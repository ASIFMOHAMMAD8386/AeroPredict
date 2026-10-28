// Background activity is synthetic and uses the same paused/scrubbed flight clock.
import {taxiPoint,smoothBlend} from './flight-sequence.mjs';
const mod=(n,d)=>((n%d)+d)%d;
export function trafficState(seconds,role){
  const t=mod(seconds,60);let position,label,visible=true,gear=true;
  if(role==='arrival'){
    if(t<7){const u=t/7;position=[-240,4.1+115*(1-u),-2220+1520*u];label='Final approach';}
    else if(t<14){const u=(t-7)/7;position=[-240,4.1,-700+1300*(1-(1-u)**2)];label='Landing & rollout';}
    else if(t<18){position=taxiPoint([[-240,4.1,600],[-240,4.1,650],[-120,4.1,650]],(t-14)/4);label='Vacating runway';}
    else if(t<27){position=[-120,4.1,650-350*smoothBlend((t-18)/9)];label='Taxi to holding stand';}
    else{position=[-120,4.1,300];label='Waiting at taxi stand';}
  }else{
    if(t<15){position=[-120,4.1,-700];label='Holding for arrival';}
    else if(t<20){position=[-120,4.1,-700-380*smoothBlend((t-15)/5)];label='Taxi to runway';}
    else if(t<23){position=taxiPoint([[-120,4.1,-1080],[-240,4.1,-1080],[-240,4.1,-1020]],(t-20)/3);label='Lining up';}
    else if(t<31){const u=(t-23)/8;position=[-240,4.1,-1020+1670*u*u];label='Takeoff roll';}
    else if(t<37){const u=(t-31)/6;position=[-240,4.1+250*u*u,650+2150*u];gear=u<.5;label='Climbing away';}
    else{const u=(t-37)/13;position=[-240,254.1+700*u,2800+3200*u];visible=t<49;gear=false;label='Departure';}
  }
  return {position,label,visible,gear,cycle:t};
}
export function trafficHeading(seconds,role){
  const a=trafficState(seconds-.015,role),b=trafficState(seconds+.015,role);
  const d=b.position.map((v,i)=>v-a.position[i]);
  if(Math.hypot(...d)<.0001){return (role==='arrival'&&a.cycle>=18)||(role==='departure'&&a.cycle<20)?[0,0,-1]:[0,0,1];}
  if(Math.hypot(...d)>100)return [0,0,1];
  const length=Math.hypot(...d);return d.map(v=>v/length);
}
export const crewStations=[
  [333,-207.8,'load'],[335,-207.8,'load'],[324,-202,'carry'],[339,-211,'load'],
  [320,-199,'walk'],[331,-199,'load'],[344,-211,'carry'],[317,-210,'load'],
  [322,-245,'marshal'],[331,-246,'marshal'],[350,15,'walk'],[349,24,'load'],
  [335,113,'load'],[342,115,'load'],[328,225,'carry'],[337,228,'load'],[351,-324,'load'],[342,-320,'walk'],
];
const crewEnds={2:[331.4,-206.5],4:[317,-209],6:[340,-206],10:[352,30],14:[334,229],17:[350,-316]};
export function crewMovement(seconds,index){
  const [x,z,role]=crewStations[index],end=crewEnds[index];
  if(!end)return {x,z,yaw:role==='marshal'?Math.PI/2:Math.PI,carrying:false};
  const u=mod(seconds*.10+index*.17,1),outbound=u<.5,f=outbound?u*2:2-u*2;
  return {x:x+(end[0]-x)*f,z:z+(end[1]-z)*f,yaw:Math.atan2(end[0]-x,end[1]-z)+(outbound?0:Math.PI),carrying:role==='carry'&&outbound};
}
