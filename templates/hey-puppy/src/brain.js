// Hey Puppy ka dimagh: Groq (free key) pehle, phir Ollama (laptop par, chhota 2B-4B model). Koi paid service nahi.
// Mood tag + tool tags parse karta hai, Urdu / Roman Urdu / English pehchaan kar usi zabaan mein jawab.
const MOODS = ["happy", "excited", "sad", "sleepy", "curious", "listening", "thinking", "playful", "love"];

function detectLang(text) {
  const t = String(text || "");
  if (/[\u0600-\u06FF]/.test(t)) return "ur";
  if (/\b(kya|hai|hain|mujhe|mera|meri|karo|kar|nahi|haan|aap|kaise|kyun|banao|batao|acha|theek|shukriya|kal|aaj)\b/i.test(t)) return "roman-ur";
  return "en";
}

function moodFromText(text) {
  const t = String(text || "").toLowerCase();
  if (/\b(love|pyar|pyaar|mohabbat|thank you|shukriya|jazakallah)\b|محبت|شکریہ/.test(t)) return "love";
  if (/\b(wow|zabardast|great|awesome|congrat|mubarak|yay|kamaal)\b|مبارک|زبردست/.test(t)) return "excited";
  if (/\b(sad|udaas|dukh|sorry|afsos|problem|masla|fail|ghalti|error)\b|افسوس|اداس/.test(t)) return "sad";
  if (/\b(sleep|neend|so ja|thak|tired|good night|shab bakhair)\b|نیند|شب بخیر/.test(t)) return "sleepy";
  if (/\b(play|khel|joke|mazaak|haha|lol|bark)\b|مذاق/.test(t)) return "playful";
  if (/\?|\b(kya|kyun|kaise|why|how|what)\b/.test(t)) return "curious";
  return "happy";
}

function parseReply(raw) {
  let text = String(raw || "");
  let mood = null;
  const m = text.match(/\[mood:\s*([a-z]+)\s*\]/i);
  if (m && MOODS.includes(m[1].toLowerCase())) mood = m[1].toLowerCase();
  text = text.replace(/\[mood:[^\]]*\]/gi, "");
  const tools = [];
  text = text.replace(/<tool\s+name="([a-z_]+)"\s*>([\s\S]*?)<\/tool>/gi, (_, name, body) => {
    let args = {};
    try { args = JSON.parse(body.trim() || "{}"); } catch { args = { text: body.trim() }; }
    tools.push({ name, args });
    return "";
  });
  text = text.trim();
  return { text, mood: mood || moodFromText(text), tools };
}

function systemPrompt({ persona, memory, lessons, skills, tools, lang, page }) {
  const langLine = lang === "ur" ? "User ne Urdu (Nastaliq) mein likha/bola: jawab Urdu script mein do."
    : lang === "roman-ur" ? "User Roman Urdu mein baat kar raha hai: jawab Roman Urdu mein do."
    : "User wrote in English: reply in English.";
  return `You are ${persona.assistantName}, ${persona.ownerName}'s private desktop puppy assistant on his Windows laptop. ${persona.personality}
${langLine}
Keep replies short (1-3 sentences, they are spoken aloud). Start every reply with a mood tag like [mood:happy]. Moods: ${MOODS.join(", ")}.
To act, add tool tags: <tool name="TOOL">{"arg":"value"}</tool>. The app ALWAYS asks ${persona.ownerName} Allow/Deny before any action that changes something; never claim an action is done before the result comes back.
TOOLS:
${tools.map((t) => `- ${t.name}: ${t.description}`).join("\n")}
${memory.length ? `\nWHAT YOU KNOW ABOUT ${persona.ownerName.toUpperCase()}:\n- ${memory.slice(-15).join("\n- ")}` : ""}
${lessons.length ? `\nSEEKHA HUA (lessons):\n- ${lessons.slice(-10).join("\n- ")}` : ""}
${skills.length ? `\nSKILLS:\n${skills.map((s) => `## ${s.name}\n${s.text.slice(0, 800)}`).join("\n")}` : ""}
${page ? `\nCURRENT BROWSER PAGE (from the Chrome extension): ${page.title} (${page.url})\n${String(page.text).slice(0, 6000)}` : ""}`;
}

async function callGroq(key, model, messages, timeoutMs = 45000) {
  const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST", signal: ac.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages, temperature: 0.6, max_tokens: 600 }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`Groq ${r.status}: ${(j.error && j.error.message) || "error"}`.slice(0, 200));
    return j.choices[0].message.content || "";
  } finally { clearTimeout(tm); }
}

async function callOllama(model, messages, timeoutMs = 120000) {
  const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch("http://127.0.0.1:11434/api/chat", { method: "POST", signal: ac.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model, messages, stream: false }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`Ollama ${r.status}: ${j.error || "error"}`);
    return (j.message && j.message.content) || "";
  } finally { clearTimeout(tm); }
}

// Free brains ek ke baad ek: Groq (2 models) -> Ollama.
async function think(messages, cfg) {
  const errors = [];
  if (cfg.GROQ_API_KEY) {
    for (const model of [cfg.GROQ_MODEL || "openai/gpt-oss-20b", "llama-3.1-8b-instant"]) {
      try { const t = await callGroq(cfg.GROQ_API_KEY, model, messages); if (t.trim()) return { text: t, brain: `Groq ${model}` }; } catch (e) { errors.push(e.message); }
    }
  }
  try { const model = cfg.OLLAMA_MODEL || "qwen2.5:3b"; const t = await callOllama(model, messages); if (t.trim()) return { text: t, brain: `Ollama ${model}` }; } catch (e) { errors.push(`Ollama: ${e.message}`); }
  throw new Error("Koi free brain nahi chala. Settings mein Groq ki free key lagayein (console.groq.com/keys) ya Ollama install karke 'ollama pull qwen2.5:3b' chalayein. " + errors.slice(0, 2).join(" | "));
}

module.exports = { MOODS, detectLang, moodFromText, parseReply, systemPrompt, think, callGroq, callOllama };
