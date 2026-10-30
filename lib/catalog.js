// v3.11: Har free AI brain ki ek jagah list (catalog). Pipeline, Settings, Auto Setup aur tests
// sab isi se chalte hain. Naya brain = yahan ek line. Koi import nahi, taake browser bhi parh sake.
// model: "auto" = brain ki apni /models list se pehla free chat model khud chuna jata hai.
// Research: freeinference.dev (2026-10-27) + free-llm.com (2026-10-27) + live check 2026-10-28.

export const CATALOG = [
  { id: "groq", name: "Groq", base: "https://api.groq.com/openai/v1", model: "openai/gpt-oss-120b", visionModel: "qwen/qwen3.8-27b",
    keyUrl: "https://console.groq.com/keys", prefix: /^gsk_[A-Za-z0-9]{20,}$/, note: "Sab se tez. 30/min, 1,000/din. Voice bhi isi se. Card nahi.", signup: "Google" },
  { id: "gemini", name: "Google Gemini", base: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-flash-latest", vision: true,
    fallbacks: "gemini-2.5-flash-lite,gemini-3.1-flash-lite", keyUrl: "https://aistudio.google.com/apikey", prefix: /^(AIza[0-9A-Za-z_-]{30,}|AQ\.[0-9A-Za-z_.-]{20,})$/,
    note: "Picture dekh sakta hai. Limit account ke hisaab se. Card nahi.", signup: "Google" },
  { id: "openrouter", publicModels: true, name: "OpenRouter", base: "https://openrouter.ai/api/v1", model: "google/gemma-4-26b-a4b-it:free", fallbacks: "openrouter/free",
    keyUrl: "https://openrouter.ai/settings/keys", prefix: /^sk-or-(v1-)?[0-9a-f]{40,}$/i, note: "20/min, 50/din, sirf :free models. Card nahi.", signup: "Google" },
  { id: "zai", name: "Z.ai GLM", base: "https://api.z.ai/api/paas/v4", model: "glm-4.7-flash",
    keyUrl: "https://z.ai/manage-apikey/apikey-list", prefix: /^[0-9a-f]{32}\.[0-9A-Za-z]{16}$/, note: "GLM Flash hamesha free, ~1,000/din. Sirf email.", signup: "Google/email" },
  { id: "mistral", name: "Mistral", base: "https://api.mistral.ai/v1", model: "mistral-small-latest",
    keyUrl: "https://console.mistral.ai/api-keys", prefix: null, note: "Free Experiment plan, 1/sec. Phone verify, card nahi.", signup: "Google + phone" },
  { id: "cohere", name: "Cohere", base: "https://api.cohere.ai/compatibility/v1", model: "command-a-03-2025",
    keyUrl: "https://dashboard.cohere.com/api-keys", prefix: null, note: "Trial key: 1,000 calls/mahina, 20/min. Card nahi.", signup: "Google" },
  { id: "nvidia", publicModels: true, name: "NVIDIA NIM", base: "https://integrate.api.nvidia.com/v1", model: "deepseek-ai/deepseek-v4.1-flash", fallbacks: "nvidia/nemotron-3-super-120b-a12b",
    keyUrl: "https://build.nvidia.com/settings/api-keys", prefix: /^nvapi-[A-Za-z0-9_-]{30,}$/, note: "~40/min, DeepSeek V4.1 Flash + Nemotron. Phone verify, card nahi.", signup: "email + phone" },
  { id: "sambanova", publicModels: true, name: "SambaNova", base: "https://api.sambanova.ai/v1", model: "DeepSeek-V3.2", fallbacks: "Meta-Llama-3.3-70B-Instruct,gpt-oss-120b",
    keyUrl: "https://cloud.sambanova.ai/apis", prefix: null, note: "DeepSeek/Llama 70B, 20/din. Card nahi.", signup: "Google" },
  { id: "cloudflare", name: "Cloudflare Workers AI", base: "https://api.cloudflare.com/client/v4/accounts/{account}/ai/v1", model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    needs: "CLOUDFLARE_ACCOUNT_ID", keyUrl: "https://dash.cloudflare.com/profile/api-tokens", prefix: null,
    note: "10,000 neurons/din. Token 'Workers AI' wala + Account ID chahiye. Card nahi.", signup: "email" },
  { id: "huggingface", publicModels: true, name: "Hugging Face", base: "https://router.huggingface.co/v1", model: "openai/gpt-oss-120b",
    keyUrl: "https://huggingface.co/settings/tokens", prefix: /^hf_[A-Za-z0-9]{30,}$/, note: "Chhota mahana free credit. Token 'Inference' permission ke sath.", signup: "Google" },
  { id: "hetzner", name: "Hetzner Inference", base: "https://inference.hetzner.com/api/v1", model: "auto",
    keyUrl: "https://experiments.hetzner.com/inference", prefix: null, note: "Experimental, abhi free: 10/min. Card nahi.", signup: "email" },
  { id: "nous", publicModels: true, name: "Nous Portal", base: "https://inference-api.nousresearch.com/v1", model: "reflection/beam-1.0-501b-a23b:free", fallbacks: "ornith/ornith-1.5-122b:free,stepfun/step-3.7-flash:free", pick: /:free$/,
    keyUrl: "https://portal.nousresearch.com", prefix: null, note: ":free models (Reflection Beam, Ornith). Kuch logon se $0 card verify maanga gaya.", signup: "Google" },
  { id: "requesty", name: "Requesty", base: "https://router.requesty.ai/v1", model: "auto", pick: /:free$/,
    keyUrl: "https://app.requesty.ai/api-keys", prefix: null, note: "Gateway: 20/min, 200/din free models. Card nahi.", signup: "Google" },
  // Ye bina key bhi chalte hain; key lagayein to limit barh jati hai.
  { id: "kilo", name: "Kilo Gateway", base: "https://api.kilo.ai/api/gateway", model: "kilo-auto/free", keyless: true, optionalKey: true,
    keyUrl: "https://app.kilo.ai", prefix: null, note: "Bina key: 200/ghanta. kilo-auto/free khud free model chunta hai." },
  { id: "ovh", name: "OVHcloud AI", base: "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1", model: "gpt-oss-120b", fallbacks: "Meta-Llama-3_3-70B-Instruct", keyless: true,
    keyUrl: "https://endpoints.ai.cloud.ovh.net", prefix: null, note: "Bina key: 2/min. Backup ke liye." },
  { id: "pollinations", name: "Pollinations", base: "https://gen.pollinations.ai/v1", model: "openai",
    keyUrl: "https://enter.pollinations.ai", prefix: /^(sk|pk)_[A-Za-z0-9]{16,}$/, note: "Ab free key zaroori hai (Oct 2026 se bina key band). enter.pollinations.ai se free key lein." },
  { id: "llm7", name: "LLM7", base: "https://api.llm7.io/v1", model: "default", keyless: true, optionalKey: true,
    keyUrl: "https://token.llm7.io", prefix: null, note: "Free token: 100K tokens/din. Bina token bohat jaldi limit." },
];

