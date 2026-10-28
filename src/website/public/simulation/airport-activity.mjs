import * as T from 'three';
import {trafficState,trafficHeading,crewStations,crewMovement} from './airport-traffic.mjs';
import {createArrivalUnloading} from './arrival-unloading.mjs';
const mod=(n,d)=>((n%d)+d)%d;
export function createAirportActivity(scene,library,container,hero){
  const root=new T.Group();root.name='Working airport';scene.add(root);
  const find=(o,prefix)=>{let result;o.traverse(child=>{if(!result&&child.name.startsWith(prefix))result=child;});return result;};
  function clone(name){const source=library.getObjectByName(name);if(!source)throw Error(`Missing airport actor: ${name}`);const o=source.clone(true);o.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});root.add(o);return o;}
  const crew=crewStations.map(([x,z,role],i)=>{
    const o=clone('CrewPrototype');o.position.set(x,.12,z);o.rotation.y=role==='marshal'?Math.PI/2:Math.PI;
    const limbs=['CrewArmL','CrewArmR','CrewLegL','CrewLegR'].map(name=>find(o,name));
    o.traverse(n=>{if(n.name.startsWith('CrewWand'))n.visible=role==='marshal';});
    let bag;if(role==='carry'){bag=clone('SuitcasePrototype');root.remove(bag);o.add(bag);bag.position.set(0,.95,.34);bag.scale.setScalar(.7);}
    return {o,x,z,role,limbs,i,bag};
  });
  const truck=clone('CateringPrototype');truck.position.set(345,.12,-210);truck.rotation.y=Math.PI;
  const platform=find(truck,'CateringPlatform');
  const belt=clone('BeltLoaderPrototype');belt.position.set(334,.12,-212.5);belt.rotation.y=Math.PI;
  const loadingCart=clone('BaggageCartPrototype');loadingCart.position.set(326,.12,-202);loadingCart.rotation.y=Math.PI/2;
  const bags=Array.from({length:4},()=>{const b=clone('SuitcasePrototype');root.remove(b);belt.add(b);return b;});
  const serviceCurve=new T.CatmullRomCurve3([[356,.12,-370],[356,.12,370],[364,.12,390],[365,.12,-370]].map(p=>new T.Vector3(...p)),true,'catmullrom',.12);
  const busCurve=new T.CatmullRomCurve3([[535,.12,-420],[535,.12,420],[600,.12,440],[600,.12,-420]].map(p=>new T.Vector3(...p)),true,'catmullrom',.10);
  const vehicles=[];
  function mover(name,curve,speed,start,offset=0){const o=clone(name);vehicles.push({o,curve,speed,start,offset,length:curve.getLength()});return o;}
  for(const start of [0,.31,.64]){
    mover('TractorPrototype',serviceCurve,6,start);
    for(let i=1;i<=3;i++)mover('BaggageCartPrototype',serviceCurve,6,start,i*4.4);
  }
  mover('FollowMePrototype',serviceCurve,7.5,.12);
  mover('BusPrototype',busCurve,8,.1);mover('BusPrototype',busCurve,8,.60);
  const aircraft={arrival:clone('BackgroundJetPrototype'),departure:clone('BackgroundJetPrototype')};
  const gear={};const lights=[];
  for(const [role,o] of Object.entries(aircraft)){
    gear[role]=find(o,'AirportLandingGear');
    for(const [x,c] of [[-17.8,0xff353d],[17.8,0x51ff9e]]){
      const light=new T.Mesh(new T.SphereGeometry(.16,6,4),new T.MeshBasicMaterial({color:c}));light.position.set(x,.9,-6);o.add(light);lights.push(light);
    }
    const beacon=new T.Mesh(new T.SphereGeometry(.18,6,4),new T.MeshBasicMaterial({color:0xff5148}));beacon.position.set(0,2.3,-1);o.add(beacon);lights.push(beacon);
  }
  // A short, low-opacity tyre puff marks touchdown without obscuring the plane.
  const smoke=new T.InstancedMesh(new T.SphereGeometry(1,6,4),new T.MeshBasicMaterial({color:0xd7e0df,transparent:true,opacity:0,depthWrite:false}),12);scene.add(smoke);
  const dummy=new T.Object3D();let focus=new T.Vector3(),focusHeading=new T.Vector3(0,0,1),trafficLabel='Final approach';
  const pose=new T.Quaternion();
  const arrival=createArrivalUnloading(scene,library,container,hero);
  function update(seconds,dt){
    for(const actor of crew){
      const {o,x,z,role,limbs,i}=actor,walk=role==='walk'||role==='carry',w=seconds*4.4+i*1.9;
      const motion=crewMovement(seconds,i);
      o.position.set(motion.x,.12,motion.z);o.rotation.y=motion.yaw;
      if(actor.bag)actor.bag.visible=motion.carrying;
      const [left,right,legL,legR]=limbs;
      if(role==='marshal'){
        left.rotation.z=-1.7-.45*Math.sin(w*.45);right.rotation.z=1.7+.45*Math.sin(w*.45);left.rotation.x=right.rotation.x=.12;
      }else{
        left.rotation.x=motion.carrying?-.8:walk?Math.sin(w)*.48:-.65+Math.sin(w*.7)*.22;
        right.rotation.x=motion.carrying?-.8:walk?-Math.sin(w)*.48:-.45-Math.sin(w*.7)*.2;
        legL.rotation.x=walk?Math.sin(w)*.30:0;legR.rotation.x=walk?-Math.sin(w)*.30:0;
      }
    }
    if(platform)platform.position.y=2.9+.22*Math.sin(seconds*.5);
    for(let i=0;i<bags.length;i++){const u=mod(seconds*.18+i*.25,1),z=-4+8*u;bags[i].position.set(0,.63+(z+4.5)/9*1.55,z);}
    for(const item of vehicles){const u=mod(item.start+(seconds*item.speed-item.offset)/item.length,1);item.o.position.copy(item.curve.getPointAt(u));const d=item.curve.getTangentAt(u);item.o.rotation.y=Math.atan2(d.x,d.z);}
    for(const [role,o] of Object.entries(aircraft)){
      const state=trafficState(seconds,role),d=new T.Vector3(...trafficHeading(seconds,role));o.position.set(...state.position);o.visible=state.visible;
      pose.setFromEuler(new T.Euler(-Math.asin(d.y),Math.atan2(d.x,d.z),0,'YXZ'));o.quaternion.slerp(pose,1-Math.exp(-Math.max(dt,.016)*12));
      if(gear[role])gear[role].visible=state.gear;
    }
    const cycle=mod(seconds,60),tracked=cycle<16||cycle>=48?'arrival':'departure',state=trafficState(seconds,tracked);
    focus.copy(aircraft[tracked].position);focusHeading.set(...trafficHeading(seconds,tracked));trafficLabel=state.label;
    lights.forEach((light,i)=>light.visible=i%3!==2||mod(seconds+i*.2,1.1)<.16);
    const puff=cycle>=7&&cycle<8.4?(cycle-7)/1.4:-1;smoke.visible=puff>=0;
    if(puff>=0){smoke.material.opacity=Math.sin(puff*Math.PI)*.11;for(let i=0;i<12;i++){dummy.position.set(-240+(i%2?2.3:-2.3)+Math.sin(i)*puff*3,.6+puff*.8,-700+Math.floor(i/2)*1.6+puff*6);dummy.scale.setScalar(.3+puff*1.7);dummy.updateMatrix();smoke.setMatrixAt(i,dummy.matrix);}smoke.instanceMatrix.needsUpdate=true;}
    arrival.update(seconds);
    container.dataset.airportCrew=String(crew.length+(seconds>=96?4:0));container.dataset.airportTrafficState=trafficLabel;
    container.dataset.airportTrafficPosition=focus.toArray().map(v=>v.toFixed(1)).join(',');
    container.dataset.airportServicePosition=vehicles[0].o.position.toArray().map(v=>v.toFixed(1)).join(',');
  }
  return {update,get trafficFocus(){return focus;},get trafficHeading(){return focusHeading;},get trafficLabel(){return trafficLabel;}};
}
