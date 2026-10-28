// Visual scenario settings. These are not measured airport weather observations.
export const weatherProfiles={
  Clear:{label:'Clear skies',sky:0xa9cfdf,horizon:0xd0e3e8,cloud:0xf2f5f4,cover:.18,sun:3.1,ambient:2.1,fogNear:3000,fogFar:7500,rain:0,wind:1,wet:false},
  Rain:{label:'Rain · wet runway',sky:0x637c8e,horizon:0xa3b5bf,cloud:0x7d909e,cover:.80,sun:1.1,ambient:1.6,fogNear:900,fogFar:3500,rain:850,wind:4,wet:true},
  Thunderstorm:{label:'Thunderstorm · heavy rain',sky:0x27394e,horizon:0x6a7a89,cloud:0x35475a,cover:.96,sun:.5,ambient:1.25,fogNear:500,fogFar:2200,rain:1500,wind:8,wet:true},
  Fog:{label:'Fog · reduced visibility',sky:0xb5c1c5,horizon:0xc4cecf,cloud:0xc4cecf,cover:.92,sun:.45,ambient:1.7,fogNear:65,fogFar:420,rain:0,wind:1,wet:false},
};
export const weatherProfile=value=>weatherProfiles[value]||weatherProfiles.Clear;
