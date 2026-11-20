// v3.17: server shuru hote hi queue worker + schedule tick (ek hi dafa).
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
  const t = setInterval(() => { try { tick(); } catch {} }, 30000);
  t.unref?.();
  return true;
}
