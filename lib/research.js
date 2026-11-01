// v3.15 Project research: "website banao / project banao" par build se pehle chhoti research.
// Free sources: GitHub public search API (bina key) + DuckDuckGo Instant Answer API (bina key) + andar ka gyaan. 5s timeout, fail ho to sirf andar ka gyaan.
export const BUILD_RE = /\b(ye banao|yeh banao|project banao|website banao|site banao|store banao|app banao|bana do|banao|build (me )?(a |an )?(website|app|project|store|site)|make (me )?(a |an )?(website|app|store))\b/i;
export const isBuildRequest = (t) => BUILD_RE.test(String(t || "")) && !/\b(picture|tasveer|image|photo|logo|banner|poster)\b/i.test(String(t || ""));

const KB = [
  { re: /store|shop|dukaan|e-?commerce|kapr|clothing|fashion/i, kind: "Online store", similar: ["Shopify themes (Dawn)", "WooCommerce Storefront", "Medusa (open-source store)"], features: ["Size chart + size guide", "WhatsApp order button", "Cash on Delivery + delivery charges", "Wishlist", "Product filter (size, rang, qeemat)", "Urdu / English toggle"], stack: ["HTML + CSS + vanilla JS (sab se halka)", "Next.js + localStorage cart", "Medusa ya Snipcart (baad mein)"] },
  { re: /travel|flight|tour|hotel|safar/i, kind: "Travel site", similar: ["Skyscanner", "Booking.com", "Travelpayouts widgets"], features: ["Route search form", "WhatsApp inquiry", "Visa info section", "Popular routes cards", "Reviews slot (asli reviews baad mein)"], stack: ["HTML + CSS + JS", "Next.js static export", "Travelpayouts widget (free affiliate)"] },
  { re: /portfolio|resume|cv/i, kind: "Portfolio", similar: ["Read.cv", "Framer portfolios", "GitHub Pages portfolio"], features: ["Projects grid", "Contact form", "Download CV button", "Dark / light theme"], stack: ["HTML + CSS", "Astro", "Next.js"] },
  { re: /dashboard|admin|panel|crm/i, kind: "Dashboard", similar: ["Tremor", "AdminLTE", "Refine"], features: ["Charts", "Search + filter table", "CSV export", "Dark mode", "Login page"], stack: ["Next.js + Chart.js", "React + Recharts", "SQLite (local)"] },
  { re: /blog|news|magazine/i, kind: "Blog", similar: ["Ghost", "Hashnode", "Medium"], features: ["Categories", "Search", "Newsletter signup", "SEO meta tags"], stack: ["Astro", "Next.js MDX", "Hugo"] },
  { re: /restaurant|food|cafe|menu/i, kind: "Restaurant site", similar: ["Toast sites", "Square Online", "OpenTable pages"], features: ["Menu with prices", "WhatsApp order", "Opening hours + map", "Gallery"], stack: ["HTML + CSS + JS", "Next.js"] },
];
const GENERAL = { kind: "Website / app", similar: ["Similar open-source projects (neeche GitHub)"], features: ["Mobile-first layout", "Contact / WhatsApp button", "SEO meta tags", "Dark mode", "Fast loading images"], stack: ["HTML + CSS + vanilla JS", "Next.js (React)"] };

export function localIdeas(text) { return KB.find((k) => k.re.test(text)) || GENERAL; }

async function withTimeout(url, ms = 5000, opt = {}) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms);
  try { const r = await fetch(url, { ...opt, signal: ac.signal }); return r.ok ? await r.json() : null; } catch { return null; } finally { clearTimeout(t); }
}
export async function researchProject(text, { online = true } = {}) {
  const base = localIdeas(text);
  const out = { kind: base.kind, similar: [...base.similar], features: [...base.features], stack: [...base.stack], sources: ["andar ka gyaan"] };
  if (!online) return out;
  const q = String(text).replace(BUILD_RE, " ").replace(/[^a-z0-9 ]/gi, " ").split(/\s+/).filter((w) => w.length > 3).slice(0, 4).join(" ") || base.kind;
  const [gh, ddg] = await Promise.all([
    withTimeout(`https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&per_page=4`, 5000, { headers: { "User-Agent": "faheem-ai", Accept: "application/vnd.github+json" } }),
    withTimeout(`https://api.duckduckgo.com/?q=${encodeURIComponent(base.kind)}&format=json&no_html=1`, 5000),
  ]);
  if (gh?.items?.length) { out.similar.push(...gh.items.slice(0, 4).map((r) => `${r.full_name} (${r.stargazers_count} stars)`)); out.sources.push("GitHub search"); }
  if (ddg?.AbstractText) { out.summary = ddg.AbstractText.slice(0, 300); out.sources.push("DuckDuckGo"); }
  return out;
}
