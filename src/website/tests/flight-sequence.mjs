import assert from 'node:assert/strict';
import {flightPhase,filmFrame,airportPosition,stages,FLIGHT_SECONDS,takeoffPitch,TAKEOFF_SHOT} from '../public/simulation/flight-sequence.mjs';
const gap=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
// Ground sequences must join at exactly the same aircraft position.
for(const [left,right] of [['taxi','runway'],['runway','takeoff'],['approach','landing'],['landing','gate'],['gate','unload']]){
  assert.ok(gap(airportPosition({id:left,u:1}),airportPosition({id:right,u:0}))<1e-7,`${left} → ${right} must not teleport`);
}
for(let n=0;n<=1000;n++){
  const phase=flightPhase(n/1000),p=airportPosition(phase);
  assert.ok(p.every(Number.isFinite),'Scrubbing anywhere must produce a finite pose');
  assert.ok(p[1]>=4.1-1e-8,'Aircraft wheels must not go below the ground');
  assert.ok(phase.routeProgress>=0&&phase.routeProgress<=1);
}
assert.deepEqual(airportPosition(flightPhase(0)),[310,4.1,-270]);
assert.deepEqual(airportPosition(flightPhase(1)),[310,4.1,-55]);
assert.equal(flightPhase(1).complete,true);
assert.equal(flightPhase(.55).airport,false);
assert.equal(flightPhase(.1).routeProgress,0);
assert.equal(flightPhase(.9).routeProgress,1);
assert.ok(stages.every((s,i)=>!i||s.start===stages[i-1].end),'Timeline stages must cover the journey without gaps');
assert.ok(FLIGHT_SECONDS>=60,'Classroom sequence must allow time to see each stage');
for(const seconds of [38.5,40,42.5,67.5,70,71.5]){
  const boundary=seconds/FLIGHT_SECONDS;
  const before=filmFrame(boundary-1e-7),after=filmFrame(boundary+1e-7);
  assert.ok(Math.abs(before.airportOpacity-after.airportOpacity)<.0001,'Scene blend must not cut at a boundary');
  if(seconds===40||seconds===70)assert.ok(gap(airportPosition(before.airportPhase),airportPosition(after.airportPhase))<.01,'The aircraft must keep flying throughout a dissolve');
}
assert.equal(filmFrame(38/FLIGHT_SECONDS).airportOpacity,1);
assert.equal(filmFrame(50/FLIGHT_SECONDS).airportOpacity,0);
assert.equal(filmFrame(72/FLIGHT_SECONDS).airportOpacity,1);
assert.ok(filmFrame(40.5/FLIGHT_SECONDS).blending&&filmFrame(69.5/FLIGHT_SECONDS).blending);
assert.ok((TAKEOFF_SHOT.end-TAKEOFF_SHOT.start)*FLIGHT_SECONDS>=13);
assert.ok(TAKEOFF_SHOT.end<38.5/FLIGHT_SECONDS,'Takeoff clip must stop airborne before the globe transition');
assert.equal(takeoffPitch({id:'runway',u:0}),0);
assert.ok(takeoffPitch({id:'runway',u:1})>.20,'The nose rotates before leaving the runway');
assert.ok(Math.abs(takeoffPitch({id:'runway',u:1})-takeoffPitch({id:'takeoff',u:0}))<1e-8,'Nose rotation stays continuous at liftoff');
assert.ok(airportPosition(flightPhase(TAKEOFF_SHOT.end))[1]>100,'Clip ends with a visible climb');
console.log('PASS: continuous ground transitions, safe height, complete timeline, final arrival and smooth moving scene blends.');
