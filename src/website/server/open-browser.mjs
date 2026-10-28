import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
export function browserCandidates(env=process.env){
  const roots=[env.ProgramFiles,env['ProgramFiles(x86)'],env.LOCALAPPDATA].filter(Boolean);
  const apps=[['Brave','BraveSoftware/Brave-Browser/Application/brave.exe'],['Edge','Microsoft/Edge/Application/msedge.exe'],['Chrome','Google/Chrome/Application/chrome.exe']];
  return apps.flatMap(([name,path])=>roots.map(root=>({name,path:join(root,...path.split('/'))})));
}
export async function openBrowser(url,{env=process.env,exists=existsSync,launch=spawn}={}){
  const target=new URL(url);
  if(!['http:','https:'].includes(target.protocol))throw Error('Invalid website address.');
  for(const candidate of browserCandidates(env)){
    if(!exists(candidate.path))continue;
    try{
      await new Promise((resolve,reject)=>{
        const browser=launch(candidate.path,['--new-window',target.href],{detached:true,windowsHide:false,stdio:'ignore'});
        browser.once('error',reject);browser.once('spawn',()=>{browser.unref();resolve();});
      });
      return candidate.name;
    }catch{}
  }
  throw Error(`Could not open a browser. Open ${target.href} in Brave, Edge or Chrome.`);
}
