// v3.32 Phone se Jarvis: /api/v1/jarvis (proxy.js phone key / Bearer check karta hai).
// Khatarnak kaam (shutdown, restart, lock waghera) par Jarvis pehle "haan/nahi" poochta hai, phone se bhi.
import { jarvisTurn } from "../../../../lib/jarvis/brain.js";
import { isPaused } from "../../../../lib/ops/control";
import { notePhoneSeen } from "../../../../lib/phone.js";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function POST(req) {
  try { notePhoneSeen(req.headers.get("user-agent")); } catch {}
  let b; try { b = await req.json(); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }
  const text = String(b?.text || "").trim().slice(0, 2000);
  if (!text) return Response.json({ error: "Kuch likhein ya bolein." }, { status: 400 });
  try { if (isPaused()) return Response.json({ reply: "Pause All chalu hai. Laptop par Resume dabayein.", emotion: "neutral" }); } catch {}
  const out = await jarvisTurn({
    text,
    history: Array.isArray(b.history) ? b.history.slice(-10) : [],
    gender: b.gender === "female" ? "female" : "male",
    lang: ["en", "ur-script", "roman"].includes(b.lang) ? b.lang : "roman",
    pending: b.pending || null,
    preferLocal: b.preferLocal !== false,
    role: "assistant",
    tone: "professional",
    name: "",
  });
  return Response.json({ reply: out.reply, pending: out.pending || null, action: out.action?.name || null, brain: out.brain || "" });
}
