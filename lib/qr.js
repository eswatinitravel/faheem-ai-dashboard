// v3.27 Chhota apna QR code generator (byte mode, error level M, version 1-10, ~210 bytes tak).
// QR Code ISO/IEC 18004 ke aam algorithm par apna code; koi library nahi. Phone connect ke URL ke liye kaafi.

const EC_PER_BLOCK = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26]; // level M
const BLOCKS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];

// GF(256), poly x^8+x^4+x^3+x^2+1 (0x11D)
const EXP = new Array(512), LOG = new Array(256);
(() => { let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);

function rsGenerator(deg) {
  let g = [1];
  for (let i = 0; i < deg; i++) {
    const next = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) { next[j] ^= g[j]; next[j + 1] ^= mul(g[j], EXP[i]); }
    g = next;
  }
  return g; // g[0] = 1 (highest power)
}
function rsRemainder(data, deg) {
  const gen = rsGenerator(deg);
  const r = new Array(deg).fill(0);
  for (const b of data) {
    const f = b ^ r[0];
    r.shift(); r.push(0);
    for (let i = 0; i < deg; i++) r[i] ^= mul(gen[i + 1], f);
  }
  return r;
}

function rawModules(v) {
  let r = (16 * v + 128) * v + 64;
  if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; }
  return r;
}
const dataCapacity = (v) => Math.floor(rawModules(v) / 8) - EC_PER_BLOCK[v] * BLOCKS[v];

function alignPositions(v) {
  if (v === 1) return [];
  const n = Math.floor(v / 7) + 2, size = v * 4 + 17;
  const step = Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2;
  const out = [6];
  for (let i = n - 1, p = size - 7; i >= 1; i--, p -= step) out.splice(1, 0, p);
  return out;
}

function encodeData(bytes, v) {
  const bits = [];
  const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(4, 4); put(bytes.length, v < 10 ? 8 : 16);
  for (const b of bytes) put(b, 8);
  const cap = dataCapacity(v) * 8;
  put(0, Math.min(4, cap - bits.length));
  while (bits.length % 8) bits.push(0);
  const out = [];
  for (let i = 0; i < bits.length; i += 8) out.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  for (let pad = 0xec; out.length < dataCapacity(v); pad ^= 0xec ^ 0x11) out.push(pad);
  return out;
}

function interleave(data, v) {
  const nb = BLOCKS[v], ec = EC_PER_BLOCK[v], raw = Math.floor(rawModules(v) / 8);
  const shortCount = nb - (raw % nb), shortLen = Math.floor(raw / nb);
  const blocks = [];
  for (let i = 0, k = 0; i < nb; i++) {
    const len = shortLen - ec + (i < shortCount ? 0 : 1);
    const d = data.slice(k, k + len); k += len;
    blocks.push({ d, e: rsRemainder(d, ec) });
  }
  const out = [];
  const maxD = Math.max(...blocks.map((b) => b.d.length));
  for (let i = 0; i < maxD; i++) for (const b of blocks) if (i < b.d.length) out.push(b.d[i]);
  for (let i = 0; i < ec; i++) for (const b of blocks) out.push(b.e[i]);
  return out;
}

