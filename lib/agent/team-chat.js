// v3.27 AI Team group chat: Planner, Researcher, Coder, Reviewer ek hi chat mein baari baari jawab dete hain.
// PiBot (w01fb0ss/PiBot, Apache-2.0) ke "kai named bots ek group chat mein" idea se; apna code.
// Hifazat: koi bot khud kuch nahi chalata. Shell command ya file likhna sirf "proposal" banta hai; server par
// exact text ke saath mehfooz (SHA-256), 10 minute mein expire, aur sirf user ke "Ijazat do" button se ek dafa chalta hai.
import crypto from "crypto";

export const BOTS = [
  { id: "planner", name: "Planner", agent: "general", color: "#7fe3ff", job: "Kaam ko chhote qadmon mein baanto" },
  { id: "researcher", name: "Researcher", agent: "research", color: "#c08bff", job: "Facts, options, khatre" },
  { id: "coder", name: "Coder", agent: "coder", color: "#5dffa8", job: "Code / commands tajweez karo" },
  { id: "reviewer", name: "Reviewer", agent: "research", color: "#ffc95c", job: "Ghaltiyan aur aakhri raaye" },
];

const RULES = `Qawaid:
- Jawab Roman Urdu mein (code/commands English mein), chhota: zyada se zyada 120 lafz.
- Pichhle bots ki baat dohrao mat; apna hissa jodo. Doosre bot ka naam le kar baat kar sakte ho.
- Tum KUCH BHI khud nahi chala sakte. Kabhi mat kaho ke command chal gayi ya file ban gayi.
- Khatarnak kaam (delete, format, registry, shutdown, password) kabhi tajweez mat karo.`;

const PROPOSE = `Agar file likhni ho ya command chalani ho to SIRF is format mein tajweez karo (user ijazat dega):
\`\`\`file:relative/path/name.ext
poora content
\`\`\`
\`\`\`shell
ek command
\`\`\``;

export function botPrompt(bot) {
  const who = {
    planner: "Tum Planner ho. User ke kaam ko 3-6 numbered qadmon mein baanto aur batao kaun sa bot kya kare.",
    researcher: "Tum Researcher ho. Zaroori facts, behtar options, free tools aur khatre batao. Agar pakka nahi pata to saaf kaho.",
    coder: "Tum Coder ho. Plan ke mutabiq asal code ya commands do. Windows (PowerShell) ka khayal rakho.\n" + PROPOSE,
    reviewer: "Tum Reviewer ho. Plan aur Coder ki tajweez parkho: ghaltiyan, security, kya reh gaya. Aakhir mein ek line: 'Faisla: ...'.",
  }[bot.id] || `Tum ${bot.name} ho.`;
  return `${who}\n${RULES}`;
}

// Baat-cheet ko ek transcript bana kar har bot ko do (har brain par chal jata hai).
export function buildMessages(bot, history, maxChars = 12000) {
  const lines = [];
  for (const m of history) {
    const who = m.role === "user" ? "User" : (BOTS.find((b) => b.id === m.bot)?.name || m.name || "Bot");
    lines.push(`${who}: ${String(m.content || "").trim()}`);
  }
  let t = lines.join("\n\n");
  if (t.length > maxChars) t = "…" + t.slice(-maxChars);
  return [
    { role: "system", content: botPrompt(bot) },
    { role: "user", content: `Group chat ab tak:\n\n${t}\n\nAb sirf ${bot.name} ki baari hai. Apna jawab do (naam ke baghair shuru karo).` },
  ];
}

const SHELL_LANG = /^(shell|bash|sh|zsh|powershell|pwsh|ps1?|cmd|bat|console|terminal)$/i;
export function parseProposals(text) {
  const out = [];
  const re = /```([^\n`]*)\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(String(text || "")))) {
    const info = m[1].trim(), body = m[2].replace(/\s+$/, "");
    const f = /^file\s*:\s*(.+)$/i.exec(info);
    if (f) {
      const p = f[1].trim().replace(/\\/g, "/");
      if (!p || p.startsWith("/") || /^[a-z]:/i.test(p) || p.split("/").includes("..")) { out.push({ kind: "blocked", reason: `Path project se bahar: ${p}` }); continue; }
      if (body.trim()) out.push({ kind: "write", path: p, content: body + "\n" });
    } else if (SHELL_LANG.test(info)) {
      const cmd = body.split("\n").map((l) => l.replace(/^\s*(\$|PS>|>)\s?/, "")).filter((l) => l.trim() && !/^\s*#/.test(l)).join("\n").trim();
      if (!cmd) continue;
      const danger = dangerous(cmd);
      out.push(danger ? { kind: "blocked", reason: danger, cmd } : { kind: "shell", cmd });
    }
  }
  return out.slice(0, 6);
}

