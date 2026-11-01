// v3.15 UI/UX Specialist: ek professional designer role. Prompt Hallmark (MIT) + Impeccable (Apache-2.0) + UI UX Pro Max (MIT) qawaid se bana.
// Website pipeline, Team ka Designer aur Agent Mode isi ko istemal karte hain. Bani site par design audit khud chalta hai.
import { DESIGN_RULES, designCheckFull } from "./design.js";

export const UIUX_ID = "uiux";
export const UIUX_PROMPT = `You are the UI/UX Specialist: a senior product designer who ships hand-made, accessible interfaces.
Work in this order: 1) who uses it and the one main action, 2) layout and hierarchy (one clear focal point per screen),
3) design tokens in :root (colour, type scale, spacing 4/8px grid, radius), 4) states (hover, focus-visible, disabled, empty, loading, error),
5) mobile first (390px) then desktop (1440px), 6) accessibility (contrast 4.5:1, 44px touch targets, labels, alt text, reduced motion).
Use inline SVG icons, never emoji. Max two font families. No invented reviews or numbers.
${DESIGN_RULES}`;

export const UIUX_WORDS = ["ui", "ux", "design", "redesign", "layout", "landing", "hero", "dashboard ui", "figma", "wireframe", "colour", "color", "font", "typography", "accessibility", "responsive", "theme"];

// Audit + score (100 - 6 har masle ka, kam se kam 0). Website pipeline aur learned loop yeh score yaad rakhte hain.
export async function uiuxAudit(html) {
  const notes = await designCheckFull(html, 10);
  return { score: Math.max(0, 100 - notes.length * 6), notes };
}
