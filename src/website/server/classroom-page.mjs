import {mkdirSync,writeFileSync} from 'node:fs';
export function writeShareStatus(root,status,message){
  const dir=new URL('public/classroom/',root);mkdirSync(dir,{recursive:true});
  writeFileSync(new URL('status.json',dir),JSON.stringify({status,message}));
}
export function writeClassroomPage(root){
  const dir=new URL('public/classroom/',root);mkdirSync(dir,{recursive:true});
  const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AeroPredict · Start and share</title>
  <style>*{box-sizing:border-box}body{margin:0;background:#08121d;color:#eef5fa;font:18px system-ui,sans-serif;min-height:100vh;display:grid;place-items:center;padding:32px}main{max-width:1000px;width:100%;display:grid;grid-template-columns:1fr 1fr;gap:45px;align-items:center}small{color:#ffc15c;letter-spacing:.14em}h1{font-size:clamp(36px,5vw,64px);line-height:1.06;margin:20px 0}p{color:#b8cbd9;line-height:1.6}#qr{background:white;padding:10px;border-radius:18px}svg{display:block;width:100%;height:auto}a{color:#ffd589;overflow-wrap:anywhere}.button{display:inline-block;background:#ffc15c;color:#08121d;padding:16px 23px;border-radius:10px;font-weight:700;text-decoration:none;margin:10px 0}#status{font-size:15px}.note{font-size:14px}#waiting{border:1px solid #284254;border-radius:18px;padding:45px 28px;text-align:center;background:#10212e} @media(max-width:650px){main{grid-template-columns:1fr}#qr{max-width:360px;margin:auto}h1{font-size:38px}}</style>
  <main><section><small>AEROPREDICT · CLASSROOM DEMO</small><h1>Your website<br>is ready.</h1><p>The simulator runs on this computer.<br>Open it now while your class link connects.</p><a class="button" href="/simulation/">Open the flight simulator →</a><p><a href="/live/">Open live flights</a></p><p id="status" role="status" aria-live="polite">Connecting your public class link…</p><p><a id="public-link" hidden></a></p><p class="note">Keep this laptop awake and online for your class. The QR appears automatically when sharing is verified. Run START_HERE.cmd each session; the temporary link can change.</p></section><section><div id="waiting"><h2>Class QR is connecting</h2><p>You can use your local website now.</p></div><div id="qr" hidden></div><p style="text-align:center">Scan with mobile data or any Wi-Fi once the QR appears.</p></section></main>
  <script src="/simulation/vendor/qrcode.js"></script><script>
  let lastBase='',polling=false;
  function validBase(value){try{const u=new URL(value);return u.protocol==='https:'&&/^[a-z0-9-]+\\.trycloudflare\\.com$/.test(u.host)&&!u.username&&!u.password?u.origin:null}catch{return null}}
  async function refreshSharing(){
    if(polling)return;polling=true;
    const box=document.getElementById('qr'),link=document.getElementById('public-link'),status=document.getElementById('status'),waiting=document.getElementById('waiting');
    try{
      const r=await fetch('/api/share',{cache:'no-store',signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error('Unavailable');
      const state=await r.json(),base=validBase(state.public_base);
      if(base){
        const url=base+'/simulation/';if(base!==lastBase){const qr=qrcode(0,'M');qr.addData(url);qr.make();box.innerHTML=qr.createSvgTag({cellSize:8,margin:32,scalable:true});lastBase=base;}
        box.hidden=false;waiting.hidden=true;link.hidden=false;link.href=url;link.textContent=url;
        status.textContent='Public sharing is active. Show this QR to your class.';
      }else{
        box.hidden=true;waiting.hidden=false;link.hidden=true;lastBase='';
        const detail=await fetch('./status.json',{cache:'no-store',signal:AbortSignal.timeout(5000)}).then(r=>r.json()).catch(()=>({}));
        status.textContent=detail.status==='ready'?'Public sharing has stopped. Run START_HERE.cmd again.':detail.message||'Connecting your public class link. Your local simulator is ready.';
        waiting.querySelector('h2').textContent=detail.status==='unavailable'?'Public QR is not ready':'Class QR is connecting';
      }
    }catch{box.hidden=true;waiting.hidden=false;link.hidden=true;lastBase='';status.textContent='Connection unavailable. Run START_HERE.cmd to start the website.';}
    finally{polling=false;}
  }
  refreshSharing();setInterval(refreshSharing,2500);
  </script></html>`;
  writeFileSync(new URL('index.html',dir),html);return html;
}
