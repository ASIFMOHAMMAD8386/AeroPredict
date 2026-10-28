import { readSettings, lanAddresses } from "./server/settings.mjs";
import { writeQrFiles } from "./server/qr-files.mjs";
const root = new URL("./", import.meta.url),
  { PORT } = readSettings(root),
  base = lanAddresses(PORT)[0] ?? `http://localhost:${PORT}`;
for (const item of writeQrFiles(base))
  console.log(`${item.name} QR: ${item.url}`);
