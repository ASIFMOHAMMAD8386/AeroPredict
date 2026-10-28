import * as T from "three";
import { GLTFLoader } from "./vendor/GLTFLoader.js";
import { airports } from "./engine.mjs";
import { clamp, routePoint, routeDistance, zoomDistance } from "./route-math.mjs";
import {createAirport} from './airport-scene.mjs';
import {flightPhase, filmFrame, stages, FLIGHT_SECONDS,TAKEOFF_SHOT} from './flight-sequence.mjs';
export function createGlobe(container) {
  let renderer;
  container.tabIndex = 0;
  container.setAttribute(
    "aria-label",
    "Route explorer. Drag to orbit, pinch or scroll to zoom. Arrow keys rotate. R resets the view.",
  );
  try {
    renderer = new T.WebGLRenderer({ alpha: true, antialias: true });
  } catch {
    container.textContent =
      "3D is unavailable on this device. Flight details remain available.";
    return { select() {}, resize() {} };
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  container.append(renderer.domElement);
  const airport = window.AEROPREDICT_MODE === 'live' ? null : createAirport(container);
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(40, 1, 0.01, 100),
    earth = new T.Group();
  scene.add(earth);
  const pos = (lon, lat, r = 1) =>
    new T.Vector3(
      r * Math.cos((lat * Math.PI) / 180) * Math.sin((lon * Math.PI) / 180),
      r * Math.sin((lat * Math.PI) / 180),
      r * Math.cos((lat * Math.PI) / 180) * Math.cos((lon * Math.PI) / 180),
    );
  const texture = new T.TextureLoader().load("./vendor/earth-nasa.jpg");
  texture.colorSpace = T.SRGBColorSpace;
  // NASA equirectangular image is aligned with our longitude convention by a 90-degree rotation.
  const surface = new T.Mesh(
    new T.SphereGeometry(1, 96, 64),
    new T.MeshPhongMaterial({ map: texture, shininess: 6 }),
  );
  surface.rotation.y = -Math.PI / 2;
  earth.add(surface);
  earth.add(
    new T.Mesh(
      new T.SphereGeometry(1.025, 64, 48),
      new T.ShaderMaterial({
        transparent: true,
        side: T.BackSide,
        blending: T.AdditiveBlending,
        depthWrite: false,
        vertexShader:
          "varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}",
        fragmentShader:
          "varying vec3 n;varying vec3 v;void main(){float glow=pow(1.-abs(dot(normalize(n),normalize(v))),3.);gl_FragColor=vec4(.12,.45,.9,glow*.55);}",
      }),
    ),
  );
  scene.add(new T.AmbientLight(0xc0dfed, 1.7));
  const light = new T.DirectionalLight(0xc7eeff, 2);
  light.position.set(3, 4, 5);
  scene.add(light);
  const gridMat = new T.LineBasicMaterial({
    color: 0x31546b,
    transparent: true,
    opacity: 0.12,
  });
  const line = (pts, mat) =>
    new T.Line(new T.BufferGeometry().setFromPoints(pts), mat);
  for (let lat = -60; lat <= 60; lat += 30)
    earth.add(
      line(
        Array.from({ length: 181 }, (_, i) => pos(i * 2, lat, 1.002)),
        gridMat,
      ),
    );
  for (let lon = 0; lon < 360; lon += 30)
    earth.add(
      line(
        Array.from({ length: 181 }, (_, i) => pos(lon, i - 90, 1.002)),
        gridMat,
      ),
    );
  fetch("./vendor/countries.geojson")
    .then((r) => r.json())
    .then((data) => {
      const mat = new T.LineBasicMaterial({
        color: 0x769e9b,
        transparent: true,
        opacity: 0.22,
      });
      for (const f of data.features) {
        const polygons =
          f.geometry.type === "Polygon"
            ? [f.geometry.coordinates]
            : f.geometry.type === "MultiPolygon"
              ? f.geometry.coordinates
              : [];
        for (const polygon of polygons)
          for (const ring of polygon)
            earth.add(
              line(
                ring.map(([lon, lat]) => pos(lon, lat, 1.006)),
                mat,
              ),
            );
      }
    })
    .catch(() => {});
  const stars = [];
  for (let i = 0; i < 600; i++) {
    const theta = i * 2.399963,
      y = 1 - (2 * (i + 0.5)) / 600,
      r = Math.sqrt(1 - y * y);
    stars.push(
      new T.Vector3(r * Math.cos(theta), y, r * Math.sin(theta)).multiplyScalar(
        15,
      ),
    );
  }
  scene.add(
    new T.Points(
      new T.BufferGeometry().setFromPoints(stars),
      new T.PointsMaterial({
        color: 0x99c3ce,
        size: 0.025,
        transparent: true,
        opacity: 0.5,
      }),
    ),
  );
  let yaw = 79 * Math.PI / 180, pitch = 14 * Math.PI / 180;
  let selected = null, route = null, t = 0, speed = 1,shot=null;
  const decorations=[];
  let running = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let view = 'top', polar = 0.10, azimuth = 0, target = 0.4;
  let initialized = false, fitted = true;
  const aim = new T.Vector3(), desiredAim = new T.Vector3();
  const normal = new T.Vector3(), forward = new T.Vector3(), across = new T.Vector3(), north = new T.Vector3();
  const desiredCamera = new T.Vector3(), orbit = new T.Vector3();
  const accent = window.AEROPREDICT_MODE === 'live' ? 0x70baff : 0xffbf55;
  const markerMaterial = new T.MeshBasicMaterial({color: accent});
  const markers = [], labels = [];
  const plane = new T.Group(); earth.add(plane); plane.visible = false;
  new GLTFLoader().load('./assets/aeropredict-airliner-v2.glb', ({scene:model}) => {
    const box = new T.Box3().setFromObject(model), size = box.getSize(new T.Vector3());
    model.position.sub(box.getCenter(new T.Vector3()));
    const holder = new T.Group(); holder.add(model);
    holder.scale.setScalar(0.12 / Math.max(size.x,size.y,size.z)); plane.add(holder); container.dataset.modelVersion = "2";
  }, undefined, () => {});
  const a = () => airports[selected.origin], b = () => airports[selected.destination];
  const point = fraction => {const p=new T.Vector3(...routePoint(a(),b(),fraction));return p.addScaledVector(p.clone().normalize(),.006);};
  function disposeRoute() {
    if (route) {earth.remove(route);route.geometry.dispose();route.material.dispose();}
    for(const mesh of decorations){earth.remove(mesh);mesh.geometry.dispose();}
    decorations.length=0;
    for (const m of markers) {earth.remove(m);m.geometry.dispose();}
    for (const l of labels) l.element.remove();
    markers.length = labels.length = 0;
  }
  function worldDistance() {
    const halfY = camera.fov * Math.PI / 360;
    const halfX = Math.atan(Math.tan(halfY) * camera.aspect);
    return 1.12 / Math.sin(Math.min(halfX,halfY));
  }
  const bounds = () => view === 'world' ? [1.35, Math.max(12,worldDistance()*2)] : (view === 'follow'||view === 'airport') ? [.055,.6] : [0.10,3.4];
  function updateButtons() {
    const life=view==='airport'&&airport?.activityView;
    for (const id of ['airport','airport-life','top','side','along','follow','world'])
      document.getElementById(id === 'world' ? 'world' : `view-${id}`).setAttribute('aria-pressed',String(id==='airport-life'?life:id==='airport'?view==='airport'&&!life:view===id));
    document.getElementById('view-name').textContent = life?'Airport life':view === 'airport' ? 'Airport film' : view === 'world' ? 'World view' : view === 'top' ? 'Top view' : view === 'side' ? 'Side view' : view === 'follow' ? (selected?.isLive ? 'Position snapshot' : 'Aircraft camera') : 'Along route';
  }
  container.addEventListener('airport-camera-change',updateButtons);
  function preset(next) {
    if (!selected) return;
    view = next; fitted = true;
    if (view === 'world') {
      const mid = point(0.5).normalize(); yaw = Math.atan2(mid.x,mid.z); pitch = Math.asin(mid.y);
      target = worldDistance();
    } else if(view==='follow'||view==='airport'){
      polar=1.05;azimuth=-.90;target=.10;
    } else {
      polar = view === 'top' ? 0.10 : 1.13;
      azimuth = view === 'along' ? -Math.PI/2 : 0;
      target = routeDistance(a(),b(),camera.aspect,camera.fov) * (view==='along' ? 1.28 : 1);
    }
    updateButtons();
  }
  function zoom(delta) {
    const [lo,hi] = bounds(); target = zoomDistance(target,delta,lo,hi); fitted = false;
  }
  function select(f,isLive) {
    selected={...f,isLive}; disposeRoute(); t=0;shot=null;
    normal.copy(point(0.5)).normalize();
    north.set(0,1,0).addScaledVector(normal,-normal.y).normalize();
    forward.copy(pos(b().lon,b().lat)).sub(pos(a().lon,a().lat));
    forward.addScaledVector(normal,-forward.dot(normal)).normalize();
    across.crossVectors(normal,forward).normalize();
    const routePoints=Array.from({length:161},(_,i)=>point(i/160));
    if(isLive){
      route=line(routePoints,new T.LineDashedMaterial({color:accent,dashSize:.005,gapSize:.003}));route.computeLineDistances();
    }else{
      const curve=new T.CatmullRomCurve3(routePoints);
      route=new T.Mesh(new T.TubeGeometry(curve,160,.00085,8,false),new T.ShaderMaterial({
        transparent:true,depthWrite:false,uniforms:{uProgress:{value:0},uColor:{value:new T.Color(accent)}},
        vertexShader:'varying float along;void main(){along=uv.x;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:'uniform float uProgress;uniform vec3 uColor;varying float along;void main(){float done=step(along,uProgress);gl_FragColor=vec4(mix(vec3(.40,.55,.62),uColor,done),mix(.35,1.,done));}'
      }));
      for(const fraction of [.2,.4,.6,.8]){
        const arrow=new T.Mesh(new T.ConeGeometry(.0019,.0055,10),markerMaterial);
        arrow.position.copy(point(fraction));const direction=point(fraction+.002).sub(point(fraction-.002)).normalize();
        arrow.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction);earth.add(arrow);decorations.push(arrow);
      }
    }
    earth.add(route);
    document.getElementById('view-follow').hidden=isLive&&!f.live_position;
    document.getElementById('view-follow').textContent=isLive?'View position':'Follow aircraft';
    document.getElementById('journey-state').textContent=`Demo flight · ${f.origin} → ${f.destination}`;
    running=!matchMedia('(prefers-reduced-motion: reduce)').matches;updatePause();
    for (const code of [f.origin,f.destination]) {
      const ap=airports[code], marker=new T.Mesh(new T.SphereGeometry(0.006,16,12),markerMaterial);
      marker.position.copy(pos(ap.lon,ap.lat,1.010));earth.add(marker);markers.push(marker);
      const element=document.createElement('span');element.className='airport-label';element.textContent=`${code} · ${ap.name}`;
      container.append(element);labels.push({element,position:marker.position});
    }
    plane.visible = !isLive || Boolean(f.live_position);
    if (isLive && f.live_position) {
      plane.position.copy(pos(f.live_position.longitude,f.live_position.latitude,1.008));
      plane.up.copy(plane.position).normalize();plane.lookAt(pos(b().lon,b().lat,1.008));
    }
    airport?.focusAircraft();resize(); preset(isLive?'side':'airport'); initialized=false;
  }
  function resize() {
    const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;
    renderer.setSize(w,h);airport?.resize();camera.aspect=w/h;camera.updateProjectionMatrix();
    if(selected&&fitted)preset(view);
  }
  new ResizeObserver(resize).observe(container);
  const pointers=new Map();let gesture=null;
  const separation=()=>{const p=[...pointers.values()];return Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);};
  function startGesture() {
    const p=[...pointers.values()];
    gesture=p.length===1?{x:p[0].x,y:p[0].y,yaw,pitch,azimuth,polar}:p.length===2?{separation:separation(),target}:null;
  }
  container.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    container.focus({preventScroll:true});container.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});startGesture();
  });
  container.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId))return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(!gesture)return;
    fitted=false;
    if(pointers.size===2&&gesture.separation){
      const [lo,hi]=bounds();target=clamp(gesture.target*gesture.separation/Math.max(1,separation()),lo,hi);
    } else if(pointers.size===1&&gesture.x!==undefined){
      const dx=(e.clientX-gesture.x)*0.006,dy=(e.clientY-gesture.y)*0.006;
      if(view==='world'){yaw=gesture.yaw-dx;pitch=clamp(gesture.pitch+dy,-1.48,1.48);}
      else{azimuth=gesture.azimuth-dx;polar=clamp(gesture.polar+dy,0.06,1.42);}
    }
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])
    container.addEventListener(event,e=>{pointers.delete(e.pointerId);startGesture();});
  container.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?300:1));},{passive:false});
  document.getElementById('zoom-in').onclick=()=>zoom(-110);
  document.getElementById('zoom-out').onclick=()=>zoom(110);
  document.getElementById('zoom-level').oninput=e=>{
    const [lo,hi]=bounds();target=hi*Math.pow(lo/hi,Number(e.target.value)/100);fitted=false;
  };
  for(const id of ['airport','top','side','along','follow'])document.getElementById(`view-${id}`).onclick=()=>{shot=null;if(id==='airport')airport?.focusAircraft();preset(id);};
  document.getElementById('view-airport-life').onclick=()=>{preset('airport');airport?.focusActivity();};
  document.getElementById('world').onclick=()=>preset('world');
  document.getElementById('reset').onclick=()=>{airport?.focusAircraft();preset('airport');};
  function rotate(dx,dy) {
    fitted=false;
    if(view==='world'){yaw+=dx;pitch=clamp(pitch+dy,-1.48,1.48);}
    else{azimuth+=dx;polar=clamp(polar+dy,0.06,1.42);}
  }
  for(const [id,dx,dy] of [['rotate-left',-.3,0],['rotate-right',.3,0],['rotate-up',0,-.18],['rotate-down',0,.18]])
    document.getElementById(id).onclick=()=>rotate(dx,dy);
  container.addEventListener('keydown',e=>{
    const delta={ArrowLeft:[-.15,0],ArrowRight:[.15,0],ArrowUp:[0,-.12],ArrowDown:[0,.12]}[e.key];
    if(delta){e.preventDefault();rotate(...delta);}
    if(['+','=','-','_'].includes(e.key)){e.preventDefault();zoom(e.key==='-'||e.key==='_'?110:-110);}
    if(e.key.toLowerCase()==='r'){airport?.focusAircraft();preset('airport');}
  });
  const pause=document.getElementById('pause');
  const updatePause=()=>pause.textContent=running?'Pause flight':shot?.complete?'Replay takeoff':t>=1?'Replay flight':'Play flight';updatePause();
  pause.onclick=()=>{if(shot?.complete){t=TAKEOFF_SHOT.start;shot.complete=false;}else if(t>=1)t=0;running=!running;updatePause();};
  document.getElementById('restart-flight').onclick=()=>{shot=null;t=0;airport?.focusAircraft();preset('airport');running=true;updatePause();};
  document.getElementById('takeoff-shot').onclick=()=>{t=TAKEOFF_SHOT.start;shot={end:TAKEOFF_SHOT.end,complete:false};airport?.focusTakeoff();preset('airport');running=true;updatePause();};
  document.getElementById('journey-speed').onchange=e=>{speed=Number(e.target.value);};
  document.getElementById('journey-timeline').oninput=e=>{shot=null;t=Number(e.target.value)/100;running=false;updatePause();};
  const milestones=document.getElementById('flight-stages');
  for(const stage of stages){
    const button=document.createElement('button');button.type='button';button.textContent=stage.title;button.dataset.stage=stage.id;
    button.onclick=()=>{shot=null;t=stage.start+.00001;running=false;if(airport?.activityView){airport.focusAircraft();preset('airport');}updatePause();};milestones.append(button);
  }
  let last=0;
  function frame(now) {
    requestAnimationFrame(frame);
    if(!selected||container.closest('[hidden]')||document.hidden||document.getElementById('aircraft-dialog')?.open){last=now;return;}
    const dt=Math.min((now-last)/1000,.05);last=now;
    if(airport?.failed&&view==='airport')preset('side');
    if(!selected.isLive){
      if(running&&(airport?.ready||airport?.failed)){const end=shot?.end??1;t=Math.min(end,t+dt*speed/FLIGHT_SECONDS);if(t>=end){running=false;if(shot)shot.complete=true;updatePause();}}
      const rp=flightPhase(t).routeProgress;
      plane.position.copy(point(rp));plane.position.addScaledVector(plane.position.clone().normalize(),.005);plane.up.copy(plane.position).normalize();
      const direction=point(Math.min(1,flightPhase(t).routeProgress+.002)).sub(point(Math.max(0,flightPhase(t).routeProgress-.002))).normalize();
      plane.lookAt(plane.position.clone().add(direction));
      route.material.uniforms.uProgress.value=rp;
      document.getElementById('journey-progress').textContent=`${Math.round(t*100)}% of journey`;
      if(document.activeElement!==document.getElementById('journey-timeline'))document.getElementById('journey-timeline').value=String(t*100);
      const phase=flightPhase(t);
      const life=view==='airport'&&airport?.activityView;
      const blendingNow=filmFrame(t).blending&&view==='airport'&&!life;
      document.getElementById('journey-state').textContent=shot?(shot.complete?'Takeoff shot complete · airborne':`Takeoff shot · ${t*FLIGHT_SECONDS<27.8?'accelerating':t*FLIGHT_SECONDS<30?'nose lift':'airborne & climbing'}`):life?'Airport life · crew, ground services & traffic':t>=1?`Journey complete · baggage unloaded in ${b().name}`:blendingNow?(t*FLIGHT_SECONDS<55?`Leaving ${a().name} · route view`:`Approaching ${b().name}`):phase.id==='cruise'?`Cruising · ${a().name} → ${b().name}`:`${phase.title} · ${phase.arrival?b().name:a().name}`;
      for(const button of milestones.children)button.setAttribute('aria-current',String(button.dataset.stage===phase.id));
      document.querySelector('.route-legend').textContent=life?'Simulated activity · Pause and speed control the whole airport':phase.airport&&view==='airport'?'Full journey · 2 minutes at 1×':'Bright path: travelled in demo · Faint path: remaining';
      container.dataset.journeyProgress=t.toFixed(4);
    }
    const phase=flightPhase(t), film=filmFrame(t);
    const activityView=view==='airport'&&airport?.activityView;
    const airportOpacity=view==='airport'&&!airport?.failed?(activityView?1:film.airportOpacity):0;
    const airportVisible=airportOpacity>0;
    renderer.domElement.style.visibility=airportOpacity>=1?'hidden':'visible';
    container.dataset.airportVisible=String(airportVisible);
    container.dataset.sceneBlend=airportOpacity.toFixed(3);
    document.querySelector('.orbit-hint').textContent=airportVisible?'Drag to orbit the aircraft · Scroll to zoom · Choose an airport camera above':'Drag to orbit · Scroll or pinch to zoom · R to reset';
    document.querySelector('.globe-tools').hidden=airportVisible;
    const blending=view==='airport'&&film.blending&&!activityView&&!airport?.failed;
    plane.visible=!blending;
    if(airportVisible){airport.show(airportOpacity);airport.render({...film.airportPhase,elapsedSeconds:t*FLIGHT_SECONDS,weather:selected.weather||'Clear'},(activityView?phase.arrival:film.airportPhase.arrival)?b().name:a().name,dt,blending);}else airport?.hide();
    if(view==='world'){
      desiredAim.set(0,0,0);desiredCamera.copy(pos(yaw*180/Math.PI,pitch*180/Math.PI,target));
      camera.up.set(0,1,0);
    }else if(view==='follow'||view==='airport'){
      const localNormal=plane.position.clone().normalize();
      const heading=selected.isLive?pos(b().lon,b().lat).sub(plane.position).normalize():point(Math.min(1,flightPhase(t).routeProgress+.002)).sub(point(Math.max(0,flightPhase(t).routeProgress-.002))).normalize();
      heading.addScaledVector(localNormal,-heading.dot(localNormal)).normalize();
      const lateral=new T.Vector3().crossVectors(localNormal,heading).normalize();
      orbit.copy(lateral).multiplyScalar(Math.cos(azimuth)).addScaledVector(heading,Math.sin(azimuth));
      desiredAim.copy(plane.position);
      desiredCamera.copy(desiredAim).addScaledVector(localNormal,target*Math.cos(polar)).addScaledVector(orbit,target*Math.sin(polar));
      camera.up.copy(localNormal);
    }else{
      desiredAim.copy(normal).multiplyScalar(1.006);
      orbit.copy(across).multiplyScalar(Math.cos(azimuth)).addScaledVector(forward,Math.sin(azimuth));
      desiredCamera.copy(desiredAim).addScaledVector(normal,target*Math.cos(polar)).addScaledVector(orbit,target*Math.sin(polar));
      camera.up.copy(normal).multiplyScalar(Math.sin(polar)).addScaledVector(north,Math.cos(polar));
    }
    if(!initialized){camera.position.copy(desiredCamera);aim.copy(desiredAim);initialized=true;}
    else{const ease=1-Math.exp(-dt*12);camera.position.lerp(desiredCamera,ease);aim.lerp(desiredAim,ease);}
    if(camera.position.length()<1.025)camera.position.setLength(1.025);
    camera.lookAt(aim);
    const unitsPerPixel=position=>2*camera.position.distanceTo(position)*Math.tan(camera.fov*Math.PI/360)/Math.max(1,container.clientHeight);
    const cap=view==='world'?24:(view==='follow'||view==='airport')?Math.min(160,container.clientWidth*.24,container.clientHeight*.40):Math.min(76,container.clientWidth*.12);
    const size=unitsPerPixel(plane.position),modelScale=Math.min(1,cap*size/.12);
    plane.scale.setScalar(modelScale);
    markers.forEach(m=>m.scale.setScalar(Math.min(1,5*unitsPerPixel(m.position)/.012)));
    camera.updateMatrixWorld();
    for(const l of labels){
      const projected=l.position.clone().project(camera);
      const visible=l.position.dot(camera.position.clone().sub(l.position))>0&&Math.abs(projected.x)<.94&&Math.abs(projected.y)<.94&&projected.z<1;
      l.element.hidden=airportOpacity>.8||!visible;
      l.element.style.opacity=String(1-airportOpacity);
      l.element.style.left=`${(projected.x*.5+.5)*container.clientWidth}px`;
      l.element.style.top=`${(-projected.y*.5+.5)*container.clientHeight}px`;
    }
    const [lo,hi]=bounds();document.getElementById('zoom-level').value=String(100*Math.log(target/hi)/Math.log(lo/hi));
    document.getElementById('zoom-readout').textContent=`${(worldDistance()/Math.max(.1,camera.position.distanceTo(aim))).toFixed(1)}×`;
    container.dataset.view=view;container.dataset.longitude=(Math.atan2(camera.position.x,camera.position.z)*180/Math.PI).toFixed(1);
    container.dataset.cameraDistance=camera.position.length().toFixed(3);container.dataset.focusDistance=camera.position.distanceTo(aim).toFixed(3);
    container.dataset.aircraftPixels=(.12*modelScale/size).toFixed(1);
    container.dataset.cameraPosition=camera.position.toArray().map(x=>x.toFixed(4)).join(',');
    if(airportOpacity<1)renderer.render(scene,camera);
    if(blending){
      airport.bridge({position:plane.position.clone().project(camera),quaternion:camera.quaternion.clone().invert().multiply(plane.getWorldQuaternion(new T.Quaternion())),pixels:.12*modelScale/size},airportOpacity,film.airportPhase);
    }else airport?.hideBridge();
  }
  requestAnimationFrame(frame);
  return {select,resize};
}