// Aisi commands ijazat ke liye bhi nahi dikhate.
export function dangerous(cmd) {
  const c = String(cmd);
  const BAD = [/\brm\s+-[a-z]*r[a-z]*\s+(\/|~|\*|[a-z]:)/i, /\brmdir\s+\/s/i, /\bdel\s+\/[sqf]/i, /\bremove-item\b[^\n]*-recurse/i, /\bformat(\.com)?\s+[a-z]:/i, /\bmkfs/i, /\bdd\s+if=/i, /\bdiskpart\b/i, /\bshutdown\b/i, /\b(restart|stop)-computer\b/i, /\breg(\.exe)?\s+(add|delete)\b/i, /\bbcdedit\b/i, /\bcipher\s+\/w/i, /\bvssadmin\b/i, /\bnet\s+user\b/i, /\btakeown\b/i, /\bicacls\b/i, /\bset-executionpolicy\b/i];
  if (BAD.some((re) => re.test(c))) return "Khatarnak command — chalane ki ijazat nahi di ja sakti";
  if (/(curl|wget|iwr|invoke-webrequest)[^|]*\|\s*(sh|bash|iex|invoke-expression|powershell)/i.test(c)) return "Internet se script seedha chalana mana hai";
  if (c.length > 600) return "Command bohat lambi hai";
  return "";
}

// ---- Proposals: server ki memory mein (globalThis), ek dafa, 10 min ----
export const TTL_MS = 10 * 60 * 1000;
const store = () => (globalThis.__fadTeamProposals ||= new Map());
const sha = (o) => crypto.createHash("sha256").update(JSON.stringify(o)).digest("hex");

export function addProposal(p, project, bot) {
  const id = "tp_" + crypto.randomBytes(8).toString("hex");
  const rec = { id, project, bot, kind: p.kind, path: p.path, content: p.content, cmd: p.cmd, at: Date.now(), status: "pending" };
  rec.hash = sha({ project, kind: rec.kind, path: rec.path, content: rec.content, cmd: rec.cmd });
  store().set(id, rec);
  for (const [k, v] of store()) if (Date.now() - v.at > TTL_MS * 3) store().delete(k);
  return publicProposal(rec);
}
export function publicProposal(r) {
  return { id: r.id, bot: r.bot, kind: r.kind, path: r.path, cmd: r.cmd, preview: r.kind === "write" ? String(r.content).slice(0, 1200) : undefined, lines: r.kind === "write" ? String(r.content).split("\n").length : undefined, status: r.status, expiresAt: r.at + TTL_MS, hash: r.hash?.slice(0, 12) };
}
// Ijazat / mana. Exact wohi kaam chalta hai jo bot ne likha tha (hash dobara jaancha jata hai).
export function takeProposal(id, project) {
  const r = store().get(String(id || ""));
  if (!r) return { error: "Yeh tajweez nahi mili (server restart ya purani)." };
  if (r.project !== project) return { error: "Yeh tajweez kisi aur project ki hai." };
  if (r.status !== "pending") return { error: `Pehle hi ${r.status === "used" ? "chal chuki" : r.status === "rejected" ? "mana ho chuki" : r.status}.` };
  if (Date.now() - r.at > TTL_MS) { r.status = "expired"; return { error: "10 minute guzar gaye — tajweez expire. Team se dobara maangein." }; }
  if (sha({ project: r.project, kind: r.kind, path: r.path, content: r.content, cmd: r.cmd }) !== r.hash) return { error: "Tajweez badal gayi — nahi chalegi." };
  r.status = "used";
  return { rec: r };
}
export function rejectProposal(id) {
  const r = store().get(String(id || ""));
  if (!r || r.status !== "pending") return false;
  r.status = "rejected"; return true;
}

// Har bot ke liye brain: us ke specialist ka order, aur jahan ho sake doosre bot se alag brain (mukhtalif raaye).
export function pickOrder(providers, prefer, taken, sortFn, coolingFn) {
  const live = sortFn(providers, prefer).filter((p) => !coolingFn(p.id));
  return [...live.filter((p) => !taken.has(p.id)), ...live.filter((p) => taken.has(p.id))];
}
