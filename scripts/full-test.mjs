// Faheem AI full test suite (v3.9: UI UX Pro Max included)
import fs from "fs"; import path from "path"; import os from "os"; import { execSync, spawn } from "child_process";
const ROOT = process.env.FAHEEM_ROOT || process.cwd();
const R = []; let cur = "";
const sec = (s) => (cur = s);
async function t(name, fn) {
  const t0 = Date.now();
  try { const r = await fn(); const ok = r !== false; R.push({ sec: cur, name, ok, ms: Date.now() - t0, note: typeof r === "string" ? r : "" }); }
  catch (e) { R.push({ sec: cur, name, ok: false, ms: Date.now() - t0, note: String(e.message || e).slice(0, 160) }); }
}
const rd = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const ex = (f) => fs.existsSync(path.join(ROOT, f));
const must = (c, m) => { if (!c) throw new Error(m || "fail"); return true; };

// ---------- load providers.js with stub config + fake fetch ----------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fp-"));
fs.writeFileSync(path.join(tmp, "config.mjs"), "export const getConfig = () => globalThis.__cfg || {};");
fs.writeFileSync(path.join(tmp, "providers.mjs"), rd("lib/providers.js").replace('from "./config"', 'from "./config.mjs"'));
fs.writeFileSync(path.join(tmp, "prefs.mjs"), rd("lib/prefs.js"));
const P = await import(path.join(tmp, "providers.mjs"));
const PR = await import(path.join(tmp, "prefs.mjs"));
const realFetch = globalThis.fetch;
let routes = []; const calls = [];
globalThis.fetch = async (url, opt = {}) => {
  url = String(url); calls.push({ url, body: opt.body ? JSON.parse(opt.body) : null, headers: opt.headers });
  for (const [re, h] of routes) if (re.test(url)) return h(url, opt.body ? JSON.parse(opt.body) : null, opt);
  return realFetch(url, opt);
};
const J = (status, obj, headers = {}) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", ...headers } });
const OK = (text) => J(200, { choices: [{ message: { content: text } }] });
const prov = (cfg, id) => { globalThis.__cfg = cfg; return P.getProviders().find((p) => p.id === id); };

sec("1. Providers (brains) list");
await t("Bina key: Pollinations + LLM7 + Ollama hamesha list mein", () => { globalThis.__cfg = {}; const ids = P.getProviders().map((p) => p.id); return must(ids.includes("pollinations") && ids.includes("llm7") && ids.includes("ollama"), ids.join()); });
await t("Bina key: Groq/Gemini/OpenRouter/Z.ai/Mistral chhupe rehte hain", () => { globalThis.__cfg = {}; const ids = P.getProviders().map((p) => p.id); return must(!["groq","gemini","openrouter","zai","mistral"].some((i) => ids.includes(i))); });
await t("Z.ai GLM key se list mein aata hai", () => must(prov({ ZAI_API_KEY: "k".repeat(30) }, "zai")));
await t("Z.ai default model glm-4.7-flash (free)", () => must(prov({ ZAI_API_KEY: "x".repeat(30) }, "zai").model === "glm-4.7-flash"));
await t("Z.ai base URL api.z.ai/api/paas/v4", () => must(prov({ ZAI_API_KEY: "x".repeat(30) }, "zai").base === "https://api.z.ai/api/paas/v4"));
await t("Mistral key se list mein aata hai", () => must(prov({ MISTRAL_API_KEY: "m".repeat(30) }, "mistral")));
await t("Mistral default model mistral-small-latest", () => must(prov({ MISTRAL_API_KEY: "m".repeat(30) }, "mistral").model === "mistral-small-latest"));
await t("Mistral base URL api.mistral.ai/v1", () => must(prov({ MISTRAL_API_KEY: "m".repeat(30) }, "mistral").base === "https://api.mistral.ai/v1"));
await t("Custom model setting (ZAI_MODEL) kaam karti hai", () => must(prov({ ZAI_API_KEY: "x".repeat(30), ZAI_MODEL: "glm-4.5-flash" }, "zai").model === "glm-4.5-flash"));
await t("FREE_ENABLED=false se bina-key brains band", () => { globalThis.__cfg = { FREE_ENABLED: "false" }; return must(!P.getProviders().some((p) => p.keyless)); });
await t("OLLAMA_ENABLED=false se Ollama band", () => { globalThis.__cfg = { OLLAMA_ENABLED: "false" }; return must(!P.getProviders().some((p) => p.id === "ollama")); });
await t("Saare 8 brains ek saath (sab keys)", () => { globalThis.__cfg = { GROQ_API_KEY: "g".repeat(30), GEMINI_API_KEY: "a".repeat(30), OPENROUTER_API_KEY: "o".repeat(30), ZAI_API_KEY: "z".repeat(30), MISTRAL_API_KEY: "m".repeat(30) }; return must(P.getProviders().length === 8, String(P.getProviders().length)); });
await t("Vision brains: Gemini + Groq vision", () => { const v = P.visionProviders(P.getProviders()).map((p) => p.id); return must(v.includes("gemini") && v.includes("groq-vision"), v.join()); });

