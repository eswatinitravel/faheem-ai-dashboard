// v3.24 Jarvis ka dimagh: pehle laptop wala Ollama (free, local), phir baqi free brains.
import { getProviders, callProvider, isCooling } from "../providers.js";
import { detectEmotion, emotionGuide, skillFor, convoGuide, TONE } from "./emotion.js";
import { detectLaptop, runLaptop, ACTIONS_HELP, RISKY } from "./actions.js";
import { logTurn, notesPrompt, readLog } from "./memory.js";

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
export const TONES = { professional: "Tone: professional, clear and concise.", friendly: "Tone: friendly, warm and helpful.", formal: "Tone: formal and polished, use respectful Urdu forms (aap)." };

function system({ gender, lang, emotion, role = "assistant", tone = "friendly", name = "", idle = false }) {
  const P = PERSONAS[gender] || PERSONAS.male;
  return [
    `${P.line}${name && name !== P.name ? ` Your name is ${String(name).slice(0, 24)}.` : ""} ${ROLES[role] || ROLES.assistant} ${TONES[tone] || TONES.friendly} You run on the user's own laptop with free AI. You can control the laptop through a small set of safe actions.`,
    "You are speaking out loud: reply in 1-3 short natural spoken sentences. No markdown, no lists, no emojis, no code unless asked.",
    lang === "en" ? "Reply in simple English." : lang === "ur-script" ? "Reply in Urdu script (اردو)." : "Reply in Roman Urdu (Urdu written in English letters), the way people in Pakistan text.",
    `If the user wants a laptop action you did not already do, put ONE tag at the very end: <<ACTION {"name":"...","args":{...}}>> using only: ${ACTIONS_HELP}. Never invent other actions. For shutdown/restart/lock ask for confirmation first.`,
    "Never claim you did something on the laptop unless an action result says so.",
    emotionGuide(emotion),
    convoGuide({ idle }),
    skillFor(emotion) ? "Reference (comfort skill, follow its spirit briefly):\n" + skillFor(emotion) : "",
    notesPrompt(),
  ].filter(Boolean).join("\n\n");
}

// Ollama sab se pehle (user ki shart: laptop wale free AI), phir key wale, phir bina-key.
function orderBrains(preferLocal = true) {
  const list = getProviders().filter((p) => !isCooling(p.id));
  const rank = (p) => (p.id === "ollama" ? (preferLocal ? -1 : 90) : p.keyless ? 50 : p.live ? 60 : 10);
  return list.sort((a, b) => rank(a) - rank(b));
}

const YES = /^(haan|han|haa|ji|jee|ji\s*haan|yes|yeah|ok|okay|theek|thik|kar\s*do|karo|bilkul|ہاں|جی)\b/i;
const NO = /^(nahi|nahin|nai|no|mat|rehne\s*do|cancel|نہیں)\b/i;

export async function jarvisTurn({ text, history = [], gender = "male", lang = "roman", pending = null, preferLocal = true, role, tone: style, name, idle = false }) {
  const t0 = Date.now();
  // v3.26: idle = user ne "Khud baat chhero" on kiya aur chup hai; Jarvis ek halki baat chherta hai (laptop kaam nahi).
  if (idle) text = "(User kaafi der se chup hai. Ek halki dostana baat chhero.)";
  const emotion = detectEmotion(text);
  const tone = TONE[emotion] || TONE.neutral;
  const correction = /^(nahi|ghalat|galat|wrong|aisa\s*nahi|ye\s*nahi)\b/i.test(String(text).trim()) && !pending;

  // 1) Pichla khatarnak kaam: haan/nahi.
  if (pending?.name && RISKY.has(pending.name)) {
    if (YES.test(text.trim())) { const r = await runLaptop(pending, { confirmed: true }); logTurn({ user: text, reply: r.say, emotion, action: pending, ok: r.ok, ms: Date.now() - t0 }); return { reply: r.say, emotion, tone, action: { ...pending, result: r } }; }
    if (NO.test(text.trim())) { const reply = "Theek hai, nahi kiya."; logTurn({ user: text, reply, emotion, ms: Date.now() - t0 }); return { reply, emotion, tone }; }
  }
  // 2) Seedha laptop kaam (bina AI, foran).
  const quick = idle ? null : detectLaptop(text);
  if (quick) {
    const r = await runLaptop(quick);
    logTurn({ user: text, reply: r.say, emotion, action: quick, ok: r.ok, ms: Date.now() - t0 });
    return { reply: r.say, emotion, tone, action: { ...quick, result: r }, pending: r.needConfirm ? quick : null, brain: "Jarvis (seedha)" };
  }
  // 3) AI se jawab.
  const msgs = [{ role: "system", content: system({ gender, lang, emotion, role, tone: style, name, idle }) },
    ...history.filter((m) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string").slice(-10).map((m) => ({ role: m.role, content: m.content.slice(0, 1500) })),
    { role: "user", content: text }];
  let reply = "", brain = "", lastErr = "";
  for (const p of orderBrains(preferLocal).slice(0, 6)) {
    try { reply = String(await callProvider(p, msgs, p.id === "ollama" ? 90000 : 45000) || "").trim(); if (reply) { brain = p.name; break; } }
    catch (e) { lastErr = `${p.name}: ${String(e.message).slice(0, 80)}`; }
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
      if (r.needConfirm) { pend = a; reply = r.say; } else if (!r.ok) reply = (reply ? reply + " " : "") + r.say;
    } catch {}
  }
  logTurn({ user: text, reply, emotion, brain, action, ms: Date.now() - t0, correction });
  return { reply, emotion, tone, action, pending: pend, brain };
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
