// v3.17 Queue handlers: "prompt" (brains ki fallback line se jawab), "reminder" (yaad-dihani).
import { registerHandler } from "./queue.js";
import { appendLine } from "./store.js";

export function registerDefaultHandlers({ getProviders, callProvider, isCooling, preferFor }) {
  registerHandler("reminder", async (job) => {
    appendLine("notifications.jsonl", { at: new Date().toISOString(), title: "Yaad-dihani", text: job.payload.prompt });
    return `Yaad-dihani: ${job.payload.prompt}`;
  });
  // v3.38 Task board autopilot: card chalao (tools par ruk kar Review mein ijazat maangta hai), natija notification.
  registerHandler("board", async (job, ctx) => {
    const { runCard } = await import("../board.js");
    ctx.step("Board card chal raha hai");
    const c = await runCard(job.payload.cardId);
    const last = (c.comments || []).slice(-1)[0]?.text || "";
    appendLine("notifications.jsonl", { at: new Date().toISOString(), title: `Board: ${c.title} (Review)`, text: last.slice(0, 600) });
    return { card: c.id, column: c.column, text: last.slice(0, 2000) };
  });
  // v3.39 Subah ki report (ActivityWatch + board + emails ke tayar jawab; bhejna kabhi nahi).
  registerHandler("briefing", async (job, ctx) => {
    const { buildBriefing } = await import("../briefing.js");
    ctx.step("Subah ki report ban rahi hai");
    const b = await buildBriefing({ speakAloud: true });
    return { text: b.text };
  });
  registerHandler("prompt", async (job, ctx) => {
    const order = preferFor(job.payload.role || "general");
    const list = getProviders().filter((p) => !isCooling(p.id)).sort((a, b) => {
      const r = (p) => (p.id === "ollama" ? 999 : p.keyless ? 500 : order.indexOf(p.id) < 0 ? 400 : order.indexOf(p.id));
      return r(a) - r(b);
    });
    const errs = [];
    for (const p of list) {
      ctx.step(`${p.name} se poochh raha hoon`);
      try {
        const text = await callProvider(p, [{ role: "system", content: "You are Faheem's assistant. Answer briefly in Roman Urdu unless asked otherwise." }, { role: "user", content: job.payload.prompt }], 90000);
        if (String(text || "").trim()) {
          appendLine("notifications.jsonl", { at: new Date().toISOString(), title: job.title, text: String(text).slice(0, 2000), brain: p.name });
          return { brain: p.name, text: String(text).slice(0, 4000) };
        }
      } catch (e) { errs.push(`${p.name}: ${String(e.message).slice(0, 80)}`); }
    }
    throw new Error(errs.length ? `Koi brain nahi chala (${errs.slice(0, 3).join("; ")})` : "Koi brain chalu nahi");
  });
}
