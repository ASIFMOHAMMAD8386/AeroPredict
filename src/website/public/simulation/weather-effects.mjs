import * as T from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {lightningState} from './weather-timing.mjs';
export function createWeatherEffects(scene,camera,container){
  const cloudTexture=new T.TextureLoader().load('./assets/blender-cloud-volume.png');cloudTexture.colorSpace=T.SRGBColorSpace;
  // A smooth density mask keeps low mist free of minified volume-render grain.
  const pixels=new Uint8Array(128*64*4);
  for(let y=0;y<64;y++)for(let x=0;x<128;x++){
    const u=x/127*2-1,v=y/63*2-1,k=(y*128+x)*4;
    pixels[k]=pixels[k+1]=pixels[k+2]=255;
    pixels[k+3]=Math.round(255*Math.exp(-3.5*(u*u+v*v))*Math.max(0,1-Math.abs(u)**4)*Math.max(0,1-Math.abs(v)**4));
  }
  const mistTexture=new T.DataTexture(pixels,128,64);mistTexture.magFilter=T.LinearFilter;mistTexture.minFilter=T.LinearFilter;mistTexture.needsUpdate=true;
  const clouds=[],mist=[];
  for(let i=0;i<38;i++){
    const material=new T.SpriteMaterial({map:cloudTexture,transparent:true,depthWrite:false,fog:true});
    const sprite=new T.Sprite(material);sprite.renderOrder=1;scene.add(sprite);clouds.push(sprite);
  }
  for(let i=0;i<16;i++){
    const sprite=new T.Sprite(new T.SpriteMaterial({map:mistTexture,transparent:true,depthWrite:false,fog:true}));scene.add(sprite);mist.push(sprite);
  }
  const lightning=new T.Group();scene.add(lightning);let bolts=[];
  new GLTFLoader().loadAsync('./assets/blender-lightning.glb').then(g=>{
    for(let i=0;i<3;i++){
      const bolt=g.scene.getObjectByName(`LightningBolt${i}`);if(!bolt)throw Error('Missing Blender lightning mesh');
      bolt.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.fog=false;o.material.toneMapped=false;}});
      lightning.add(bolt);bolts.push(bolt);
    }
    container.dataset.weatherAssets='ready';
  }).catch(()=>{container.dataset.weatherAssets='error';});
  const puddles=new T.Mesh(new T.PlaneGeometry(200,200),new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{clock:{value:0},storm:{value:0}},
    vertexShader:`#include <common>
    #include <logdepthbuf_pars_vertex>
    varying vec3 world;void main(){vec4 w=modelMatrix*vec4(position,1.);world=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;
    #include <logdepthbuf_vertex>
    }`,
    fragmentShader:`#include <common>
    #include <logdepthbuf_pars_fragment>
    varying vec3 world;uniform float clock,storm;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
    void main(){
    #include <logdepthbuf_fragment>
    bool pavement=abs(world.x)<24.||abs(world.x-160.)<11.||(world.x>200.&&world.x<450.&&abs(world.z)<440.);if(!pavement)discard;
    vec2 cell=floor(world.xz*1.7),uv=fract(world.xz*1.7)-.5;float seed=hash(cell),age=fract(clock*1.3+seed*7.);
    float ring=(1.-smoothstep(.012,.035,abs(length(uv)-age*.48)))*(1.-age);
    float wetArea=smoothstep(.48,.72,noise(world.xz*.065));float alpha=wetArea*.11+ring*.19;
    gl_FragColor=vec4(mix(vec3(.48,.63,.73),vec3(.31,.44,.56),storm),alpha);}` }));
  puddles.rotation.x=-Math.PI/2;puddles.position.y=.19;puddles.renderOrder=2;scene.add(puddles);
  const forward=new T.Vector3(),right=new T.Vector3(),up=new T.Vector3(0,1,0);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  return {update(name,seconds,focus){
    const storm=name==='Thunderstorm',fog=name==='Fog',wet=storm||name==='Rain';
    const cloudCount=fog?0:storm?38:wet?30:10;
    for(let i=0;i<clouds.length;i++){
      const c=clouds[i];c.visible=i<cloudCount;
      if(!c.visible)continue;
      const angle=i*2.39996,d=1300+(i%5)*450,drift=seconds*(storm?5:2);
      c.position.set(Math.cos(angle)*d+drift,storm?320+(i%4)*60:wet?350+(i%4)*65:420+(i%4)*70,Math.sin(angle)*d);
      c.scale.set(storm?1250:wet?1100:900,storm?420:wet?350:300,1);
      c.material.color.setHex(storm?0x607181:wet?0x9caeb9:0xffffff);c.material.opacity=storm?.88:wet?.82:.92;
    }
    for(let i=0;i<mist.length;i++){
      const m=mist[i];m.visible=fog||wet;
      const angle=i*2.39996,d=70+(i%5)*85;
      m.position.set(focus.x+Math.cos(angle)*d+Math.sin(seconds*.045+i)*25,4+(i%3)*4,focus.z+Math.sin(angle)*d);
      m.scale.set(fog?190:105,fog?23:10,1);m.material.color.setHex(fog?0xc7d2d6:0x98adba);m.material.opacity=fog?.16:storm?.085:.045;
    }
    puddles.visible=wet&&camera.position.y<180;
    puddles.position.x=Math.round(focus.x/70)*70;puddles.position.z=Math.round(focus.z/70)*70;
    puddles.material.uniforms.clock.value=seconds;puddles.material.uniforms.storm.value=storm?1:0;
    const strike=lightningState(seconds,storm,reduced.matches);lightning.visible=strike.visible;
    camera.getWorldDirection(forward);forward.y=0;forward.normalize();right.crossVectors(forward,up).normalize();
    lightning.position.copy(camera.position).addScaledVector(forward,700).addScaledVector(right,strike.index%2?170:-170);lightning.position.y=0;
    lightning.scale.setScalar(.72);bolts.forEach((b,i)=>{b.visible=i===strike.index%3;});
    container.dataset.lightning=String(strike.visible);
    return strike;
  }};
}
