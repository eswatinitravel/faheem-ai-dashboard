import { getProviders, sortProviders, isCooling, callProvider } from "../../../../lib/providers";
import { AGENTS } from "../../../../lib/agents";
import { projectDir, runTool } from "../../../../lib/agent/tools";
import { BOTS, buildMessages, parseProposals, addProposal, takeProposal, rejectProposal, pickOrder, publicProposal } from "../../../../lib/agent/team-chat.js";
import { audit } from "../../../../lib/ops/audit.js";
import { isPaused } from "../../../../lib/ops/control.js";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// v3.27 AI Team group chat. POST {action:"chat", project, history, bots} -> NDJSON (har bot ki baari).
// POST {action:"approve"|"reject", project, id} -> sirf user ke button se, ek dafa.
export async function GET() { return Response.json({ ok: true, bots: BOTS }); }

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const project = String(b.project || "").trim();
  if (b.action === "reject") return Response.json({ ok: rejectProposal(b.id) });
  if (b.action === "approve") {
    if (!project) return Response.json({ ok: false, error: "project chahiye" }, { status: 400 });
    if (isPaused()) return Response.json({ ok: false, error: "Pause All chalu hai — pehle Resume karein." }, { status: 423 });
    const t = takeProposal(b.id, project);
    if (t.error) return Response.json({ ok: false, error: t.error }, { status: 409 });
    const r = t.rec, dir = projectDir(project), runId = "teamchat-" + Date.now();
    audit("teamchat_approved", `${project}: ${r.kind === "write" ? "file " + r.path : r.cmd.slice(0, 200)}`, { bot: r.bot, hash: r.hash.slice(0, 16) });
    let out;
    try {
      out = r.kind === "write" ? await runTool(dir, runId, "write_file", { path: r.path }, r.content) : await runTool(dir, runId, "run_command", { cmd: r.cmd });
    } catch (e) { out = "Ghalti: " + e.message; }
    return Response.json({ ok: true, proposal: publicProposal(r), output: String(out ?? "").slice(0, 6000) });
  }
  if (b.action !== "chat") return Response.json({ ok: false, error: "action: chat | approve | reject" }, { status: 400 });
  if (!project) return Response.json({ ok: false, error: "project chahiye" }, { status: 400 });

  const history = (Array.isArray(b.history) ? b.history : []).slice(-30)
    .map((m) => ({ role: m.role === "user" ? "user" : "bot", bot: m.bot, content: String(m.content || "").slice(0, 6000) }))
    .filter((m) => m.content.trim());
  if (!history.length || history[history.length - 1].role !== "user") return Response.json({ ok: false, error: "Pehle apna sawal likhein" }, { status: 400 });
  const want = Array.isArray(b.bots) && b.bots.length ? b.bots : BOTS.map((x) => x.id);
  const team = BOTS.filter((x) => want.includes(x.id));
  if (!team.length) return Response.json({ ok: false, error: "Kam az kam ek bot chunein" }, { status: 400 });

  const enc = new TextEncoder();
  const signal = req.signal;
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (o) => { try { ctrl.enqueue(enc.encode(JSON.stringify(o) + "\n")); } catch {} };
      const providers = getProviders();
      const taken = new Set();
      const convo = [...history];
      for (const bot of team) {
        if (signal?.aborted) break;
        send({ type: "turn", bot: bot.id, name: bot.name });
        const prefer = AGENTS.find((a) => a.id === bot.agent)?.prefer || [];
        const order = pickOrder(providers, prefer, taken, sortProviders, isCooling).slice(0, 5);
        const errors = [];
        let text = null, used = null;
        for (const p of order) {
          if (signal?.aborted) break;
          try { const r = await callProvider(p, buildMessages(bot, convo), 90000); if (r && String(r).trim()) { text = String(r).trim(); used = p; break; } errors.push(`${p.name}: khali`); }
          catch (e) { errors.push(`${p.name}: ${String(e.message).slice(0, 80)}`); }
        }
        if (text == null) { send({ type: "error", bot: bot.id, name: bot.name, text: order.length ? "Koi brain jawab nahi de saka: " + errors.join(" | ") : "Abhi koi brain khali nahi (sab limit par)." }); continue; }
        taken.add(used.id);
        const proposals = parseProposals(text).map((p) => (p.kind === "blocked" ? { kind: "blocked", reason: p.reason, cmd: p.cmd } : addProposal(p, project, bot.id)));
        convo.push({ role: "bot", bot: bot.id, content: text });
        send({ type: "reply", bot: bot.id, name: bot.name, text, brain: used.name, proposals });
      }
      send({ type: "done" });
      try { ctrl.close(); } catch {}
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache" } });
}
