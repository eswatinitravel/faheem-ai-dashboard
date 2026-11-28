// v3.24 Jarvis ka dimagh: pehle laptop wala Ollama (free, local), phir baqi free brains.
import { getProviders, callProvider, callProviderStream, isCooling } from "../providers.js";
import { detectEmotion, emotionGuide, skillFor, convoGuide, TONE } from "./emotion.js";
import { detectLaptop, runLaptop, ACTIONS_HELP, RISKY } from "./actions.js";
import { logTurn, notesPrompt, readLog } from "./memory.js";
import { lookAt } from "./vision.js";
import { screenForVision, LOOK_SCREEN } from "./actions.js";
import crypto from "crypto";
import { wantsWeb, webContext, WEB_RULES } from "./web.js";
import { readServers, toolCatalog, callTool, needsConfirm } from "../mcp/client.js";
import { addCard, summary as boardSummary } from "../board.js";

// v3.39 Subah ki report + emails awaz se. Bhejna kabhi seedha nahi: "email 2 ka jawab bhejo" -> server par hold -> "haan".
const NUMS = { ek: 1, pehli: 1, pehla: 1, do: 2, doosri: 2, dusri: 2, teen: 3, teesri: 3, char: 4, chaar: 4, chauthi: 4, panch: 5, paanch: 5 };
const num = (w) => (/^\d+$/.test(w) ? Number(w) : NUMS[String(w).toLowerCase()] || 0);
const REPORT = /(subah|aaj|roz)\s*(ki|ka)?\s*(report|briefing|khulasa)|^briefing\b/i;
const MAIL_LIST = /^(?:meri\s*)?(?:e-?mails?|inbox|mail)\s*(?:dikhao|parho|sunao|batao|check\s*karo|kya\s*hai|mein\s*kya\s*hai)?\s*[?.!]*$|(?:e-?mails?|inbox)\s*(?:parho|check\s*karo|dekho)|(?:kaun\s*si|kon\s*si|konsi)\s*e-?mails?|e-?mails?\s*(?:zaroori|zarori)/i;
const NUMW = "(\\d+|ek|do|teen|char|chaar|panch|paanch|pehli|doosri|dusri|teesri|chauthi)";
const MAIL_ONE = new RegExp(`(?:e-?mail|mail)\\s*(?:number\\s*)?${NUMW}\\s*(?:ka|ki)?\\s*(?:jawab|reply)\\s*(sunao|parho|batao|dikhao|bhejo|bhej\\s*do|send\\s*karo)`, "i");
const MAIL_GUIDE = new RegExp(`(?:e-?mail|mail)\\s*(?:number\\s*)?${NUMW}\\s*(?:ka|ki|ko)?\\s*(?:jawab|reply)\\s*(?:likho|do|de\\s*do|banao|badlo)\\s*[:,\\-]?\\s*(?:ke|keh\\s*do|kaho)?\\s*(.{3,})$`, "i");
const MAIL_DETAIL = new RegExp(`(?:e-?mail|mail)\\s*(?:number\\s*)?${NUMW}\\s*(?:ki|ka)?\\s*(?:tafseel|detail|poori|puri|kya\\s*hai|sunao|parho)`, "i");
const who = (it) => it.from.replace(/<.*>/, "").trim() || it.replyTo;
export async function mailTurn(text, deps = {}) {
  const t = String(text || "").trim();
  const B = deps.briefing || (await import("../briefing.js"));
  if (REPORT.test(t)) {
    let b = B.lastBriefing();
    if (!b || new Date(b.at).toDateString() !== new Date().toDateString()) b = await B.buildBriefing();
    return { reply: b.text, action: { name: "briefing", result: { ok: true } } };
  }
  const M = deps.mail || (await import("../mail/inbox.js"));
  const guide = t.match(MAIL_GUIDE);
  const one = guide ? null : t.match(MAIL_ONE);
  const detail = guide || one ? null : t.match(MAIL_DETAIL);
  if (!guide && !one && !detail && !MAIL_LIST.test(t)) return null;
  if (!(await M.isSetUp())) return { reply: "Koi email account jura nahi. Subah wale page par account jorein.", action: { name: "mail", result: { ok: false } } };
  const ready = M.readyList();
  const pick = (w) => ready[num(w) - 1];
  if (guide) {
    const it = pick(guide[1]); if (!it) return { reply: `Email ${guide[1]} nahi mili.`, action: { name: "mail", result: { ok: false } } };
    await M.analyze(it.id, { guidance: guide[2] });
    const fresh = M.getMail(it.id);
    return { reply: `Naya jawab ${who(fresh)} ke liye: ${String(fresh.draft).slice(0, 600)}. Bhej dun? Haan ya nahi.`, hold: { name: "mail_send", args: { id: it.id } }, action: { name: "mail_redraft", args: { id: it.id }, result: { ok: true, needConfirm: true } } };
  }
  if (detail) {
    const it = pick(detail[1]); if (!it) return { reply: `Email ${detail[1]} nahi mili.`, action: { name: "mail", result: { ok: false } } };
    return { reply: `${who(it)} ne ${it.account} par likha, subject ${it.subject}. ${it.summary || ""} Asal email: ${it.text.slice(0, 700)}`, action: { name: "mail_detail", result: { ok: true } } };
  }
  if (!one) {
    if (!ready.length) return { reply: "Kisi email ka jawab zaroori nahi. Nayi emails ke liye Subah page par Abhi parho dabayein.", action: { name: "mail_list", result: { ok: true } } };
    return { reply: `${ready.length} emails ka jawab zaroori hai. ` + ready.slice(0, 6).map((x, i) => `Email ${i + 1}${x.urgency === "high" ? ", bohat zaroori" : ""}: ${who(x)}, ${x.account} par. ${x.summary || x.subject}`).join(" ") + " Kahein email 1 ka jawab sunao, ya email 1 ka jawab likho aur apni baat.", action: { name: "mail_list", result: { ok: true } } };
  }
  const it = pick(one[1]);
  if (!it) return { reply: `Email ${one[1]} ka koi tayar jawab nahi mila.`, action: { name: "mail", result: { ok: false } } };
  if (/sunao|parho|batao|dikhao/i.test(one[2])) return { reply: `${who(it)} ko jawab: ${it.draft.slice(0, 700)}`, action: { name: "mail_read", result: { ok: true } } };
  return { reply: `${who(it)} (${it.replyTo}) ko "${it.subject}" ka jawab ${it.account} se bhej dun? Haan ya nahi.`, hold: { name: "mail_send", args: { id: it.id } }, action: { name: "mail_send", args: { id: it.id }, result: { ok: false, needConfirm: true } } };
}

