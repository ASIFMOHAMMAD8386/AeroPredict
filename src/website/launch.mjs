import { spawn } from "node:child_process";
import { mkdirSync, openSync, closeSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { readSettings, lanAddresses } from "./server/settings.mjs";
import { writeQrFiles } from "./server/qr-files.mjs";
import {openBrowser} from './server/open-browser.mjs';
const root = new URL("./", import.meta.url),
  { PORT } = readSettings(root),
  health = `http://127.0.0.1:${PORT}/api/health`;
const running = async () => {
  try {
    const r = await fetch(health, { signal: AbortSignal.timeout(800) });
    return (await r.json()).project === "aeropredict-local";
  } catch {
    return false;
  }
};
if (!(await running())) {
  mkdirSync(new URL(".local/", root), { recursive: true });
  const log = openSync(new URL(".local/server.log", root), "a");
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: fileURLToPath(root),
    detached: true,
    windowsHide: true,
    stdio: ["ignore", log, log],
  });
  child.unref();
  closeSync(log);
  for (let i = 0; i < 30 && !(await running()); i++)
    await new Promise((resolve) => setTimeout(resolve, 200));
  if (!(await running())) {
    console.error(
      "Could not start. Check .local/server.log, or run node server.mjs for diagnostics.",
    );
    process.exit(1);
  }
}
const base = lanAddresses(PORT)[0] ?? `http://localhost:${PORT}`,
  url = base + "/simulation/";
writeQrFiles(base);
console.log(
  `Simulation: ${url}\nLive Flights: ${base}/live/\nClassmates must be on the same Wi-Fi. Share QR uses this address.`,
);
if (process.platform === "win32" && !process.argv.includes("--no-open")) {
  await openBrowser(url);
}
