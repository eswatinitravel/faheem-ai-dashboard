// Shared settings for the chat page and the options page (saved in this browser).
const KEY = "faheem-ai-prefs";
export const DEFAULT_PREFS = { agent: "auto", provider: "auto", speakReplies: true, voiceChoice: "urdu-female" };
export function loadPrefs() {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(KEY) || "{}"), voiceChoice: localStorage.getItem("faheem-ai-voice") || JSON.parse(localStorage.getItem(KEY) || "{}").voiceChoice || DEFAULT_PREFS.voiceChoice }; }
  catch { return { ...DEFAULT_PREFS }; }
}
export function savePrefs(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); if (p.voiceChoice) localStorage.setItem("faheem-ai-voice", p.voiceChoice); } catch {}
}
export const THEMES = [
  { id: "aura", name: "Black aura + red", ball: "radial-gradient(circle at 35% 35%, #ff4d4d, #1a0505 70%)" },
  { id: "pink", name: "Light pink", ball: "radial-gradient(circle at 35% 35%, #ffd1e6, #f472b6 75%)" },
  { id: "purple", name: "Light purple", ball: "radial-gradient(circle at 35% 35%, #e9d5ff, #a855f7 75%)" },
  { id: "green", name: "Light green", ball: "radial-gradient(circle at 35% 35%, #d1fae5, #34d399 75%)" },
  { id: "black", name: "Black aura", ball: "radial-gradient(circle at 35% 35%, #6b7280, #000 70%)" },
  { id: "white", name: "White aura", ball: "radial-gradient(circle at 35% 35%, #fff, #d4d4d8 75%)" },
];
export function applyTheme(id) {
  document.documentElement.dataset.theme = id;
  try { localStorage.setItem("faheem-ai-theme", id); } catch {}
}
export function savedTheme() {
  try { return localStorage.getItem("faheem-ai-theme") || "aura"; } catch { return "aura"; }
}