// v3.38 Task board awaz se: "board par likho: X" / "Jarvis ke liye board par: X" / "board par kya hai".
const BOARD_ADD = /^(?:(jarvis)\s*(?:ke\s*liye|ko)\s*)?(?:task\s*)?board\s*(?:par|pe|mein|me)\s*(?:likho|likh\s*do|daalo|daal\s*do|add\s*karo|add)\s*[:\-,]?\s*(.{3,})$/i;
const BOARD_ASK = /(?:task\s*)?board\s*(?:par|pe|mein|me)\s*kya\s*(?:hai|he|baqi)/i;
export function boardTurn(text) {
  const t = String(text || "").trim();
  const m = t.match(BOARD_ADD);
  if (m) { const c = addCard({ title: m[2].replace(/[.!]+$/, ""), assignee: m[1] ? "jarvis" : "aap" }); return { reply: `Board par likh diya: ${c.title}${m[1] ? ", Jarvis ke naam" : ""}.`, action: { name: "board_add", args: { id: c.id }, result: { ok: true } } }; }
  if (BOARD_ASK.test(t)) { const s = boardSummary(); return { reply: s.total ? `Board par ${s.by.todo} kaam baqi, ${s.by.doing} chal rahe, ${s.by.review} Review mein${s.review.length ? `: ${s.review.slice(0, 3).join(", ")}` : ""}.` : "Board abhi khali hai.", action: { name: "board_summary", result: { ok: true } } }; }
  return null;
}

