// "npm run check": sab JS files ka syntax + JSON + extension manifest (bina internet).
const fs = require("fs"); const path = require("path"); const { spawnSync } = require("child_process");
const root = path.join(__dirname, ".."); let bad = 0;
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((f) => f.name === "node_modules" ? [] : f.isDirectory() ? walk(path.join(d, f.name)) : [path.join(d, f.name)]);
for (const f of walk(root)) {
  if (/\.(c?js)$/.test(f)) { const r = spawnSync(process.execPath, ["--check", f], { encoding: "utf8" }); if (r.status) { bad++; console.log("SYNTAX", path.relative(root, f), r.stderr.split("\n")[0]); } }
  if (f.endsWith(".json")) { try { JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { bad++; console.log("JSON", path.relative(root, f), e.message); } }
}
console.log(bad ? `${bad} masle` : "Sab theek");
process.exit(bad ? 1 : 0);
