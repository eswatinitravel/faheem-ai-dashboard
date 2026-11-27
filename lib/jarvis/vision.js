// v3.31 Jarvis ki aankh: tasveer ya screen dekh kar jawab (Gemini / Groq vision, free key se).
import { getProviders, callProvider, isCooling, visionProviders } from "../providers.js";

export async function lookAt({ images = [], question = "", lang = "roman", system = "" }) {
  const imgs = images.filter((u) => typeof u === "string" && /^data:image\/(png|jpe?g|webp);base64,/.test(u) && u.length < 6_000_000).slice(0, 3);
  if (!imgs.length) return { ok: false, reply: "Tasveer theek se nahi mili. Dobara lagayein." };
  const vp = visionProviders(getProviders()).filter((p) => !isCooling(p.id));
  if (!vp.length) return { ok: false, reply: "Tasveer dekhne ke liye Gemini ya Groq ki free key chahiye. Options mein Keys par ja kar lagayein." };
  const langLine = lang === "en" ? "Answer in simple English." : lang === "ur-script" ? "Answer in Urdu script." : "Answer in Roman Urdu.";
  const msgs = [
    { role: "system", content: (system ? system + "\n\n" : "") + "You are looking at an image the user shared (or their screen). Read all visible text accurately, then answer the user's question. If no question, say in 2-4 spoken sentences what it is and the key information (names, numbers, prices, errors, links). Never invent text you cannot read; say it is unclear. " + langLine },
    { role: "user", content: [{ type: "text", text: question || "Is tasveer mein kya hai? Zaroori maloomat batao." }, ...imgs.map((u) => ({ type: "image_url", image_url: { url: u } }))] },
  ];
  let lastErr = "";
  for (const p of vp.slice(0, 3)) {
    try { const out = String(await callProvider(p, msgs, 60000) || "").replace(/[*#`_]/g, "").trim(); if (out) return { ok: true, reply: out, brain: p.name }; }
    catch (e) { lastErr = `${p.name}: ${String(e.message).slice(0, 100)}`; }
  }
  return { ok: false, reply: "Tasveer abhi nahi parh saka. " + (lastErr ? `(${lastErr})` : "") };
}
