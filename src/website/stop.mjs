import { readFileSync } from "node:fs";
import { readSettings } from "./server/settings.mjs";
const root = new URL("./", import.meta.url),
  { PORT } = readSettings(root);
try {
  const token = readFileSync(new URL(".local/admin-token", root), "utf8");
  const response = await fetch(`http://127.0.0.1:${PORT}/api/admin/shutdown`, {
    method: "POST",
    headers: { "X-AeroPredict-Token": token },
    signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) throw Error();
  console.log("AeroPredict local server stopped.");
} catch {
  console.log(
    "No accessible AeroPredict local server is running on this port.",
  );
}
