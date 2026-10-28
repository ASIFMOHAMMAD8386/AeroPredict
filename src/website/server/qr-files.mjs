import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { qrPng } from "./qr-png.mjs";
export function writeQrFiles(base, kind = "local") {
  if (!["local", "public"].includes(kind)) throw Error("Invalid QR file type");
  const root = new URL("../", import.meta.url),
    sandbox = { module: { exports: {} }, exports: {} };
  runInNewContext(
    readFileSync(new URL("public/simulation/vendor/qrcode.js", root), "utf8"),
    sandbox,
  );
  const factory = sandbox.module.exports,
    presentation = new URL("presentation/", root);
  mkdirSync(presentation, { recursive: true });
  const entries = [];
  for (const name of ["simulation", "live"]) {
    const url = `${base}/${name}/`,
      qr = factory(0, "M");
    qr.addData(url);
    qr.make();
    writeFileSync(new URL(`${name}-${kind}-qr.png`, presentation), qrPng(qr));
    writeFileSync(
      new URL(`${name}-${kind}-qr.svg`, presentation),
      qr.createSvgTag({ cellSize: 10, margin: 40, scalable: true }),
    );
    entries.push({
      name,
      url,
      size: qr.getModuleCount(),
      modules: Array.from({ length: qr.getModuleCount() }, (_, row) =>
        Array.from({ length: qr.getModuleCount() }, (_, col) =>
          qr.isDark(row, col),
        ),
      ),
    });
  }
  writeFileSync(
    new URL(
      kind === "local" ? "qr-matrices.json" : "public-qr-matrices.json",
      presentation,
    ),
    JSON.stringify(entries),
  );
  return entries.map(({ name, url }) => ({ name, url }));
}