sec("2. Provider calls (mock server)");
const cfgAll = { GROQ_API_KEY: "g".repeat(30), GEMINI_API_KEY: "AIza" + "a".repeat(30), ZAI_API_KEY: "z".repeat(30), MISTRAL_API_KEY: "m".repeat(30) };
const msgs = [{ role: "user", content: "salam" }];
await t("Z.ai: sahi URL + Bearer key + model", async () => { routes = [[/api\.z\.ai/, () => OK("GLM jawab")]]; calls.length = 0; const r = await P.callProvider(prov(cfgAll, "zai"), msgs); const c = calls[0]; return must(r === "GLM jawab" && c.url === "https://api.z.ai/api/paas/v4/chat/completions" && c.headers.Authorization === "Bearer " + "z".repeat(30) && c.body.model === "glm-4.7-flash"); });
await t("Mistral: sahi URL + Bearer key + model", async () => { routes = [[/mistral/, () => OK("Mistral jawab")]]; calls.length = 0; const r = await P.callProvider(prov(cfgAll, "mistral"), msgs); return must(r === "Mistral jawab" && calls[0].url === "https://api.mistral.ai/v1/chat/completions" && calls[0].body.model === "mistral-small-latest"); });
await t("Gemini: x-goog-api-key header", async () => { routes = [[/generativelanguage/, () => OK("G")]]; calls.length = 0; await P.callProvider(prov(cfgAll, "gemini"), msgs); return must(calls[0].headers["x-goog-api-key"]); });
await t("429 limit: saaf 'limit reached' error", async () => { routes = [[/mistral/, () => J(429, {}, { "retry-after": "30" })]]; try { await P.callProvider(prov(cfgAll, "mistral"), msgs); return false; } catch (e) { return must(/limit reached \(retry in 30s\)/.test(e.message), e.message); } });
await t("429 ke baad cooldown laga (isCooling)", () => must(P.isCooling("mistral")));
await t("Doosra brain cooldown se mutasir nahi", () => must(!P.isCooling("zai")));
await t("Khali jawab: 'empty reply' error", async () => { routes = [[/api\.z\.ai/, () => J(200, { choices: [{ message: { content: "" } }] })]]; try { await P.callProvider(prov(cfgAll, "zai"), msgs); return false; } catch (e) { return must(/empty reply/.test(e.message)); } });
await t("Bina-key server ka error-jawab (200) error mana jata hai", async () => { routes = [[/pollinations/, () => OK("The API key used for this request has reached its limit")]]; globalThis.__cfg = {}; const p = P.getProviders().find((x) => x.id === "pollinations"); try { await P.callProvider(p, msgs); return false; } catch (e) { return must(/busy/.test(e.message)); } });
await t("Asli jawab jis mein 'rate limit' beech mein ho, theek rehta hai", async () => { routes = [[/pollinations/, () => OK("Groq ka rate limit 30 RPM hai.")]]; globalThis.__cfg = {}; const p = P.getProviders().find((x) => x.id === "pollinations"); const r = await P.callProvider(p, msgs); return must(/30 RPM/.test(r)); });
await t("401 ghalat key: HTTP 401 error dikhata hai", async () => { routes = [[/api\.z\.ai/, () => J(401, { error: "bad key" })]]; try { await P.callProvider(prov(cfgAll, "zai"), msgs); return false; } catch (e) { return must(/HTTP 401/.test(e.message)); } });
await t("Lambi chat chhoti hoti hai (trim, Groq 20k)", async () => { routes = [[/groq/, () => OK("ok")]]; calls.length = 0; const big = Array.from({ length: 60 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: "x".repeat(3000) })); await P.callProvider(prov(cfgAll, "groq"), [{ role: "system", content: "s" }, ...big]); const n = JSON.stringify(calls[0].body.messages).length; return must(n < 40000, String(n)); });
await t("System message trim ke baad bhi rehta hai", () => must(calls[0].body.messages[0].role === "system"));

