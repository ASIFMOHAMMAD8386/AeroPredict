import * as T from "three";
import { GLTFLoader } from "./vendor/GLTFLoader.js";
for(const host of [document.getElementById('aircraft-preview'),document.getElementById('aircraft-inspect')].filter(Boolean)){
 try{
  const renderer=new T.WebGLRenderer({alpha:true,antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  host.append(renderer.domElement);
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.05,100);
  const direction=new T.Vector3(7,4.5,9).normalize(),group=new T.Group();scene.add(group);
  scene.add(new T.HemisphereLight(0xdcecff,0x445369,2.8));
  const key=new T.DirectionalLight(0xffffff,3);key.position.set(3,7,8);scene.add(key);
  const rim=new T.DirectionalLight(0x8ecaff,2);rim.position.set(-6,3,-7);scene.add(rim);
  let ready=false,desiredDistance=12,distance=12,drag=null;
  function fit(){
   if(!ready)return;
   group.updateMatrixWorld(true);
   const right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),direction).normalize();
   const up=new T.Vector3().crossVectors(direction,right).normalize();
   const tan=Math.tan(camera.fov*Math.PI/360);let needed=0;
   const point=new T.Vector3();
   group.traverse(object=>{
    const positions=object.geometry?.attributes?.position;if(!object.isMesh||!positions)return;
    for(let i=0;i<positions.count;i++){
     point.fromBufferAttribute(positions,i).applyMatrix4(object.matrixWorld);
     needed=Math.max(needed,point.dot(direction)+Math.max(Math.abs(point.dot(right))/(tan*camera.aspect),Math.abs(point.dot(up))/tan));
    }
   });
   desiredDistance=needed*1.10;
  }
  new GLTFLoader().load('./assets/aeropredict-airliner-v2.glb',({scene:model})=>{
   const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3());
   model.position.sub(box.getCenter(new T.Vector3()));
   const scaled=new T.Group();scaled.add(model);scaled.scale.setScalar(8.4/Math.max(size.x,size.y,size.z));group.add(scaled);
   ready=true;resize();fit();distance=desiredDistance;host.dataset.loaded='true';host.dataset.modelVersion='2';
  },undefined,()=>host.textContent='Aircraft preview unavailable.');
  function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();fit();}
  new ResizeObserver(resize).observe(host);
  host.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,rx:group.rotation.x,ry:group.rotation.y};host.setPointerCapture(e.pointerId);});
  host.addEventListener('pointermove',e=>{if(drag){group.rotation.y=drag.ry+(e.clientX-drag.x)*.008;group.rotation.x=T.MathUtils.clamp(drag.rx+(e.clientY-drag.y)*.005,-.7,.7);}});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])host.addEventListener(event,()=>{drag=null;fit();});
  host.addEventListener('dblclick',()=>{group.rotation.set(0,0,0);fit();});
  function render(){requestAnimationFrame(render);if(document.hidden||host.closest('[hidden]')||(host.closest('dialog')&&!host.closest('dialog').open))return;distance+=(desiredDistance-distance)*.08;camera.position.copy(direction).multiplyScalar(distance);camera.lookAt(0,0,0);renderer.render(scene,camera);}
  render();
 }catch{host.textContent='3D preview unavailable on this device.';}
}
