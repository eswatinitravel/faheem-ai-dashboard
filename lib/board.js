// v3.38 Task board (Multica ka idea, apna code): Backlog -> Karna hai -> Chal raha -> Review (aap ki haan) -> Done.
// Card aap ka ho ya Jarvis ka. Jarvis wala card recipe (MCP tools) ya seedha AI se chalta hai, natija card par comment,
// phir card "Review" mein: aap Approve karein to Done, warna wapas. "Autopilot" = card khud waqt par chalta hai (ops schedule).
import { readJson, writeJson, newId } from "./ops/store.js";
import { audit } from "./ops/audit.js";

export const COLUMNS = [
  { id: "backlog", name: "Backlog" },
  { id: "todo", name: "Karna hai" },
  { id: "doing", name: "Chal raha" },
  { id: "review", name: "Review" },
  { id: "done", name: "Done" },
];
const COL_IDS = new Set(COLUMNS.map((c) => c.id));
export const ASSIGNEES = ["aap", "jarvis"];
const FILE = "board.json";
const MAX_CARDS = 500;

const load = () => { const b = readJson(FILE, null); return b && Array.isArray(b.cards) ? b : { cards: [] }; };
const save = (b) => writeJson(FILE, b);
const now = () => new Date().toISOString();

export function listCards() { return load().cards; }
export function getCard(id) { return load().cards.find((c) => c.id === id) || null; }

function cleanFields(f = {}, base = {}) {
  const out = { ...base };
  if (f.title != null) out.title = String(f.title).trim().slice(0, 160);
  if (f.detail != null) out.detail = String(f.detail).slice(0, 4000);
  if (f.assignee != null) out.assignee = ASSIGNEES.includes(f.assignee) ? f.assignee : "aap";
  if (f.priority != null) out.priority = ["low", "normal", "high"].includes(f.priority) ? f.priority : "normal";
  if (f.due != null) out.due = /^\d{4}-\d{2}-\d{2}/.test(String(f.due)) ? String(f.due).slice(0, 10) : "";
  if (f.recipe != null) out.recipe = /^[a-z0-9-]{0,48}$/.test(String(f.recipe)) ? String(f.recipe) : "";
  if (f.values != null && typeof f.values === "object") out.values = Object.fromEntries(Object.entries(f.values).slice(0, 20).map(([k, v]) => [String(k).slice(0, 40), String(v).slice(0, 2000)]));
  if (f.column != null) { if (!COL_IDS.has(f.column)) throw new Error("Column ghalat."); out.column = f.column; }
  return out;
}

export function addCard(fields = {}) {
  const c = cleanFields(fields, { assignee: "aap", priority: "normal", column: "todo", detail: "", due: "", recipe: "", values: {} });
  if (!c.title) throw new Error("Card ka naam likhein.");
  const b = load();
  if (b.cards.length >= MAX_CARDS) throw new Error(`Board par ${MAX_CARDS} cards ki had. Purane Done cards hatayein.`);
  const card = { id: newId("card"), ...c, comments: [], createdAt: now(), updatedAt: now(), scheduleId: null, runs: 0 };
  b.cards.push(card); save(b); audit("board_card_added", card.title, { id: card.id });
  return card;
}

function mutate(id, fn) {
  const b = load(); const c = b.cards.find((x) => x.id === id);
  if (!c) throw new Error("Card nahi mila.");
  fn(c, b); c.updatedAt = now(); save(b); return c;
}

export function updateCard(id, fields) { return mutate(id, (c) => Object.assign(c, cleanFields(fields, {}))); }
export function moveCard(id, column) { if (!COL_IDS.has(column)) throw new Error("Column ghalat."); return mutate(id, (c) => { c.column = column; }); }
export function addComment(id, text, by = "aap", extra = {}) {
  return mutate(id, (c) => { c.comments = [...(c.comments || []), { at: now(), by, text: String(text).slice(0, 4000), ...extra }].slice(-60); });
}
export function deleteCard(id) {
  const b = load(); const c = b.cards.find((x) => x.id === id);
  b.cards = b.cards.filter((x) => x.id !== id); save(b);
  if (c) audit("board_card_deleted", c.title, { id });
  return c;
}

// Review: aap ki haan = Done; na = wapas "Karna hai" + wajah.
export function review(id, ok, note = "") {
  return mutate(id, (c) => {
    c.column = ok ? "done" : "todo";
    c.pendingCall = null;
    c.comments = [...(c.comments || []), { at: now(), by: "aap", text: ok ? `Approve${note ? ": " + note : ""}` : `Wapas bheja${note ? ": " + note : ""}` }].slice(-60);
  });
}

