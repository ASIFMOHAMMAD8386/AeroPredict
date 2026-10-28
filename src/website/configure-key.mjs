import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { readFileSync, writeFileSync } from "node:fs";
if (!process.stdin.isTTY) {
  console.error("Run SET_API_KEY.cmd in a terminal.");
  process.exit(1);
}
const silent = new Writable({
  write(chunk, encoding, callback) {
    callback();
  },
});
const prompt = createInterface({
  input: process.stdin,
  output: silent,
  terminal: true,
});
process.stdout.write("Paste your Aviationstack API key (input hidden): ");
const key = (
  await new Promise((resolve) => prompt.question("", resolve))
).trim();
prompt.close();
process.stdout.write("\n");
if (!/^[A-Za-z0-9_-]{20,128}$/.test(key)) {
  console.error("That does not look like an API key. Nothing was saved.");
  process.exit(1);
}
const file = new URL(".env", import.meta.url);
let text;
try {
  text = readFileSync(file, "utf8");
} catch {
  text = readFileSync(new URL(".env.example", import.meta.url), "utf8");
}
text = /^AVIATIONSTACK_API_KEY=.*$/m.test(text)
  ? text.replace(/^AVIATIONSTACK_API_KEY=.*$/m, `AVIATIONSTACK_API_KEY=${key}`)
  : `AVIATIONSTACK_API_KEY=${key}\n${text}`;
writeFileSync(file, text, { mode: 0o600 });
console.log(
  "Saved privately in .env. Restart with STOP_LOCAL.cmd and START_LOCAL.cmd.",
);
