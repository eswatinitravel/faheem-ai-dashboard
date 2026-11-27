// v3.39 Subah ki report: kal ka focus (ActivityWatch), board ke kaam, aur emails (Jarvis ne jawab tayar kiye, bheje nahi).
import { readJson, writeJson, appendLine } from "./ops/store.js";
import { awDaySummary, fmtMin } from "./activitywatch.js";
import { summary as boardSummary, listCards } from "./board.js";

export const lastBriefing = () => readJson("briefing.json", null);

export async function buildBriefing({ deps = {} } = {}) {
  const aw = await (deps.aw || awDaySummary)(1);
  const board = boardSummary();
  const urgent = listCards().filter((c) => c.column !== "done" && (c.priority === "high" || (c.due && c.due <= new Date().toISOString().slice(0, 10)))).slice(0, 5).map((c) => c.title);
  let mail = { setUp: false };
  try {
    const M = deps.mail || (await import("./mail/inbox.js"));
    if (await M.isSetUp()) {
      mail.setUp = true;
      try { const r = await M.refresh({ days: 1 }); mail.added = r.added; } catch (e) { mail.error = e.message; }
      try { const d = await M.draft(); mail.drafted = d.drafted; } catch (e) { mail.error ||= e.message; }
      mail.counts = M.counts();
      mail.ready = M.readyList().slice(0, 5).map((x) => ({ id: x.id, from: x.from.replace(/<.*>/, "").trim().slice(0, 40), subject: x.subject.slice(0, 80) }));
    }
  } catch (e) { mail.error = e.message; }

  const lines = [];
  const h = new Date().getHours();
  lines.push(h < 12 ? "Subah bakhair." : h < 17 ? "Salam." : "Shaam bakhair.");
  if (aw.ok) lines.push(aw.totalMin ? `Kal aap ne ${fmtMin(aw.totalMin)} laptop par kaam kiya. Sab se zyada: ${aw.apps.slice(0, 3).map((a) => `${a.app} ${fmtMin(a.min)}`).join(", ")}.` : "Kal laptop par koi kaam record nahi hua.");
  lines.push(board.total ? `Board par ${board.by.todo} kaam baqi, ${board.by.review} Review mein${urgent.length ? `. Zaroori: ${urgent.slice(0, 3).join(", ")}` : ""}.` : "Board khali hai.");
  if (mail.setUp && mail.counts) lines.push(mail.counts.drafted ? `${mail.counts.drafted} emails ke jawab tayar hain, aap ki haan ka intezar.` : "Koi email jawab ka intezar nahi kar rahi.");
  else if (mail.setUp && mail.error) lines.push("Gmail nahi khula: " + mail.error);
  const b = { at: new Date().toISOString(), aw, board, urgent, mail, text: lines.join(" ") };
  writeJson("briefing.json", b);
  appendLine("notifications.jsonl", { at: b.at, title: "Subah ki report", text: b.text.slice(0, 800) });
  return b;
}

export async function ensureDailyBriefing(every = "daily@08:00") {
  const { listSchedules, createSchedule, setScheduleStatus } = await import("./ops/scheduler.js");
  for (const s of listSchedules().filter((x) => x.kind === "briefing")) setScheduleStatus(s.id, "deleted");
  if (!every) return null;
  return createSchedule({ title: "Subah ki report", prompt: "briefing", every, kind: "briefing" });
}
export async function briefingSchedule() {
  const { listSchedules } = await import("./ops/scheduler.js");
  return listSchedules().find((x) => x.kind === "briefing") || null;
}
