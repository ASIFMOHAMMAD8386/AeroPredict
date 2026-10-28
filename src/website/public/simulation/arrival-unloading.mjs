import * as T from 'three';
import {unloadingState} from './unloading-state.mjs';
export function createArrivalUnloading(scene,library,container,hero){
  const group=new T.Group();group.name='Arrival unloading';scene.add(group);
  const find=(o,prefix)=>{let result;o.traverse(n=>{if(!result&&n.name.startsWith(prefix))result=n;});return result;};
  function make(name,parent=group){
    const source=library.getObjectByName(name);if(!source)throw Error(`Missing arrival asset: ${name}`);
    const o=source.clone(true);o.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});parent.add(o);return o;
  }
  const hatch=make('CargoDoorPrototype',hero),hinge=find(hatch,'CargoHinge');
  const belt=make('BeltLoaderPrototype');belt.rotation.y=Math.PI;
  const train=new T.Group();group.add(train);train.rotation.y=-Math.PI/2;
  make('TractorPrototype',train);
  const trolleys=Array.from({length:3},(_,i)=>{const o=make('EmptyCartPrototype',train);o.position.z=-(i+1)*4.4;return o;});
  const beltBags=Array.from({length:8},()=>make('SuitcasePrototype',belt));
  const loadedBags=Array.from({length:8},(_,i)=>{
    const o=make('SuitcasePrototype',trolleys[i%3]),slot=Math.floor(i/3);
    o.position.set(slot===0?-.42:slot===1?.42:0,.74,slot===2?.6:-.55);return o;
  });
  const crew=[[322.2,-45],[320,-44.7],[334,-38],[302,-28]].map(([x,z],i)=>{
    const o=make('CrewPrototype');o.position.set(x,.12,z);o.rotation.y=Math.PI;
    const limbs=['CrewArmL','CrewArmR','CrewLegL','CrewLegR'].map(n=>find(o,n));
    o.traverse(n=>{if(n.name.startsWith('CrewWand'))n.visible=i===3;});
    return {o,x,z,limbs};
  });
  const carried=make('SuitcasePrototype',crew[1].o);carried.position.set(0,.96,.36);carried.scale.setScalar(.75);
  function update(seconds){
    const state=unloadingState(seconds);group.visible=state.visible;hatch.visible=seconds>=100;
    if(hinge)hinge.rotation.z=-1.45*state.hatch;
    belt.position.set(360+(321-360)*state.equipment,.12,-49);
    train.position.set(360-30*state.equipment,.12,-25-14*state.equipment);
    for(let i=0;i<8;i++){
      const item=state.cases[i],z=4-8*Math.max(0,Math.min(1,item.u));
      beltBags[i].visible=item.visible;beltBags[i].position.set(0,.63+(z+4.5)/9*1.55,z);
      loadedBags[i].visible=item.loaded;
    }
    for(let i=0;i<crew.length;i++){
      const actor=crew[i],[left,right,legL,legR]=actor.limbs,w=seconds*4.4+i;
      if(i===1){
        const elapsed=Math.max(0,Math.min(12,seconds-107)),u=(elapsed%6)/6,outbound=u<.5,f=outbound?u*2:2-u*2;
        actor.o.position.set(320+13.5*f,.12,-44.7+5.7*f);actor.o.rotation.y=Math.atan2(13.5,5.7)+(outbound?0:Math.PI);
        const walking=seconds>=107&&seconds<119;carried.visible=walking&&outbound;
        left.rotation.x=right.rotation.x=carried.visible?-.8:Math.sin(w)*.4;
        legL.rotation.x=walking?Math.sin(w)*.3:0;legR.rotation.x=-legL.rotation.x;
      }else if(i===3&&seconds<105){
        left.rotation.z=-1.8-.3*Math.sin(w*.5);right.rotation.z=1.8+.3*Math.sin(w*.5);
      }else{
        left.rotation.z=right.rotation.z=0;left.rotation.x=-.6+.2*Math.sin(w);right.rotation.x=-.7-.2*Math.sin(w);
      }
    }
    container.dataset.arrivalCrew=state.visible?'4':'0';container.dataset.unloadedBags=String(state.loaded);
  }
  return {update};
}
