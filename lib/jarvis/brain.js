// v3.24 Jarvis ka dimagh: pehle laptop wala Ollama (free, local), phir baqi free brains.
import { getProviders, callProvider, callProviderStream, isCooling } from "../providers.js";
import { detectEmotion, emotionGuide, skillFor, convoGuide, TONE } from "./emotion.js";
import { detectLaptop, runLaptop, ACTIONS_HELP, RISKY } from "./actions.js";
import { logTurn, notesPrompt, readLog } from "./memory.js";
import { lookAt } from "./vision.js";
import { screenForVision, LOOK_SCREEN } from "./actions.js";
import crypto from "crypto";

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
function system({ gender, lang, emotion, role = "assistant", tone = "friendly", name = "", idle = false, text = "" }) {
  const wantsTools = !idle && ACTION_HINT.test(String(text));
  const P = PERSONAS[gender] || PERSONAS.male;
  return [
    `${P.line}${name && name !== P.name ? ` Your name is ${String(name).slice(0, 24)}.` : ""} ${ROLES[role] || ROLES.assistant} ${TONES[tone] || TONES.friendly} You run on the user's own laptop with free AI. You can control the laptop through a small set of safe actions.`,
    "You are speaking out loud: reply in 1-3 short natural spoken sentences. No markdown, no lists, no emojis, no code unless asked.",
    "Speak like a polished professional: lead with the answer, be precise and calm, then offer one useful next step only when it helps. No filler openers, no repeated apologies, no overpromising. If you are not sure, say so in one line and offer to check. Use the user's earlier words in this conversation so it feels like one continuous talk.",
    lang === "en" ? "Reply in simple English." : lang === "ur-script" ? "Reply in Urdu script (اردو)." : "Reply in Roman Urdu (Urdu written in English letters), the way people in Pakistan text.",
    wantsTools ? `If the user wants a laptop action you did not already do, put ONE tag at the very end: <<ACTION {"name":"...","args":{...}}>> using only: ${ACTIONS_HELP}. Never invent other actions. For shutdown/restart/lock ask for confirmation first.` : "",
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
  // 2) Seedha laptop kaam (bina AI, foran).
  const quick = idle ? null : detectLaptop(text);
  if (quick) {
    const r = await runLaptop(quick);
    logTurn({ user: text, reply: r.say, emotion, action: quick, ok: r.ok, ms: Date.now() - t0 });
    return { reply: r.say, emotion, tone, action: { ...quick, result: r }, pending: r.needConfirm ? holdPending(quick) : null, brain: "Jarvis (seedha)" };
  }
  // 3) AI se jawab.
  const msgs = [{ role: "system", content: system({ gender, lang, emotion, role, tone: style, name, idle, text }) },
    ...history.filter((m) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string").slice(-10).map((m) => ({ role: m.role, content: m.content.slice(0, 1500) })),
    { role: "user", content: text }];
  let reply = "", brain = "", lastErr = "";
  // v3.31.1: onSentence ho to stream: har mukammal jumla foran (ACTION tag aur markdown ke baghair).
  let spoken = "";
  const route = routeFor(text);
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
      const r = await runLaptop(a);
      action = { ...a, result: r };
      if (r.needConfirm) { pend = holdPending(a); reply = r.say; } else if (!r.ok) reply = (reply ? reply + " " : "") + r.say;
    } catch {}
  }
  logTurn({ user: text, reply, emotion, brain, action, ms: Date.now() - t0, correction });
  return { reply, emotion, tone, action, pending: pend, brain, spoken };
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
