// v3.17: Next.js server start par ops (queue, recovery, schedules) chalu.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try { const m = await import("./lib/ops/boot.js"); m.boot(); } catch (e) { console.error("[ops] boot fail:", e?.message); }
}
