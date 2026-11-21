// v3.21 Copilot: front chat ka dimagh. Har message par faisla: kaun sa specialist, kaun se brains (kis tarteeb mein),
// kaun si skills (dashboard ki built-in + GitHub wali), aur kyun. Pehle bina AI ke (keywords + seekha hua);
// sirf jab saaf na ho to sab se tez brain se 1 chhota sawal (6 sec, warna keyword wala faisla).
import { AGENTS, routeAgent } from "./agents.js";
import { SKILLS } from "./skills.js";
import { skillFor, skillsContext } from "./github.js";
import { DESIGN_RULES } from "./design.js";
import { callProvider, isCooling } from "./providers.js";

// Dashboard ki apni skills: kab lagani hain (lafz) aur chat ko kya bataana hai.
const BUILTIN = [
  { id: "hallmark", words: /(design|website|page|landing|ui\b|css|layout|hero|section)/i, roles: ["web", "uiux"], note: () => DESIGN_RULES },
  { id: "ui-ux-pro-max", words: /(rang|color|colour|palette|font|typography|style|brand look|design system)/i, roles: ["web", "uiux"], note: () => "Use the UI UX Pro Max design database approach: pick a product type, then a matching style, colour palette (as CSS variables), font pairing and landing pattern. Explain the choice in one line." },
  { id: "impeccable", words: /(audit|check design|design check|contrast|accessib|a11y)/i, roles: ["uiux", "web"], note: () => "After writing UI code, self-audit it like Impeccable: side-tab borders, low contrast, overused fonts (Inter/Poppins everywhere), AI purple-blue palettes, missing focus states. List fixes." },
  { id: "browser-tester", words: /(test|chal raha|kaam kar raha|button kaam|click)/i, roles: ["web", "coder"], note: () => "Before finishing, mentally run the page: every onclick handler defined, every script closed, forms have labels, no console errors." },
  { id: "playwright", words: /(playwright|e2e|end to end|browser test|screenshot test)/i, roles: ["coder", "web"], note: () => "Prefer Playwright for real browser tests; give a runnable test file and the exact npx command for Windows." },
  { id: "compound-engineering", words: /(plan|feature|refactor|architecture|bara kaam|project)/i, roles: ["coder"], note: () => "Work Compound-Engineering style: Plan (small steps) -> Work -> Review -> write one lesson learned at the end." },
  { id: "graphify", words: /(codebase|knowledge graph|graph|samjhao project|repo samjhao)/i, roles: ["coder", "research"], note: () => "When explaining a codebase, map modules and how they connect before details." },
  { id: "agent-team", words: /(team|swarm|kai agents|multi agent)/i, roles: ["coder", "general"], note: () => "Split the job into roles (planner, builder, reviewer) and show each role's output briefly." },
  { id: "memory", words: /(yaad|remember|pichli baar|pehle bataya)/i, roles: null, note: () => "Use the memory context given above; say plainly if you do not remember something." },
];

export function builtinSkillsFor(text, role) {
  const out = [];
  for (const b of BUILTIN) if (b.words.test(text) && (!b.roles || b.roles.includes(role))) out.push(b);
  // Website par Hallmark hamesha (purana rule).
  if (role === "web" && !out.find((x) => x.id === "hallmark")) out.unshift(BUILTIN[0]);
  return out.slice(0, 3);
}

// Saari skills ki chhoti list (chat ko pata ho kya kya maujood hai).
export function allSkillsCatalog() {
  const built = SKILLS.map((s) => `- ${s.name}: ${String(s.summary || "").slice(0, 110)}`).join("\n");
  const gh = skillsContext(25);
  return `Dashboard skills available in this chat (the Copilot applies them automatically; the user can also ask for one by name):\n${built}${gh ? "\n\n" + gh : ""}`;
}

// Kaam ki qism se brain ki khoobi.
const NEED = {
  coder: "strong at code", web: "strong at code + design", uiux: "can see images, design sense", writer: "good Urdu / Roman Urdu",
  business: "fast numbers", travel: "broad knowledge", research: "deep reasoning", general: "fast",
};