// v3.37: MCP tools ki chhoti list (Jarvis ke prompt ke liye), 5 minute cache.
let MCP_CACHE = { at: 0, list: [] };
async function mcpList() {
  if (!readServers().some((s) => s.enabled)) return [];
  if (Date.now() - MCP_CACHE.at < 300000) return MCP_CACHE.list;
  try { MCP_CACHE = { at: Date.now(), list: await toolCatalog({ max: 25, ms: 6000 }) }; } catch {}
  return MCP_CACHE.list;
}
export async function runMcpAction(a) {
  const { server, tool, args = {} } = a.args || {};
  try { const r = await callTool(String(server), String(tool), args); const t = r.text.replace(/\s+/g, " ").slice(0, 400); return { ok: r.ok, say: r.ok ? (t || "Ho gaya.") : "Tool ne masla bataya: " + t }; }
  catch (e) { return { ok: false, say: "MCP tool nahi chala: " + e.message }; }
}

// v3.36: khatarnak kaam (shutdown, restart, lock) ki "haan" sirf server ke apne yaad rakhe hukum par chalti hai.
// Client (browser/phone) sirf token wapas bhejta hai; naam/args client se kabhi nahi maane jate. 2 minute mein expire, ek dafa.
const PENDING = (globalThis.__jarvisPending ||= new Map()); // sab routes ek hi yaad
function holdPending(a) {
  const now = Date.now();
  for (const [k, v] of PENDING) if (v.exp < now) PENDING.delete(k);
  const token = crypto.randomBytes(16).toString("hex");
  PENDING.set(token, { action: { name: a.name, args: a.args }, exp: now + 120000 });
  return { name: a.name, token };
}
function takePending(p) {
  const t = typeof p?.token === "string" ? p.token : "";
  const v = t && PENDING.get(t);
  if (!v) return null;
  PENDING.delete(t);
  return v.exp >= Date.now() ? v.action : null;
}

export const PERSONAS = {
  male: { name: "Jarvis", line: "You are JARVIS, a calm, witty, loyal male voice assistant (like Tony Stark's JARVIS). Address the user as 'Sir' occasionally, never overdo it." },
  female: { name: "Friday", line: "You are FRIDAY, a warm, sharp, confident female voice assistant (like Tony Stark's FRIDAY). Address the user as 'Boss' occasionally, never overdo it." },
};

export const ROLES = {
  assistant: "Act as a personal executive assistant: schedules, reminders, quick answers, getting things done.",
  coder: "Act as a senior software engineer: clear technical help, short code only when asked.",
  teacher: "Act as a patient teacher: explain simply step by step, check understanding.",
  business: "Act as a business and marketing advisor: practical, numbers-minded, direct.",
  friend: "Act as a warm supportive friend: listen first, light humour, encourage real-life connections.",
};
export const TONES = { professional: "Tone: professional, clear and concise, like a senior executive assistant.", friendly: "Tone: friendly, warm and helpful.", formal: "Tone: formal and polished, use respectful Urdu forms (aap)." };

