// v3.13 Agent Team (swarm) — Ruflo (ruvnet/ruflo, MIT) ke "swarm/queen + workers" idea se inspired; apna code.
// Bara kaam (website / store / kai files): Designer → Coder → Tester → Reviewer, ek shared task board
// (~/.faheem-ai/projects/<id>/team.json). Har role apna free brain le sakta hai (specialist ka prefer order).
// Free limits bachane ke liye: max rounds + token budget + max calls. Brains limit par hon to purana
// single Agent Mode chalta hai (fallback). Is file mein koi brain/provider import nahi — sab deps se aata hai,
// is liye test mock brains se chal sakte hain.
import fs from "fs";
import path from "path";
import { projectDir, runTool, tree, checkCode, projectDesignCheck } from "./tools.js";
import { DESIGN_RULES } from "../design.js";
import { designBrief } from "../uupm/index.js";
import * as MEM from "../memory.js";

export const ROLES = [
  { id: "designer", name: "Designer", icon: "🎨", agent: "web", job: "Design spec: sections, rang, font, files" },
  { id: "coder", name: "Coder", icon: "💻", agent: "coder", job: "Poori files likhna / theek karna" },
  { id: "tester", name: "Tester", icon: "🧪", agent: "coder", job: "Bina AI checks + browser test (free)" },
  { id: "reviewer", name: "Reviewer", icon: "🔎", agent: "research", job: "Aakhri jaanch: plan poora hua?" },
];
export const DEFAULTS = { maxRounds: 3, maxTokens: 60000, maxCalls: 10 };
export const TEAM_FILE = "team.json";

// Sirf bare kaam team ko: website/store/page/kai files. Chhota kaam purana Agent Mode hi kare.
export function isTeamTask(task) {
  return /(website|web site|\bsite\b|store|shop|dukaan|landing|pages?\b|portfolio|dashboard|multi|kai files|several files|all pages|sari pages|e-?commerce|checkout|html)/i.test(String(task || ""));
}

export const estimateTokens = (x) => Math.ceil((typeof x === "string" ? x : JSON.stringify(x || "")).length / 4);
export class BudgetError extends Error { constructor(m) { super(m); this.code = "BUDGET"; } }
export class BrainsError extends Error { constructor(m) { super(m); this.code = "BRAINS"; } }

export function boardFile(dir) { return path.join(dir, TEAM_FILE); }
export function readBoard(dirOrProject) {
  const dir = fs.existsSync(String(dirOrProject)) && path.isAbsolute(String(dirOrProject)) ? dirOrProject : projectDir(dirOrProject);
  try { return JSON.parse(fs.readFileSync(boardFile(dir), "utf8")); } catch { return null; }
}
function saveBoard(dir, board) { board.updated = Date.now(); try { fs.writeFileSync(boardFile(dir), JSON.stringify(board, null, 1)); } catch {} }

// Har role ke liye brain chunna: specialist ka prefer order, aur jahan ho sake doosre role se alag brain.
const preferSort = (list, order = []) => [...list].sort((a, b) => { const r = (p) => { const i = order.indexOf(p.id); return i < 0 ? 999 : i; }; return r(a) - r(b); });
export function makeAsker({ providers = [], call, isCooling = () => false, sort = preferSort, agents = [] }) {
  const assigned = {};
  const ask = async (roleId, messages, signal) => {
    const role = ROLES.find((r) => r.id === roleId) || ROLES[1];
    const prefer = agents.find((a) => a.id === role.agent)?.prefer || [];
    const live = sort(providers, prefer).filter((p) => !isCooling(p.id));
    const taken = new Set(Object.entries(assigned).filter(([r]) => r !== roleId).map(([, id]) => id));
    const mine = live.filter((p) => p.id === assigned[roleId]);
    const free = live.filter((p) => p.id !== assigned[roleId] && !taken.has(p.id));
    const rest = live.filter((p) => p.id !== assigned[roleId] && taken.has(p.id));
    const errors = [];
    for (const p of [...mine, ...free, ...rest]) {
      if (signal?.aborted) throw new Error("Roka gaya.");
      try {
        const text = await call(p, messages);
        if (!text || !String(text).trim()) throw new Error("empty reply");
        assigned[roleId] = p.id;
        return { text: String(text), brain: p.name || p.id, brainId: p.id };
      } catch (e) { errors.push(`${p.name || p.id}: ${String(e.message).slice(0, 80)}`); }
    }
    throw new BrainsError(`Koi brain ${role.name} ke liye jawab nahi de saka (${errors.slice(0, 3).join(" · ") || "koi brain nahi"})`);
  };
  ask.assigned = assigned;
  return ask;
}

