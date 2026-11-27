// v3.33 Plan pehle (Plannotator ka idea, code apna): Agent kaam shuru karne se pehle chhota plan deta hai.
// Aap plan badal sakte hain, phir "Approve" par Agent usi plan par chalta hai. Koi file nahi badalti.
import { getProviders, callProvider, isCooling } from "../../../../lib/providers.js";
import { isPaused } from "../../../../lib/ops/control";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function isLocal(req) {
  const host = (req.headers.get("host") || "").split(":")[0];
  return ["localhost", "127.0.0.1", "[::1]"].includes(host);
}

export async function POST(req) {
  if (!isLocal(req)) return Response.json({ error: "Agent sirf isi laptop par." }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const task = String(b?.task || "").trim().slice(0, 4000);
  if (!task) return Response.json({ error: "Kaam likhein." }, { status: 400 });
  if (isPaused()) return Response.json({ error: "Pause All chalu hai." }, { status: 423 });
  const msgs = [
    { role: "system", content: "You are a senior developer. Write a short build plan for the task, BEFORE any code. 3-8 numbered steps, each one line: which files to create or change and what. Then one line 'Risk:' naming anything that could break or delete data. Roman Urdu for explanations, file names as-is. No code." },
    { role: "user", content: `Project: ${String(b.project || "").slice(0, 60)}\nTask: ${task}` },
  ];
  const rank = (p) => (p.id === "ollama" ? 90 : p.keyless ? 50 : 10);
  let lastErr = "";
  for (const p of getProviders().filter((x) => !isCooling(x.id)).sort((a, c) => rank(a) - rank(c)).slice(0, 5)) {
    try { const plan = String(await callProvider(p, msgs, 45000) || "").trim(); if (plan) return Response.json({ plan, brain: p.name }); }
    catch (e) { lastErr = `${p.name}: ${String(e.message).slice(0, 80)}`; }
  }
  return Response.json({ error: "Plan nahi ban saka. " + lastErr }, { status: 502 });
}
