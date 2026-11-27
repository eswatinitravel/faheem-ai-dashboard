// v3.39 Subah ki report + Gmail inbox API. Sirf isi laptop se (localhost). Email bhejna sirf "mail_send" se,
// jo page par aap ke "Bhejo" dabane (aur confirm) par hi aata hai.
import { buildBriefing, lastBriefing, ensureDailyBriefing, briefingSchedule } from "../../../lib/briefing.js";
import * as M from "../../../lib/mail/inbox.js";
import { readSaved, writeSaved, getConfig } from "../../../lib/config.js";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const isLocal = (req) => ["localhost", "127.0.0.1", "[::1]"].includes((req.headers.get("host") || "").split(":")[0]);
const bad = (error, status = 400) => Response.json({ ok: false, error }, { status });
const pub = (it) => ({ id: it.id, from: it.from, replyTo: it.replyTo, subject: it.subject, date: it.date, text: it.text, status: it.status, draft: it.draft, sentAt: it.sentAt || null });

export async function GET(req) {
  if (!isLocal(req)) return bad("Sirf isi laptop par.", 403);
  const m = M.listMail();
  return Response.json({ ok: true, briefing: lastBriefing(), schedule: await briefingSchedule(), mail: { setUp: await M.isSetUp(), user: getConfig().GMAIL_USER || "", lastCheck: m.lastCheck, lastError: m.lastError, items: m.items.filter((x) => x.status !== "skipped").slice(0, 40).map(pub), counts: M.counts() } });
}

export async function POST(req) {
  if (!isLocal(req)) return bad("Sirf isi laptop par.", 403);
  let b; try { b = await req.json(); } catch { return bad("Bad request"); }
  const id = String(b?.id || "");
  try {
    switch (b?.action) {
      case "build": return Response.json({ ok: true, briefing: await buildBriefing() });
      case "schedule": return Response.json({ ok: true, schedule: await ensureDailyBriefing(b.every === "" ? "" : /^daily@\d{1,2}:\d{2}$/.test(b.every) ? b.every : "daily@08:00") });
      case "mail_setup": {
        const user = String(b.user || "").trim(), pass = String(b.pass || "").replace(/\s+/g, "");
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(user)) return bad("Email ka pata ghalat.");
        if (pass && !/^[a-z]{16}$/i.test(pass)) return bad("Google App Password 16 haroof ka hota hai (jaise abcd efgh ijkl mnop).");
        writeSaved({ ...readSaved(), GMAIL_USER: user, ...(pass ? { GMAIL_APP_PASSWORD: pass } : {}) });
        const t = await M.testLogin();
        return Response.json({ ok: t.ok, error: t.ok ? undefined : t.error });
      }
      case "mail_forget": writeSaved({ ...readSaved(), GMAIL_USER: "", GMAIL_APP_PASSWORD: "" }); return Response.json({ ok: true });
      case "mail_refresh": { const r = await M.refresh({ days: 2 }); const d = await M.draft(); return Response.json({ ok: true, ...r, ...d }); }
      case "mail_draft": return Response.json({ ok: true, ...(await M.draft(id)) });
      case "mail_edit": return Response.json({ ok: true, item: pub(M.editDraft(id, b.text)) });
      case "mail_skip": return Response.json({ ok: true, item: pub(M.skip(id)) });
      case "mail_send": { if (b.confirm !== true) return bad("Bhejne ke liye haan chahiye."); return Response.json(await M.sendReply(id)); }
      default: return bad("action?");
    }
  } catch (e) { return bad(e.message || String(e)); }
}
