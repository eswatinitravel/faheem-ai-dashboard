// v3.16 Chhota pure-JS ZIP writer + reader (koi bhari dependency nahi; sirf Node ka zlib).
// makeZip([{ name, data, exec }]) -> Buffer   |   readZip(buffer) -> [{ name, data, exec }]
import zlib from "zlib";

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
export function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosTime(d = new Date()) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const date = ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

export function safeZipName(name) {
  const n = String(name || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!n || n.split("/").some((p) => p === ".." ) || /^[a-z]:/i.test(n)) throw new Error(`ZIP mein ghalat file naam: ${name}`);
  return n;
}

export function makeZip(entries, { date = new Date() } = {}) {
  const locals = [], centrals = [];
  let offset = 0;
  const { time, date: dd } = dosTime(date);
  const seen = new Set();
  for (const e of entries) {
    const name = safeZipName(e.name);
    if (seen.has(name)) continue; seen.add(name);
    const raw = Buffer.isBuffer(e.data) ? e.data : Buffer.from(String(e.data ?? ""), "utf8");
    const crc = crc32(raw);
    const def = zlib.deflateRawSync(raw, { level: 9 });
    const useDef = def.length < raw.length;
    const body = useDef ? def : raw;
    const nameBuf = Buffer.from(name, "utf8");
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(useDef ? 8 : 0, 8);
    lh.writeUInt16LE(time, 10); lh.writeUInt16LE(dd, 12); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(body.length, 18); lh.writeUInt32LE(raw.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26); lh.writeUInt16LE(0, 28);
    locals.push(lh, nameBuf, body);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE((3 << 8) | 20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(useDef ? 8 : 0, 10);
    ch.writeUInt16LE(time, 12); ch.writeUInt16LE(dd, 14); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(body.length, 20); ch.writeUInt32LE(raw.length, 24);
    ch.writeUInt16LE(nameBuf.length, 28); ch.writeUInt16LE(0, 30); ch.writeUInt16LE(0, 32); ch.writeUInt16LE(0, 34); ch.writeUInt16LE(0, 36);
    ch.writeUInt32LE((((e.exec ? 0o100755 : 0o100644) << 16) >>> 0), 38); ch.writeUInt32LE(offset, 42);
    centrals.push(ch, nameBuf);
    offset += 30 + nameBuf.length + body.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(0, 4); end.writeUInt16LE(0, 6);
  end.writeUInt16LE(seen.size, 8); end.writeUInt16LE(seen.size, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16); end.writeUInt16LE(0, 20);
  return Buffer.concat([...locals, cd, end]);
}

// Tests + jaanch ke liye: ZIP khol kar files wapas (CRC bhi check).
export function readZip(buf) {
  let eo = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eo = i; break; }
  if (eo < 0) throw new Error("ZIP ka end record nahi mila");
  const count = buf.readUInt16LE(eo + 10); let p = buf.readUInt32LE(eo + 16);
  const out = [];
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("central directory kharab");
    const method = buf.readUInt16LE(p + 10), crc = buf.readUInt32LE(p + 16), csize = buf.readUInt32LE(p + 20), size = buf.readUInt32LE(p + 24);
    const nl = buf.readUInt16LE(p + 28), xl = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32), attr = buf.readUInt32LE(p + 38), lo = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nl).toString("utf8");
    const lnl = buf.readUInt16LE(lo + 26), lxl = buf.readUInt16LE(lo + 28);
    const body = buf.slice(lo + 30 + lnl + lxl, lo + 30 + lnl + lxl + csize);
    const data = method === 8 ? zlib.inflateRawSync(body) : Buffer.from(body);
    if (data.length !== size || crc32(data) !== crc) throw new Error(`CRC/size ghalat: ${name}`);
    out.push({ name, data, exec: ((attr >>> 16) & 0o111) !== 0 });
    p += 46 + nl + xl + cl;
  }
  return out;
}