// Coder ke jawab se write_file / edit_file actions (Agent Mode wala format).
export function parseTeamActions(text) {
  const out = [];
  const re = /<action\s+tool="(write_file|edit_file)"([^>]*)>([\s\S]*?)<\/action>/g;
  let m;
  while ((m = re.exec(String(text || "")))) {
    const [, tool, attrs, inner] = m;
    const args = {};
    for (const a of attrs.matchAll(/([a-z_]+)="([^"]*)"/g)) args[a[1]] = a[2];
    if (!args.path) continue;
    if (tool === "edit_file") {
      const o = inner.match(/<old>([\s\S]*?)<\/old>/), n = inner.match(/<new>([\s\S]*?)<\/new>/);
      out.push({ tool, args: { ...args, old: o ? o[1] : "", new: n ? n[1] : "" }, body: null });
    } else out.push({ tool, args, body: inner.replace(/^\s*```[a-z]*\s*\n/i, "").replace(/\n```\s*$/, "") });
  }
  const tail = String(text || "").slice(String(text || "").lastIndexOf("<action"));
  const cut = /<action\s+tool="write_file"[^>]*>(?![\s\S]*<\/action>)/.test(tail);
  return { actions: out, cut };
}

function parseJson(text) { try { return JSON.parse((String(text).match(/\{[\s\S]*\}/) || ["{}"])[0]); } catch { return null; } }

const DESIGNER = (mem) => `You are the DESIGNER in a small AI build team (Designer → Coder → Tester → Reviewer) inside Faheem's dashboard.
Write a SHORT design spec for the Coder (max 300 words, plain text, no code):
- PAGES/SECTIONS in order, with what each contains (real content, the user's business name exactly, PKR prices for Pakistani shops).
- COLOURS as hex in a :root palette, FONTS (Google Fonts names), spacing/radius.
- INTERACTIONS that must work (cart in localStorage, filters, forms with validation, mobile menu).
- Last line exactly: FILES: index.html, style.css, script.js   (the files the Coder must write; plain HTML/CSS/JS, index.html at root).
${DESIGN_RULES}
${mem ? `\n${mem}` : ""}`;

const CODER = (mem) => `You are the CODER in a small AI build team. You receive the Designer's spec (and, in later rounds, the Tester/Reviewer issues).
Write COMPLETE working files using ONLY these actions (no other text needed except 1 short THOUGHT line):
<action tool="write_file" path="index.html">
...the COMPLETE raw file, no markdown fences...
</action>
<action tool="edit_file" path="style.css"><old>exact old text</old><new>new text</new></action>
Rules: plain HTML/CSS/JS that opens directly in a browser; no "..." or TODO; every button/cart/form/menu really works; images from https://image.pollinations.ai/prompt/<url-encoded description>?width=800&height=800&nologo=true (never placeholder sites); colours/fonts in :root CSS variables; keep the user's business name exactly; prices in PKR (Rs) for Pakistani shops. In fix rounds, fix EVERY listed issue (edit_file for small fixes, write_file to rewrite).
${mem ? `\n${mem}` : ""}`;

const REVIEWER = (mem) => `You are the REVIEWER in a small AI build team. Compare the built files with the user's task and the Designer's spec.
Find only REAL problems: missing requested pages/features, broken interactions, wrong business name/currency, obviously unfinished parts.
Reply ONLY with JSON: {"ok":true,"summary":"1-3 lines in simple Roman Urdu: kya bana, kaise kholein"} or {"ok":false,"issues":["..."],"summary":"..."} (max 5 issues).
${mem ? `\n${mem}` : ""}`;

