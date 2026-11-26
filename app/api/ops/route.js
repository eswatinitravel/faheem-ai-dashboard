import { boot as realBoot } from "../../../lib/ops/boot";
// v3.17.1: ops pehli dafa /workflows khulne par shuru hota tha. v3.29: server.mjs listen ke baad /api/ops?boot=1 khud bulata hai
// (isi route ke andar, taake handlers / queue wahi module istemal karein jo yeh route karta hai).
const boot = () => { try { realBoot(); } catch (e) { console.error("[ops]", e?.message); } };
import { listJobs, counts, enqueue, retryJob, cancelJob, resumeAfterApproval } from "../../../lib/ops/queue";
import { listApprovals, decide } from "../../../lib/ops/approvals";
import { listAudit, audit } from "../../../lib/ops/audit";
import { isPaused, setPaused } from "../../../lib/ops/control";
import { listSchedules, createSchedule, runNow, setScheduleStatus } from "../../../lib/ops/scheduler";
import { exportAll } from "../../../lib/ops/export";
import { readLines } from "../../../lib/ops/store";
import { allRoles, saveOverride } from "../../../lib/brain-roles";
import { getProviders } from "../../../lib/providers";

export const dynamic = "force-dynamic";

function isLocal(req) {
  const host = (req.headers.get("host") || "").split(":")[0];
  return ["localhost", "127.0.0.1", "[::1]"].includes(host);
}
const bad = (error, status = 400) => Response.json({ ok: false, error }, { status });

// v3.17 Workflows: kaam, ijazat, audit, schedules, brains order, Pause All, export.
export async function GET(req) {
  if (!isLocal(req)) return bad("Sirf isi laptop par.", 403);
  boot();
  const url = new URL(req.url);
  // v3.29: server.mjs ka halka "jagao" call — poora data nahi bhejte.
  if (url.searchParams.get("boot") === "1") return Response.json({ ok: true, booted: !!globalThis.__faheemOps, since: globalThis.__faheemOpsBootedAt || null });
  if (url.searchParams.get("export") === "1") {
    audit("data_export", "Saara data export kiya");
    return new Response(JSON.stringify(exportAll(), null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="faheem-ai-export-${new Date().toISOString().slice(0, 10)}.json"` } });
  }
  const live = new Set(getProviders().map((p) => p.id));
  return Response.json({
    ok: true, paused: isPaused(), counts: counts(),
    jobs: listJobs().slice(0, 100), approvals: listApprovals().slice(0, 100), audit: listAudit(150),
    schedules: listSchedules(), notifications: readLines("notifications.jsonl", 30),
    roles: allRoles().map((r) => ({ ...r, order: r.order.map((id) => ({ id, on: live.has(id) })) })),
  });
}

export async function POST(req) {
  if (!isLocal(req)) return bad("Sirf isi laptop par.", 403);
  // CSRF: sirf apne hi page se (browser Origin bhejta hai).
  const origin = req.headers.get("origin");
  if (origin && !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin)) return bad("Ghalat origin.", 403);
  boot();
  const b = await req.json().catch(() => ({}));
  try {
    switch (b.action) {
      case "pause": return Response.json({ ok: true, paused: setPaused(true) });
      case "resume": return Response.json({ ok: true, paused: setPaused(false) });
      case "approve":
      case "reject": {
        const a = decide(String(b.id), b.action === "approve", b.action === "approve" && b.args ? b.args : undefined);
        if (a.status === "approved" && a.jobId) resumeAfterApproval(a.jobId, a.id);
        return Response.json({ ok: true, approval: a });
      }
      case "retry": return Response.json({ ok: true, job: retryJob(String(b.id)) });
      case "cancel": return Response.json({ ok: true, job: cancelJob(String(b.id)) });
      case "ask": {
        const prompt = String(b.prompt || "").trim();
        if (!prompt) return bad("Sawal likhein.");
        return Response.json({ ok: true, job: enqueue("prompt", { prompt: prompt.slice(0, 4000), role: String(b.role || "general") }, { title: prompt.slice(0, 80) }) });
      }
      case "schedule": return Response.json({ ok: true, schedule: createSchedule({ title: b.title, prompt: b.prompt, every: b.every || "once", at: b.at || null, kind: b.kind === "reminder" ? "reminder" : "prompt" }) });
      case "run_now": return Response.json({ ok: true, job: runNow(String(b.id)) });
      case "schedule_status": return Response.json({ ok: true, schedule: setScheduleStatus(String(b.id), String(b.status)) });
      case "brain_order": { const order = saveOverride(String(b.role), Array.isArray(b.order) ? b.order : []); audit("brain_order", `${b.role}: ${order.slice(0, 5).join(" > ")}`); return Response.json({ ok: true, order }); }
      default: return bad("Ghalat action.");
    }
  } catch (e) { return bad(e.message); }
}
