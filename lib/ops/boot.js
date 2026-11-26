// v3.17: server shuru hote hi queue worker + schedule tick (ek hi dafa).
// v3.29: server.mjs listen ke foran baad /api/ops?boot=1 bulata hai, is liye /workflows khole baghair bhi schedules chalte hain.
// globalThis wala jhanda hot-reload (dev) par bhi rehta hai: dobara timer nahi bante.
import { startWorker } from "./queue.js";
import { tick } from "./scheduler.js";
import { registerDefaultHandlers } from "./handlers.js";
import { getProviders, callProvider, isCooling } from "../providers.js";
import { preferFor } from "../brain-roles.js";

const g = globalThis;
export function boot() {
  if (g.__faheemOps) return false;
  g.__faheemOps = true;
  registerDefaultHandlers({ getProviders, callProvider, isCooling, preferFor });
  startWorker(1500);
  // Shuru par foran ek tick: band hone ke dauran chhoote hue schedules ek dafa abhi (30s intezar nahi).
  try { tick(); } catch (e) { console.error("[ops] tick:", e?.message); }
  const t = setInterval(() => { try { tick(); } catch {} }, 30000);
  t.unref?.();
  g.__faheemOpsBootedAt = new Date().toISOString();
  return true;
}
