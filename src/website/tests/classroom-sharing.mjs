import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {writeClassroomPage,writeShareStatus} from '../server/classroom-page.mjs';
import {startPresentation} from '../server/startup-flow.mjs';
import {checkHealth} from '../server/public-health.mjs';
import {tunnelRejected} from '../server/tunnel-state.mjs';
import {openBrowser} from '../server/open-browser.mjs';
import {EventEmitter} from 'node:events';
const folder=mkdtempSync(join(tmpdir(),'aeropredict-share-')),root=pathToFileURL(folder+'/');
try{
  const html=writeClassroomPage(root);
  assert.ok(html.includes('href="/simulation/"'),'Local site must open without a public link');
  assert.ok(html.includes("fetch('/api/share'"),'QR must be gated by active sharing state');
  assert.ok(html.includes('id="qr" hidden'),'An old QR must not display before status verification');
  assert.ok(readFileSync(new URL('public/classroom/index.html',root),'utf8')===html);
  writeShareStatus(root,'connecting','Preparing the class QR');
  assert.equal(JSON.parse(readFileSync(new URL('public/classroom/status.json',root))).status,'connecting');
  const nodes=Object.fromEntries(['qr','waiting','public-link','status'].map(id=>[id,{hidden:id!=='waiting',textContent:'',querySelector(){return this;}}]));
  let publicBase=null,encoded;
  const context={URL,AbortSignal,document:{getElementById:id=>nodes[id]},
    fetch:async url=>({ok:true,json:async()=>url==='/api/share'?{public_base:publicBase}:{status:'connecting',message:'Preparing class QR'}}),
    qrcode:()=>({addData:url=>encoded=url,make(){},createSvgTag:()=>'<svg></svg>'})};
  const inline=html.match(/<script>([\s\S]*?)<\/script>/)[1].replace('refreshSharing();setInterval(refreshSharing,2500);','');
  runInNewContext(inline,context);
  await context.refreshSharing();assert.equal(nodes.qr.hidden,true);
  publicBase='https://test-classroom.trycloudflare.com';await context.refreshSharing();
  assert.equal(nodes.qr.hidden,false);assert.equal(encoded,publicBase+'/simulation/');
  publicBase=null;await context.refreshSharing();assert.equal(nodes.qr.hidden,true,'Stopped sharing hides the QR without reloading');
  for(const invalid of ['http://test-classroom.trycloudflare.com','https://example.com','https://x.trycloudflare.com.evil.example','https://user:pass@x.trycloudflare.com']){
    publicBase=invalid;await context.refreshSharing();assert.equal(nodes.qr.hidden,true);
  }
  const events=[];let release;
  const result=startPresentation({run:async file=>{events.push(file);return file==='launch.mjs'?0:await new Promise(r=>release=r);},prepare:()=>events.push('prepare'),open:()=>events.push('open'),onPublicFailure:()=>events.push('public-failed')});
  await new Promise(r=>setImmediate(r));
  assert.deepEqual(events,['launch.mjs','prepare','open','public-share.mjs'],'The browser opens before public sharing finishes');
  release(1);assert.deepEqual(await result,{local:true,public:false});assert.equal(events.at(-1),'public-failed');
  let opened=false;
  assert.deepEqual(await startPresentation({run:async()=>1,prepare(){},open(){opened=true;},onPublicFailure(){}}),{local:false,public:false});
  assert.equal(opened,false,'Do not claim local readiness after a local startup failure');
  let probes=0;const dnsProbe=async url=>{probes++;assert.equal(url.pathname,'/api/health');return true;};
  const dnsError=()=>{throw Object.assign(Error('DNS lookup failed'),{cause:{code:'ENOTFOUND'}});};
  assert.equal((await checkHealth('https://test.trycloudflare.com',{fetcher:dnsError,dnsProbe})).ok,true);
  assert.equal(probes,1);
  assert.equal((await checkHealth('https://example.com',{fetcher:dnsError,dnsProbe})).ok,false);assert.equal(probes,1);
  assert.equal((await checkHealth('https://test.trycloudflare.com',{fetcher:async()=>Response.json({project:'other'}),dnsProbe})).ok,false);
  assert.equal(tunnelRejected('Registered tunnel connection\nUnauthorized: Tunnel not found'),true);
  assert.equal(tunnelRejected('Unauthorized: Tunnel not found\nRegistered tunnel connection'),false);
  assert.equal(tunnelRejected('Registered tunnel connection'),false);
  let browserLaunch;
  const chosen=await openBrowser('http://localhost:4180/classroom/',{
    env:{ProgramFiles:'C:/Program Files'},exists:path=>path.endsWith('brave.exe'),
    launch:(path,args,options)=>{browserLaunch={path,args,options};const child=new EventEmitter();child.unref=()=>{};queueMicrotask(()=>child.emit('spawn'));return child;},
  });
  assert.equal(chosen,'Brave');assert.equal(browserLaunch.options.windowsHide,false,'Browser window must be visible');
  assert.deepEqual(browserLaunch.args,['--new-window','http://localhost:4180/classroom/']);
  assert.ok(!browserLaunch.path.includes('explorer.exe'),'Launch the real browser directly');
  console.log('PASS: local browser opens before public sharing; failed sharing preserves local readiness; QR updates and DNS retries safely. No real provider calls.');
}finally{rmSync(folder,{recursive:true,force:true});}
