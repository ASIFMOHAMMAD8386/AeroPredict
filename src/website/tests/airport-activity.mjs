import assert from 'node:assert/strict';
import {trafficState,trafficHeading,crewStations} from '../public/simulation/airport-traffic.mjs';
const gap=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
for(let t=0;t<60;t+=.025){
 const arrival=trafficState(t,'arrival'),departure=trafficState(t,'departure');
 for(const [role,state] of [['arrival',arrival],['departure',departure]]){
  assert.ok(state.position.every(Number.isFinite));assert.ok(state.position[1]>=4.1-1e-8,'Wheels may not sink into the runway');
  assert.ok(state.position[0]<=-119.99,'Background planes stay on the separate western airfield');
  assert.ok(Math.abs(Math.hypot(...trafficHeading(t,role))-1)<1e-8,'Heading remains a valid direction');
 }
 if(arrival.position[1]<8&&departure.position[1]<8)assert.ok(gap(arrival.position,departure.position)>80,'Traffic needs separation while on the ground');
 const onRunway=s=>Math.abs(s.position[0]+240)<24&&s.position[1]<8&&Math.abs(s.position[2])<1400;
 assert.ok(!(onRunway(arrival)&&onRunway(departure)),'Arrival must clear the secondary runway before departure enters');
}
for(const [role,boundaries] of [['arrival',[7,14,18,27]],['departure',[15,20,23,31,37]]]){
 for(const t of boundaries)assert.ok(gap(trafficState(t-1e-6,role).position,trafficState(t+1e-6,role).position)<.01,'Traffic stages must join without teleporting');
}
assert.equal(crewStations.length,18);
assert.ok(crewStations.some(s=>s[2]==='marshal')&&crewStations.some(s=>s[2]==='carry'));
assert.deepEqual(trafficState(4,'arrival'),trafficState(64,'arrival'),'Scrubbing uses a deterministic activity clock');
console.log('PASS: traffic continuity, ground height, main-runway isolation, runway occupancy, aircraft separation and deterministic activity.');
