// v3.39 Subah ki report + v3.40 kai email accounts. Sirf isi laptop se (localhost).
// Email bhejna sirf "mail_send" + confirm:true se, jo page par aap ke "Bhejo" (aur haan) par hi aata hai.
import { buildBriefing, lastBriefing, ensureDailyBriefing, briefingSchedule } from "../../../lib/briefing.js";
import * as M from "../../../lib/mail/inbox.js";
import { listAccounts, addAccount, removeAccount, patchAccount, publicAccount, PRESETS, detectProvider } from "../../../lib/mail/accounts.js";
import { startDeviceLogin, pollDeviceLogin } from "../../../lib/mail/msauth.js";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const isLocal = (req) => ["localhost", "127.0.0.1", "[::1]"].includes((req.headers.get("host") || "").split(":")[0]);
const bad = (error, status = 400) => Response.json({ ok: false, error }, { status });
const pub = (it) => ({ id: it.id, account: it.account, accountLabel: it.accountLabel, from: it.from, replyTo: it.replyTo, subject: it.subject, date: it.date, text: it.text, status: it.status, urgency: it.urgency || "", summary: it.summary || "", needsReply: !!it.needsReply, draft: it.draft, sentAt: it.sentAt || null });

export async function GET(req) {
  if (!isLocal(req)) return bad("Sirf isi laptop par.", 403);
  const m = M.listMail();
  const ready = M.readyList().map((x) => x.id);
  const rank = (it) => { const i = ready.indexOf(it.id); return i < 0 ? 999 : i; };
  const items = m.items.filter((x) => x.status !== "skipped").sort((a, b) => rank(a) - rank(b)).slice(0, 60).map((x) => ({ ...pub(x), n: rank(x) < 999 ? rank(x) + 1 : null }));
  const presets = Object.fromEntries(Object.entries(PRESETS).map(([k, v]) => [k, { name: v.name, auth: v.auth, help: v.help, imap: v.imap.host, smtp: v.smtp.host }]));
  return Response.json({ ok: true, briefing: lastBriefing(), schedule: await briefingSchedule(),
    mail: { setUp: await M.isSetUp(), accounts: (await listAccounts()).map(publicAccount), presets, lastCheck: m.lastCheck, errors: m.errors || [], items, counts: M.counts() } });
}

export async function POST(req) {
  if (!isLocal(req)) return bad("Sirf isi laptop par.", 403);
  let b; try { b = await req.json(); } catch { return bad("Bad request"); }
  const id = String(b?.id || "");
  try {
    switch (b?.action) {
      case "build": return Response.json({ ok: true, briefing: await buildBriefing() });
      case "schedule": return Response.json({ ok: true, schedule: await ensureDailyBriefing(b.every === "" ? "" : /^daily@\d{1,2}:\d{2}$/.test(b.every) ? b.every : "daily@09:00") });
      case "detect": return Response.json({ ok: true, provider: detectProvider(String(b.email || "")) });
      case "account_add": {
        const a = await addAccount(b.account || {});
        if (a.auth === "oauth_ms") return Response.json({ ok: true, account: publicAccount(a), next: "ms_login" });
        const t = await M.testAccount(a.id);
        return Response.json({ ok: t.ok, error: t.ok ? undefined : t.error, account: publicAccount(a) });
      }
      case "account_remove": return Response.json({ ok: await removeAccount(id) });
      case "account_toggle": return Response.json({ ok: true, account: publicAccount(await patchAccount(id, (a) => { a.enabled = !a.enabled; })) });
      case "account_test": { const t = await M.testAccount(id); return Response.json({ ok: t.ok, error: t.ok ? undefined : t.error }); }
      case "ms_start": return Response.json({ ok: true, ...(await startDeviceLogin(id)) });
      case "ms_poll": { const r = await pollDeviceLogin(id); if (r.done) { const t = await M.testAccount(id); return Response.json({ ok: t.ok, done: true, error: t.ok ? undefined : t.error }); } return Response.json({ ok: true, ...r }); }
      case "mail_refresh": { const r = await M.refresh({ days: 2 }); const d = await M.analyze(); return Response.json({ ok: true, ...r, ...d }); }
      case "mail_draft": return Response.json({ ok: true, ...(await M.analyze(id, { guidance: String(b.guidance || "").slice(0, 1000) })) });
      case "mail_edit": return Response.json({ ok: true, item: pub(M.editDraft(id, b.text)) });
      case "mail_skip": return Response.json({ ok: true, item: pub(M.skip(id)) });
      case "mail_send": { if (b.confirm !== true) return bad("Bhejne ke liye haan chahiye."); return Response.json(await M.sendReply(id)); }
      default: return bad("action?");
    }
  } catch (e) { return bad(e.message || String(e)); }
}
