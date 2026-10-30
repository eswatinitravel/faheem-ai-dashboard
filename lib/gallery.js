// v3.11 Gallery: pictures/files sirf isi laptop par data/gallery mein (update se nahi mitti, data/ mehfooz hai).
import fs from "fs";
import path from "path";

export const MAX_BYTES = 10 * 1024 * 1024; // har file 10MB tak
export const MAX_FILES = 12;               // ek dafa mein 12 files
export const MAX_TOTAL = 500 * 1024 * 1024; // poori gallery 500MB tak

// Sirf yeh qismein. SVG jaan bujh kar nahi (us mein script chhup sakti hai).
export const TYPES = {
  png: { mime: "image/png", kind: "image" },
  jpg: { mime: "image/jpeg", kind: "image" },
  jpeg: { mime: "image/jpeg", kind: "image" },
  webp: { mime: "image/webp", kind: "image" },
  gif: { mime: "image/gif", kind: "image" },
  html: { mime: "text/plain; charset=utf-8", kind: "code" },
  htm: { mime: "text/plain; charset=utf-8", kind: "code" },
  css: { mime: "text/plain; charset=utf-8", kind: "code" },
  txt: { mime: "text/plain; charset=utf-8", kind: "text" },
  md: { mime: "text/plain; charset=utf-8", kind: "text" },
  json: { mime: "text/plain; charset=utf-8", kind: "text" },
  pdf: { mime: "application/pdf", kind: "file" },
};
export const ACCEPT = Object.keys(TYPES).map((e) => "." + e).join(",");

export const galleryDir = () => path.resolve(/*turbopackIgnore: true*/ process.env.FAHEEM_GALLERY_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "gallery"));

export const extOf = (name) => (String(name).toLowerCase().match(/\.([a-z0-9]+)$/) || [])[1] || "";

// Naam saaf: sirf harf/number/-_. ; aage waqt ka nishan taake do files takrayein nahi.
export function safeName(name) {
  const ext = extOf(name);
  const stem = String(name).replace(/\.[^.]*$/, "").normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/^[-.]+|[-.]+$/g, "").slice(0, 60) || "file";
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}-${stem}.${ext}`;
}

// Diya hua naam gallery ke andar hi rahe (../ waghera rad).
export function resolveFile(name) {
  const n = String(name || "");
  if (!/^[\w.-]{1,120}$/.test(n) || n.startsWith(".")) return null;
  if (!TYPES[extOf(n)]) return null;
  const p = path.join(galleryDir(), n);
  return path.dirname(p) === galleryDir() ? p : null;
}

// Picture ke pehle bytes check: naam .png magar andar kuch aur ho to rad.
export function magicOk(ext, buf) {
  const b = buf.subarray(0, 12);
  const hex = b.toString("hex");
  if (ext === "png") return hex.startsWith("89504e470d0a1a0a");
  if (ext === "jpg" || ext === "jpeg") return hex.startsWith("ffd8ff");
  if (ext === "gif") return b.toString("latin1", 0, 4) === "GIF8";
  if (ext === "webp") return b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP";
  if (ext === "pdf") return b.toString("latin1", 0, 5) === "%PDF-";
  // Text files: binary (NUL byte) na ho.
  return !buf.subarray(0, 4096).includes(0);
}

export function listFiles() {
  const dir = galleryDir();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((n) => resolveFile(n)).map((name) => {
    const st = fs.statSync(path.join(dir, name));
    const t = TYPES[extOf(name)];
    return { name, original: name.replace(/^[a-z0-9]+-[a-z0-9]{4}-/, ""), size: st.size, kind: t.kind, mtime: st.mtimeMs, url: `/api/gallery?file=${encodeURIComponent(name)}` };
  }).sort((a, b) => b.mtime - a.mtime);
}

export const totalSize = () => listFiles().reduce((n, f) => n + f.size, 0);
