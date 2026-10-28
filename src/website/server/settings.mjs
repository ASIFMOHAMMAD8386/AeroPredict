import { readFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
export function readSettings(root) {
  const settings = {
    LIVE_DATA_ENABLED: "false",
    AVIATIONSTACK_API_VARIANT: "legacy",
    PRIOR_API_CALLS: "0",
    PORT: "4180",
  };
  try {
    for (const line of readFileSync(new URL(".env", root), "utf8").split(
      /\r?\n/,
    )) {
      const m = line.match(/^([A-Z_]+)\s*=\s*(.*)$/);
      if (m) settings[m[1]] = m[2].trim().replace(/^(['"])(.*)\1$/, "$2");
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  for (const key of Object.keys(settings).concat("AVIATIONSTACK_API_KEY"))
    if (process.env[key] !== undefined) settings[key] = process.env[key];
  const port = Number(settings.PORT);
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw Error("PORT must be a number between 1024 and 65535.");
  return { ...settings, PORT: port };
}
export function lanAddresses(port) {
  const candidates = [];
  for (const [name, entries] of Object.entries(networkInterfaces()))
    for (const a of entries ?? [])
      if (
        a.family === "IPv4" &&
        !a.internal &&
        !a.address.startsWith("169.254.")
      )
        candidates.push({ name, url: `http://${a.address}:${port}` });
  candidates.sort(
    (a, b) =>
      Number(/wi-?fi|wlan/i.test(b.name)) - Number(/wi-?fi|wlan/i.test(a.name)),
  );
  return [...new Set(candidates.map((x) => x.url))];
}