sec("3. Groq 'Tool choice is none' fix");
const toolErr = (gen) => J(400, { error: { message: "Tool choice is none, but model called a tool", type: "invalid_request_error", code: "tool_use_failed", ...(gen !== undefined ? { failed_generation: gen } : {}) } });
await t("write_file tool call -> <action> mein badla", async () => { routes = [[/groq/, () => toolErr(JSON.stringify({ name: "write_file", arguments: { path: "hero.html", content: "<h1>Hero</h1>" } }))]]; const r = await P.callProvider(prov(cfgAll, "groq"), msgs); return must(/<action tool="write_file" path="hero.html">\n<h1>Hero<\/h1>\n<\/action>/.test(r), r); });
await t("read_file (namespace 'repo.read_file') bhi badla", async () => { routes = [[/groq/, () => toolErr('{"name":"repo_browser.read_file","arguments":{"path":"index.html"}}')]]; const r = await P.callProvider(prov(cfgAll, "groq"), msgs); return must(/<action tool="read_file">\{"path":"index.html"\}<\/action>/.test(r), r); });
await t("edit_file old/new badla", async () => { routes = [[/groq/, () => toolErr(JSON.stringify({ name: "edit_file", arguments: { path: "a.css", old: "red", new: "blue" } }))]]; const r = await P.callProvider(prov(cfgAll, "groq"), msgs); return must(/<old>red<\/old><new>blue<\/new>/.test(r)); });
await t("arguments string (JSON text) bhi samjha", async () => { routes = [[/groq/, () => toolErr(JSON.stringify({ name: "finish", arguments: JSON.stringify({ summary: "done" }) }))]]; const r = await P.callProvider(prov(cfgAll, "groq"), msgs); return must(/<action tool="finish">\{"summary":"done"\}<\/action>/.test(r), r); });
await t("Kai tool calls (array) sab badle", async () => { routes = [[/groq/, () => toolErr(JSON.stringify([{ name: "read_file", arguments: { path: "a" } }, { name: "read_file", arguments: { path: "b" } }]))]]; const r = await P.callProvider(prov(cfgAll, "groq"), msgs); return must((r.match(/<action/g) || []).length === 2); });
await t("Pehle se <action> ho to waisa hi wapas", async () => { routes = [[/groq/, () => toolErr('<action tool="check">{}</action>')]]; const r = await P.callProvider(prov(cfgAll, "groq"), msgs); return must(r === '<action tool="check">{}</action>'); });
await t("failed_generation na ho: llama-3.3-70b se dobara", async () => { calls.length = 0; routes = [[/groq/, (u, b) => b.model === "openai/gpt-oss-120b" ? toolErr() : OK("llama ne jawab diya")]]; const r = await P.callProvider(prov(cfgAll, "groq"), msgs); return must(r === "llama ne jawab diya" && calls.at(-1).body.model === "llama-3.3-70b-versatile"); });
await t("GROQ_FALLBACK_MODEL setting se doosra model", async () => { calls.length = 0; routes = [[/groq/, (u, b) => b.model === "openai/gpt-oss-120b" ? toolErr() : OK("ok")]]; await P.callProvider(prov({ ...cfgAll, GROQ_FALLBACK_MODEL: "qwen/qwen3-32b" }, "groq"), msgs); return must(calls.at(-1).body.model === "qwen/qwen3-32b"); });
await t("Fallback bhi fail: loop nahi, saaf error", async () => { calls.length = 0; routes = [[/groq/, () => toolErr()]]; try { await P.callProvider(prov(cfgAll, "groq"), msgs); return false; } catch (e) { return must(calls.length <= 2 && /HTTP 400/.test(e.message), calls.length + " " + e.message); } });
await t("Doosre 400 errors fallback trigger nahi karte", async () => { calls.length = 0; routes = [[/groq/, () => J(400, { error: { message: "context too long" } })]]; try { await P.callProvider(prov(cfgAll, "groq"), msgs); return false; } catch (e) { return must(calls.length === 1); } });

sec("4. Ollama fix");
const cfgO = { OLLAMA_MODEL: "llama3.2:3b" };
await t("Model na mile: laptop par mojood model khud istemal", async () => { calls.length = 0; routes = [[/api\/tags/, () => J(200, { models: [{ name: "nomic-embed-text" }, { name: "qwen3:1.7b" }] })], [/11434\/v1/, (u, b) => b.model === "qwen3:1.7b" ? OK("qwen jawab") : J(404, { error: { message: "model 'llama3.2:3b' not found" } })]]; const r = await P.callProvider(prov(cfgO, "ollama"), msgs); return must(r === "qwen jawab"); });
await t("Embedding model chat ke liye nahi chuna", () => must(!calls.some((c) => c.body?.model === "nomic-embed-text")));
await t("Koi model na ho: 'ollama pull' hidayat", async () => { routes = [[/api\/tags/, () => J(200, { models: [] })], [/11434\/v1/, () => J(404, { error: { message: "model 'llama3.2:3b' not found" } })]]; try { await P.callProvider(prov(cfgO, "ollama"), msgs); return false; } catch (e) { return must(/ollama pull llama3.2:3b/.test(e.message), e.message); } });
await t("Uske baad Ollama 10 min cooldown", () => must(P.isCooling("ollama")));
await t("Ollama band ho (connection refused): crash nahi", async () => { routes = [[/11434/, () => { throw new TypeError("fetch failed"); }]]; try { await P.callProvider(prov({ OLLAMA_URL: "http://localhost:11999" }, "ollama"), msgs); } catch (e) { return must(/fetch failed/.test(e.message)); } return true; });

sec("5. Real free brains (internet, bina key)");
globalThis.fetch = realFetch;
for (const id of ["pollinations", "llm7"]) {
  await t(`${id}: asli jawab`, async () => { globalThis.__cfg = {}; const p = P.getProviders().find((x) => x.id === id); globalThis.fetch = realFetch; const r = await P.callProvider(p, [{ role: "user", content: "Reply with exactly: OK" }], 40000); return must(r && r.length > 0, "khali") && `jawab: ${r.slice(0, 40).replace(/\s+/g, " ")}`; });
}
await t("Z.ai endpoint zinda (401 bina key)", async () => { const r = await realFetch("https://api.z.ai/api/paas/v4/chat/completions", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }); return must(r.status === 401, String(r.status)); });
await t("Mistral endpoint zinda (401 bina key)", async () => { const r = await realFetch("https://api.mistral.ai/v1/models"); return must(r.status === 401, String(r.status)); });
await t("Groq endpoint zinda (401 bina key)", async () => { const r = await realFetch("https://api.groq.com/openai/v1/models"); return must(r.status === 401, String(r.status)); });
await t("OpenRouter endpoint zinda", async () => { const r = await realFetch("https://openrouter.ai/api/v1/models"); return must(r.ok, String(r.status)); });

