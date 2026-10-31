// v3.14 "Soch raha hai" animation ka chhota store. Jab koi bhi brain kaam kare: room ke border par
// laal dots + top bar par patli dots ki patti (har page par). Jawab aate hi band.
export function createThinkingStore() {
  const active = new Map();
  const subs = new Set();
  const emit = () => { for (const f of subs) { try { f(api.count()); } catch {} } };
  const api = {
    start(id = "x") { active.set(id, (active.get(id) || 0) + 1); emit(); return id; },
    stop(id = "x") { const n = (active.get(id) || 0) - 1; if (n > 0) active.set(id, n); else active.delete(id); emit(); },
    count() { let n = 0; for (const v of active.values()) n += v; return n; },
    isActive(id) { return (active.get(id) || 0) > 0; },
    ids() { return [...active.keys()]; },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    reset() { active.clear(); emit(); },
  };
  return api;
}

// Kaun si API calls "brain kaam kar raha hai" hain (sirf POST)
export const THINK_URL = /\/api\/(chat|tools|rooms|agent(\/team)?|v1\/chat\/completions)(\?|$)/;
export function isThinkingRequest(url, method = "GET", body) {
  if (String(method).toUpperCase() !== "POST") return false;
  const u = String(url || "");
  if (!THINK_URL.test(u.replace(/^https?:\/\/[^/]+/, ""))) return false;
  // Rooms: sirf "send" (history save/clear nahi)
  if (/\/api\/rooms/.test(u) && typeof body === "string" && !/"action"\s*:\s*"send"/.test(body)) return false;
  return true;
}

const g = typeof globalThis !== "undefined" ? globalThis : {};
export const thinking = g.__faheemThinking || (g.__faheemThinking = createThinkingStore());
