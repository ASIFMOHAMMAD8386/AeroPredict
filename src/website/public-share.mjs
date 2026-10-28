import { spawn, spawnSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  openSync,
  closeSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { createHash,randomBytes } from "node:crypto";
import { readSettings } from "./server/settings.mjs";
import { writeQrFiles } from "./server/qr-files.mjs";
import {checkHealth} from './server/public-health.mjs';
import {writeShareStatus} from './server/classroom-page.mjs';
import {tunnelRejected} from './server/tunnel-state.mjs';
const root = new URL("./", import.meta.url),
  cwd = fileURLToPath(root),
  state = new URL(".local/public-tunnel.json", root);
let log = new URL('.local/tunnel.log',root);
const { PORT } = readSettings(root);
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function reachable(base) {
  return (await checkHealth(base)).ok;
}
function validPublic(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" &&
      /^[a-z0-9-]+\.trycloudflare\.com$/.test(u.host)
      ? u.origin
      : null;
  } catch {
    return null;
  }
}
function publish(url) {
  const current = JSON.parse(readFileSync(state, "utf8"));
  writeFileSync(state, JSON.stringify({ ...current, url, verified: true }));
  writeQrFiles(url, "public");
  writeShareStatus(root,'ready','Public sharing is active. Show the QR to your class.');
  const text = `AeroPredict public presentation links\n\nSimulation: ${url}/simulation/\nLive Flights: ${url}/live/\n\nWorks from other networks while this laptop, the local server and Cloudflare Tunnel stay running. The temporary hostname changes after the tunnel is stopped and recreated.\n`;
  writeFileSync(new URL("presentation/PUBLIC_LINKS.txt", root), text);
  console.log(text);
  if (process.platform === "win32" && !process.argv.includes("--no-open")) {
    const browser = spawn("explorer.exe", [url + "/simulation/"], {
      windowsHide: true,
      stdio: "ignore",
    });
    browser.unref();
  }
}
if (!(await reachable(`http://127.0.0.1:${PORT}`))) {
  const started = spawnSync(process.execPath, ["launch.mjs", "--no-open"], {
    cwd,
    windowsHide: true,
    stdio: "inherit",
  });
  if (started.status !== 0 || !(await reachable(`http://127.0.0.1:${PORT}`)))
    throw Error("Start the local project before creating its public link.");
}
let existingUrl=null;
try {
  const saved = JSON.parse(readFileSync(state, "utf8"));
  if (
    validPublic(saved.url) &&
    Number.isSafeInteger(saved.pid) &&
    saved.pid > 0
  ) {
    process.kill(saved.pid, 0);
    existingUrl=saved.url;
    if(/^tunnel-[0-9]+-[a-f0-9]+\.log$/.test(saved.log_file||''))log=new URL('.local/'+saved.log_file,root);
  }
} catch {}
function tunnelUsable(url){
  try{
    const saved=JSON.parse(readFileSync(state,'utf8'));
    if(saved.url!==url)return false;
    process.kill(saved.pid,0);
    let recent='';try{recent=readFileSync(log,'utf8').slice(-16000);}catch{}
    return !tunnelRejected(recent);
  }catch{return false;}
}
async function verifyPublic(url,milliseconds=180000){
  writeShareStatus(root,'connecting','Checking your public class link. The local simulator is ready.');
  let lastNotice=0;
  const deadline=Date.now()+milliseconds;
  while(Date.now()<deadline){
    if(await reachable(url)){publish(url);return true;}
    if(!tunnelUsable(url))return false;
    try{const saved=JSON.parse(readFileSync(state,'utf8'));if(saved.url===url&&saved.verified)writeFileSync(state,JSON.stringify({...saved,verified:false}));}catch{}
    if(Date.now()-lastNotice>15000){console.log('Your local website is ready. Still checking the public class link…');lastNotice=Date.now();}
    await pause(2000);
  }
  writeShareStatus(root,'unavailable','Public sharing is not ready yet. The local simulator works. Run START_HERE.cmd again to retry this link.');
  return false;
}
if(existingUrl){
  console.log('Reusing your existing public tunnel.');
  if(await verifyPublic(existingUrl,20000))process.exit(0);
  console.log('Replacing the expired or unreachable public tunnel. The local website stays open.');
  const stopped=spawnSync(process.execPath,['public-stop.mjs'],{cwd,windowsHide:true,stdio:'inherit'});
  if(stopped.status!==0)throw Error('The old public tunnel could not be stopped safely.');
  writeShareStatus(root,'connecting','Creating a new public class link. Your local simulator is ready.');
}
if (process.platform !== "win32" || process.arch !== "x64")
  throw Error(
    "This portable public launcher currently supports 64-bit Windows.",
  );
const binary = new URL(".local/tools/cloudflared.exe", root),
  version = "2026.10.3",
  digest = "76b2805253d0d6ffacb092a7acfbee99e7af6917835c0c5410e23f3ef5052da2";
mkdirSync(new URL(".local/tools/", root), { recursive: true });
if (!existsSync(binary)) {
  console.log(
    "Downloading the official Cloudflare Tunnel executable. No account or installation is required.",
  );
  const response = await fetch(
    `https://github.com/cloudflare/cloudflared/releases/download/${version}/cloudflared-windows-amd64.exe`,
    { signal: AbortSignal.timeout(120000) },
  );
  if (!response.ok) throw Error("Official Cloudflare download failed.");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (createHash("sha256").update(bytes).digest("hex") !== digest)
    throw Error("Cloudflare download checksum did not match.");
  writeFileSync(binary, bytes);
}
if (createHash("sha256").update(readFileSync(binary)).digest("hex") !== digest)
  throw Error("Cloudflare executable checksum did not match.");
// A retired process must never overwrite the current tunnel's connection log.
const logFile=`tunnel-${Date.now()}-${randomBytes(4).toString('hex')}.log`;
log=new URL('.local/'+logFile,root);
const output = openSync(log, "w");
const child = spawn(
  fileURLToPath(binary),
  [
    "tunnel",
    "--url",
    `http://127.0.0.1:${PORT}`,
    "--protocol",
    "http2",
    "--no-autoupdate",
  ],
  { cwd, windowsHide: true, detached: true, stdio: ["ignore", output, output] },
);
child.unref();
closeSync(output);
console.log("Creating your temporary public HTTPS address…");
let url = null;
for (let i = 0; i < 60; i++) {
  await pause(500);
  let text = "";
  try {
    text = readFileSync(log, "utf8");
  } catch {}
  url = validPublic(
    text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com\b/)?.[0],
  );
  if (url) break;
}
if (!url) {
  try {
    process.kill(child.pid);
  } catch {}
  throw Error("No public address was received. Check .local/tunnel.log.");
}
writeFileSync(
  state,
  JSON.stringify({
    url,
    pid: child.pid,
    created_at: new Date().toISOString(),
    log_file:logFile,
    verified: false,
  }),
);
if(await verifyPublic(url))process.exit(0);
console.error(
  `The temporary public link is not verified yet: ${url}. Your local website is ready. Run START_HERE.cmd again to retry.`,
);
process.exitCode = 1;
