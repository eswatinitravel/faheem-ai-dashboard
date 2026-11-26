// v3.29 Update backup + wapsi (rollback). scripts/update.ps1 isay chalata hai; Node har jagah hai (npm ke sath), is liye
// yeh Windows aur Linux (CI test) dono par ek jaisa chalta hai.
//   node scripts/update-backup.mjs backup  <root>              -> <root>/backups/v3.28.0-2026-11-26_2222/ (path print)
//   node scripts/update-backup.mjs restore <root> [backupDir]  -> app files backup jaisi (backupDir na ho to sab se naya)
//   node scripts/update-backup.mjs list    <root>              -> JSON
// Kabhi nahi chhoota: node_modules, .next, data/ (chats), .env / .env.local (keys), backups/, .git — aur ~/.faheem-ai (woh root se bahar hai).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export const SKIP = ["node_modules", ".next", "data", "backups", ".git", ".env", ".env.local"];
export const KEEP_BACKUPS = 3;
const META = "faheem-backup.json";

const pad = (n) => String(n).padStart(2, "0");
const stamp = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
const version = (root) => { try { return JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version || "0.0.0"; } catch { return "0.0.0"; } };
export const backupsDir = (root) => path.join(root, "backups");

export function listBackups(root) {
  const dir = backupsDir(root);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => { try { return { dir: path.join(dir, d.name), name: d.name, ...JSON.parse(fs.readFileSync(path.join(dir, d.name, META), "utf8")) }; } catch { return null; } })
    .filter((b) => b && b.complete)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export function backup(root, { now = new Date(), keep = KEEP_BACKUPS } = {}) {
  root = path.resolve(root);
  if (!fs.existsSync(path.join(root, "package.json"))) throw new Error(`Yeh Faheem AI ka folder nahi (package.json nahi mila): ${root}`);
  const ver = version(root);
  let dest = path.join(backupsDir(root), `v${ver}-${stamp(now)}`);
  for (let i = 2; fs.existsSync(dest); i++) dest = path.join(backupsDir(root), `v${ver}-${stamp(now)}-${i}`);
  fs.mkdirSync(dest, { recursive: true });
  const items = fs.readdirSync(root).filter((n) => !SKIP.includes(n));
  for (const n of items) fs.cpSync(path.join(root, n), path.join(dest, n), { recursive: true, force: true, dereference: false });
  // "complete" aakhir mein: beech mein ruka backup kabhi wapsi ke liye nahi chuna jata.
  fs.writeFileSync(path.join(dest, META), JSON.stringify({ version: ver, createdAt: now.toISOString(), items, complete: true }, null, 2));
  // Purane backups hatao (sirf aakhri `keep`).
  for (const old of listBackups(root).slice(keep)) fs.rmSync(old.dir, { recursive: true, force: true });
  return { dir: dest, version: ver };
}

export function restore(root, backupDir) {
  root = path.resolve(root);
  const b = backupDir ? listBackups(root).find((x) => path.resolve(x.dir) === path.resolve(backupDir)) : listBackups(root)[0];
  if (!b) throw new Error(backupDir ? `Backup nahi mila ya adhoora hai: ${backupDir}` : "Koi backup nahi mila — pehle ek update hona zaroori hai.");
  // Naye version ki files (jo purane mein thi hi nahi) bhi hatani hain, warna purana build toot sakta hai.
  for (const n of fs.readdirSync(root)) if (!SKIP.includes(n)) fs.rmSync(path.join(root, n), { recursive: true, force: true });
  for (const n of fs.readdirSync(b.dir)) if (n !== META) fs.cpSync(path.join(b.dir, n), path.join(root, n), { recursive: true, force: true, dereference: false });
  return { dir: b.dir, version: b.version };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, root = process.cwd(), dir] = process.argv.slice(2);
  try {
    if (cmd === "backup") { const r = backup(root); console.log(r.dir); }
    else if (cmd === "restore") { const r = restore(root, dir); console.log(`v${r.version}`); }
    else if (cmd === "list") console.log(JSON.stringify(listBackups(root).map(({ name, version, createdAt }) => ({ name, version, createdAt }))));
    else { console.error("Istemal: node scripts/update-backup.mjs backup|restore|list <root> [backupDir]"); process.exit(2); }
  } catch (e) { console.error(`Backup masla: ${e.message}`); process.exit(1); }
}
