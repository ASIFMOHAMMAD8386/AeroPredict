export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export function spherePoint(lon, lat, radius = 1) {
  const a = lat * Math.PI / 180, b = lon * Math.PI / 180;
  return [radius * Math.cos(a) * Math.sin(b), radius * Math.sin(a), radius * Math.cos(a) * Math.cos(b)];
}
export function routePoint(a, b, fraction, raised = true) {
  const t = clamp(fraction, 0, 1);
  const u = spherePoint(a.lon, a.lat), v = spherePoint(b.lon, b.lat);
  const angle = Math.acos(clamp(u.reduce((sum, x, i) => sum + x * v[i], 0), -1, 1));
  const s = Math.sin(angle);
  const p = angle < 1e-8 ? u : u.map((x, i) => (Math.sin((1-t)*angle)*x + Math.sin(t*angle)*v[i])/s);
  const radius = 1.003 + (raised ? Math.sin(t * Math.PI) * 0.014 : 0);
  return p.map(x => x * radius);
}
export function routeDistance(a, b, aspect = 1, fov = 40) {
  const u = spherePoint(a.lon, a.lat), v = spherePoint(b.lon, b.lat);
  const span = Math.sqrt(u.reduce((s, x, i) => s + (x-v[i])**2, 0));
  const halfY = fov * Math.PI / 360;
  const halfX = Math.atan(Math.tan(halfY) * Math.max(0.15, aspect));
  return clamp((span * 0.72 + 0.025) / Math.tan(Math.min(halfY, halfX)), 0.26, 2.6);
}
export function zoomDistance(distance, delta, lo, hi) {
  return clamp(distance * Math.exp(clamp(delta, -300, 300) * 0.0018), lo, hi);
}
