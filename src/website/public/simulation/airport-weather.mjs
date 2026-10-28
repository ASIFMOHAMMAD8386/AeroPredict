import * as T from 'three';
import {weatherProfile} from './weather-profile.mjs';
import {createWeatherEffects} from './weather-effects.mjs';

// Visual scenario weather follows the film clock, including pause and scrubbing.
export function createAirportWeather(scene,camera,sun,ambient,container){
  const effects=createWeatherEffects(scene,camera,container);
  const skyMaterial=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,
    uniforms:{zenith:{value:new T.Color()},horizon:{value:new T.Color()},cloud:{value:new T.Color()},cover:{value:.2},clock:{value:0}},
    vertexShader:'varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec3 direction; uniform vec3 zenith,horizon,cloud; uniform float cover,clock;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
      void main(){vec3 d=normalize(direction);float h=max(d.y,0.);vec2 uv=d.xz/max(.16,d.y)*1.7+vec2(clock*.006,0.);
      float n=.57*noise(uv)+.28*noise(uv*2.1)+.15*noise(uv*4.3);
      float clouds=smoothstep(1.-cover-.12,1.-cover+.16,n)*smoothstep(0.,.15,h);
      vec3 color=mix(horizon,zenith,pow(h,.55));color=mix(color,cloud,clouds*.88);gl_FragColor=vec4(color,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`});
  const sky=new T.Mesh(new T.SphereGeometry(9000,32,16),skyMaterial);sky.frustumCulled=false;scene.add(sky);
  const count=1500,positions=new Float32Array(count*6),seeds=[];
  for(let i=0;i<count;i++)seeds.push([((i*73.137)%1)*160-80,((i*31.619)%1)*90,((i*17.433)%1)*160-80]);
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));
  const rain=new T.LineSegments(geometry,new T.LineBasicMaterial({color:0xcfe8f6,transparent:true,opacity:.48,depthWrite:false}));rain.frustumCulled=false;scene.add(rain);
  const wetMaterials=[];let current='',profile=weatherProfile('Clear');
  return {
    setEnvironment(environment){environment.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){
      if(m&&/Runway asphalt|Apron concrete/i.test(m.name)&&!wetMaterials.some(x=>x.m===m))wetMaterials.push({m,color:m.color.clone(),roughness:m.roughness,metalness:m.metalness});
    }});current='';},
    update(name,seconds,focus){
      if(name!==current){
        current=name;profile=weatherProfile(name);sun.intensity=profile.sun;ambient.intensity=profile.ambient;
        // Overcast light is diffuse; avoid a sharp sun shadow map in rain/fog.
        sun.castShadow=name==='Clear';
        scene.background.setHex(profile.sky);scene.fog.color.setHex(profile.horizon);scene.fog.near=profile.fogNear;scene.fog.far=profile.fogFar;
        for(const key of ['zenith','horizon','cloud'])skyMaterial.uniforms[key].value.setHex(profile[key==='zenith'?'sky':key]);
        skyMaterial.uniforms.cover.value=profile.cover;
        for(const {m,color,roughness,metalness} of wetMaterials){m.color.copy(color).multiplyScalar(profile.wet?.67:1);m.roughness=profile.wet?.22:roughness;m.metalness=profile.wet?.18:metalness;}
        container.dataset.visualWeather=name||'Clear';
      }
      sky.position.copy(camera.position);skyMaterial.uniforms.clock.value=seconds;rain.visible=profile.rain>0;
      const strike=effects.update(name,seconds,focus);
      sun.intensity=profile.sun+strike.flash*2;ambient.intensity=profile.ambient+strike.flash*.9;
      skyMaterial.uniforms.horizon.value.setHex(profile.horizon).lerp(new T.Color(0xb4caff),strike.flash*.45);
      if(rain.visible){
        rain.position.copy(camera.position);geometry.setDrawRange(0,profile.rain*2);
        for(let i=0;i<profile.rain;i++){
          const [x,y,z]=seeds[i],height=((y-seconds*26)%90+90)%90-35,k=i*6,length=name==='Thunderstorm'?1.8:1.1;
          positions.set([x,height,z,x+profile.wind*.05,height-length,z+.12],k);
        }
        geometry.attributes.position.needsUpdate=true;
      }
      return profile.label+(strike.visible?' · Lightning':'');
    }
  };
}
