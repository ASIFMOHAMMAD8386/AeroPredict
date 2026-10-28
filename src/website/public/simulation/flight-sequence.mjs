// Compressed teaching sequence. Distances are illustrative, not flight procedures.
export const FLIGHT_SECONDS = 120;
export const stages = [
  {id:'taxi', title:'Airport & taxi', start:0, end:18},
  {id:'runway', title:'Runway acceleration', start:18, end:30},
  {id:'takeoff', title:'Takeoff & climb', start:30, end:40},
  {id:'cruise', title:'Globe route', start:40, end:70},
  {id:'approach', title:'Approach', start:70, end:82},
  {id:'landing', title:'Landing & rollout', start:82, end:92},
  {id:'gate', title:'Taxi to arrival gate', start:92, end:100},
  {id:'unload', title:'Crew unloading baggage', start:100, end:120},
].map(s=>({...s,start:s.start/FLIGHT_SECONDS,end:s.end/FLIGHT_SECONDS}));
const clamp = n => Math.max(0,Math.min(1,n));
export function flightPhase(progress) {
  const t=clamp(progress), stage=stages.find(s=>t<s.end)||stages.at(-1);
  const u=clamp((t-stage.start)/(stage.end-stage.start));
  return {...stage,u,elapsedSeconds:t*FLIGHT_SECONDS,routeProgress:clamp((t*FLIGHT_SECONDS-40)/30),airport:stage.id!=='cruise',arrival:t*FLIGHT_SECONDS>=70,complete:t>=1};
}
export const smoothBlend = value => {const u=clamp(value);return u*u*(3-2*u);};
// Both renderers stay active during these four-second dissolves. The airport
// continues climbing/approaching underneath the globe instead of disappearing.
export function filmFrame(progress) {
  const phase=flightPhase(progress);
  const seconds=progress*FLIGHT_SECONDS,departure=seconds<55;
  const airportOpacity=departure?1-smoothBlend((seconds-38.5)/4):smoothBlend((seconds-67.5)/4);
  const airportPhase=phase.airport?phase:departure?
    {...phase,id:'takeoff',u:1,arrival:false,coastSeconds:seconds-40}:
    {...phase,id:'approach',u:0,arrival:true,leadSeconds:70-seconds};
  return {airportOpacity,airportPhase,blending:airportOpacity>0&&airportOpacity<1};
}
export const departureTaxi = [[310,4.1,-270],[240,4.1,-270],[160,4.1,-330],[160,4.1,-790],[130,4.1,-900],[40,4.1,-900],[0,4.1,-850],[0,4.1,-820]];
export const arrivalTaxi = [[0,4.1,550],[0,4.1,650],[110,4.1,650],[160,4.1,500],[160,4.1,-50],[250,4.1,-55],[310,4.1,-55]];
export const TAKEOFF_SHOT={start:23.5/FLIGHT_SECONDS,end:37/FLIGHT_SECONDS};
export function takeoffPitch(phase,u=phase.u){
  if(phase.id==='runway')return Math.PI/15*smoothBlend((u-.82)/.18);
  if(phase.id==='takeoff')return Math.max(Math.atan(.3*u),Math.PI/15*(1-smoothBlend((u-.35)/.5)));
  return 0;
}
const rotationHeight=angle=>4.1*Math.cos(angle)+Math.sin(angle)-4.1;
// Linear polylines keep tires on the authored taxiway. Smooth heading is handled separately.
export function taxiPoint(points,u) {
  if(u<=0)return [...points[0]];
  if(u>=1)return [...points.at(-1)];
  const lengths=points.slice(1).map((p,i)=>Math.hypot(...p.map((v,j)=>v-points[i][j])));
  let d=clamp(u)*lengths.reduce((a,b)=>a+b,0);
  for(let i=0;i<lengths.length;i++){
    if(d<=lengths[i]||i===lengths.length-1){const f=lengths[i]?d/lengths[i]:0;return points[i].map((v,j)=>v+(points[i+1][j]-v)*f);}
    d-=lengths[i];
  }
}
export function airportPosition(phase,u=phase.u) {
  u=clamp(u);
  switch(phase.id){
    case 'taxi': return taxiPoint(departureTaxi,u);
    case 'runway': return [0,4.1+rotationHeight(takeoffPitch(phase,u)),-820+1490*u*u];
    case 'takeoff': return [0,4.1+210*u*u+rotationHeight(takeoffPitch(phase,u))*(1-smoothBlend(u/.16))+42*(phase.coastSeconds||0),670+1400*u+140*(phase.coastSeconds||0)];
    case 'approach': return [0,4.1+210*(1-u)+17.5*(phase.leadSeconds||0),-2600+1950*u-162.5*(phase.leadSeconds||0)];
    case 'landing': return [0,4.1,-650+1200*(1-(1-u)**2)];
    case 'gate': return taxiPoint(arrivalTaxi,u);
    case 'unload': return [310,4.1,-55];
    default: return [0,214.1,2070];
  }
}
