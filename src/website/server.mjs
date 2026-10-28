import { mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { readSettings, lanAddresses } from "./server/settings.mjs";
import { openDatabase } from "./server/storage.mjs";
import { createLocalServer } from "./server/http.mjs";
const root = new URL("./", import.meta.url),
  settings = readSettings(root),
  state = new URL(".local/", root);
mkdirSync(state, { recursive: true });
const db = openDatabase(
  fileURLToPath(new URL("flight-cache.sqlite", state)),
  Number(settings.PRIOR_API_CALLS),
);
const token = randomBytes(32).toString("hex"),
  urls = lanAddresses(settings.PORT);
const cleanup = () => {
  db.close();
  try {
    unlinkSync(new URL("admin-token", state));
  } catch {}
};
const server = createLocalServer({
  publicRoot: fileURLToPath(new URL("public/", root)),
  env: { ...settings, DB: db },
  adminToken: token,
  lanUrls: urls,
  onShutdown: cleanup,
});
server.on("error", (error) => {
  db.close();
  console.error(
    error.code === "EADDRINUSE"
      ? `Port ${settings.PORT} is already in use. Run START_LOCAL.cmd to open the existing server.`
      : "Local server could not start. Check the port and folder permissions.",
  );
  process.exitCode = 1;
});
server.listen(settings.PORT, "0.0.0.0", () => {
  writeFileSync(new URL("admin-token", state), token, { mode: 0o600 });
  writeFileSync(new URL("server.pid", state), String(process.pid));
  console.log("AeroPredict Local Presentation");
  console.log(
    `On this computer: http://localhost:${settings.PORT}/simulation/`,
  );
  for (const base of urls) {
    console.log(`Same Wi-Fi Simulation: ${base}/simulation/`);
    console.log(`Same Wi-Fi Live Flights: ${base}/live/`);
  }
  console.log(
    `Live key configured: ${Boolean(settings.AVIATIONSTACK_API_KEY)}. No provider call is made at startup.`,
  );
  console.log(
    "Open a Wi-Fi address before using Share QR. Use STOP_LOCAL.cmd to stop the server.",
  );
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close(cleanup));
