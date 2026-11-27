// v3.35 Chhota XLSX/CSV reader (apna code, koi package nahi). Browser aur Node 18+ dono mein chalta hai
// (DecompressionStream "deflate-raw"). Sirf pehli sheet, values (formulas ka nateeja), dates number ki tarah.

async function inflateRaw(bytes) {
  const ds = new DecompressionStream("deflate-raw");
  const out = new Response(new Blob([bytes]).stream().pipeThrough(ds));
  return new Uint8Array(await out.arrayBuffer());
}

// ZIP ki central directory parh kar files nikalna.
async function unzip(buf) {
  const u8 = new Uint8Array(buf), dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("Yeh XLSX file theek nahi (zip nahi mili).");
  const count = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true);
  const files = {}, dec = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
    const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
    const off = dv.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nlen));
    files[name] = { method, csize, off };
    p += 46 + nlen + xlen + clen;
  }
  const read = async (name) => {
    const f = files[name]; if (!f) return null;
    const lh = f.off, start = lh + 30 + dv.getUint16(lh + 26, true) + dv.getUint16(lh + 28, true);
    const data = u8.subarray(start, start + f.csize);
    const raw = f.method === 0 ? data : f.method === 8 ? await inflateRaw(data) : null;
    if (!raw) throw new Error("XLSX compression samajh nahi aayi.");
    return dec.decode(raw);
  };
  return { names: Object.keys(files), read };
}

const unesc = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d)).replace(/&amp;/g, "&");
const colNum = (ref) => { let n = 0; for (const ch of ref.replace(/\d+/g, "")) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };

export async function readXlsx(buf) {
  const z = await unzip(buf);
  const shared = [];
  const ss = await z.read("xl/sharedStrings.xml");
  if (ss) for (const si of ss.match(/<si>[\s\S]*?<\/si>/g) || []) shared.push(unesc((si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || []).map((t) => t.replace(/<[^>]+>/g, "")).join("")));
  const sheetName = z.names.filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort((a, b) => parseInt(a.match(/\d+/)) - parseInt(b.match(/\d+/)))[0];
  const xml = sheetName && (await z.read(sheetName));
  if (!xml) throw new Error("Sheet nahi mili.");
  const rows = [];
  for (const r of xml.match(/<row\b[^>]*\/>|<row\b[^>]*[^/]>[\s\S]*?<\/row>/g) || []) {
    const rn = +((r.match(/^<row\b[^>]* r="(\d+)"/) || [])[1] || 0);
    while (rn && rows.length < rn - 1) rows.push([]); // Excel ki khali rows
    const row = [];
    for (const c of r.match(/<c [^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) || []) {
      const ref = (c.match(/ r="([A-Z]+\d+)"/) || [])[1]; const t = (c.match(/ t="(\w+)"/) || [])[1];
      const v = (c.match(/<v>([\s\S]*?)<\/v>/) || [])[1]; const is = (c.match(/<is>[\s\S]*?<\/is>/) || [])[0];
      let val = "";
      if (t === "s" && v != null) val = shared[+v] ?? "";
      else if (t === "inlineStr" && is) val = unesc(is.replace(/<[^>]+>/g, ""));
      else if (t === "b") val = v === "1" ? "TRUE" : "FALSE";
      else if (v != null) val = unesc(v);
      row[ref ? colNum(ref) : row.length] = val;
    }
    rows.push(Array.from(row, (x) => x ?? ""));
  }
  return rows;
}

export function readCsv(text) {
  const rows = []; let row = [], cur = "", q = false;
  const sep = (text.split("\n")[0].match(/;/g) || []).length > (text.split("\n")[0].match(/,/g) || []).length ? ";" : ",";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === sep) { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += ch;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

// Report: har column ki jaanch + safai ke masle. Pehli line headers.
export function analyze(rows) {
  const width = Math.max(0, ...rows.map((r) => r.length));
  const norm = rows.map((r) => Array.from({ length: width }, (_, i) => String(r[i] ?? "")));
  const header = (norm[0] || []).map((h, i) => h.trim() || `Column ${i + 1}`);
  const body = norm.slice(1);
  const isEmpty = (r) => r.every((c) => !c.trim());
  const emptyRows = body.filter(isEmpty).length;
  const seen = new Set(); let dupRows = 0;
  for (const r of body) { if (isEmpty(r)) continue; const k = r.map((c) => c.trim().toLowerCase()).join("\u0001"); if (seen.has(k)) dupRows++; else seen.add(k); }
  let extraSpaces = 0;
  const cols = header.map((name, i) => {
    const vals = body.map((r) => r[i]);
    const filled = vals.filter((v) => v.trim());
    extraSpaces += vals.filter((v) => v !== v.trim() || /\s{2,}/.test(v)).length;
    const nums = filled.map((v) => Number(v.replace(/[, ]/g, ""))).filter((n) => Number.isFinite(n));
    const numeric = filled.length > 0 && nums.length / filled.length >= 0.8;
    const freq = {}; for (const v of filled) { const k = v.trim(); freq[k] = (freq[k] || 0) + 1; }
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const sum = nums.reduce((a, b) => a + b, 0);
    return { name, filled: filled.length, empty: vals.length - filled.length, unique: Object.keys(freq).length, numeric,
      sum: numeric ? sum : null, avg: numeric && nums.length ? sum / nums.length : null, min: numeric ? Math.min(...nums) : null, max: numeric ? Math.max(...nums) : null, top };
  });
  return { header, rowCount: body.length, colCount: width, emptyRows, dupRows, extraSpaces, cols };
}

// Saaf data: spaces trim, khali aur duplicate rows hatao.
export function cleanRows(rows) {
  const out = []; const seen = new Set();
  rows.forEach((r, idx) => {
    const c = r.map((v) => String(v ?? "").trim().replace(/\s{2,}/g, " "));
    if (idx > 0 && c.every((v) => !v)) return;
    const k = c.map((v) => v.toLowerCase()).join("\u0001");
    if (idx > 0 && seen.has(k)) return; seen.add(k); out.push(c);
  });
  return out;
}

export function toCsv(rows) {
  return "\ufeff" + rows.map((r) => r.map((v) => (/[",\n;]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(",")).join("\r\n");
}
