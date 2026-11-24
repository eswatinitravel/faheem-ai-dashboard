// Shared settings for the chat page and the options page (saved in this browser).
const KEY = "faheem-ai-prefs";
export const DEFAULT_PREFS = { agent: "auto", provider: "auto", speakReplies: true, voiceChoice: "urdu-female", quality: "auto", fx3d: "off", uiScale: "100", teamMode: false, research: true, bgScene: "ripple" };
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
  // v3.26: "ripple" glass naya default; purana default "desert" ek baar ripple ban jata hai.
  try { if (!localStorage.getItem("faheem-bg-v326")) { const o = JSON.parse(localStorage.getItem(KEY) || "{}"); if (!o.bgScene || o.bgScene === "desert") { o.bgScene = "ripple"; localStorage.setItem(KEY, JSON.stringify(o)); } localStorage.setItem("faheem-bg-v326", "1"); } } catch {}
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(KEY) || "{}"), voiceChoice: localStorage.getItem("faheem-ai-voice") || JSON.parse(localStorage.getItem(KEY) || "{}").voiceChoice || DEFAULT_PREFS.voiceChoice }; }
  catch { return { ...DEFAULT_PREFS }; }
}
export function savePrefs(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); if (p.voiceChoice) localStorage.setItem("faheem-ai-voice", p.voiceChoice); } catch {}
  try { window.dispatchEvent(new CustomEvent("faheem-prefs", { detail: p })); } catch {}
}
// v3.26: sirf 3 neon glass theme. Purani saved value (aura/black/white/pink/purple/green) => neon-blue.
export const THEMES = [
  { id: "neon-blue", name: "Neon Blue", ball: "radial-gradient(circle at 35% 35%, #7fe3ff, #1e8cff 55%, #04060f 90%)" },
  { id: "neon-red", name: "Neon Red", ball: "radial-gradient(circle at 35% 35%, #ffb3a0, #ff2a3c 55%, #0e0306 90%)" },
  { id: "neon-magenta", name: "Neon Magenta", ball: "radial-gradient(circle at 35% 35%, #ffb3ff, #e030ff 55%, #0a0314 90%)" },
];
export const THEME_IDS = THEMES.map((t) => t.id);
export const DEFAULT_THEME = "neon-blue";
export function normalizeTheme(id) { return THEME_IDS.includes(id) ? id : DEFAULT_THEME; }
export function applyTheme(id) {
  const t = normalizeTheme(id);
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem("faheem-ai-theme", t); } catch {}
  return t;
}
export function savedTheme() {
  try { return normalizeTheme(localStorage.getItem("faheem-ai-theme")); } catch { return DEFAULT_THEME; }
}
// Pehle paint se pehle theme lagane wala chhota script (layout.js <head> mein). Purana theme => neon-blue.
export const THEME_BOOT = `(function(){try{var k="faheem-ai-theme",ok=["neon-blue","neon-red","neon-magenta"],t=localStorage.getItem(k);if(ok.indexOf(t)<0){t="neon-blue";localStorage.setItem(k,t);}document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","neon-blue");}})();`;
