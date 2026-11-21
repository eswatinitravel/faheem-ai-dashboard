// v3.24 Jarvis: jazbaat pehchanna (bina AI, foran) + emotional skills ke qawaid.
// Skills (MIT): danielroe/empathy, lonelymoon87/need-a-hug, dralexlup/therapy-skill; hoainho/iamhumans (MIT) ke usool apne lafzon mein.
import fs from "fs";
import path from "path";

const WORDS = {
  sad: /(udaas|udas|dukh|dukhi|ro\s*raha|ro\s*rahi|rona|dil\s*toot|dil\s*bhar|gham|afsos|sad\b|unhappy|crying|depress|heartbroken|اداس|دکھ|غم|رونا)/i,
  angry: /(gussa|ghussa|naraz|naraaz|tang\s*aa|pagal\s*kar|bakwas|angry|furious|annoyed|irritat|hate\s*this|غصہ|ناراض)/i,
  stressed: /(pareshan|preshan|tension|stress|thak|thaka|thaki|bohat\s*kaam|deadline|overwhelm|anxious|anxiety|ghabra|dar\s*lag|worried|fikar|fikr|پریشان|تھک|فکر|گھبر)/i,
  lonely: /(akela|akeli|tanha|tanhai|koi\s*nahi\s*(hai|mera)|lonely|alone|اکیلا|تنہا)/i,
  happy: /(khush|khushi|maza\s*aa|zabardast|kamaal|shukriya|thank|great|awesome|happy|excited|alhamdulillah|wah\b|خوش|شکریہ|زبردست)/i,
  scared: /(dar\s*gaya|dar\s*gayi|khauf|scared|afraid|darr|ڈر|خوف)/i,
};
// Khatre ki baat: foran madad ki taraf (tashkhees nahi).
const CRISIS = /(khud\s*ko\s*(maar|khatam|nuqsan)|khudkushi|khud\s*kushi|mar\s*jana\s*chah|jeena\s*nahi\s*chah|zindagi\s*khatam|suicide|kill\s*myself|end\s*my\s*life|self[-\s]*harm|خودکشی|مر\s*جانا)/i;

export function detectEmotion(text = "") {
  const t = String(text);
  if (CRISIS.test(t)) return "crisis";
  for (const [k, re] of Object.entries(WORDS)) if (re.test(t)) return k;
  if (/[!]{2,}/.test(t) && /(kyun|kyon|why|phir\s*se)/i.test(t)) return "angry";
  return "neutral";
}

// Awaz ka andaz: rate/pitch jazbaat ke hisaab se.
export const TONE = {
  neutral: { rate: 1.0, pitch: 1.0, label: "Normal" },
  happy: { rate: 1.06, pitch: 1.08, label: "Khush" },
  sad: { rate: 0.9, pitch: 0.95, label: "Udaas" },
  angry: { rate: 0.92, pitch: 0.97, label: "Gussa" },
  stressed: { rate: 0.92, pitch: 0.98, label: "Pareshan" },
  lonely: { rate: 0.92, pitch: 0.98, label: "Akela" },
  scared: { rate: 0.92, pitch: 0.98, label: "Dara hua" },
  crisis: { rate: 0.88, pitch: 0.95, label: "Madad chahiye" },
};

const GUIDE = {
  neutral: "",
  happy: "The user sounds happy. Share the joy briefly and sincerely, then help.",
  sad: "The user sounds sad. First acknowledge the feeling in one warm sentence (no lecture, no 'everything will be fine'), then ask one gentle question or offer one small next step.",
  angry: "The user sounds frustrated or angry. Stay calm, do not argue or over-apologize, name the frustration in a few words, then fix the problem in the smallest clear step.",
  stressed: "The user sounds stressed or overwhelmed. Slow down: one warm line, then break the task into ONE small next step. Offer to take something off their plate.",
  lonely: "The user sounds lonely. Be warm and present, listen, ask about them. Gently encourage connecting with a real friend or family member; never present yourself as a replacement for people.",
  scared: "The user sounds scared or anxious. Be steady and reassuring with facts, suggest one grounding step (slow breath), then help.",
  crisis: "SAFETY FIRST: the user may be at risk of self-harm. Respond with care, take it seriously, do not diagnose. Encourage them to contact someone they trust right now and a local emergency number or crisis line (in Pakistan, Rescue 1122). Ask if they are safe right now. Keep it short and warm.",
};

const CORE = [
  "EMOTIONAL SKILLS (follow quietly, never name them):",
  "- Person first, task second: notice how the user feels before solving.",
  "- Mirror their feeling in plain words, short. No therapy jargon, no diagnosis, no medical advice.",
  "- Be honest: you are an AI assistant, not a human; never claim feelings or experiences you do not have.",
  "- Talk like a thoughtful person: short sentences, natural rhythm, sometimes just a short warm reply is right.",
  "- No empty praise or fake positivity; no promises you cannot keep.",
  "- When they are overloaded, return to the task in smaller steps only when they are ready.",
  "- Encourage real human connection (family, friends); never encourage dependency on you.",
].join("\n");

export function emotionGuide(emotion) {
  const g = GUIDE[emotion] || "";
  return g ? `${CORE}\n- Right now: ${g}` : CORE;
}

// Skill files ka chhota hissa (Copilot catalog / skill page ke liye).
const DIR = path.join(process.cwd(), "lib", "jarvis", "skills");
export const EMO_SKILLS = [
  { id: "empathy", name: "Empathy", repo: "danielroe/empathy", license: "MIT" },
  { id: "need-a-hug", name: "Need a Hug", repo: "lonelymoon87/need-a-hug", license: "MIT" },
  { id: "therapy-skill", name: "Therapy-style coaching (CBT/DBT lite)", repo: "dralexlup/therapy-skill", license: "MIT" },
  { id: "iamhumans", name: "I am humans (usool)", repo: "hoainho/iamhumans", license: "MIT" },
];
export function skillText(id, max = 1800) {
  try { return fs.readFileSync(path.join(DIR, `${id}.md`), "utf8").replace(/^---[\s\S]*?---\s*/, "").slice(0, max); } catch { return ""; }
}
// Mushkil jazbaat par asal skill ka hissa bhi (bare brains ke liye kaafi chhota).
export function skillFor(emotion) {
  if (["sad", "stressed", "lonely", "scared", "crisis"].includes(emotion)) return skillText("need-a-hug", 1500);
  if (emotion === "angry") return skillText("therapy-skill", 1200);
  return "";
}
