import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {writeClassroomPage,writeShareStatus} from './server/classroom-page.mjs';
import {readSettings} from './server/settings.mjs';
import {startPresentation} from './server/startup-flow.mjs';
import {openBrowser} from './server/open-browser.mjs';
const root=new URL('./',import.meta.url),{PORT}=readSettings(root),screen=`http://localhost:${PORT}/classroom/`;
const run=(file,args)=>new Promise(resolve=>{
  const child=spawn(process.execPath,[file,...args],{cwd:fileURLToPath(root),windowsHide:true,stdio:'inherit'});
  child.once('error',()=>resolve(1));child.once('exit',code=>resolve(code??1));
});
console.log('Starting your local website first. The class QR will connect separately.');
const result=await startPresentation({run,
  prepare(){writeClassroomPage(root);writeShareStatus(root,'connecting','Preparing your public class link…');},
  async open(){
    console.log(`\nLOCAL WEBSITE READY — ${screen}\nYou can open the simulator now while the class QR connects.\n`);
    if(process.platform==='win32'&&!process.argv.includes('--no-open')){
      const name=await openBrowser(screen);
      console.log(`Opened a visible ${name} window for AeroPredict.`);
    }
  },
  onPublicFailure(){
    writeShareStatus(root,'unavailable','Public sharing is not ready. Your local simulator still works. Run START_HERE.cmd again to retry.');
    console.log(`\nYour website is still running: ${screen}\nPublic QR could not be verified. Run START_HERE.cmd again to retry the existing link.\n`);
  },
});
if(!result.local){console.error('The local server could not start. Check .local/server.log.');process.exitCode=1;}
else if(result.public)console.log(`\nCLASS QR READY — ${screen}\nThe browser screen updates automatically. Keep the laptop awake and online.\nStop everything with STOP_HERE.cmd.\n`);
