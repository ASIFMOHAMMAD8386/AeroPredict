export async function startPresentation({run,prepare,open,onPublicFailure}){
  const local=await run('launch.mjs',['--no-open']);
  if(local!==0)return {local:false,public:false};
  prepare();
  // Opening the local site must not depend on public DNS or the tunnel.
  await open();
  const publicCode=await run('public-share.mjs',['--no-open']);
  if(publicCode!==0)onPublicFailure();
  return {local:true,public:publicCode===0};
}