// Jarvis card chalao: recipe ho to recipe (MCP tools), warna seedha AI. Natija comment, card Review mein.
const RUNNING = (globalThis.__faheemBoardRunning ||= new Set());
export async function runCard(id, { allowTools = false, deps = null } = {}) {
  const card = getCard(id);
  if (!card) throw new Error("Card nahi mila.");
  if (card.assignee !== "jarvis") throw new Error("Yeh card aap ka hai. Jarvis ko dene ke liye 'Jarvis' chunein.");
  if (RUNNING.has(id)) throw new Error("Yeh card pehle se chal raha hai.");
  RUNNING.add(id);
  try {
    moveCard(id, "doing");
    addComment(id, card.recipe ? `Recipe "${card.recipe}" shuru` : "Kaam shuru", "jarvis");
    let out;
    try {
      if (card.recipe) {
        const { runRecipe } = deps?.recipes || (await import("./mcp/recipes.js"));
        out = await runRecipe(card.recipe, card.values || {}, { allowTools });
      } else {
        const ask = deps?.ask || defaultAsk;
        out = { ok: true, answer: await ask(card) };
      }
    } catch (e) { out = { ok: false, answer: "Masla: " + (e?.message || e) }; }
    const steps = (out.steps || []).map((s) => `${s.ok ? "theek" : "masla"} ${s.server}.${s.tool}`).join(", ");
    return mutate(id, (c) => {
      c.runs = (c.runs || 0) + 1;
      c.pendingCall = out.needConfirm ? out.call : null;
      c.column = "review";
      c.lastOk = !!out.ok;
      const text = out.needConfirm ? `Ijazat chahiye: ${out.call.server}.${out.call.tool} chalaun? ${out.answer || ""}`.trim() : (out.answer || "(khali jawab)") + (steps ? `\n\nTools: ${steps}` : "");
      c.comments = [...(c.comments || []), { at: now(), by: "jarvis", text: text.slice(0, 4000), ok: !!out.ok }].slice(-60);
    });
  } finally { RUNNING.delete(id); }
}

async function defaultAsk(card) {
  const { getProviders, callProvider, isCooling } = await import("./providers.js");
  const history = (card.comments || []).filter((c) => c.by === "aap").slice(-3).map((c) => c.text).join("\n");
  const msgs = [
    { role: "system", content: "You are Jarvis working on a task card from Faheem's task board. Do the task as well as you can in text (plan, draft, answer). Be concrete and short. Reply in Roman Urdu unless the task is in English. If you truly cannot do it without the laptop or internet, say exactly what is needed." },
    { role: "user", content: `TASK: ${card.title}\n${card.detail || ""}${history ? `\n\nFaheem ke notes:\n${history}` : ""}` },
  ];
  let last;
  for (const p of getProviders().filter((x) => !isCooling(x.id))) {
    try { const t = String(await callProvider(p, msgs, 90000) || "").trim(); if (t) return t + `\n(${p.name || p.id})`; } catch (e) { last = e; }
  }
  throw new Error("Koi AI brain jawab nahi de raha" + (last ? `: ${last.message}` : ""));
}

// Autopilot: card ko ops schedule se jorna ("2h", "daily@09:00"). Schedule "board" job banata hai jo runCard chalata hai.
export async function setAutopilot(id, every) {
  const { createSchedule, setScheduleStatus } = await import("./ops/scheduler.js");
  const card = getCard(id);
  if (!card) throw new Error("Card nahi mila.");
  if (card.scheduleId) { try { setScheduleStatus(card.scheduleId, "deleted"); } catch {} }
  if (!every) return mutate(id, (c) => { c.scheduleId = null; c.every = ""; });
  if (card.assignee !== "jarvis") throw new Error("Autopilot sirf Jarvis wale card par.");
  const s = createSchedule({ title: `Board: ${card.title}`, prompt: id, every, kind: "board" });
  return mutate(id, (c) => { c.scheduleId = s.id; c.every = every; });
}

export function summary() {
  const cards = listCards();
  const by = Object.fromEntries(COLUMNS.map((c) => [c.id, cards.filter((x) => x.column === c.id).length]));
  return { by, review: cards.filter((x) => x.column === "review").map((x) => x.title).slice(0, 5), total: cards.length };
}
