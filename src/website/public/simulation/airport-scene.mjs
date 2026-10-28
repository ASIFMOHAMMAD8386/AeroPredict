import * as T from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {airportPosition, departureTaxi, arrivalTaxi,smoothBlend,takeoffPitch} from './flight-sequence.mjs';
import {createAirportActivity} from './airport-activity.mjs';
import {createAirportWeather} from './airport-weather.mjs';

export function createAirport(container) {
  const stage=document.createElement('div');stage.className='airport-stage';stage.hidden=true;
  const hud=document.createElement('div');hud.className='airport-hud';
  const title=document.createElement('strong'),sub=document.createElement('span');
  sub.textContent='Ground crew · moving services · simulated traffic';hud.append(title,sub);
  const loading=document.createElement('div');loading.className='airport-loading';loading.textContent='Loading Blender airport…';
  const tools=document.createElement('div');tools.className='airport-cameras';tools.setAttribute('role','group');tools.setAttribute('aria-label','Airport camera');
  let cameraMode='chase',ready=false,failed=false,previous='',lastCity='';
  let orbitAngle=-.72,tilt=.42,distance=95,gesture,activity;
  const buttons=[];
  function focusCamera(id){
    cameraMode=id;
    if(id==='crew'){orbitAngle=.548;tilt=.183;distance=17;}
    else if(id==='traffic'){orbitAngle=-2.11;tilt=.22;distance=110;}
    else if(id==='overview'){orbitAngle=2.45;tilt=.44;distance=1740;}
    else if(id==='takeoff'){orbitAngle=-1.0;tilt=.085;distance=65;}
    else{orbitAngle=-.72;tilt=.42;distance=95;}
    buttons.forEach(x=>x.b.setAttribute('aria-pressed',String(x.id===id)));
    container.dispatchEvent(new Event('airport-camera-change'));
  }
  for(const [id,label] of [['chase','Aircraft camera'],['takeoff','Takeoff camera'],['crew','Ground crew'],['traffic','Arrivals & departures'],['overview','Airport overview'],['runway','Runway camera']]){
    const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-pressed',String(id===cameraMode));
    b.onclick=()=>focusCamera(id);buttons.push({id,b});tools.append(b);
  }
  let renderer;
  const unavailable=()=>({ready:true,failed:true,show(){},hide(){},hideBridge(){},resize(){},render(){},bridge(){},focusAircraft(){},focusActivity(){},focusTakeoff(){}});
  try {renderer=new T.WebGLRenderer({antialias:true,logarithmicDepthBuffer:true});}catch{return unavailable();}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  stage.append(renderer.domElement,hud,tools,loading);container.append(stage);
  // One foreground aircraft bridges the two scales. The backgrounds can dissolve
  // without ghosting two differently positioned airliners on top of each other.
  let bridgeRenderer;
  try{bridgeRenderer=new T.WebGLRenderer({antialias:true,alpha:true});}catch{renderer.dispose();stage.remove();return unavailable();}
  bridgeRenderer.setPixelRatio(Math.min(devicePixelRatio,1.75));bridgeRenderer.outputColorSpace=T.SRGBColorSpace;
  bridgeRenderer.toneMapping=T.ACESFilmicToneMapping;bridgeRenderer.toneMappingExposure=1.1;
  const bridgeCanvas=bridgeRenderer.domElement;bridgeCanvas.className='flight-bridge';bridgeCanvas.hidden=true;container.append(bridgeCanvas);
  const bridgeScene=new T.Scene(),bridgeCamera=new T.PerspectiveCamera(40,1,.1,100),bridgeAircraft=new T.Group();
  bridgeCamera.position.set(0,0,5);bridgeScene.add(new T.HemisphereLight(0xdceeff,0x647543,2.1));
  const bridgeSun=new T.DirectionalLight(0xfff1db,3.1);bridgeSun.position.set(-3,6,4);bridgeScene.add(bridgeSun,bridgeAircraft);
  let bridgeGear,jetWidth=37;const jetCenter=new T.Vector3();
  const scene=new T.Scene();scene.background=new T.Color(0xa9cfdf);scene.fog=new T.Fog(0xa9cfdf,3000,7500);
  const camera=new T.PerspectiveCamera(43,1,.75,12000);
  const ambient=new T.HemisphereLight(0xdceeff,0x647543,2.1);scene.add(ambient);
  const sun=new T.DirectionalLight(0xfff1db,3.1);sun.position.set(-400,800,-600);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-90,right:90,top:90,bottom:-90,near:5,far:1800});sun.shadow.bias=-.00010;sun.shadow.normalBias=.035;
  scene.add(sun,sun.target);
  const weather=createAirportWeather(scene,camera,sun,ambient,container);
  const aircraft=new T.Group();scene.add(aircraft);let gear;
  const trails={};
  for(const [name,points] of [['departure',departureTaxi],['arrival',arrivalTaxi]]){
    const material=new T.LineDashedMaterial({color:0xffca46,dashSize:5,gapSize:4,depthTest:false,transparent:true,opacity:.8});
    const line=new T.Line(new T.BufferGeometry().setFromPoints(points.map(([x,,z])=>new T.Vector3(x,.7,z))),material);line.computeLineDistances();line.renderOrder=2;scene.add(line);trails[name]=line;
  }
  const loader=new GLTFLoader();
  Promise.all([
    loader.loadAsync('./assets/aeropredict-airport-v2.glb'),
    loader.loadAsync('./assets/aeropredict-airport-airliner.glb'),
    loader.loadAsync('./assets/aeropredict-airport-activity.glb'),
  ]).then(([environment,jet,actors])=>{
    environment.scene.traverse(o=>{if(o.isMesh){o.receiveShadow=true;if(o.material){o.material.side=T.DoubleSide;if(/White markings|Taxiway gold/.test(o.material.name)){o.material.polygonOffset=true;o.material.polygonOffsetFactor=-1;o.material.polygonOffsetUnits=-1;}}}});
    scene.add(environment.scene);
    weather.setEnvironment(environment.scene);
    jet.scene.traverse(o=>{if(o.isMesh)o.castShadow=true;});
    aircraft.add(jet.scene);gear=jet.scene.getObjectByName('AirportLandingGear');
    const bounds=new T.Box3().setFromObject(jet.scene);bounds.getCenter(jetCenter);jetWidth=Math.max(...bounds.getSize(new T.Vector3()).toArray());
    const bridgeModel=jet.scene.clone(true);bridgeModel.position.sub(jetCenter);bridgeAircraft.add(bridgeModel);bridgeGear=bridgeModel.getObjectByName('AirportLandingGear');
    activity=createAirportActivity(scene,actors.scene,container,aircraft);
    ready=true;loading.hidden=true;container.dataset.airportLoaded='true';
  }).catch(()=>{failed=true;loading.textContent='Airport assets could not load. Choose a globe view above.';container.dataset.airportLoaded='error';});
  function resize(){const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();bridgeRenderer.setSize(w,h);bridgeCamera.aspect=w/h;bridgeCamera.updateProjectionMatrix();}
  const desired=new T.Vector3(),aim=new T.Vector3(),look=new T.Vector3(),direction=new T.Vector3(),offset=new T.Vector3();
  const up=new T.Vector3(0,1,0),turn=new T.Quaternion(),lastPosition=new T.Vector3();let lastArrival;
  const canvas=renderer.domElement;
  // Stop gestures here so the globe underneath does not rotate at the same time.
  stage.addEventListener('pointerdown',e=>e.stopPropagation());
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);gesture={x:e.clientX,y:e.clientY,orbitAngle,tilt};});
  canvas.addEventListener('pointermove',e=>{if(!gesture)return;orbitAngle=gesture.orbitAngle-(e.clientX-gesture.x)*.008;tilt=Math.max(.08,Math.min(1.30,gesture.tilt+(e.clientY-gesture.y)*.006));});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>gesture=null);
  stage.addEventListener('wheel',e=>{e.stopPropagation();e.preventDefault();const close=cameraMode==='crew'||previous==='unload',lo=close?10:cameraMode==='overview'?700:65,hi=close?120:cameraMode==='overview'?5000:600;distance=Math.max(lo,Math.min(hi,distance*Math.exp(e.deltaY*.0012)));},{passive:false});
  function render(phase,city,dt,blending=false){
    if(!ready)return;
    if(city!==lastCity){title.textContent=`${city} · ${phase.arrival?'arrival':'departure'}`;lastCity=city;}
    const p=new T.Vector3(...airportPosition(phase));
    activity.update(phase.elapsedSeconds||0,dt);
    direction.set(...airportPosition(phase,Math.min(1,phase.u+.006))).sub(new T.Vector3(...airportPosition(phase,Math.max(0,phase.u-.006)))).normalize();
    if(direction.lengthSq()<.01)direction.set(['gate','unload'].includes(phase.id)?1:0,0,['gate','unload'].includes(phase.id)?0:1);
    const heading=Math.atan2(direction.x,direction.z);
    const bodyPitch=['runway','takeoff'].includes(phase.id)?takeoffPitch(phase):Math.asin(direction.y);
    turn.setFromEuler(new T.Euler(-bodyPitch,heading,0,'YXZ'));
    const reset=!previous||phase.arrival!==lastArrival||lastPosition.distanceTo(p)>500;
    if(reset)aircraft.quaternion.copy(turn);else aircraft.quaternion.slerp(turn,1-Math.exp(-dt*9));
    aircraft.position.copy(p);
    aircraft.visible=!blending;hud.hidden=blending;tools.hidden=blending;
    if(gear){const extension=phase.id==='takeoff'?1-smoothBlend((phase.u-.35)/.25):1;gear.scale.setScalar(Math.max(.001,extension));gear.visible=extension>.01;}
    trails.departure.visible=phase.id==='taxi';trails.arrival.visible=phase.id==='gate';
    aim.copy(p).add(new T.Vector3(0,2,0));
    // Preserve the matching aircraft pose through the airport/globe dissolve.
    const mode=blending?'chase':phase.id==='unload'&&!['crew','traffic','overview'].includes(cameraMode)?'unload':cameraMode;
    if(mode==='crew'){
      if(phase.arrival)aim.set(322,1.7,-46);else aim.set(330,1.1,-206);
      desired.copy(aim).add(new T.Vector3(Math.sin(orbitAngle)*Math.cos(tilt),Math.sin(tilt),Math.cos(orbitAngle)*Math.cos(tilt)).multiplyScalar(distance));
    }else if(mode==='unload'){
      if(previous!=='unload'){orbitAngle=.67;tilt=.135;distance=25;}
      aim.set(322,1.7,-46);
      desired.copy(aim).add(new T.Vector3(Math.sin(orbitAngle)*Math.cos(tilt),Math.sin(tilt),Math.cos(orbitAngle)*Math.cos(tilt)).multiplyScalar(distance));
    }else if(mode==='traffic'){
      aim.copy(activity.trafficFocus).add(new T.Vector3(0,2,0));
      const angle=Math.atan2(activity.trafficHeading.x,activity.trafficHeading.z)+orbitAngle;
      desired.copy(aim).add(new T.Vector3(Math.sin(angle)*Math.cos(tilt),Math.sin(tilt),Math.cos(angle)*Math.cos(tilt)).multiplyScalar(distance));
    }else if(mode==='overview'){
      aim.set(70,0,-70);desired.copy(aim).add(new T.Vector3(Math.sin(orbitAngle)*Math.cos(tilt),Math.sin(tilt),Math.cos(orbitAngle)*Math.cos(tilt)).multiplyScalar(distance));
    }else if(mode==='takeoff'){
      const angle=heading+orbitAngle;
      desired.copy(p).add(new T.Vector3(Math.sin(angle)*Math.cos(tilt),Math.sin(tilt),Math.cos(angle)*Math.cos(tilt)).multiplyScalar(distance));
    }else if(mode==='runway'){
      desired.set(p.x+125,p.y+24,p.z-65);
    }else{
      // Arc slowly around the climbing aircraft, revealing the runway behind.
      const cinematicArc=phase.id==='takeoff'?Math.PI*(1-smoothBlend(phase.u/.55)):Math.PI;
      const angle=heading+orbitAngle+cinematicArc;
      const filmTilt=phase.weather==='Thunderstorm'?Math.min(tilt,.16):tilt;
      offset.set(Math.sin(angle)*Math.cos(filmTilt),Math.sin(filmTilt),Math.cos(angle)*Math.cos(filmTilt)).multiplyScalar(distance);
      if(phase.id==='takeoff')offset.multiplyScalar(1+.9*smoothBlend((phase.u-.70)/.30));
      desired.copy(p).add(offset);
      const introSeconds=phase.weather==='Thunderstorm'?2.8:4.5;
      if(mode==='chase'&&phase.id==='taxi'&&phase.elapsedSeconds<introSeconds){
        const intro=smoothBlend(phase.elapsedSeconds/introSeconds);
        desired.lerpVectors(new T.Vector3(850,600,-1050),desired,intro);aim.lerpVectors(new T.Vector3(70,0,-70),aim,intro);
      }
    }
    desired.y=Math.max(['crew','unload'].includes(mode)?1.8:12,desired.y);
    if(reset){camera.position.copy(desired);look.copy(aim);}else{camera.position.lerp(desired,1-Math.exp(-dt*5));look.lerp(aim,1-Math.exp(-dt*8));}
    camera.up.copy(up);camera.lookAt(look);previous=phase.id;lastArrival=phase.arrival;lastPosition.copy(p);
    const shadowFocus=mode==='traffic'?activity.trafficFocus:mode==='crew'?new T.Vector3(330,0,-210):mode==='overview'?aim:p;
    sun.position.copy(shadowFocus).add(new T.Vector3(-400,800,-600));sun.target.position.copy(shadowFocus);
    title.textContent=mode==='unload'?`${city} · arrival baggage unloading`:mode==='crew'?`${city} · ${phase.arrival?'arrival':'gate 02'} ground crew`:mode==='traffic'?`Secondary runway · ${activity.trafficLabel.toLowerCase()}`:`${city} · ${phase.arrival?'arrival':'departure'}`;
    const weatherLabel=weather.update(phase.weather||'Clear',phase.elapsedSeconds||0,look);
    sub.textContent=`${weatherLabel} · ${mode==='unload'?'4 crew · baggage unloading':'Simulated airport activity'}`;
    container.dataset.airportPhase=phase.id;container.dataset.airportCamera=cameraMode;container.dataset.airportAircraft=p.toArray().map(v=>v.toFixed(2)).join(',');
    renderer.render(scene,camera);
  }
  function bridge(globePose,opacity,phase){
    if(!ready){bridgeCanvas.hidden=true;return;}
    bridgeCanvas.hidden=false;
    const center=jetCenter.clone().applyQuaternion(aircraft.quaternion).add(aircraft.position);
    const airportPose={position:center.clone().project(camera),quaternion:camera.quaternion.clone().invert().multiply(aircraft.quaternion),pixels:jetWidth/(2*camera.position.distanceTo(center)*Math.tan(camera.fov*Math.PI/360)/container.clientHeight)};
    const mix=1-opacity,ndc=airportPose.position.lerp(globePose.position,mix);
    const units=2*5*Math.tan(bridgeCamera.fov*Math.PI/360)/container.clientHeight;
    bridgeAircraft.position.set(ndc.x*container.clientWidth*units/2,ndc.y*container.clientHeight*units/2,0);
    bridgeAircraft.quaternion.copy(airportPose.quaternion).slerp(globePose.quaternion,mix);
    bridgeAircraft.scale.setScalar((airportPose.pixels+(globePose.pixels-airportPose.pixels)*mix)*units/jetWidth);
    if(bridgeGear)bridgeGear.visible=phase.arrival&&opacity>.4;
    bridgeRenderer.render(bridgeScene,bridgeCamera);
  }
  resize();return {get ready(){return ready;},get failed(){return failed;},get activityView(){return ['crew','traffic','overview'].includes(cameraMode);},focusAircraft(){focusCamera('chase');},focusActivity(){focusCamera('crew');},focusTakeoff(){focusCamera('takeoff');previous='';},show(opacity=1){stage.hidden=false;stage.style.opacity=String(opacity);stage.style.pointerEvents=opacity>.6?'auto':'none';},hide(){stage.hidden=true;previous='';},hideBridge(){bridgeCanvas.hidden=true;},resize,render,bridge};
}
