import { readFileSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { writeQrFiles } from "./server/qr-files.mjs";
import { readSettings, lanAddresses } from "./server/settings.mjs";
const root = new URL("./", import.meta.url),
  state = new URL(".local/public-tunnel.json", root);
try {
  const value = JSON.parse(readFileSync(state, "utf8"));
  if (!Number.isSafeInteger(value.pid) || value.pid <= 0)
    throw Error("Invalid tunnel process identifier.");
  const expected = fileURLToPath(
    new URL(".local/tools/cloudflared.exe", root),
  ).replaceAll("'", "''");
  // Verify the executable belongs to this project before stopping a saved PID.
  const code = `$p=Get-Process -Id ${value.pid} -ErrorAction SilentlyContinue; if($null -eq $p){exit 0}; if($p.Path -ine '${expected}'){Write-Error 'The saved process belongs to another application.';exit 1}; Stop-Process -Id $p.Id -ErrorAction Stop`;
  const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", code], {
    windowsHide: true,
    stdio: "inherit",
  });
  if (result.status !== 0)
    throw Error("The tunnel could not be stopped safely.");
  unlinkSync(state);
  const { PORT } = readSettings(root);
  writeQrFiles(lanAddresses(PORT)[0] ?? `http://localhost:${PORT}`, "local");
  console.log("Public sharing stopped. The local project is still running.");
} catch (error) {
  if (error.code === "ENOENT")
    console.log("No saved public tunnel is running.");
  else {
    console.error(error.message);
    process.exitCode = 1;
  }
}