function filesFromSpec(spec) {
  const line = (String(spec).match(/FILES:\s*([^\n]+)/i) || [])[1] || "";
  const list = line.split(/[,\s]+/).map((s) => s.trim().replace(/[`'"*]/g, "")).filter((s) => /^[\w./-]+\.(html?|css|m?js|json|svg)$/i.test(s) && !s.includes(".."));
  return list.length ? [...new Set(list)].slice(0, 8) : ["index.html"];
}

function readFilesFor(dir, max = 30000) {
  let out = "", total = 0;
  for (const f of tree(dir, 200).filter((x) => !x.dir && /\.(html?|css|m?js|json)$/i.test(x.path) && x.path !== TEAM_FILE)) {
    let t = ""; try { t = fs.readFileSync(path.join(dir, f.path), "utf8"); } catch { continue; }
    const part = t.slice(0, 12000);
    if (total + part.length > max) { out += `\n--- ${f.path} (${t.length} chars, chhota kiya) ---\n${part.slice(0, Math.max(0, max - total))}\n`; break; }
    out += `\n--- ${f.path} ---\n${part}${t.length > part.length ? "\n…(baaqi hissa)" : ""}\n`; total += part.length;
  }
  return out || "(abhi koi file nahi)";
}

// Tester: sirf bina-AI checks (free limit ka ek token bhi nahi) + browser test (agar diya gaya).
export async function teamTest(dir, { runtimeTest, round = 1 } = {}) {
  const issues = [];
  const files = tree(dir, 200).filter((x) => !x.dir && x.path !== TEAM_FILE);
  if (!files.some((f) => /\.html?$/i.test(f.path))) issues.push("Koi HTML page nahi bana (index.html chahiye).");
  for (const f of files) if (/\.(html?|m?js|json)$/i.test(f.path)) { const iss = checkCode(f.path, fs.readFileSync(path.join(dir, f.path), "utf8")); for (const i of iss) issues.push(`${f.path}: ${i}`); }
  // Linked CSS/JS files mojood hon.
  for (const f of files.filter((x) => /\.html?$/i.test(x.path))) {
    const h = fs.readFileSync(path.join(dir, f.path), "utf8");
    for (const m of h.matchAll(/(?:href|src)=["'](?!https?:|\/\/|data:|#|mailto:|tel:)([^"'?#]+\.(?:css|js))["']/gi)) if (!fs.existsSync(path.join(dir, path.dirname(f.path), m[1]))) issues.push(`${f.path}: "${m[1]}" link hai magar file nahi bani.`);
  }
  if (round < 3) { try { const d = await projectDesignCheck(dir); for (const x of d.slice(0, 4)) issues.push(`Design: ${x}`); } catch {} }
  if (runtimeTest && !issues.some((i) => !i.startsWith("Design:"))) {
    for (const f of files.filter((x) => /\.html?$/i.test(x.path)).slice(0, 3)) {
      try { const rt = await runtimeTest({ file: path.join(dir, f.path) }); if (rt && !rt.skipped && !rt.ok) for (const e of (rt.errors || []).slice(0, 4)) issues.push(`${f.path} (browser test): ${e}`); } catch {}
    }
  }
  return [...new Set(issues)].slice(0, 15);
}

export async function runTeam({ project, task, emit = () => {}, signal, deps = {}, options = {} }) {
  const dir = deps.dir || projectDir(project);
  const opt = { ...DEFAULTS, ...Object.fromEntries(Object.entries(options).filter(([, v]) => Number(v) > 0).map(([k, v]) => [k, Number(v)])) };
  const mem = deps.memory || MEM;
  const runId = "team-" + new Date().toISOString().replace(/[:.]/g, "-");
  const board = {
    version: 1, project: path.basename(dir), task: String(task).slice(0, 2000), status: "running", started: Date.now(), round: 0,
    budget: { maxTokens: opt.maxTokens, maxCalls: opt.maxCalls, maxRounds: opt.maxRounds, used: 0, calls: 0 },
    roles: Object.fromEntries(ROLES.map((r) => [r.id, { name: r.name, brain: r.id === "tester" ? "bina AI (local checks)" : null }])),
    tasks: [], handoffs: [], log: [], files: [],
  };
  const changed = new Set();
  const log = (text) => { board.log.push({ at: Date.now(), text: String(text).slice(0, 400) }); board.log = board.log.slice(-200); };
  const todo = () => emit({ type: "todo", items: board.tasks.map((t) => `${t.status === "done" ? "[x]" : "[ ]"} ${ROLES.find((r) => r.id === t.role)?.icon || ""} ${t.title}${t.status === "failed" ? " ⚠" : ""}`) });
  const addTask = (role, title) => { const t = { id: board.tasks.length + 1, role, title, status: "doing", at: Date.now() }; board.tasks.push(t); saveBoard(dir, board); todo(); return t; };
  const doneTask = (t, status = "done", output = "") => { t.status = status; t.output = String(output).slice(0, 1500); t.end = Date.now(); saveBoard(dir, board); todo(); };
  const handoff = (from, to, note) => {
    const h = { from, to, note: String(note).slice(0, 400), at: Date.now(), round: board.round };
    board.handoffs.push(h); log(`${from} → ${to}: ${note}`); saveBoard(dir, board);
    emit({ type: "handoff", from, to, text: `🤝 ${from} → ${to}: ${String(note).slice(0, 200)}` });
  };
  const memCtx = (q) => { try { return mem.memoryContext ? mem.memoryContext(q, { project: board.project, maxTokens: 250 }) : ""; } catch { return ""; } };
  const tracker = mem.lessonTracker ? mem.lessonTracker(board.project) : { fail() {}, pass() {} };

  const call = async (roleId, messages) => {
    if (signal?.aborted) throw new Error("Roka gaya.");
    const est = estimateTokens(messages);
    if (board.budget.calls >= opt.maxCalls) throw new BudgetError(`Calls ki had (${opt.maxCalls}) puri — free limit bachane ke liye team ruk gayi.`);
    if (board.budget.used + est > opt.maxTokens) throw new BudgetError(`Token budget (${opt.maxTokens}) khatam hone wala tha — free limit bachane ke liye team ruk gayi.`);
    const role = ROLES.find((r) => r.id === roleId);
    emit({ type: "brain", text: `${role.icon} ${role.name} soch raha hai…` });
    const r = await deps.ask(roleId, messages, signal);
    board.budget.used += est + estimateTokens(r.text); board.budget.calls++;
    board.roles[roleId].brain = r.brain;
    log(`${role.name} · ${r.brain} · ~${est + estimateTokens(r.text)} tokens`);
    saveBoard(dir, board);
    emit({ type: "brain", text: `⚡ ${role.name} · ${r.brain} (budget ${board.budget.used}/${opt.maxTokens} · calls ${board.budget.calls}/${opt.maxCalls})` });
    return r.text;
  };

  const fallback = async (why) => {
    board.status = "fallback"; log(`Fallback: ${why}`); saveBoard(dir, board);
    emit({ type: "thought", text: `↩ Team ruk gayi (${String(why).slice(0, 160)}). Single Agent Mode par wapas ja raha hoon.` });
    if (deps.fallback) return deps.fallback({ project, task, emit, signal });
    emit({ type: "error", text: why });
  };

  const finish = (summary, partial = false) => {
    board.status = partial ? "partial" : "done"; board.files = [...changed]; board.summary = String(summary).slice(0, 1500); board.end = Date.now(); saveBoard(dir, board);
    try { mem.saveProjectSummary?.({ project: board.project, task, summary, files: [...changed] }); } catch {}
    // Agent Mode ki project memory (.faheem-agent.json) — taake "Jaari rakho" ko pata ho.
    try { const f = path.join(dir, ".faheem-agent.json"); let m = []; try { m = JSON.parse(fs.readFileSync(f, "utf8")); } catch {} m.push({ at: Date.now(), task, summary: `[Team] ${summary}`, files: [...changed] }); fs.writeFileSync(f, JSON.stringify(m.slice(-20), null, 1)); } catch {}
    emit({ type: "done", summary, files: [...changed], partial, team: true, budget: { ...board.budget } });
  };

  saveBoard(dir, board);
  emit({ type: "team", text: `👥 Team mode: Designer → Coder → Tester → Reviewer (max ${opt.maxRounds} rounds, ~${opt.maxTokens} tokens, ${opt.maxCalls} calls)`, roles: ROLES.map((r) => r.name) });

  // 1) Designer
  let spec = "";
  const tD = addTask("designer", "Designer: design spec");
  try {
    const brief = (() => { try { return designBrief(task); } catch { return ""; } })();
    spec = (await call("designer", [{ role: "system", content: DESIGNER(memCtx(task)) + (brief ? `\n\n${brief}` : "") }, { role: "user", content: `TASK: ${task}` }])).trim();
    doneTask(tD, "done", spec);
    emit({ type: "thought", text: "🎨 Design spec: " + spec.replace(/\s+/g, " ").slice(0, 300) + "…" });
  } catch (e) {
    doneTask(tD, "failed", e.message);
    if (e.code === "BUDGET") { finish(e.message, true); return; }
    return fallback(e.message);
  }
  const want = filesFromSpec(spec);
  handoff("Designer", "Coder", `Spec tayyar. Files: ${want.join(", ")}`);

  // 2-4) Coder ↔ Tester ↔ Reviewer rounds
  let issues = [], reviewSummary = "", lastOk = false;
  for (let round = 1; round <= opt.maxRounds; round++) {
    if (signal?.aborted) { emit({ type: "error", text: "Roka gaya." }); board.status = "stopped"; saveBoard(dir, board); return; }
    board.round = round;
    const tC = addTask("coder", round === 1 ? "Coder: files likhna" : `Coder: round ${round} fixes (${issues.length})`);
    let reply = "";
    try {
      const msgs = [{ role: "system", content: CODER(memCtx(task + " " + issues.join(" "))) },
        { role: "user", content: `TASK: ${task}\n\nDESIGN SPEC (Designer):\n${spec}\n\nFILES TO WRITE: ${want.join(", ")}${round > 1 ? `\n\nCURRENT FILES:\n${readFilesFor(dir)}\n\nFIX THESE ISSUES:\n- ${issues.join("\n- ")}` : ""}` }];
      reply = await call("coder", msgs);
    } catch (e) {
      doneTask(tC, "failed", e.message);
      if (e.code === "BUDGET") { finish(`${e.message} ${changed.size ? `Ban chuki files: ${[...changed].join(", ")}.` : ""} "Jaari rakho" (bina team) se aage chalayein.`, true); return; }
      if (!changed.size) return fallback(e.message);
      finish(`Coder ke brains limit par (${e.message.slice(0, 120)}). Ban chuki files mehfooz: ${[...changed].join(", ")}.`, true); return;
    }
    const { actions, cut } = parseTeamActions(reply);
    let wrote = 0;
    for (const a of actions) {
      const id = `team-${round}-${wrote}`;
      emit({ type: "tool", id, name: a.tool, label: a.args.path });
      let res;
      try { res = await runTool(dir, runId, a.tool, a.args, a.body, signal); } catch (e) { res = `Ghalti: ${e.message}`; }
      const ok = !/^(Ghalti|File nahi|Ijazat nahi|Khatarnak|<old>|Khali content)|CHECK masle/.test(res);
      emit({ type: "result", id, ok, text: String(res).slice(0, 400) });
      if (!/^(Ghalti|File nahi|Ijazat nahi|<old>|Khali content)/.test(res)) { changed.add(a.args.path); wrote++; emit({ type: "file", path: a.args.path }); }
    }
    doneTask(tC, wrote ? "done" : "failed", `${wrote} file action(s)`);
    if (!wrote && round === 1) return fallback("Coder ne koi file nahi likhi (jawab ka format ghalat).");
    handoff("Coder", "Tester", `${wrote} file(s) likhi/badli${cut ? " (aakhri file kat gayi)" : ""}.`);

    // Tester (bina AI)
    const tT = addTask("tester", `Tester: round ${round} jaanch`);
    issues = await teamTest(dir, { runtimeTest: deps.runtimeTest, round });
    if (cut) issues.unshift("Aakhri write_file adhoori reh gayi (jawab kat gaya) — file poori likhein.");
    const real = issues.filter((i) => !i.startsWith("Design:"));
    if (real.length) {
      tracker.fail(real);
      doneTask(tT, "failed", issues.join("\n"));
      if (round < opt.maxRounds) { handoff("Tester", "Coder", `${real.length} masle: ${real.slice(0, 3).join(" | ")}`); continue; }
      finish(`Rounds khatam (${opt.maxRounds}). ${real.length} masle baqi: ${real.slice(0, 3).join(" | ")}. Files: ${[...changed].join(", ")}. "Jaari rakho" likh kar theek karwayein.`, true); return;
    }
    tracker.pass(`Round ${round} mein Coder ne theek kiya.`);
    doneTask(tT, "done", issues.length ? `Pass · design tips: ${issues.join(" | ")}` : "Sab checks pass");
    handoff("Tester", "Reviewer", issues.length ? `Checks pass (${issues.length} design tips).` : "Sab checks pass.");

    // Reviewer
    const tR = addTask("reviewer", `Reviewer: round ${round} review`);
    try {
      const rv = await call("reviewer", [{ role: "system", content: REVIEWER(memCtx(task)) }, { role: "user", content: `TASK: ${task}\n\nDESIGN SPEC:\n${spec.slice(0, 3000)}\n\nFILES:\n${readFilesFor(dir, 20000)}` }]);
      const j = parseJson(rv) || {};
      reviewSummary = String(j.summary || "").trim();
      if (j.ok === false && Array.isArray(j.issues) && j.issues.length) {
        issues = j.issues.slice(0, 5).map(String);
        doneTask(tR, "failed", issues.join("\n"));
        if (round < opt.maxRounds) { handoff("Reviewer", "Coder", `${issues.length} cheezein: ${issues.slice(0, 3).join(" | ")}`); continue; }
        finish(`${reviewSummary || "Ban gaya."} Reviewer ke ${issues.length} mashware baqi: ${issues.slice(0, 3).join(" | ")}.`, true); return;
      }
      doneTask(tR, "done", reviewSummary || "OK");
    } catch (e) {
      doneTask(tR, "failed", e.message);
      emit({ type: "thought", text: `🔎 Review skip: ${String(e.message).slice(0, 140)} (tests pass hain).` });
    }
    lastOk = true; break;
  }
  if (lastOk) finish(`${reviewSummary || "Team ne kaam mukammal kiya — sab checks pass."} Files: ${[...changed].join(", ")}. Kholne ke liye Live Preview dekhein.`);
}