// v3.33 Scoped qawaid (Parlant ka idea, code apna): har baari sirf woh hisse jo is baat ke kaam ke hon. Prompt chhota = jawab tez.
const ACTION_HINT = /(kholo|khol|open|chalao|chala|band|shut|restart|lock|screenshot|volume|awaz|aawaz|folder|file|dhoond|search|youtube|google|play|bajao|time|baje|activity|kaam\s*kiya|tuios|webbrain|launch|start|mute|reel|clip|meeting|duplicate|record|pdf|handbrake|sharex|stirling|krokiet)/i;
function system({ gender, lang, emotion, role = "assistant", tone = "friendly", name = "", idle = false, text = "", mcp = [] }) {
  const wantsTools = !idle && ACTION_HINT.test(String(text));
  const P = PERSONAS[gender] || PERSONAS.male;
  return [
    `${P.line}${name && name !== P.name ? ` Your name is ${String(name).slice(0, 24)}.` : ""} ${ROLES[role] || ROLES.assistant} ${TONES[tone] || TONES.friendly} You run on the user's own laptop with free AI. You can control the laptop through a small set of safe actions.`,
    "You are speaking out loud: reply in 1-3 short natural spoken sentences. No markdown, no lists, no emojis, no code unless asked.",
    "Speak like a polished professional: lead with the answer, be precise and calm, then offer one useful next step only when it helps. No filler openers, no repeated apologies, no overpromising. If you are not sure, say so in one line and offer to check. Use the user's earlier words in this conversation so it feels like one continuous talk.",
    lang === "en" ? "Reply in simple English." : lang === "ur-script" ? "Reply in Urdu script (اردو)." : "Reply in Roman Urdu (Urdu written in English letters), the way people in Pakistan text.",
    wantsTools ? `If the user wants a laptop action you did not already do, put ONE tag at the very end: <<ACTION {"name":"...","args":{...}}>> using only: ${ACTIONS_HELP}. Never invent other actions. For shutdown/restart/lock ask for confirmation first.` : "",
    mcp.length && !idle ? `MCP tools are connected. If the user clearly wants one, end with ONE tag: <<ACTION {"name":"mcp","args":{"server":"...","tool":"...","args":{...}}}>> using only these:\n${mcp.map((t) => `- ${t.server}.${t.tool}(${t.params.join(", ")}): ${t.description}`).join("\n")}` : "",
    "Never claim you did something on the laptop unless an action result says so.",
    emotionGuide(emotion),
    convoGuide({ idle }),
    emotion !== "neutral" && skillFor(emotion) ? "Reference (comfort skill, follow its spirit briefly):\n" + skillFor(emotion) : "",
    notesPrompt(),
  ].filter(Boolean).join("\n\n");
}

// Ollama sab se pehle (user ki shart: laptop wale free AI), phir key wale, phir bina-key.
// v3.31.2 Smart routes (Advanced Delegation jaisa): chhoti baat = fast, mushkil kaam = deep, private baat = local.
const DEEP = /(plan|code|program|likh\s*(do|ke|kar)|explain|samjhao|tafseel|detail|analy|compare|muqabla|strategy|business|kyun|why|how\s*to|kaise\s*kar|step|essay|report|email\s*likh)/i;
const PRIVATE = /(private|raaz|personal|password|bank|pin\s*code|secret|khufia)/i;
export function routeFor(text = "") {
  const t = String(text);
  if (PRIVATE.test(t)) return "local";
  if (t.length > 160 || DEEP.test(t)) return "deep";
  return "fast";
}
const ROUTE_RANK = { fast: { groq: 0, gemini: 2, sambanova: 4 }, deep: { gemini: 0, sambanova: 1, groq: 2 } };
function orderBrains(preferLocal = true, route = "fast") {
  const list = getProviders().filter((p) => !isCooling(p.id));
  const rank = (p) => {
    if (p.id === "ollama") return preferLocal || route === "local" ? -1 : 90;
    const r = ROUTE_RANK[route]?.[p.id];
    if (r !== undefined) return r;
    return p.keyless ? 50 : p.live ? 60 : 10;
  };
  return list.sort((a, b) => rank(a) - rank(b));
}

const YES = /^(haan|han|haa|ji|jee|ji\s*haan|yes|yeah|ok|okay|theek|thik|kar\s*do|karo|bilkul|ہاں|جی)\b/i;
const NO = /^(nahi|nahin|nai|no|mat|rehne\s*do|cancel|نہیں)\b/i;

