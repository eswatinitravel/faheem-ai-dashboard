// Tools (MCP jaisi list: name, description, inputSchema). "allow: true" wale tool sirf Faheem ke Allow ke baad chalte hain.
const fs = require("fs");
const os = require("os");
const path = require("path");

const APPS = { notepad: "notepad.exe", calculator: "calc.exe", calc: "calc.exe", explorer: "explorer.exe", paint: "mspaint.exe", chrome: "chrome", edge: "msedge", vscode: "code", word: "winword", excel: "excel" };

const TOOLS = [
  { name: "open_url", allow: true, description: 'Website kholna. {"url":"https://..."}', inputSchema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] } },
  { name: "web_search", allow: true, description: 'Browser mein search kholna. {"query":"..."}', inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
  { name: "open_app", allow: true, description: `App kholna. {"name":"notepad"} (${Object.keys(APPS).join(", ")})`, inputSchema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } },
  { name: "list_files", allow: true, description: 'Folder ki files (sirf Home folder ke andar). {"dir":"Documents"}', inputSchema: { type: "object", properties: { dir: { type: "string" } } } },
  { name: "read_file", allow: true, description: 'Text file parhna (Home ke andar). {"path":"Documents/notes.txt"}', inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } },
  { name: "write_note", allow: true, description: 'Documents/HeyPuppy mein note likhna. {"name":"list","text":"..."}', inputSchema: { type: "object", properties: { name: { type: "string" }, text: { type: "string" } }, required: ["text"] } },
  { name: "set_reminder", allow: true, description: 'Yaad-dihani. {"text":"chai","in_minutes":10} ya {"text":"...","at":"2026-11-02T09:00"}', inputSchema: { type: "object", properties: { text: { type: "string" }, in_minutes: { type: "number" }, at: { type: "string" } }, required: ["text"] } },
  { name: "list_reminders", allow: false, description: "Saari yaad-dihaniyan dekhna. {}", inputSchema: { type: "object", properties: {} } },
  { name: "remember", allow: false, description: 'Faheem ki koi pasand / baat yaad rakhna. {"fact":"..."}', inputSchema: { type: "object", properties: { fact: { type: "string" } }, required: ["fact"] } },
  { name: "add_skill", allow: true, description: 'Nayi skill seekhna (skills/ mein file). {"name":"...","text":"steps"}', inputSchema: { type: "object", properties: { name: { type: "string" }, text: { type: "string" } }, required: ["name", "text"] } },
  { name: "page_action", allow: true, description: 'Browser page par fill/click (Chrome extension phir se Allow maangti hai). {"type":"fill","selector":"#q","value":"..."} ya {"type":"click","selector":"button"}', inputSchema: { type: "object", properties: { type: { type: "string" }, selector: { type: "string" }, value: { type: "string" } }, required: ["type", "selector"] } },
];

const insideHome = (p) => { const full = path.resolve(os.homedir(), String(p || "")); if (full !== os.homedir() && !full.startsWith(os.homedir() + path.sep)) throw new Error("Sirf Home folder ke andar ijazat hai."); return full; };
const needsAllow = (name) => (TOOLS.find((t) => t.name === name) || { allow: true }).allow !== false;
const describe = (name, a) => ({
  open_url: `Website kholun: ${a.url}`, web_search: `Search karun: "${a.query}"`, open_app: `App kholun: ${a.name}`, list_files: `Folder dekhun: ${a.dir || "Home"}`,
  read_file: `File parhun: ${a.path}`, write_note: `Note likhun: ${a.name || "note"}`, set_reminder: `Yaad-dihani lagaun: "${a.text}"`, add_skill: `Nayi skill save karun: ${a.name}`,
  page_action: `Browser page par ${a.type}: ${a.selector}`,
}[name] || `${name} chalaun`);

async function runTool(name, args, ctx) {
  const a = args || {};
  switch (name) {
    case "open_url": { const u = String(a.url || ""); if (!/^https?:\/\//i.test(u)) throw new Error("Sirf http(s) link."); await ctx.openExternal(u); return `Khol diya: ${u}`; }
    case "web_search": { const u = "https://duckduckgo.com/?q=" + encodeURIComponent(a.query || ""); await ctx.openExternal(u); return `Search khol di: ${a.query}`; }
    case "open_app": { const exe = APPS[String(a.name || "").toLowerCase()]; if (!exe) throw new Error(`Yeh app list mein nahi: ${a.name}`); ctx.spawnApp(exe); return `${a.name} khol diya.`; }
    case "list_files": { const d = insideHome(a.dir || ""); return fs.readdirSync(d).slice(0, 60).join(", ") || "(khali)"; }
    case "read_file": { const f = insideHome(a.path); const st = fs.statSync(f); if (st.size > 200000) throw new Error("File bohat bari hai."); return fs.readFileSync(f, "utf8").slice(0, 6000); }
    case "write_note": { const d = path.join(os.homedir(), "Documents", "HeyPuppy"); fs.mkdirSync(d, { recursive: true }); const n = String(a.name || "note").replace(/[^\w-]+/g, "-").slice(0, 40) + ".txt"; fs.writeFileSync(path.join(d, n), String(a.text || "")); return `Note save: Documents\\HeyPuppy\\${n}`; }
    case "set_reminder": {
      const when = a.at ? new Date(a.at) : new Date(Date.now() + Number(a.in_minutes || 10) * 60000);
      if (isNaN(when)) throw new Error("Waqt samajh nahi aaya.");
      const r = ctx.store.reminders(); r.push({ id: Date.now(), text: String(a.text || "").slice(0, 200), at: when.toISOString(), done: false }); ctx.store.saveReminders(r);
      return `Yaad-dihani lag gayi: ${when.toLocaleString()}`;
    }
    case "list_reminders": { const r = ctx.store.reminders().filter((x) => !x.done); return r.length ? r.map((x) => `${new Date(x.at).toLocaleString()}: ${x.text}`).join("\n") : "Koi yaad-dihani nahi."; }
    case "remember": { ctx.store.remember(a.fact); return "Yaad rakh liya."; }
    case "add_skill": { const n = ctx.store.addSkill(a.name, a.text); return `Skill save: skills/${n}.md`; }
    case "page_action": { if (!["fill", "click"].includes(a.type)) throw new Error("Sirf fill ya click."); ctx.queuePageAction({ type: a.type, selector: String(a.selector || ""), value: a.value }); return "Chrome extension mein Allow ke liye bhej diya (extension ka icon dabayein)."; }
    default: throw new Error(`Anjaan tool: ${name}`);
  }
}

module.exports = { TOOLS, APPS, needsAllow, describe, runTool, insideHome };
