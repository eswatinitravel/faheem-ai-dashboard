import { getProviders, callProvider, isCooling } from "../../../lib/providers";
import { AGENTS, BASE, routeAgent } from "../../../lib/agents";

export const dynamic = "force-dynamic";

export async function GET() {
  const providers = getProviders().map((p) => ({ id: p.id, name: p.name, model: p.model, cooling: !!isCooling(p.id) }));
  const agents = AGENTS.map((a) => ({ id: a.id, name: a.name, icon: a.icon }));
  return Response.json({ providers, agents });
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  const history = Array.isArray(body?.messages) ? body.messages.slice(-20) : [];
  const clean = history
    .filter((m) => m && typeof m.content === "string" && ["user", "assistant"].includes(m.role) && m.meta !== "error")
    .map((m) => ({ role: m.role, content: m.content }));
  const lastUser = [...clean].reverse().find((m) => m.role === "user")?.content || "";

  // Master Agent picks the specialist.
  const agent = routeAgent(lastUser, body?.agent);

  const system = [{ role: "system", content: `${BASE}\n\n${agent.prompt}` }];
  if (body?.voice) system.push({ role: "system", content: "The user is talking by voice and your reply will be read aloud. Answer in 1-4 short spoken sentences, no markdown, no lists, no code unless asked." });
  if (body?.voice && body?.voiceLang === "ur") system.push({ role: "system", content: "Write this spoken reply in proper Urdu script (اردو رسم الخط), not Roman Urdu and not English, so the Urdu voice pronounces it correctly. Keep technical words like npm or website in English letters only if needed." });
  const messages = [...system, ...clean];

  // Brain order: manual choice first, else the specialist's favourite free providers.
  let providers = getProviders();
  const order = body?.provider && body.provider !== "auto" ? [body.provider, ...agent.prefer] : agent.prefer;
  // Order: aapki keys wale brains -> bina key free brains -> laptop Ollama.
  const rank = (id) => {
    if (body?.provider && body.provider !== "auto" && id === body.provider) return -1;
    if (id === "pollinations") return 50;
    if (id === "llm7") return 51;
    if (id === "ollama") return 60;
    const i = order.indexOf(id);
    return i < 0 ? 40 : i;
  };
  providers.sort((a, b) => rank(a.id) - rank(b.id));

  const errors = [];
  for (const p of providers) {
    if (isCooling(p.id)) {
      errors.push(`${p.name}: cooling down`);
      continue;
    }
    try {
      const reply = await callProvider(p, messages);
      return Response.json({ reply, provider: p.name, model: p.model, agent: { id: agent.id, name: agent.name, icon: agent.icon }, skipped: errors });
    } catch (err) {
      errors.push(`${p.name}: ${err.message}`);
    }
  }
  return Response.json({ error: "Koi provider jawab nahi de saka.", details: errors }, { status: 503 });
}
