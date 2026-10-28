import assert from 'node:assert/strict';
import { spherePoint, routePoint, routeDistance, zoomDistance } from '../public/simulation/route-math.mjs';
const a={lat:17.24,lon:78.43},b={lat:13.20,lon:77.71};
const norm=p=>Math.hypot(...p);
for(const t of [0,.1,.5,.9,1]) assert.ok(Number.isFinite(norm(routePoint(a,b,t))));
assert.ok(Math.abs(norm(routePoint(a,b,.5))-1.017)<1e-10);
for(const [t,ap] of [[0,a],[1,b]]) {
 const expected=spherePoint(ap.lon,ap.lat,1.003),actual=routePoint(a,b,t);
 assert.ok(actual.every((x,i)=>Math.abs(x-expected[i])<1e-10),'Geodesic endpoints must match airports');
}
assert.ok(routeDistance(a,b,.5)>routeDistance(a,b,2),'Narrow views must fit the route');
assert.ok(zoomDistance(.5,-100,.1,3)<.5);
assert.ok(zoomDistance(.5,100,.1,3)>.5);
assert.equal(zoomDistance(.1,-1000,.1,3),.1);
assert.equal(zoomDistance(3,1000,.1,3),3);
assert.ok(Number.isFinite(norm(routePoint(a,a,.5))),'Identical endpoints stay finite');
console.log('PASS: route geometry, endpoint alignment, aspect-aware framing and zoom bounds.');