export const LOCAL = { id: "ollama", name: "Ollama (local)" };

const up = (id) => id.toUpperCase();
export const keyField = (id) => `${up(id)}_API_KEY`;
export const modelField = (id) => `${up(id)}_MODEL`;

// Settings mein save hone wale saare fields (purane naam same rahe, taake keys.json na toote).
export const CATALOG_FIELDS = [
  ...CATALOG.flatMap((p) => [keyField(p.id), modelField(p.id), ...(p.needs ? [p.needs] : [])]),
  "GROQ_VISION_MODEL", "GROQ_FALLBACK_MODEL", "GEMINI_FALLBACK_MODELS", "OPENROUTER_FALLBACK_MODELS",
  "OLLAMA_ENABLED", "OLLAMA_URL", "OLLAMA_MODEL", "FREE_ENABLED", "DISABLED_BRAINS",
];

// Paste ki hui key se brain pehchaanein. Pakka prefix ho to ek naam; warna "unknown" (server /models se aazmaata hai).
export function detectKey(raw) {
  const key = String(raw || "").trim().replace(/^["']|["']$/g, "");
  if (!key || /\s|@/.test(key) || key.length < 20) return { key, id: null, sure: false, error: "Ye key nahi lagti (space, email ya bohat chhoti)." };
  const hit = CATALOG.filter((p) => p.prefix && p.prefix.test(key));
  if (hit.length === 1) return { key, id: hit[0].id, sure: true };
  // Bina pakke prefix wale brains: server par ek ek se aazma kar dekhte hain.
  return { key, id: null, sure: false, candidates: CATALOG.filter((p) => (!p.prefix || hit.includes(p)) && !p.keyless).map((p) => p.id) };
}