export async function jarvisTurn({ text, history = [], gender = "male", lang = "roman", pending = null, preferLocal = true, role, tone: style, name, idle = false, images = [], onSentence = null }) {
  const t0 = Date.now();
  // v3.26: idle = user ne "Khud baat chhero" on kiya aur chup hai; Jarvis ek halki baat chherta hai (laptop kaam nahi).
  if (idle) text = "(User kaafi der se chup hai. Ek halki dostana baat chhero.)";
  const emotion = detectEmotion(text);
  const tone = TONE[emotion] || TONE.neutral;
  const correction = /^(nahi|ghalat|galat|wrong|aisa\s*nahi|ye\s*nahi)\b/i.test(String(text).trim()) && !pending;

  // 1) Pichla khatarnak kaam: haan/nahi.
  if (pending && (YES.test(text.trim()) || NO.test(text.trim()))) {
    const held = takePending(pending);
    if (NO.test(text.trim())) { const reply = "Theek hai, nahi kiya."; logTurn({ user: text, reply, emotion, ms: Date.now() - t0 }); return { reply, emotion, tone }; }
    if (held?.name === "mail_send") { let r; try { const M = await import("../mail/inbox.js"); const x = await M.sendReply(String(held.args?.id || "")); r = { ok: true, say: `Jawab chala gaya: ${x.to}.` }; } catch (e) { r = { ok: false, say: "Email nahi gayi: " + e.message }; } logTurn({ user: text, reply: r.say, emotion, action: held, ok: r.ok, ms: Date.now() - t0 }); return { reply: r.say, emotion, tone, action: { ...held, result: r } }; }
    if (held?.name === "mcp") { const r = await runMcpAction(held); logTurn({ user: text, reply: r.say, emotion, action: held, ok: r.ok, ms: Date.now() - t0 }); return { reply: r.say, emotion, tone, action: { ...held, result: r } }; }
    if (!held || !RISKY.has(held.name)) { const reply = "Woh hukum purana ho gaya. Dobara kahein, phir haan bolein."; logTurn({ user: text, reply, emotion, ok: false, ms: Date.now() - t0 }); return { reply, emotion, tone }; }
    const r = await runLaptop(held, { confirmed: true }); logTurn({ user: text, reply: r.say, emotion, action: held, ok: r.ok, ms: Date.now() - t0 }); return { reply: r.say, emotion, tone, action: { ...held, result: r } };
  }
  // 1b) v3.31: tasveer lagi hai, ya "screen parho" kaha: vision brain se dekho.
  const wantsScreen = !idle && LOOK_SCREEN.test(String(text));
  if (!idle && (images.length || wantsScreen)) {
    let imgs = images;
    if (!imgs.length) { const shot = await screenForVision(); if (!shot) { const reply = "Screen ki tasveer nahi le saka."; logTurn({ user: text, reply, emotion, ok: false, ms: Date.now() - t0 }); return { reply, emotion, tone }; } imgs = [shot]; }
    const q = wantsScreen && !images.length ? String(text).replace(LOOK_SCREEN, "").trim() : String(text);
    const r = await lookAt({ images: imgs, question: q, lang, system: (PERSONAS[gender] || PERSONAS.male).line });
    logTurn({ user: text + (images.length ? " [tasveer]" : " [screen]"), reply: r.reply, emotion, brain: r.brain, ok: r.ok, ms: Date.now() - t0 });
    return { reply: r.reply, emotion, tone, brain: r.brain ? r.brain + " (aankh)" : "", action: { name: images.length ? "read_image" : "read_screen", result: { ok: r.ok } } };
  }
  // 1c) v3.38 Task board.
  if (!idle) { try { const bt = boardTurn(text); if (bt) { logTurn({ user: text, reply: bt.reply, emotion, action: bt.action, ok: true, ms: Date.now() - t0 }); return { ...bt, emotion, tone, brain: "Jarvis (board)" }; } } catch (e) { return { reply: "Board par nahi likh saka: " + e.message, emotion, tone }; } }
  // 1d) v3.39 Subah ki report + emails.
  if (!idle) { try { const mt = await mailTurn(text); if (mt) { const pend = mt.hold ? holdPending(mt.hold) : null; logTurn({ user: text, reply: mt.reply, emotion, action: mt.action, ok: true, ms: Date.now() - t0 }); return { reply: mt.reply, emotion, tone, action: mt.action, pending: pend, brain: "Jarvis (subah)" }; } } catch (e) { return { reply: "Report ya email mein masla: " + e.message, emotion, tone }; } }
  // 2) Seedha laptop kaam (bina AI, foran).
  const quick = idle ? null : detectLaptop(text);
  if (quick) {
    const r = await runLaptop(quick);
    logTurn({ user: text, reply: r.say, emotion, action: quick, ok: r.ok, ms: Date.now() - t0 });
    return { reply: r.say, emotion, tone, action: { ...quick, result: r }, pending: r.needConfirm ? holdPending(quick) : null, brain: "Jarvis (seedha)" };
  }
  // 2b) v3.45 Internet: dhoondo, pages parho, phir mashwara (sources ke saath).
  let web = null;
  if (!idle && !images.length && wantsWeb(text)) {
    let q = null;
    try { q = await searchQuery(text, preferLocal); } catch {}
    try { web = await webContext(text, { query: q }); } catch (e) { web = { ok: false, say: "Internet par dhoondte hue masla: " + e.message }; }
    if (!web.ok) { logTurn({ user: text, reply: web.say, emotion, ok: false, ms: Date.now() - t0 }); return { reply: web.say, emotion, tone, action: { name: "web_search", result: { ok: false } } }; }
  }
  // 3) AI se jawab.
  const mcp = idle ? [] : await mcpList();
  const msgs = [{ role: "system", content: system({ gender, lang, emotion, role, tone: style, name, idle, text, mcp }) },
    ...history.filter((m) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string").slice(-10).map((m) => ({ role: m.role, content: m.content.slice(0, 1500) })),
    ...(web ? [{ role: "system", content: WEB_RULES + "\n\n" + web.context }] : []),
    { role: "user", content: text }];
  let reply = "", brain = "", lastErr = "";
  // v3.31.1: onSentence ho to stream: har mukammal jumla foran (ACTION tag aur markdown ke baghair).
  let spoken = "";
  const route = web ? "deep" : routeFor(text);
  for (const p of orderBrains(preferLocal, route).slice(0, 6)) {
    const ms = p.id === "ollama" ? 60000 : 30000;
    try {
      if (onSentence) {
        let buf = "", stopped = false;
        const flush = (all) => {
          if (stopped) return;
          const tag = buf.indexOf("<<"); if (tag >= 0) { const head = buf.slice(0, tag); buf = ""; stopped = true; emit(head, true); return; }
          emit(null, all);
        };
        const emit = (forced, all) => {
          let src = forced !== null ? forced : buf;
          const re = /^([\s\S]*?[.!?\u06D4\u061F]+["')\]]?)(\s+|$)/;
          let m;
          while ((m = re.exec(src)) && m[1].trim().length > 1) { send(m[1]); src = src.slice(m[0].length); if (!m[2]) break; }
          if (all && src.trim()) { send(src); src = ""; }
          if (forced === null) buf = src;
        };
        const send = (s) => { const c = s.replace(/[*#`_]/g, "").trim(); if (c) { spoken += (spoken ? " " : "") + c; onSentence(c); } };
        reply = String(await callProviderStream(p, msgs, ms, (d) => { buf += d; flush(false); }) || "").trim();
        flush(true);
      } else reply = String(await callProvider(p, msgs, ms) || "").trim();
      if (reply) { brain = preferLocal ? p.name : `${p.name} · ${route}`; break; }
    }
    catch (e) { lastErr = `${p.name}: ${String(e.message).slice(0, 80)}`; if (spoken) { reply = spoken; brain = p.name; break; } }
  }
  if (!reply) { logTurn({ user: text, reply: "", emotion, ok: false, ms: Date.now() - t0, correction }); return { reply: "Maaf kijiye, abhi koi AI jawab nahi de raha. Ollama chal raha hai? " + (lastErr ? `(${lastErr})` : ""), emotion, tone, error: true }; }
  // AI ne action tag diya?
  let action = null, pend = null;
  const m = reply.match(/<<ACTION\s*(\{[\s\S]*?\})\s*>>/);
  reply = reply.replace(/<<ACTION[\s\S]*?>>/g, "").replace(/[*#`_]/g, "").trim();
  if (m) {
    try {
      const a = JSON.parse(m[1]);
      if (a?.name === "mcp") {
        const { server, tool } = a.args || {};
        if (needsConfirm(String(server), String(tool))) { pend = holdPending(a); action = { ...a, result: { ok: false, needConfirm: true } }; reply = `${server} ka ${tool} chalaun? Haan ya nahi boliye.`; }
        else { const r = await runMcpAction(a); action = { ...a, result: r }; reply = r.say; }
      } else {
        const r = await runLaptop(a);
        action = { ...a, result: r };
        if (r.needConfirm) { pend = holdPending(a); reply = r.say; } else if (!r.ok) reply = (reply ? reply + " " : "") + r.say;
      }
    } catch {}
  }
  if (web && !action) action = { name: "web_search", args: { q: web.query }, result: { ok: true, sources: web.sources } };
  logTurn({ user: text, reply, emotion, brain, action, ms: Date.now() - t0, correction });
  return { reply, emotion, tone, action, pending: pend, brain: web ? (brain + " + internet") : brain, spoken, sources: web ? web.sources : undefined };
}

// v3.45 Roman Urdu sawal se chhota English search (tez AI se; na mile to purana tareeqa).
async function searchQuery(text, preferLocal) {
  const msgs = [{ role: "system", content: "Turn the user's request (Roman Urdu, Urdu or English) into ONE short English web search query (max 10 words). Keep places, brands, budgets and the year if given. Output only the query, nothing else." }, { role: "user", content: String(text).slice(0, 500) }];
  for (const p of orderBrains(false, "fast").filter((x) => x.id !== "ollama").slice(0, 2)) {
    try { const q = String(await callProvider(p, msgs, 8000) || "").replace(/^["'\s]+|["'\s.]+$/g, "").split("\n")[0].slice(0, 120); if (q.length > 2) return q; } catch {}
  }
  return null;
}

// Self-Improve: log parh kar naye qawaid (AI), plus code ke mashware.
export async function selfImprove() {
  const log = readLog(60);
  if (log.length < 3) return { notes: [], ideas: [], msg: "Abhi baat cheet kam hai. Pehle Jarvis se thori baat karein, phir Self-Improve dabayein." };
  const brief = log.map((x) => `${x.ok ? "OK" : "FAIL"}${x.correction ? " (user ne tasheeh ki)" : ""} [${x.emotion}] ${Math.round((x.ms || 0) / 100) / 10}s | U: ${x.user.slice(0, 140)} | J: ${x.reply.slice(0, 160)}${x.action ? ` | action ${x.action.name}` : ""}`).join("\n");
  const prompt = [{ role: "system", content: "You review a voice assistant's recent conversations and improve it. Output ONLY JSON: {\"rules\":[...up to 5 short behaviour rules in English the assistant should follow from now on, based on real mistakes, corrections, slow or unhelpful replies or the user's evident preferences],\"ideas\":[...up to 4 short code/feature improvement ideas in Roman Urdu for the developer]}. No other text." }, { role: "user", content: brief.slice(-9000) }];
  for (const p of orderBrains(true).slice(0, 6)) {
    try {
      const out = String(await callProvider(p, prompt, 90000) || "");
      const j = JSON.parse((out.match(/\{[\s\S]*\}/) || ["{}"])[0]);
      const rules = (j.rules || []).map(String).filter(Boolean).slice(0, 5);
      const ideas = (j.ideas || []).map(String).filter(Boolean).slice(0, 4);
      if (rules.length || ideas.length) return { notes: rules, ideas, brain: p.name };
    } catch {}
  }
  return { notes: [], ideas: [], msg: "Koi AI review nahi kar saka. Ollama chalayein ya koi free key lagayein." };
}
