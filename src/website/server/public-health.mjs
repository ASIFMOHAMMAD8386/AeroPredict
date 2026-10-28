import {get} from 'node:https';
import {Resolver} from 'node:dns/promises';

function dnsFailure(error){
  return ['ENOTFOUND','EAI_AGAIN'].includes(error?.code)||
    (error?.cause&&dnsFailure(error.cause))||error?.errors?.some(dnsFailure);
}
// DNS retry preserves the URL, TLS hostname and certificate checks.
export function probeWithDns(url,timeout=4000){
  return new Promise(resolve=>{
    const resolver=new Resolver({timeout:Math.min(timeout,2000),tries:1});
    let settled=false;
    const finish=value=>{if(!settled){settled=true;resolve(value);}};
    const request=get(url,{
      signal:AbortSignal.timeout(timeout),
      lookup(host,options,callback){
        resolver.resolve4(host).then(addresses=>{
          if(!addresses.length)throw Error('No public IPv4 address');
          if(options?.all)callback(null,addresses.map(address=>({address,family:4})));
          else callback(null,addresses[0],4);
        }).catch(error=>callback(error));
      },
    },response=>{
      if(response.statusCode!==200){response.resume();return finish(false);}
      let text='';response.setEncoding('utf8');
      response.on('data',chunk=>{text+=chunk;if(text.length>32768){finish(false);request.destroy();}});
      response.on('end',()=>{try{finish(JSON.parse(text).project==='aeropredict-local');}catch{finish(false);}});
      response.on('error',()=>finish(false));
    });
    request.on('error',()=>finish(false));
  });
}
export async function checkHealth(base,{fetcher=fetch,dnsProbe=probeWithDns,timeout=4000}={}){
  const url=new URL('/api/health',base);
  try{
    const response=await fetcher(url,{signal:AbortSignal.timeout(timeout)});
    return {ok:response.ok&&(await response.json()).project==='aeropredict-local',via:'system'};
  }catch(error){
    const publicHost=url.protocol==='https:'&&/^[a-z0-9-]+\.trycloudflare\.com$/.test(url.host)&&!url.username&&!url.password;
    if(publicHost&&dnsFailure(error))return {ok:await dnsProbe(url,timeout),via:'dns-retry'};
    return {ok:false,via:'system'};
  }
}
