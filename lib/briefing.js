// v3.39 Subah ki report: kal ka focus (ActivityWatch), board ke kaam, aur emails (Jarvis ne jawab tayar kiye, bheje nahi).
import { readJson, writeJson, appendLine } from "./ops/store.js";
import { awDaySummary, fmtMin } from "./activitywatch.js";
import { summary as boardSummary, listCards } from "./board.js";

export const lastBriefing = () => readJson("briefing.json", null);

export async function buildBriefing({ deps = {}, speakAloud = false } = {}) {
  const aw = await (deps.aw || awDaySummary)(1);
  const board = boardSummary();
  const urgent = listCards().filter((c) => c.column !== "done" && (c.priority === "high" || (c.due && c.due <= new Date().toISOString().slice(0, 10)))).slice(0, 5).map((c) => c.title);
  let mail = { setUp: false };
  try {
    const M = deps.mail || (await import("./mail/inbox.js"));
    if (await M.isSetUp()) {
      mail.setUp = true;
      try { const r = await M.refresh({ days: 1 }); mail.added = r.added; mail.accounts = r.accounts; if (r.errors?.length) mail.error = r.errors.join("; "); } catch (e) { mail.error = e.message; }
      try { const d = await M.analyze(); mail.analyzed = d.analyzed; } catch (e) { mail.error ||= e.message; }
      mail.counts = M.counts();
      mail.ready = M.readyList().map((x, i) => ({ n: i + 1, id: x.id, account: x.accountLabel ? `${x.accountLabel} (${x.account})` : x.account, from: x.from.replace(/<.*>/, "").trim().slice(0, 40) || x.replyTo, subject: x.subject.slice(0, 80), urgency: x.urgency, summary: x.summary }));
    }
  } catch (e) { mail.error = e.message; }

  const lines = [];
  const h = new Date().getHours();
  lines.push(h < 12 ? "Subah bakhair." : h < 17 ? "Salam." : "Shaam bakhair.");
  if (aw.ok) lines.push(aw.totalMin ? `Kal aap ne ${fmtMin(aw.totalMin)} laptop par kaam kiya. Sab se zyada: ${aw.apps.slice(0, 3).map((a) => `${a.app} ${fmtMin(a.min)}`).join(", ")}.` : "Kal laptop par koi kaam record nahi hua.");
  lines.push(board.total ? `Board par ${board.by.todo} kaam baqi, ${board.by.review} Review mein${urgent.length ? `. Zaroori: ${urgent.slice(0, 3).join(", ")}` : ""}.` : "Board khali hai.");
  if (mail.setUp && mail.counts) {
    const r = mail.ready || [];
    if (!r.length) lines.push(`Emails parh li${mail.added ? ` (${mail.added} nayi)` : ""}. Kisi ka jawab zaroori nahi.`);
    else {
      lines.push(`Emails parh li${mail.added ? ` (${mail.added} nayi)` : ""}. ${r.length} ka jawab zaroori hai.`);
      for (const e of r.slice(0, 8)) lines.push(`Email ${e.n}${e.urgency === "high" ? ", bohat zaroori" : ""}: ${e.from}, ${e.account} par. ${e.summary || e.subject}`);
      if (r.length > 8) lines.push(`Aur ${r.length - 8} emails Subah page par.`);
      lines.push("Sab ke jawab tayar hain. Kahein email 1 ka jawab sunao, ya email 1 ka jawab bhejo.");
    }
    if (mail.error) lines.push("Masla: " + mail.error.slice(0, 160));
  } else if (mail.setUp && mail.error) lines.push("Emails nahi khuli: " + mail.error.slice(0, 160));
  const b = { at: new Date().toISOString(), aw, board, urgent, mail, text: lines.join(" ") };
  writeJson("briefing.json", b);
  appendLine("notifications.jsonl", { at: b.at, title: "Subah ki report", text: b.text.slice(0, 800) });
  // v3.40: Jarvis bol kar sunaye. Jarvis page khula ho to wahi (achhi awaz) bolta hai; warna laptop khud bolta hai.
  if (speakAloud) { try { const S = deps.speak || (await import("./speak.js")); b.spokenBy = await S.announce(b.text, "Subah ki report"); writeJson("briefing.json", b); } catch {} }
  return b;
}

// v3.40: user ki marzi: roz subah 9 baje khud chale. Pehli dafa khud chalu; agar aap band karein to band hi rahe.
export async function ensureDefaultBriefing() {
  if (readJson("briefing-pref.json", null)) return null;
  return ensureDailyBriefing("daily@09:00");
}
export async function ensureDailyBriefing(every = "daily@09:00") {
  writeJson("briefing-pref.json", { every: every || "", at: new Date().toISOString() });
  const { listSchedules, createSchedule, setScheduleStatus } = await import("./ops/scheduler.js");
  for (const s of listSchedules().filter((x) => x.kind === "briefing")) setScheduleStatus(s.id, "deleted");
  if (!every) return null;
  return createSchedule({ title: "Subah ki report", prompt: "briefing", every, kind: "briefing" });
}
export async function briefingSchedule() {
  const { listSchedules } = await import("./ops/scheduler.js");
  return listSchedules().find((x) => x.kind === "briefing") || null;
}