sec("6. Display 4K / 8K / 3D");
const win = (dpr, w) => { globalThis.window = { devicePixelRatio: dpr, innerWidth: w }; };
await t("HD = 1x render", () => { win(2, 1920); return must(PR.renderScale("hd") === 1); });
await t("Auto = screen ka DPR (max 2)", () => { win(1.5, 1920); return must(PR.renderScale("auto") === 1.5); });
await t("Auto 3x screen par bhi 2 tak", () => { win(3, 1280); return must(PR.renderScale("auto") === 2); });
await t("4K: 1920 screen par 2x (=3840px)", () => { win(1, 1920); return must(PR.renderScale("4k") === 2); });
await t("4K: 1366 laptop par ~2.81x", () => { win(1, 1366); return must(Math.abs(PR.renderScale("4k") - 3840 / 1366) < 0.01); });
await t("8K: 1920 screen par 4x (=7680px)", () => { win(1, 1920); return must(PR.renderScale("8k") === 4); });
await t("8K: had 6x (GPU bachao)", () => { win(1, 800); return must(PR.renderScale("8k") === 6); });
await t("4K asli 4K screen (dpr 2, 1920 css) = 2x", () => { win(2, 1920); return must(PR.renderScale("4k") === 2); });
await t("Default prefs: quality auto, 3D off, UI 100%", () => must(PR.DEFAULT_PREFS.quality === "auto" && PR.DEFAULT_PREFS.fx3d === "off" && PR.DEFAULT_PREFS.uiScale === "100"));
await t("savePrefs 'faheem-prefs' event bhejta hai (live update)", () => must(/faheem-prefs/.test(rd("lib/prefs.js"))));
await t("Background quality se render karta hai", () => must(/renderScale\(disp\.quality\)/.test(rd("app/components/Background.js"))));
await t("Background 3D orb layer (fx3d)", () => must(/<Scene3D quality=\{disp\.quality\} detail=\{disp\.fx3d\}/.test(rd("app/components/Background.js"))));
await t("UI size zoom laga", () => must(/document\.body\.style\.zoom/.test(rd("app/components/Background.js"))));
await t("Scene3D: 3D Ultra = 128 detail + 2600 dust", () => { const s = rd("app/components/Scene3D.js"); return must(/detail === "ultra" \? 128/.test(s) && /2600/.test(s)); });
await t("Scene3D quality badle to dobara banta hai", () => must(/\[levelRef, quality, detail\]/.test(rd("app/components/Scene3D.js"))));
await t("Options page: Display card (4K/8K/3D/UI size)", () => { const s = rd("app/options/page.js"); return must(/4K Ultra/.test(s) && /8K Extreme/.test(s) && /3D Ultra/.test(s) && /UI size/.test(s)); });
await t("8GB laptop warning dikhti hai", () => must(/8GB laptop/.test(rd("app/options/page.js"))));

