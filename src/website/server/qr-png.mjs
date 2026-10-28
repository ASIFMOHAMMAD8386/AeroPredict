import { deflateSync } from "node:zlib";
// A minimal grayscale PNG writer keeps QR exports dependency-free.
function chunk(type, data) {
  const bytes = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const value of bytes) {
    crc ^= value;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  const length = Buffer.alloc(4),
    checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, bytes, checksum]);
}
export function qrPng(qr) {
  const scale = 10,
    border = 4,
    modules = qr.getModuleCount(),
    size = (modules + 2 * border) * scale;
  const pixels = Buffer.alloc((size + 1) * size, 255);
  for (let row = 0; row < size; row++) {
    pixels[row * (size + 1)] = 0;
    const moduleRow = Math.floor(row / scale) - border;
    if (moduleRow < 0 || moduleRow >= modules) continue;
    for (let col = border * scale; col < (modules + border) * scale; col++)
      if (qr.isDark(moduleRow, Math.floor(col / scale) - border))
        pixels[row * (size + 1) + col + 1] = 0;
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(pixels)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
