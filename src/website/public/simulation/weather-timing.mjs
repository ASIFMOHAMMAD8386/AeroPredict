// Slow, separated storm strikes; pause and scrub reproduce the same weather.
export function lightningState(seconds,storm,reducedMotion=false){
  if(!storm||seconds<4)return {visible:false,flash:0,index:0};
  const elapsed=(seconds-4)%7.5,index=Math.floor((seconds-4)/7.5);
  const visible=elapsed<(reducedMotion?1.6:.85);
  const pulse=Math.max(0,1-Math.abs(elapsed-.16)/.16);
  return {visible,flash:reducedMotion?0:pulse*.7,index};
}
