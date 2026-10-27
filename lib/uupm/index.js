// UI UX Pro Max (MIT, github.com/nextlevelbuilder/ui-ux-pro-max-skill) ka data, JavaScript mein.
// Python ki zaroorat nahi: BM25 search + Design System Generator seedha dashboard ke andar.
import fs from "fs";
import path from "path";

const DIR = path.join(process.cwd(), "lib", "uupm", "data");

export const DOMAINS = {
  product: { file: "products.csv", cols: ["Product Type", "Keywords", "Primary Style Recommendation", "Key Considerations"] },
  style: { file: "styles.csv", cols: ["Style Category", "Aliases", "Keywords", "Best For", "Type", "AI Prompt Keywords"] },
  color: { file: "colors.csv", cols: ["Product Type", "Notes"] },
  typography: { file: "typography.csv", cols: ["Font Pairing Name", "Category", "Mood/Style Keywords", "Best For", "Heading Font", "Body Font"] },
  landing: { file: "landing.csv", cols: ["Pattern Name", "Aliases", "Keywords", "Conversion Optimization", "Section Order"] },
  ux: { file: "ux-guidelines.csv", cols: ["Category", "Issue", "Description", "Platform"] },
  chart: { file: "charts.csv", cols: ["Data Type", "Keywords", "Best Chart Type", "When to Use", "When NOT to Use", "Accessibility Notes"] },
  nextjs: { file: "stack-nextjs.csv", cols: ["Category", "Guideline", "Description", "Do", "Don't"] },
  html: { file: "stack-html.csv", cols: ["Category", "Guideline", "Description", "Do", "Don't"] },
};

// Chhota CSV parser (quotes, commas, newlines andar).
export function parseCSV(text) {
  const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); f = ""; if (row.length > 1 || row[0] !== "") rows.push(row); row = []; }
    else f += c;
  }
  if (f !== "" || row.length) { row.push(f); rows.push(row); }
  const head = rows.shift().map((h) => h.replace(/^\uFEFF/, "").trim());
  return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()])));
}

const cache = {};
export function rows(domain) {
  const d = DOMAINS[domain];
  if (!d) throw new Error("unknown domain: " + domain);
  if (!cache[domain]) cache[domain] = parseCSV(fs.readFileSync(path.join(DIR, d.file), "utf8"));
  return cache[domain];
}

const STOP = new Set(["a", "an", "the", "and", "or", "for", "of", "to", "in", "with", "on", "my", "ka", "ki", "ke", "aur"]);
export const tokenize = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[^\w\s]/g, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w));

// BM25 (k1=1.5, b=0.75) — wahi formula jo asli Python skill mein hai.
export function search(query, domain, n = 3, filter) {
  let list = rows(domain);
  if (domain === "style") list = list.filter((r) => r.Status !== "deprecated");
  if (filter) list = list.filter(filter);
  const cols = DOMAINS[domain].cols;
  const docs = list.map((r) => tokenize(cols.map((c) => r[c] || "").join(" ")));
  const N = docs.length, avg = docs.reduce((a, d) => a + d.length, 0) / Math.max(N, 1);
  const df = {}; docs.forEach((d) => new Set(d).forEach((w) => (df[w] = (df[w] || 0) + 1)));
  const qt = [...new Set(tokenize(query))];
  const scored = docs.map((d, i) => {
    const tf = {}; d.forEach((w) => (tf[w] = (tf[w] || 0) + 1));
    let s = 0;
    for (const w of qt) {
      if (!tf[w]) continue;
      const idf = Math.log((N - df[w] + 0.5) / (df[w] + 0.5) + 1);
      s += idf * (tf[w] * 2.5) / (tf[w] + 1.5 * (1 - 0.75 + 0.75 * d.length / avg));
    }
    return { row: list[i], score: s };
  });
  return scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, n).map((x) => ({ ...x.row, _score: +x.score.toFixed(3) }));
}

const firstName = (s) => String(s || "").split(/\s*\+\s*|,/)[0].trim().toLowerCase();

// Design System Generator: "luxury fashion store" -> product, style, rang, font, landing pattern, qawaid.
export function designSystem(query) {
  const product = search(query, "product", 1)[0];
  if (!product) return null;
  const idx = rows("product").findIndex((r) => r["Product Type"] === product["Product Type"]);
  const colors = rows("color")[idx] || search(query, "color", 1)[0] || {};
  const reason = reasoningRows()[idx] || {};
  const styleName = firstName(reason.Style_Priority || product["Primary Style Recommendation"]);
  const style = rows("style").find((s) => s["Style Category"].toLowerCase() === styleName && s.Status !== "deprecated")
    || search(styleName + " " + query, "style", 1)[0] || {};
  const typo = search(`${reason.Typography_Mood || ""} ${product.Keywords || ""} ${query}`, "typography", 1)[0] || {};
  const patName = (product["Landing Page Pattern"] || reason.Recommended_Pattern || "").toLowerCase();
  const landing = rows("landing").find((l) => l["Pattern Name"].toLowerCase() === patName) || (patName ? { "Pattern Name": product["Landing Page Pattern"] || reason.Recommended_Pattern } : search(query, "landing", 1)[0]) || {};
  const pick = (k) => colors[k] || "";
  return {
    query,
    product: product["Product Type"],
    style: { name: style["Style Category"] || styleName, keywords: style.Keywords || "", effects: style["Effects & Animation"] || "", accessibility: style.Accessibility || "" },
    colors: {
      primary: pick("Primary"), onPrimary: pick("On Primary"), secondary: pick("Secondary"), accent: pick("Accent"), onAccent: pick("On Accent"),
      background: pick("Background"), foreground: pick("Foreground"), card: pick("Card"), muted: pick("Muted"), mutedForeground: pick("Muted Foreground"),
      border: pick("Border"), destructive: pick("Destructive"), ring: pick("Ring"), notes: pick("Notes"),
    },
    typography: { name: typo["Font Pairing Name"] || "", heading: typo["Heading Font"] || "", body: typo["Body Font"] || "", url: typo["Google Fonts URL"] || "", mood: typo["Mood/Style Keywords"] || "" },
    landing: { name: landing["Pattern Name"] || "", sections: landing["Section Order"] || "", cta: landing["Primary CTA Placement"] || "", colorStrategy: landing["Color Strategy"] || "" },
    effects: reason.Key_Effects || "",
    avoid: (reason.Anti_Patterns || "").split(/\s*\+\s*/).filter(Boolean),
    considerations: product["Key Considerations"] || "",
  };
}