function score(text, a) {
  const t = ` ${text.toLowerCase()} `; let s = 0;
  for (const w of a.words) {
    const hit = w.includes(" ") ? t.includes(w) : new RegExp(`[^a-z0-9]${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^a-z0-9]`).test(t);
    if (hit) s += w.includes(" ") ? 2 : 1;
  }
  return s;
}

// Sab se tez brain se ek lafz ka faisla (sirf jab keywords se saaf na ho).
async function askRouter(providers, text) {
  const fast = ["groq", "cerebras", "gemini", "sambanova", "mistral"].map((id) => providers.find((p) => p.id === id && !isCooling(p.id))).filter(Boolean)[0];
  if (!fast) return null;
  const ids = AGENTS.map((a) => a.id).join(", ");
  const msgs = [
    { role: "system", content: `You are a router. Reply with ONE word only, one of: ${ids}. coder=code/bugs/apps, web=websites/pages, uiux=design review, writer=writing/captions/urdu, business=money/brand/selling, travel=trips/visas, research=explain/compare, general=chit-chat.` },
    { role: "user", content: String(text).slice(0, 600) },
  ];
  try {
    const r = await Promise.race([callProvider(fast, msgs, 6000), new Promise((_, no) => setTimeout(() => no(new Error("t")), 6500))]);
    const w = String(r || "").toLowerCase().match(/[a-z]+/g) || [];
    const id = w.find((x) => AGENTS.some((a) => a.id === x));
    return id ? { id, by: fast.name } : null;
  } catch { return null; }
}

// Faisla: { agent, why, skills: [{id,name,text}], brainsNote }
export async function decide({ text, forced, task, hasImage, providers }) {
  let agent, why;
  if (forced && forced !== "auto") { agent = routeAgent("", forced); why = "aap ne khud chuna"; }
  else if (task === "web") { agent = routeAgent("", "web"); why = "website ka kaam"; }
  else {
    const ranked = AGENTS.map((a) => ({ a, s: score(text, a) })).sort((x, y) => y.s - x.s);
    const top = ranked[0], second = ranked[1];
    if (top.s >= 2 && top.s > second.s) { agent = top.a; why = `lafz mile (${top.s})`; }
    else if (hasImage && /design|ui|screen|layout/i.test(text)) { agent = routeAgent("", "uiux"); why = "tasveer + design"; }
    else if (String(text).trim().length > 15) {
      const r = await askRouter(providers || [], text);
      if (r) { agent = routeAgent("", r.id); why = `${r.by} se poocha`; }
      else { agent = top.s ? top.a : AGENTS.at(-1); why = top.s ? "lafz mile" : "aam baat"; }
    } else { agent = top.s ? top.a : AGENTS.at(-1); why = top.s ? "lafz mile" : "aam baat"; }
  }
  if (/[\u0600-\u06FF]/.test(text) && agent.id === "general") { agent = routeAgent("", "writer"); why = "Urdu likhai"; }

  const skills = [];
  for (const b of builtinSkillsFor(text, agent.id)) {
    const meta = SKILLS.find((s) => s.id === b.id);
    skills.push({ id: b.id, name: meta?.name || b.id, text: b.note() });
  }
  try {
    const gh = skillFor(text);
    if (gh) for (const m of gh.matchAll(/installed skill "([^"]+)"/g)) skills.push({ id: m[1], name: m[1], text: null });
    if (gh) skills.push({ id: "_gh", name: "", text: gh });
  } catch {}

  return { agent, why, need: NEED[agent.id] || "", skills };
}

export function copilotPrompt(d) {
  return `COPILOT: This request was routed to ${d.agent.name} (${d.why}). Do the whole job here in chat; do not tell the user to go to another page unless a real file/app action is needed. If a better tool or skill exists in this dashboard, use its method directly.`;
}