sec("7. Hermes skills");
const sk = rd("hermes-skills/faheem-design/SKILL.md");
const fm = sk.match(/^---\n([\s\S]*?)\n---/);
await t("faheem-design SKILL.md frontmatter mojood", () => must(fm));
await t("frontmatter: name = faheem-design", () => must(/^name: faheem-design$/m.test(fm[1])));
await t("frontmatter: description", () => must(/^description: .{10,}/m.test(fm[1])));
await t("frontmatter: version", () => must(/^version: /m.test(fm[1])));
await t("Skill mein 'When to Use' + 'Procedure'", () => must(/## When to Use/.test(sk) && /## Procedure/.test(sk)));
await t("faheem-design GitHub par live (raw)", async () => { const r = await realFetch("https://raw.githubusercontent.com/eswatinitravel/faheem-ai-dashboard/main/hermes-skills/faheem-design/SKILL.md"); return must(r.ok, String(r.status)); });
const bat = fs.readFileSync(path.join(ROOT, "HERMES-SKILLS.bat"), "latin1");
await t("HERMES-SKILLS.bat Windows line endings (CRLF)", () => must(bat.includes("\r\n") && !/[^\r]\n/.test(bat)));
await t("bat: hermes command na ho to saaf message", () => must(/where hermes/.test(bat) && /nahi mila/.test(bat)));
await t("bat: hallmark fallback seedha GitHub se", () => must(/codeload\.github\.com\/Nutlope\/hallmark/.test(bat)));
await t("bat: hallmark %LOCALAPPDATA%\\hermes\\skills\\hallmark mein", () => must(/%LOCALAPPDATA%\\hermes\\skills\\hallmark/.test(bat)));
await t("bat: pehle se install ho to download skip", () => must(/if exist "%LOCALAPPDATA%\\hermes\\skills\\hallmark\\SKILL.md" goto hall_ok/.test(bat)));
await t("bat: saare goto labels mojood", () => { const g = [...bat.matchAll(/goto (\w+)/g)].map((m) => m[1]); return must(g.every((l) => new RegExp("^:" + l + "\\s*$", "m").test(bat.replace(/\r/g, ""))), g.join()); });
await t("Hallmark ZIP download chalta hai", async () => { const r = await realFetch("https://codeload.github.com/Nutlope/hallmark/zip/refs/heads/main"); return must(r.ok && /zip/.test(r.headers.get("content-type"))); });
await t("Hallmark ZIP mein skills/hallmark/SKILL.md (bat ka path)", () => { execSync(`cd ${tmp} && curl -sL -o h.zip https://codeload.github.com/Nutlope/hallmark/zip/refs/heads/main && unzip -qo h.zip`); return must(fs.existsSync(path.join(tmp, "hallmark-main/skills/hallmark/SKILL.md"))); });
await t("Hallmark SKILL.md name: hallmark", () => must(/^name: hallmark$/m.test(fs.readFileSync(path.join(tmp, "hallmark-main/skills/hallmark/SKILL.md"), "utf8"))));
await t("Hallmark references folder bhi copy hoga", () => must(fs.existsSync(path.join(tmp, "hallmark-main/skills/hallmark/references"))));

sec("8. Update system");
const up = rd("app/api/update/route.js"), ps = rd("scripts/update.ps1");
await t("Update button UPDATE.bat explorer.exe se kholta hai", () => must(/spawn\("explorer\.exe", \[bat\]/.test(up)));
await t("explorer na chale to purana tareeqa backup", () => must(/if \(!launched\)/.test(up)));
await t("Sirf isi laptop se update (403 bahar se)", () => must(/isLocal\(req\)/.test(up)));
await t("update.ps1: ek waqt ek updater (mutex)", () => must(/Global\\\\FaheemAIUpdate/.test(ps) || /Global\\FaheemAIUpdate/.test(ps)));
await t("update.ps1: pehle app window band", () => must(/--app=http:\/\/localhost:3000/.test(ps)));
await t("update.ps1: keys/chats (data, .env.local) mehfooz", () => must(/\$keep = @\("data", ".env.local", "node_modules", ".next"\)/.test(ps)));
await t("update.ps1: log data/update.log", () => must(/update\.log/.test(ps)));
await t("update.ps1: aakhir mein app dobara start", () => must(/start\.ps1/.test(ps)));
await t("Version compare: 3.8.0 > 3.7.0, 3.10.0 > 3.9.9", () => { const newer = (a, b) => { const pa = a.split(".").map(Number), pb = b.split(".").map(Number); for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0); return false; }; eval(up.match(/function newer[\s\S]*?\n}/)[0].replace("function newer", "globalThis.__n = function")); return must(__n("3.8.0", "3.7.0") && __n("3.10.0", "3.9.9") && !__n("3.7.0", "3.7.0")); });
await t("UPDATE.bat CRLF", () => must(fs.readFileSync(path.join(ROOT, "UPDATE.bat"), "latin1").includes("\r\n")));

sec("9. Settings / keys");
const cfgjs = rd("lib/config.js"), st = rd("app/components/Settings.js");
await t("Keys home folder mein (update se nahi mitti)", () => must(/\.faheem-ai", "keys\.json"/.test(cfgjs)));
await t("ZAI_API_KEY + MISTRAL_API_KEY save fields", () => must(/"ZAI_API_KEY", "ZAI_MODEL", "MISTRAL_API_KEY", "MISTRAL_MODEL"/.test(cfgjs)));
await t("Settings mein Z.ai box + key link", () => must(/z\.ai\/manage-apikey/.test(st)));
await t("Settings mein Mistral box + key link", () => must(/console\.mistral\.ai/.test(st)));
await t("Ghalat key (email/space) save nahi hoti", () => must(/ZAI_API_KEY: 1, MISTRAL_API_KEY: 1/.test(st)));
await t("Agent order mein zai + mistral", () => must(/"groq", "zai", "mistral"/.test(rd("lib/agent/loop.js"))));
await t("Chat agents order mein zai + mistral", () => must((rd("lib/agents.js").match(/"zai", "mistral"/g) || []).length === 7));
await t("/v1 API order mein zai + mistral", () => must(/"zai", "mistral"/.test(rd("app/api/v1/chat/completions/route.js"))));


sec("12. UI UX Pro Max (data + search)");
const U = await import(path.join(ROOT, "lib/uupm/index.js"));
const cnt = { product: 192, style: 88, color: 192, typography: 74, ux: 119, landing: 34 };
for (const [d, n] of Object.entries(cnt)) await t(`Data ${d}: ${n} rows`, () => must(U.rows(d).length === n, String(U.rows(d).length)));
await t("LICENSE MIT saath hai", () => must(/MIT License/.test(rd("lib/uupm/LICENSE"))));
await t("CSV parser: quotes, comma, nayi line", () => { const r = U.parseCSV('a,b\n"x, y","line1\nline2 ""q"""\n'); return must(r[0].a === "x, y" && r[0].b === 'line1\nline2 "q"'); });
const pyExpect = { "luxury fashion ecommerce": "E-commerce Luxury", "restaurant food delivery": "Restaurant/Food Service", "fintech banking app": "Fintech/Crypto", "travel agency booking": "Travel/Tourism Agency", "beauty spa salon": "Beauty/Spa/Wellness Service", "saas dashboard analytics": "Analytics Dashboard", "online course education": "Online Course/E-learning", "real estate property listing": "Real Estate/Property", "healthcare clinic appointment": "Healthcare App", "gaming esports": "Gaming", "crypto wallet": "Fintech/Crypto", "news magazine blog": "Magazine/Blog", "fitness gym tracker": "Fitness/Gym App", "hotel booking": "Hotel/Hospitality", "pet store": "Pet Tech App" };
await t("Search asli Python skill jaisa (15 sawal)", () => { const bad = Object.entries(pyExpect).filter(([q, e]) => U.search(q, "product", 1)[0]?.["Product Type"] !== e); return must(!bad.length, bad.map((b) => b[0]).join(", ")) && "15/15 same as Python search.py"; });
const DS = U.designSystem("luxury fashion ecommerce");
await t("Design system: product E-commerce Luxury", () => must(DS.product === "E-commerce Luxury"));
await t("Design system: rang Python jaise (#1C1917 / gold #A16207)", () => must(DS.colors.primary === "#1C1917" && DS.colors.accent === "#A16207" && DS.colors.background === "#FAFAF9"));
await t("Design system: font Cormorant + Montserrat", () => must(DS.typography.heading === "Cormorant" && DS.typography.body === "Montserrat"));
await t("Design system: style Liquid Glass", () => must(DS.style.name === "Liquid Glass"));
await t("Design system: page Feature-Rich Showcase", () => must(DS.landing.name === "Feature-Rich Showcase" && DS.landing.sections.length > 20));
await t("Design system: Google Fonts link", () => must(/^https:\/\/fonts\.googleapis\.com\/css2\?family=Cormorant/.test(DS.typography.url)));
await t("Har product ka design system banta hai (192/192)", () => { const bad = U.rows("product").filter((p) => { const d = U.designSystem(p["Product Type"] + " " + p.Keywords.split(",")[0]); return !d || !d.colors.primary || !d.typography.heading || !d.landing.name; }); return must(!bad.length, bad.length + " fail: " + bad.slice(0, 3).map((b) => b["Product Type"]).join(", ")); });
await t("Bekaar sawal: null (ghalat design nahi)", () => must(U.designSystem("qqqzzz xxyyw") === null));
await t("Brief: rang + font + checklist, 3000 se chhota", () => { const b = U.designBrief("restaurant food delivery"); return must(/--primary #/.test(b) && /Fonts:/.test(b) && /PRE-DELIVERY CHECKLIST/.test(b) && b.length < 3000, String(b.length)) && b.length + " chars"; });
await t("UX search: 'touch target' -> Touch qaida", () => must(U.search("touch target size", "ux", 3).some((r) => /touch/i.test(r.Issue + r.Category))));
await t("Font search: 'luxury elegant'", () => must(U.search("luxury elegant", "typography", 1).length === 1));
await t("Next.js stack search", () => must(U.search("image optimization", "nextjs", 1).length === 1));
await t("Contrast: kala/safed = 21:1", () => must(U.contrast("#000", "#ffffff") === 21));
await t("Contrast: #777 par #888 = fail (<4.5)", () => must(U.contrast("#777777", "#888888") < 4.5));
await t("Contrast: ghalat rang = null", () => must(U.contrast("red", "#fff") === null));

sec("13. UX Pro checks (bina AI)");
const goodHtml = '<html><head><meta name="viewport" content="width=device-width"></head><body><label for="e">Email</label><input id="e"><img src="a.webp" alt="Silk saree"><button aria-label="Cart"><svg></svg></button></body></html>';
await t("Achha page: koi masla nahi", () => { const r = U.uxCheck(goodHtml, "button{min-height:44px;color:#fff;background:#111}"); return must(r.ok, r.issues.join("; ")); });
await t("Viewport na ho: pakra", () => must(U.uxCheck("<html><body><p>x</p></body></html>").issues.some((i) => /Viewport/.test(i))));
await t("Image bina alt: pakra", () => must(U.uxCheck(goodHtml.replace(' alt="Silk saree"', "")).issues.some((i) => /alt/.test(i))));
await t("Emoji icon button: pakra", () => must(U.uxCheck(goodHtml.replace("<svg></svg>", "🛒")).issues.some((i) => /emoji/.test(i))));
await t("Kam contrast CSS: pakra", () => must(U.uxCheck(goodHtml, ".x{color:#aaaaaa;background:#ffffff}").issues.some((i) => /contrast/i.test(i))));
await t("Chhota button (30px): pakra", () => must(U.uxCheck(goodHtml, ".btn{height:30px}").issues.some((i) => /44px/.test(i))));
await t("Input bina label: pakra", () => must(U.uxCheck('<html><head><meta name="viewport"></head><body><input placeholder="Email"></body></html>').issues.some((i) => /label/.test(i))));
await t("Animation bina reduced-motion: pakra", () => must(U.uxCheck(goodHtml, ".a{transition:opacity .2s}").issues.some((i) => /reduced-motion/.test(i))));
await t("designCheck mein 'UX Pro:' qawaid jurte hain", () => must(/UX Pro: .*emoji/.test(rd("lib/design.js")) || /"UX Pro: " \+ i/.test(rd("lib/design.js"))));
await t("Agent Mode prompt mein design brief", () => must(/designBrief\(task\)/.test(rd("lib/agent/loop.js"))));
await t("Agent tools: design_system + design_search", () => { const s = rd("lib/agent/tools.js"); return must(/case "design_system"/.test(s) && /case "design_search"/.test(s) && /design_system \{"query"/.test(s)); });
await t("Website Master prompt mein design brief", () => must(/designBrief\(String\(rawText/.test(rd("app/api/chat/route.js"))));

sec("14. SVG icons + touch (dashboard khud)");
const ic = rd("app/components/Icon.js");
const used = [...["app/page.js", "app/tools/page.js", "app/options/page.js", "app/agent/page.js", "app/design/page.js"].map(rd).join("\n").matchAll(/<Icon name="(\w+)"/g)].map((m) => m[1]);
await t("Har istemal hua icon mojood", () => { const miss = [...new Set(used)].filter((n) => !new RegExp(`\\b${n}: <`).test(ic)); return must(!miss.length, miss.join()) && `${new Set(used).size} icons`; });
await t("Home topbar: koi emoji icon nahi", () => { const top = rd("app/page.js").split("\n").filter((l) => /icon-btn/.test(l)).join("\n"); return must(!/[\u{1F300}-\u{1FAFF}\u2190-\u21FF\u2295-\u22FF\uFF0B\u25A0-\u25FF\u22EF\u2315]/u.test(top), top.match(/[\u{1F300}-\u{1FAFF}]/u)?.[0]); });
await t("Agent topbar: koi emoji icon nahi", () => { const top = rd("app/agent/page.js").split("\n").filter((l) => /icon-btn/.test(l)).join("\n"); return must(!/[\u{1F300}-\u{1FAFF}\u21A9\uFF0B\u22EF]/u.test(top)); });
await t("Icon-only buttons par aria-label", () => { const lines = ["app/page.js", "app/agent/page.js", "app/tools/page.js"].map(rd).join("\n").split("\n").filter((l) => /className="icon-btn"/.test(l) && /<Icon/.test(l)); return must(lines.length && lines.every((l) => /aria-label=/.test(l)), lines.find((l) => !/aria-label=/.test(l))) && `${lines.length} buttons`; });
await t("Phone par buttons 44px (pointer: coarse)", () => must(/@media \(pointer: coarse\) \{ \.icon-btn \{ width: 44px; height: 44px;/.test(rd("app/globals.css"))));
await t("Focus ring (keyboard) har control par", () => must(/button:focus-visible, a:focus-visible/.test(rd("app/globals.css"))));
await t("Reduced-motion poore app mein", () => must(/prefers-reduced-motion: reduce\) \{ \*, \*::before/.test(rd("app/globals.css"))));
await t("Design Studio: labels (sr) + 8 domains", () => { const s = rd("app/design/page.js"); return must((s.match(/htmlFor=/g) || []).length >= 3 && ((s.split("\n").find((l) => l.startsWith("const DOMS")) || "").match(/\["\w+", "[^"]+"\]/g) || []).length === 8); });

sec("15. Hermes: ui-ux-pro-max");
await t("bat: 3 skills (3/3 ui-ux-pro-max)", () => must(/--- 3\/3 ui-ux-pro-max ---/.test(bat) || /--- 3\/3 ui-ux-pro-max ---/.test(fs.readFileSync(path.join(ROOT, "HERMES-SKILLS.bat"), "latin1"))));
const bat2 = fs.readFileSync(path.join(ROOT, "HERMES-SKILLS.bat"), "latin1");
await t("bat: UUPM codeload URL", () => must(/codeload\.github\.com\/nextlevelbuilder\/ui-ux-pro-max-skill\/zip\/refs\/heads\/main/.test(bat2)));
await t("bat: CRLF + saare labels", () => { const g = [...bat2.matchAll(/goto (\w+)/g)].map((m) => m[1]); return must(bat2.includes("\r\n") && g.every((l) => new RegExp("^:" + l + "\\s*$", "m").test(bat2.replace(/\r/g, ""))), g.join()); });
await t("UUPM ZIP download + .claude/skills/ui-ux-pro-max/SKILL.md (bat ka path)", () => { execSync(`cd ${tmp} && curl -sL -o u.zip https://codeload.github.com/nextlevelbuilder/ui-ux-pro-max-skill/zip/refs/heads/main && unzip -qo u.zip`, { timeout: 90000 }); return must(fs.existsSync(path.join(tmp, "ui-ux-pro-max-skill-main/.claude/skills/ui-ux-pro-max/SKILL.md"))); });
await t("UUPM skill: name ui-ux-pro-max", () => must(/^name: ui-ux-pro-max$/m.test(fs.readFileSync(path.join(tmp, "ui-ux-pro-max-skill-main/.claude/skills/ui-ux-pro-max/SKILL.md"), "utf8"))));
await t("UUPM skill folder mein data + scripts (symlink nahi)", () => { const d = path.join(tmp, "ui-ux-pro-max-skill-main/.claude/skills/ui-ux-pro-max"); return must(fs.statSync(path.join(d, "data/products.csv")).isFile() && fs.existsSync(path.join(d, "scripts/search.py"))); });
await t("Installed skill ki Python search chalti hai (Hermes jaisa)", () => { const o = execSync(`python3 scripts/search.py "fashion ecommerce" --design-system -f markdown`, { cwd: path.join(tmp, "ui-ux-pro-max-skill-main/.claude/skills/ui-ux-pro-max"), encoding: "utf8", timeout: 60000 }); return must(/## Design System/.test(o) && /Typography/.test(o)); });

// ---------- live server ----------
sec("10. Live server (next start)");
const PORT = 3177; const env = { ...process.env, PORT: String(PORT), HOME: tmp, NODE_ENV: "production" };
const srv = spawn("npx", ["next", "start", "-p", String(PORT)], { cwd: ROOT, env, stdio: "ignore", detached: true });
const base = `http://localhost:${PORT}`;
for (let i = 0; i < 60; i++) { try { await realFetch(base + "/api/tools"); break; } catch { await new Promise((r) => setTimeout(r, 1000)); } }
const get = (u) => realFetch(base + u, { cache: "no-store" });
for (const pg of ["/", "/tools", "/options", "/agent"]) await t(`Page ${pg} khulta hai (200)`, async () => { const r = await get(pg); return must(r.status === 200, String(r.status)); });
await t("Home par Tools button", async () => { const h = await (await get("/")).text(); return must(/href="\/tools"/.test(h)); });
await t("/tools page: 'har brain ka chat board'", async () => { const h = await (await get("/tools")).text(); return must(/har brain ka chat board/.test(h)); });
await t("/api/tools: brains ki list", async () => { const d = await (await get("/api/tools")).json(); return must(d.providers.length >= 3) && `${d.providers.length} brains: ${d.providers.map((p) => p.id).join(", ")}`; });
await t("/api/tools POST: ghalat brain = 404", async () => { const r = await realFetch(base + "/api/tools", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider: "nahi-hai", messages: [{ role: "user", content: "hi" }] }) }); return must(r.status === 404); });
await t("/api/tools POST: khali message = 400", async () => { const r = await realFetch(base + "/api/tools", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider: "pollinations", messages: [] }) }); return must(r.status === 400); });
await t("/api/tools POST: ghalat JSON se crash nahi", async () => { const r = await realFetch(base + "/api/tools", { method: "POST", headers: { "content-type": "application/json" }, body: "{bad" }); return must(r.status === 404 || r.status === 400); });
await t("Tools chat board: Pollinations se asli baat (1 by 1)", async () => { const d = await (await realFetch(base + "/api/tools", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider: "pollinations", messages: [{ role: "user", content: "Say hi in 3 words" }] }) })).json(); return must(d.ok, d.error) && `${(d.ms / 1000).toFixed(1)}s: ${d.text.slice(0, 40)}`; });
await t("Tools chat board: Ollama band ho to saaf error (crash nahi)", async () => { const d = await (await realFetch(base + "/api/tools", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider: "ollama", messages: [{ role: "user", content: "hi" }] }) })).json(); return must(d.ok === false && d.error) && d.error.slice(0, 60); });
await t("/api/chat GET: agents + brains", async () => { const d = await (await get("/api/chat")).json(); return must(d.agents.length === 7 && d.providers.length >= 3); });
await t("/api/settings GET (localhost)", async () => { const d = await (await get("/api/settings")).json(); return must("ZAI_API_KEY" in d && "MISTRAL_API_KEY" in d); });
await t("/api/update GET: version = package.json", async () => { const d = await (await get("/api/update")).json(); return must(d.current === JSON.parse(rd("package.json")).version, JSON.stringify(d)) && "v" + d.current; });
await t("/v1/models (OpenAI jaisa API)", async () => { const r = await get("/api/v1/models"); return must(r.ok); });
await t("Page /design khulta hai (200)", async () => { const r = await get("/design"); return must(r.status === 200); });
await t("Home par Design Studio link", async () => { const h = await (await get("/")).text(); return must(/href="\/design"/.test(h)); });
await t("/api/design: luxury fashion -> poora system", async () => { const d = await (await get("/api/design?q=" + encodeURIComponent("luxury fashion ecommerce"))).json(); return must(d.ok && d.system.colors.primary === "#1C1917" && d.system.typography.heading === "Cormorant") && d.system.product; });
await t("/api/design: ux domain search", async () => { const d = await (await get("/api/design?q=form%20error&domain=ux&n=3")).json(); return must(d.ok && d.results.length === 3); });
await t("/api/design: ghalat domain = 400", async () => { const r = await get("/api/design?q=x&domain=nahi"); return must(r.status === 400); });
await t("/api/design: khali q = 400", async () => { const r = await get("/api/design"); return must(r.status === 400); });
await t("/api/design: bekaar sawal = 404", async () => { const r = await get("/api/design?q=qqqzzz%20xxyyw"); return must(r.status === 404); });
await t("/api/design POST: UX check", async () => { const d = await (await realFetch(base + "/api/design", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ html: "<html><body><img src=a.png></body></html>" }) })).json(); return must(!d.ok && d.issues.length >= 2) && d.issues.length + " issues"; });
try { process.kill(-srv.pid); } catch {}

sec("11. Build + Browser Tester");
await t("Next.js build pass", () => { const o = execSync("npx next build 2>&1", { cwd: ROOT, encoding: "utf8", timeout: 300000 }); return must(/Compiled successfully/.test(o)); });
await t("Browser Tester: achha page pass", () => { fs.writeFileSync(path.join(tmp, "good.html"), '<html><body><button onclick="document.body.dataset.x=1">Buy</button></body></html>'); const d = JSON.parse(execSync(`node scripts/runtime-test.cjs ${tmp}/good.html`, { cwd: ROOT, encoding: "utf8", timeout: 40000 })); return must(d.ok && d.clicked === 1) && `clicked ${d.clicked}/${d.buttons}`; });
await t("Browser Tester: toota button pakarta hai", () => { fs.writeFileSync(path.join(tmp, "bad.html"), '<html><body><button onclick="addToCart()">Buy</button></body></html>'); let o; try { o = execSync(`node scripts/runtime-test.cjs ${tmp}/bad.html`, { cwd: ROOT, encoding: "utf8", timeout: 40000 }); } catch (e) { o = e.stdout; } const d = JSON.parse(o); return must(!d.ok && d.errors.length > 0) && d.errors[0].slice(0, 70); });

fs.mkdirSync(path.join(ROOT, "data"), { recursive: true }); fs.writeFileSync(path.join(ROOT, "data", "test-results.json"), JSON.stringify(R, null, 1));
const pass = R.filter((r) => r.ok).length;
console.log(`TOTAL ${R.length} PASS ${pass} FAIL ${R.length - pass}`);
for (const r of R.filter((r) => !r.ok)) console.log("FAIL", r.sec, "|", r.name, "|", r.note);
process.exit(0);
