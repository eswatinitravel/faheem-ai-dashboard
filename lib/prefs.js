// Shared settings for the chat page and the options page (saved in this browser).
const KEY = "faheem-ai-prefs";
export const DEFAULT_PREFS = { agent: "auto", provider: "auto", speakReplies: true, voiceChoice: "urdu-female", quality: "auto", fx3d: "off", uiScale: "100", teamMode: false, research: true, bgScene: "desert" };
// v3.16: bgScene = main chatboard ka background: "desert" (Purple Desert, getlayers.ai free layer) / "dna" (apna Three.js helix) / "off".
// v3.16: Flowstate 3D background poori tarah hata diya (user ko pasand nahi aaya). research = build se pehle research card.
// v3.13: teamMode = Agent Mode mein Designer → Coder → Tester → Reviewer team (default band, free limit bachat).

// v3.8 Display: HD / 4K / 8K render aur 3D orb.
// Canvas kitne pixel par bane: 4K = 3840 chaurai, 8K = 7680 (screen chhoti ho to bhi itna tez/saaf render).
export function renderScale(quality) {
  const dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 1;
  const w = (typeof window !== "undefined" && window.innerWidth) || 1920;
  if (quality === "hd") return 1;
  if (quality === "4k") return Math.min(Math.max(dpr, 3840 / w), 4);
  if (quality === "8k") return Math.min(Math.max(dpr, 7680 / w), 6);
  return Math.min(dpr, 2);
}
export function loadPrefs() {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(KEY) || "{}"), voiceChoice: localStorage.getItem("faheem-ai-voice") || JSON.parse(localStorage.getItem(KEY) || "{}").voiceChoice || DEFAULT_PREFS.voiceChoice }; }
  catch { return { ...DEFAULT_PREFS }; }
}
export function savePrefs(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); if (p.voiceChoice) localStorage.setItem("faheem-ai-voice", p.voiceChoice); } catch {}
  try { window.dispatchEvent(new CustomEvent("faheem-prefs", { detail: p })); } catch {}
}
export const THEMES = [
  { id: "aura", name: "Linear Ink + laal (v3.16 default)", ball: "radial-gradient(circle at 35% 35%, #ff4d4d, #08080a 70%)" },
  { id: "pink", name: "Light pink", ball: "radial-gradient(circle at 35% 35%, #ffd1e6, #f472b6 75%)" },
  { id: "purple", name: "Light purple", ball: "radial-gradient(circle at 35% 35%, #e9d5ff, #a855f7 75%)" },
  { id: "green", name: "Light green", ball: "radial-gradient(circle at 35% 35%, #d1fae5, #34d399 75%)" },
  { id: "black", name: "Graphite", ball: "radial-gradient(circle at 35% 35%, #6b7280, #000 70%)" },
  { id: "white", name: "White", ball: "radial-gradient(circle at 35% 35%, #fff, #d4d4d8 75%)" },
];
export function applyTheme(id) {
  document.documentElement.dataset.theme = id;
  try { localStorage.setItem("faheem-ai-theme", id); } catch {}
}
export function savedTheme() {
  try { return localStorage.getItem("faheem-ai-theme") || "aura"; } catch { return "aura"; }
}
