// Design rules for every website the agents build.
// Distilled from Hallmark's "Floor" (github.com/Nutlope/hallmark, MIT licence, by Together AI)
// so even small free models avoid the usual "AI-generated" look. Short on purpose: free brains have small context.

export const DESIGN_RULES = `DESIGN RULES (anti "AI-slop", always follow):
1. Put every colour and font in CSS variables in :root (--bg, --text, --accent, --font-head, --font-body) and use var(...) everywhere else.
2. Never "transition: all". Animate only transform and opacity, never width/height/top/left.
3. No purple-to-blue gradients, no card inside a card, no emoji as icons (use simple inline SVG), no fake browser windows.
4. html, body { overflow-x: clip; } — never overflow-x: hidden, never width: 100vw.
5. Every button, link and input has a visible :focus-visible style.
6. Every animation has a @media (prefers-reduced-motion: reduce) fallback, and content stays visible without JavaScript.
7. Never invent numbers, reviews, testimonials or brand logos the user did not give. Leave a clearly marked slot instead.
8. Labels, tags and nav links in normal sentence case — no small ALL-CAPS tracked labels above every heading.
9. Hero: short headline (max 7 words), one sentence, one or two buttons — all visible on a laptop screen without scrolling.
10. Max ~80 words per screen; big real pictures instead of long text. Content container max-width ~1200px, centred.
11. Two font families at most, body text 16px or bigger, good contrast.
12. Image grids use grid-template-columns: repeat(auto-fill, minmax(min(240px,100%), 1fr)) so nothing overflows on phones.`;

// Fast design checks (no AI). Returns short Roman Urdu notes; they are design tips, not crashes.
export function designCheck(css) {
  const t = String(css || "");
  if (t.length < 200) return [];
  const out = [];
  if (/transition\s*:\s*all\b/i.test(t)) out.push('Design: "transition: all" hatayein — sirf transform/opacity animate karein.');
  if (/transition\s*:[^;{}]*\b(width|height|top|left)\b/i.test(t)) out.push("Design: width/height/top/left animate na karein — transform use karein.");
  const purple = "(#667eea|#764ba2|#8b5cf6|#7c3aed|#a855f7|#9333ea|\\bpurple\\b|\\bviolet\\b)";
  const blue = "(#3b82f6|#2563eb|#1d4ed8|#6366f1|#4f46e5|\\bblue\\b)";
  if (new RegExp(`gradient\\([^;{}]*${purple}[^;{}]*${blue}|gradient\\([^;{}]*${blue}[^;{}]*${purple}`, "i").test(t)) out.push("Design: purple-blue gradient AI jaisa lagta hai — brand ka apna rang use karein.");
  if (/(html|body)[^{]*\{[^}]*overflow-x\s*:\s*hidden/i.test(t)) out.push("Design: html/body par overflow-x: hidden ki jagah overflow-x: clip.");
  if (/width\s*:\s*100vw/i.test(t)) out.push("Design: width: 100vw se phone par side-scroll aata hai — 100% use karein.");
  if (/<(button|a|input)\b/i.test(t) && !/:focus-visible/i.test(t)) out.push("Design: :focus-visible style nahi — buttons/links ke liye focus style dein.");
  if (/(@keyframes|animation\s*:)/i.test(t) && !/prefers-reduced-motion/i.test(t)) out.push("Design: animation hai magar @media (prefers-reduced-motion: reduce) fallback nahi.");
  return out;
}