let rcache;
function reasoningRows() {
  if (!rcache) rcache = parseCSV(fs.readFileSync(path.join(DIR, "ui-reasoning.csv"), "utf8"));
  return rcache;
}

export const CHECKLIST = [
  "No emojis as icons (use inline SVG icons)",
  "cursor:pointer and visible hover/focus states on every clickable element (150-300ms transitions)",
  "Text contrast at least 4.5:1 (light and dark mode)",
  "Touch targets at least 44x44px with 8px spacing",
  "Respect prefers-reduced-motion",
  "Responsive at 375px, 768px, 1024px, 1440px with no horizontal scroll",
  "Visible form labels (not placeholder-only), errors next to the field",
  "Images have alt text and reserved size (no layout shift)",
];

// AI ko dene wala brief (Agent Mode / Website Master ke prompt mein lagta hai).
export function designBrief(query) {
  let ds = null;
  try { ds = designSystem(query); } catch { ds = null; }
  if (!ds) return "";
  const c = ds.colors;
  return `DESIGN SYSTEM (UI UX Pro Max, matched product: ${ds.product}) — follow it unless the user asked otherwise:
- Style: ${ds.style.name}${ds.style.keywords ? ` (${ds.style.keywords.split(",").slice(0, 6).join(",")})` : ""}
- Colors (CSS variables): --primary ${c.primary}; --on-primary ${c.onPrimary}; --secondary ${c.secondary}; --accent/CTA ${c.accent}; --on-accent ${c.onAccent}; --bg ${c.background}; --fg ${c.foreground}; --card ${c.card}; --muted ${c.muted}; --muted-fg ${c.mutedForeground}; --border ${c.border}
- Fonts: headings "${ds.typography.heading}", body "${ds.typography.body}" (Google Fonts: ${ds.typography.url})
- Page pattern: ${ds.landing.name}${ds.landing.sections ? ` — sections: ${ds.landing.sections}` : ""}${ds.landing.cta ? `; CTA: ${ds.landing.cta}` : ""}
- Effects: ${ds.effects}
- Avoid: ${ds.avoid.join(", ") || "-"}
- Key point: ${ds.considerations}
PRE-DELIVERY CHECKLIST: ${CHECKLIST.join("; ")}.`;
}

// Rang ka contrast (WCAG).
export function contrast(a, b) {
  const lum = (hex) => {
    let h = String(hex).replace("#", "");
    if (h.length === 3) h = h.split("").map((x) => x + x).join("");
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    const v = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  };
  const la = lum(a), lb = lum(b);
  if (la == null || lb == null) return null;
  return +((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)).toFixed(2);
}

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

// UX Pro checks (bina AI): HTML + CSS ko UI UX Pro Max ke qawaid par parakhta hai.
export function uxCheck(html = "", css = "") {
  const issues = [];
  const all = html + "\n" + css;
  if (html && !/<meta[^>]+name=["']viewport["']/i.test(html)) issues.push("Viewport meta tag missing (mobile par page chhota dikhega)");
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  const noAlt = imgs.filter((t) => !/\balt=/i.test(t)).length;
  if (noAlt) issues.push(`${noAlt} image(s) without alt text`);
  const btnEmoji = (html.match(/<(button|a)\b[^>]*>([\s\S]*?)<\/\1>/gi) || []).filter((b) => EMOJI.test(b.replace(/<[^>]+>/g, ""))).length;
  if (btnEmoji) issues.push(`${btnEmoji} button/link(s) use emoji as icons — use inline SVG icons`);
  if (/(animation|transition)\s*:/i.test(all) && !/prefers-reduced-motion/i.test(all)) issues.push("Animations without a prefers-reduced-motion fallback");
  const inputs = (html.match(/<input\b[^>]*>/gi) || []).filter((t) => !/type=["']?(hidden|submit|button|checkbox|radio)/i.test(t));
  if (inputs.length && !/<label\b/i.test(html) && !inputs.every((t) => /aria-label=/i.test(t))) issues.push("Form inputs without visible labels (placeholder-only)");
  for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const body = m[2];
    const fg = body.match(/(?:^|;|\s)color\s*:\s*(#[0-9a-f]{3,6})\b/i), bg = body.match(/background(?:-color)?\s*:\s*(#[0-9a-f]{3,6})\b/i);
    if (fg && bg) { const r = contrast(fg[1], bg[1]); if (r != null && r < 4.5) issues.push(`Low contrast ${r}:1 in "${m[1].trim().slice(0, 40)}" (need 4.5:1)`); }
    if (/(?:^|[^\w-])(?:button|\.btn)(?![\w-])/i.test(" " + m[1])) { const h = body.match(/(?:min-)?height\s*:\s*(\d+)px/i); if (h && +h[1] < 44) issues.push(`Touch target ${h[1]}px in "${m[1].trim().slice(0, 40)}" (need 44px)`); }
  }
  return { ok: issues.length === 0, issues };
}
