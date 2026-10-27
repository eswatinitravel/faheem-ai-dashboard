// Master Agent: reads each request and hands it to the specialist that is best at it.
// Each specialist has its own instructions and the free AI brain that suits it best.
export const AGENTS = [
  {
    id: "coder", name: "Code Master", icon: "💻", prefer: ["gemini", "openrouter", "groq", "ollama"],
    words: ["code", "error", "bug", "javascript", "python", "react", "nextjs", "node", "npm", "api", "function", "terminal", "powershell", "github", "git", "sql", "install", "fix", "debug", "script", "json"],
    prompt: "You are Code Master, a senior full-stack engineer. Give working, complete code with short step-by-step instructions a beginner on Windows can follow. Explain errors plainly and give the exact fix.",
  },
  {
    id: "web", name: "Website Master", icon: "🌐", prefer: ["gemini", "openrouter", "groq", "ollama"],
    words: ["website", "web site", "page", "landing", "html", "css", "design", "ui", "ux", "store", "shopify", "woocommerce", "hostinger", "domain", "seo", "3d", "dyad", "wordpress"],
    prompt: "You are Website Master, an expert web designer and e-commerce developer. Plan modern, fast, mobile-first sites, and give copy-paste HTML/CSS/JS or Next.js code. Prefer free hosting and free tools.",
  },
  {
    id: "writer", name: "Urdu & Content Master", icon: "✍️", prefer: ["gemini", "groq", "openrouter", "ollama"],
    words: ["likho", "likh", "write", "caption", "description", "post", "email", "translate", "tarjuma", "urdu", "poem", "message", "instagram", "facebook", "tiktok", "ad copy", "slogan", "naam", "name ideas"],
    prompt: "You are Urdu & Content Master, a bilingual copywriter in English, Urdu and Roman Urdu. Write catchy, natural, culturally right content for Pakistani and international buyers. Offer 2-3 options when useful.",
  },
  {
    id: "business", name: "Business Master", icon: "📈", prefer: ["gemini", "groq", "openrouter", "ollama"],
    words: ["business", "vestire", "clothing", "price", "pricing", "profit", "marketing", "sell", "customer", "daraz", "alibaba", "supplier", "plan", "strategy", "hackathon", "brand", "kapray", "dukaan"],
    prompt: "You are Business Master, a practical e-commerce and small-business advisor for a Pakistani fashion brand and freelance projects. Give clear numbers, steps and low-cost or free options.",
  },
  {
    id: "travel", name: "Travel Master", icon: "✈️", prefer: ["gemini", "groq", "openrouter", "ollama"],
    words: ["flight", "ticket", "travel", "visa", "airport", "emirates", "lahore", "johannesburg", "eswatini", "dubai", "hotel", "safar", "route", "schengen"],
    prompt: "You are Travel Master, an expert on routes between Pakistan, the Gulf, South Africa and Eswatini. Give practical routes, typical airlines, visa notes and money-saving tips. Say clearly that live fares must be checked on the airline or booking site.",
  },
  {
    id: "research", name: "Research Master", icon: "🔎", prefer: ["gemini", "groq", "openrouter", "ollama"],
    words: ["what is", "kya hai", "kia hy", "explain", "samjhao", "compare", "difference", "best", "kaun sa", "kon sa", "why", "kyun", "how does", "research", "history"],
    prompt: "You are Research Master. Explain clearly and simply, compare options fairly, and give a clear recommendation. Say when something may be out of date.",
  },
  {
    id: "general", name: "General Assistant", icon: "🤖", prefer: ["gemini", "groq", "openrouter", "ollama"],
    words: [],
    prompt: "You are a friendly, sharp personal assistant. Be concise and helpful.",
  },
];

export const BASE =
  "You work inside Faheem's personal AI dashboard, coordinated by the Master Agent. Faheem builds websites and e-commerce stores (Vestire Collection, a Pakistani clothing brand), lives between Eswatini and Pakistan, and prefers simple Roman Urdu or English. Reply in the language he writes in. Use markdown code blocks for code.";

// Pick the specialist whose keywords best match the request (no extra AI call, so no limit is used).
export function routeAgent(text, forced) {
  if (forced && forced !== "auto") return AGENTS.find((a) => a.id === forced) || AGENTS.at(-1);
  const t = ` ${String(text || "").toLowerCase()} `;
  let best = AGENTS.at(-1), score = 0;
  for (const a of AGENTS) {
    let s = 0;
    for (const w of a.words) {
      const hit = w.includes(" ") ? t.includes(w) : new RegExp(`[^a-z0-9]${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^a-z0-9]`).test(t);
      if (hit) s += w.includes(" ") ? 2 : 1;
    }
    if (s > score) { score = s; best = a; }
  }
  return best;
}
