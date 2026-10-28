import {smoothBlend} from './flight-sequence.mjs';
export function unloadingState(seconds){
  const cases=Array.from({length:8},(_,i)=>{
    const start=103+i*1.5,u=(seconds-start)/4;
    return {u,visible:u>=0&&u<=1,loaded:seconds>=start+5.5};
  });
  return {visible:seconds>=96,equipment:smoothBlend((seconds-97)/5),hatch:smoothBlend((seconds-100)/3),cases,loaded:cases.filter(b=>b.loaded).length};
}
