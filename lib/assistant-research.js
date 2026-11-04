// v3.16 Private Assistant Builder ki research: is hafte ka GitHub trending (github.com/trending?since=weekly) live,
// GitHub search (personal assistant), aur andar ka gyaan (OpenClaw, Hermes Agent, nanobot, QwenPaw, AstrBot, Orkas).
// Natija: sab se zyada maange gaye features (ginti ke sath) + milte-julte projects. 6s timeout, fail = sirf andar ka gyaan.
export const KNOWN_ASSISTANTS = [
  { name: "OpenClaw", tags: ["memory", "tools", "chat-apps", "skills", "local", "allow"] },
  { name: "Hermes Agent", tags: ["memory", "skills", "tools", "self-improve", "chat-apps", "mcp"] },
  { name: "nanobot", tags: ["local", "tools", "memory", "chat-apps", "mcp"] },
  { name: "QwenPaw", tags: ["voice", "memory", "local", "companion"] },
  { name: "AstrBot", tags: ["chat-apps", "skills", "tools", "memory", "mcp"] },
  { name: "Orkas", tags: ["tools", "browser", "allow", "memory"] },
];
export const FEATURES = {
  memory: { label: "Mustaqil yaad-dasht (pasand / napasand yaad)", re: /memory|remember|context|persistent|yaad/i },
  tools: { label: "Tools: files, apps / sites kholna, search", re: /tool|file|automation|computer use|desktop|shell/i },
  "self-improve": { label: "Khud seekhna (seekha hua sabaq)", re: /self-?improv|learn|lesson|evolv|instinct/i },
  skills: { label: "Skills jo baad mein add ho saken", re: /skill/i },
  voice: { label: "Awaz se baat (Urdu / English)", re: /voice|speech|tts|stt|talk/i },
  browser: { label: "Browser madad (page parhna, fill / click)", re: /browser|web page|chrome|extension|playwright/i },
  allow: { label: "Pehle ijazat (Allow / Deny) + action log", re: /approv|permission|safe|security|guard|allow/i },
  "chat-apps": { label: "Telegram / WhatsApp bridge", re: /telegram|whatsapp|discord|slack|wechat|qq|im platform/i },
  mcp: { label: "MCP-ready tools", re: /\bmcp\b|model context protocol/i },
  local: { label: "Local / free model (Ollama 2B-4B)", re: /local|ollama|offline|self-host|private/i },
  reminders: { label: "Yaad-dihani / schedule", re: /remind|schedul|cron|calendar/i },
  companion: { label: "Desktop companion (3D puppy / orb)", re: /companion|avatar|pet|live2d|desktop pet/i },
};
const ASSIST_RE = /personal (ai )?assistant|\bassistant\b|companion|desktop pet|jarvis|claw|astrbot|hermes|nanobot|qwenpaw|orkas/i;

async function withTimeout(url, ms, opt = {}, as = "json") {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms);
  try { const r = await fetch(url, { ...opt, signal: ac.signal }); if (!r.ok) return null; return as === "text" ? await r.text() : await r.json(); } catch { return null; } finally { clearTimeout(t); }
}

// github.com/trending ka HTML: har "Box-row" mein repo + description.
export function parseTrending(html) {
  const out = [];
  for (const row of String(html || "").split('class="Box-row"').slice(1)) {
    const m = row.match(/<h2[^>]*>\s*<a[^>]*href="\/([^"]+)"/); if (!m) continue;
    const d = row.match(/<p class="col-9[^"]*">\s*([\s\S]*?)<\/p>/);
    const stars = row.match(/([\d,]+)\s+stars this week/);
    out.push({ repo: m[1].trim(), desc: d ? d[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim() : "", starsWeek: stars ? Number(stars[1].replace(/,/g, "")) : 0 });
  }
  return out;
}

export function rankFeatures(items = []) {
  const count = Object.fromEntries(Object.keys(FEATURES).map((k) => [k, 0]));
  for (const a of KNOWN_ASSISTANTS) for (const t of a.tags) if (t in count) count[t] += 2;
  for (const it of items) for (const [k, f] of Object.entries(FEATURES)) if (f.re.test(`${it.repo} ${it.desc}`)) count[k]++;
  count.companion += 1; count.voice += 1; // Faheem ki "Hey Puppy" maang
  return Object.entries(count).sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ id: k, label: FEATURES[k].label, score: n }));
}

export async function researchAssistants({ online = true } = {}) {
  const out = { kind: "Private AI assistant (Hey Puppy) - Windows, 8GB RAM, sirf free", similar: KNOWN_ASSISTANTS.map((a) => a.name), trending: [], features: [], ranked: [], stack: ["Electron + Three.js desktop puppy (Windows)", "Groq free key (dimagh + Whisper awaz) ya Ollama qwen2.5:3b (laptop par)", "Edge free awazein (ur-PK Uzma) + Chrome extension"], sources: ["andar ka gyaan"] };
  let items = [];
  if (online) {
    const [html, gh] = await Promise.all([
      withTimeout("https://github.com/trending?since=weekly", 6000, { headers: { "User-Agent": "faheem-ai", Accept: "text/html" } }, "text"),
      withTimeout(`https://api.github.com/search/repositories?q=${encodeURIComponent("personal AI assistant agent")}&sort=stars&per_page=8`, 6000, { headers: { "User-Agent": "faheem-ai", Accept: "application/vnd.github+json" } }),
    ]);
    const tr = parseTrending(html);
    if (tr.length) { out.sources.push("GitHub trending (is hafta)"); out.trending = tr.filter((x) => ASSIST_RE.test(`${x.repo} ${x.desc}`)).slice(0, 6); items.push(...tr); }
    if (gh?.items?.length) { out.sources.push("GitHub search"); items.push(...gh.items.map((r) => ({ repo: r.full_name, desc: r.description || "" }))); out.similar.push(...gh.items.slice(0, 3).map((r) => `${r.full_name} (${r.stargazers_count} stars)`)); }
  }
  out.similar.push(...out.trending.map((t) => `${t.repo} (trending${t.starsWeek ? `, +${t.starsWeek} stars` : ""})`));
  out.similar = [...new Set(out.similar)].slice(0, 12);
  out.ranked = rankFeatures(items);
  out.features = out.ranked.slice(0, 10).map((f) => f.label);
  return out;
}