const MASKS = [
  (x, y) => (x + y) % 2 === 0,
  (x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

function build(v, codewords, mask) {
  const size = v * 4 + 17;
  const m = Array.from({ length: size }, () => new Array(size).fill(false));
  const fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (x, y, dark) => { if (x >= 0 && y >= 0 && x < size && y < size) { m[y][x] = dark; fn[y][x] = true; } };
  // finders + separators
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]])
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const d = Math.max(Math.abs(dx), Math.abs(dy));
      set(cx + dx, cy + dy, d !== 2 && d !== 4);
    }
  // timing
  for (let i = 8; i < size - 8; i++) { set(i, 6, i % 2 === 0); set(6, i, i % 2 === 0); }
  // alignment
  const ap = alignPositions(v);
  for (const ax of ap) for (const ay of ap) {
    if ((ax === 6 && ay === 6) || (ax === 6 && ay === size - 7) || (ax === size - 7 && ay === 6)) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  // format (M = 00) + dark module
  let fdata = (0 << 3) | mask, rem = fdata;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const fbits = ((fdata << 10) | rem) ^ 0x5412;
  const fb = (i) => ((fbits >>> i) & 1) === 1;
  for (let i = 0; i <= 5; i++) set(8, i, fb(i));
  set(8, 7, fb(6)); set(8, 8, fb(7)); set(7, 8, fb(8));
  for (let i = 9; i < 15; i++) set(14 - i, 8, fb(i));
  for (let i = 0; i < 8; i++) set(size - 1 - i, 8, fb(i));
  for (let i = 8; i < 15; i++) set(8, size - 15 + i, fb(i));
  set(8, size - 8, true);
  // version info
  if (v >= 7) {
    let r = v;
    for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
    const vb = (v << 12) | r;
    for (let i = 0; i < 18; i++) { const bit = ((vb >>> i) & 1) === 1, a = size - 11 + (i % 3), b = Math.floor(i / 3); set(a, b, bit); set(b, a, bit); }
  }
  // data (zigzag)
  let bit = 0;
  const total = codewords.length * 8;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
      const x = right - j, upward = ((right + 1) & 2) === 0, y = upward ? size - 1 - vert : vert;
      if (fn[y][x]) continue;
      let dark = false;
      if (bit < total) { dark = ((codewords[bit >>> 3] >>> (7 - (bit & 7))) & 1) === 1; bit++; }
      if (MASKS[mask](x, y)) dark = !dark;
      m[y][x] = dark;
    }
  }
  return m;
}

function penalty(m) {
  const n = m.length; let p = 0, dark = 0;
  const lines = [];
  for (let i = 0; i < n; i++) { lines.push(m[i]); lines.push(m.map((row) => row[i])); }
  for (const line of lines) {
    let run = 1;
    for (let i = 1; i <= n; i++) {
      if (i < n && line[i] === line[i - 1]) run++;
      else { if (run >= 5) p += 3 + (run - 5); run = 1; }
    }
    const s = line.map((d) => (d ? "1" : "0")).join("");
    for (const pat of ["10111010000", "00001011101"]) { let k = s.indexOf(pat); while (k >= 0) { p += 40; k = s.indexOf(pat, k + 1); } }
  }
  for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) { const c = m[y][x]; if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3; }
  for (const row of m) for (const d of row) if (d) dark++;
  p += Math.floor(Math.abs(dark * 20 - n * n * 10) / (n * n)) * 10;
  return p;
}

// text -> { size, modules: boolean[][] } (true = kaala)
export function qrMatrix(text, { mask } = {}) {
  const bytes = [...new TextEncoder().encode(String(text))];
  let v = 1;
  while (v <= 10 && dataCapacity(v) < bytes.length + 2 + (v < 10 ? 0 : 1)) v++;
  if (v > 10) throw new Error("QR ke liye text bohat lamba hai (210 bytes tak).");
  const cw = interleave(encodeData(bytes, v), v);
  let best = null, bestP = Infinity, bestMask = 0;
  for (let k = 0; k < 8; k++) {
    if (mask != null && k !== mask) continue;
    const mtx = build(v, cw, k), p = penalty(mtx);
    if (p < bestP) { best = mtx; bestP = p; bestMask = k; }
  }
  return { version: v, mask: bestMask, size: best.length, modules: best };
}

// text -> SVG string (quiet zone 4). Rang theme ke hisaab se diye ja sakte hain, lekin scan ke liye safed/kaala behtar.
export function qrSvg(text, { scale = 6, dark = "#000", light = "#fff", margin = 4 } = {}) {
  const { size, modules } = qrMatrix(text);
  const dim = size + margin * 2;
  let d = "";
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (modules[y][x]) d += `M${x + margin} ${y + margin}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" width="${dim * scale}" height="${dim * scale}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="${light}"/><path d="${d}" fill="${dark}"/></svg>`;
}
