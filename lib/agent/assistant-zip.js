// v3.16 Private Assistant Builder: "mere laptop ke liye free AI assistant banao".
// 1) Research (GitHub trending is hafta + search + andar ka gyaan) -> card (chat page dikhata hai)
// 2) ZIP pipeline: Planner (persona + skills ka plan) -> Builder (har skill file) -> Tester (bina AI) -> Fixer -> ZIP.
// Bunyaad: templates/hey-puppy (apna, chalne wala Electron + Three.js "Hey Puppy" assistant). AI sirf persona + skills likhta hai,
// is liye free brain band ho tab bhi assistant chalega (default persona) aur label sachcha rehta hai.
import fs from "fs";
import path from "path";
import { estimateTokens, BudgetError } from "./team.js";
import { testProject, packageProject, zipRoot, cleanPath, extractFile } from "./project-zip.js";
import { ROOT as PROJECTS_ROOT, cleanName } from "./tools.js";

export const TEMPLATE_DIR = () => path.join(process.env.FAHEEM_ROOT || process.cwd(), "templates", "hey-puppy");
export const ASSISTANT_DEFAULTS = { maxRounds: 2, maxTokens: 40000, maxCalls: 8 };
export const REQUIRED_FILES = ["package.json", "main.js", "preload.js", "persona.json", "src/brain.js", "src/memory.js", "src/tools.js", "src/voice.js", "src/puppy.html", "src/puppy.js", "src/chat.html", "src/chat.js", "src/chat.css", "extension/manifest.json", "extension/popup.html", "extension/popup.js", "bridges/telegram.js", "mcp-servers.example.json", "CREDITS.md", "skills/README.md"];
const EXT_ALLOWED_PERMS = new Set(["activeTab", "scripting", "storage"]);

export function copyTemplate(dest, src = TEMPLATE_DIR()) {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((f) => (f.name === "node_modules" ? [] : f.isDirectory() ? walk(path.join(d, f.name)) : [path.join(d, f.name)]));
  const files = walk(src);
  for (const f of files) { const rel = path.relative(src, f); const to = path.join(dest, rel); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(f, to); }
  return files.map((f) => path.relative(src, f).split(path.sep).join("/"));
}

// Assistant ke khaas checks (bina AI).
export function assistantChecks(dir) {
  const issues = [];
  for (const f of REQUIRED_FILES) if (!fs.existsSync(path.join(dir, f))) issues.push(`${f}: file nahi hai.`);
  const rj = (f) => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); } catch { return null; } };
  const pkg = rj("package.json");
  if (!pkg || !/electron/.test(pkg.scripts?.start || "")) issues.push('package.json: "start" mein electron nahi.');
  const man = rj("extension/manifest.json");
  if (!man || man.manifest_version !== 3) issues.push("extension/manifest.json: manifest_version 3 chahiye.");
  else {
    for (const p of man.permissions || []) if (!EXT_ALLOWED_PERMS.has(p)) issues.push(`extension/manifest.json: zyada permission "${p}".`);
    for (const h of man.host_permissions || []) if (!/^http:\/\/127\.0\.0\.1:\d+\/\*$/.test(h)) issues.push(`extension/manifest.json: host "${h}" sirf 127.0.0.1 hona chahiye.`);
  }
  const persona = rj("persona.json");
  if (!persona || !persona.assistantName || !persona.greetingUr) issues.push("persona.json: assistantName / greetingUr nahi.");
  try {
    const main = fs.readFileSync(path.join(dir, "main.js"), "utf8");
    if (!/transparent: true/.test(main) || !/frame: false/.test(main) || !/setAlwaysOnTop\(true/.test(main)) issues.push("main.js: puppy window transparent / frameless / always-on-top nahi.");
    if (!/contextIsolation: true/.test(main) || /nodeIntegration: true/.test(main)) issues.push("main.js: contextIsolation on aur nodeIntegration off hona chahiye.");
    if (!/server\.listen\(PORT, "127\.0\.0\.1"\)/.test(main)) issues.push("main.js: extension server sirf 127.0.0.1 par.");
  } catch {}
  for (const f of fs.readdirSync(path.join(dir, "skills")).filter((x) => x.endsWith(".md"))) if (!fs.readFileSync(path.join(dir, "skills", f), "utf8").trim()) issues.push(`skills/${f}: khali skill.`);
  return issues;
}

export const README_ASSISTANT = (persona, features = []) => `## Hey Puppy kya karta hai
- **Desktop puppy:** transparent, hamesha oopar, bina frame ki window. Safed 3D puppy screen ke neeche kinare par ghoomta hai, kheench kar hila sakte hain, khamoshi mein baith / so jata hai. Settings mein "Glowing orb" avatar bhi.
- **Jazbaat:** khush (dum hilana), excited (chhalang), udaas, neend, curious (sar tedha), sun raha (kaan khade), soch raha, playful (bhonkna), pyar (dil) - baat ke mood ke mutabiq.
- **Awaz:** Mic button ya **Ctrl+Shift+Space** (push-to-talk). Urdu / English khud pehchaan (Groq Whisper, free key). Jawab Edge ki free awaz mein (Urdu: ur-PK-UzmaNeural), warna Windows ki awaz. Aap bolna shuru karein to Puppy chup ho jata hai. "Hey Puppy" wake word Settings se on (free Groq limit zyada lagti hai).
- **Browser madad:** \`extension\` folder Chrome mein load karein (chrome://extensions > Developer mode > Load unpacked). Icon dabayein: page Puppy ko bhejein, khulasa / sawal. Fill / click sirf extension mein Allow dabane par.
- **Pehle ijazat:** har kaam (site / app kholna, file parhna, note likhna, reminder, nayi skill) se pehle chat mein Allow / Deny card. Sab "Kaam ka log" tab mein.
- **Yaad + seekha hua:** aap ki pasand yaad rehti hai; har ghalti / tasheeh ke baad sabaq. "Yaad" tab mein dekhein ya mitayein.
- **Skills:** \`skills\` folder ki .md files. Chat mein "nayi skill seekho: ..." (Allow ke baad save).
- **Telegram (ikhtiyari):** .env mein TELEGRAM_BOT_TOKEN + TELEGRAM_ALLOWED_CHAT_ID. WhatsApp abhi nahi (bridges/WHATSAPP.md).
- **MCP-ready:** tools ki list MCP jaisi; \`mcp-servers.example.json\` mein baad ke liye jagah (abhi MCP client nahi chalta).

## Dimagh (sirf free)
1. **Groq free key** (console.groq.com/keys): chat Settings mein ya .env mein GROQ_API_KEY. Awaz samajhne ke liye bhi yahi.
2. **Ollama (laptop par, internet ke baghair):** ollama.com/download, phir \`ollama pull qwen2.5:3b\` (8GB RAM ke liye 2B-4B model theek). Groq na chale to Puppy khud Ollama try karta hai.

## Shortcuts
- Ctrl+Shift+Space: bolna (push-to-talk)  |  Ctrl+Shift+P: chat kholna  |  Puppy par double-click: chat  |  Tray icon: band karna

${features.length ? `## Research se chune gaye features\n${features.map((f) => `- ${f}`).join("\n")}\n` : ""}
## Pehli dafa
INSTALL.bat (Node check, \`npm install\` - Electron ~100 MB ek dafa download hota hai), phir har dafa START.bat. Puppy ka naam: ${persona.assistantName}.
`;

export const ASSISTANT_PLANNER = `You plan a private desktop assistant for Faheem (Windows, 8GB RAM, free only). The app itself already exists (Electron puppy, voice, tools, memory).
Reply ONLY with JSON: {"assistantName":"Puppy","greetingUr":"Roman Urdu greeting","greetingEn":"English greeting","personality":"1 sentence","skills":[{"file":"skills/name.md","purpose":"Roman Urdu"}]}
Rules: max 3 skills, each a short how-to for the assistant (e.g. daily plan, Vestire store helper, travel quotes). No emoji. No paid services.`;
export const ASSISTANT_BUILDER = `Write ONE skill file (markdown, max 40 lines) for Faheem's desktop assistant "Hey Puppy". Steps in simple Roman Urdu; mention which tools to use (open_url, web_search, open_app, list_files, read_file, write_note, set_reminder, remember, page_action) and that every action asks Allow first. No emoji. Reply exactly:
<file path="PATH">
...markdown...
</file>`;

export async function runAssistantZip({ task, features = [], emit = () => {}, signal, deps = {}, options = {} }) {
  const opt = { ...ASSISTANT_DEFAULTS, ...Object.fromEntries(Object.entries(options).filter(([, v]) => Number(v) > 0).map(([k, v]) => [k, Number(v)])) };
  const step = (who, text) => emit({ type: "step", who, text: String(text).slice(0, 400) });
  const budget = { used: 0, calls: 0 };
  const call = async (role, messages) => {
    if (signal?.aborted) throw new Error("Roka gaya.");
    const est = estimateTokens(messages);
    if (budget.calls >= opt.maxCalls || budget.used + est > opt.maxTokens) throw new BudgetError("Free limit bachane ke liye AI hissa roka.");
    const r = await deps.ask(role, messages, signal); budget.used += est + estimateTokens(r.text); budget.calls++; return r;
  };
  // Research (agar card se pehle nahi hui)
  let research = deps.research || null;
  if (!research && deps.researchFn) { step("Research", "GitHub trending (is hafta) + top assistants dekh raha hoon..."); research = await deps.researchFn(); }
  if (research) step("Research", `${research.sources.join(", ")}: top features - ${research.features.slice(0, 5).join("; ")}`);
  const picked = features.length ? features : research ? research.features.slice(0, 6) : [];

  // Folder + template
  const root = deps.projectsRoot || PROJECTS_ROOT;
  let nm = "hey-puppy", i = 2; while (fs.existsSync(path.join(root, nm)) && fs.readdirSync(path.join(root, nm)).length) nm = `hey-puppy-${i++}`;
  const dir = deps.dir || path.join(root, nm);
  fs.mkdirSync(dir, { recursive: true });
  const copied = copyTemplate(dir, deps.templateDir || TEMPLATE_DIR());
  step("Builder", `Hey Puppy ki bunyaad (${copied.length} files: Electron puppy, awaz, tools, extension) tayyar.`);
  emit({ type: "project", name: path.basename(dir), dir });

  // Planner: persona + skills
  const persona = JSON.parse(fs.readFileSync(path.join(dir, "persona.json"), "utf8"));
  let plan = { skills: [] }, aiNote = "";
  step("Planner", "Puppy ki shakhsiyat aur skills ka plan...");
  try {
    const r = await call("designer", [{ role: "system", content: ASSISTANT_PLANNER }, { role: "user", content: `TASK: ${task}\nPICKED FEATURES: ${picked.join("; ")}` }]);
    const j = JSON.parse((String(r.text).replace(/```(?:json)?/g, "").match(/\{[\s\S]*\}/) || ["{}"])[0]);
    plan = j;
    for (const k of ["assistantName", "greetingUr", "greetingEn", "personality"]) if (typeof j[k] === "string" && j[k].trim()) persona[k] = j[k].trim().slice(0, 300);
    persona.assistantName = persona.assistantName.replace(/[^\w\s-]/g, "").slice(0, 30) || "Puppy";
    step("Planner", `${r.brain}: naam "${persona.assistantName}", ${Array.isArray(j.skills) ? j.skills.length : 0} skills.`);
  } catch (e) { aiNote = `AI planner nahi chala (${String(e.message).slice(0, 100)}) - default persona.`; step("Planner", aiNote); }
  fs.writeFileSync(path.join(dir, "persona.json"), JSON.stringify(persona, null, 2));

  // Builder: har skill
  const skills = (Array.isArray(plan.skills) ? plan.skills : []).map((s) => ({ path: cleanPath(String(s.file || s.path || "").replace(/^(?!skills\/)/, "skills/")), purpose: String(s.purpose || "").slice(0, 160) })).filter((s) => s.path && s.path.endsWith(".md") && s.path !== "skills/README.md").slice(0, 3);
  const writeSkill = async (s, issues = []) => {
    const r = await call("coder", [{ role: "system", content: ASSISTANT_BUILDER.replace("PATH", s.path) }, { role: "user", content: `TASK: ${task}\nSKILL: ${s.path} - ${s.purpose}${issues.length ? `\nFIX: ${issues.join("; ")}` : ""}` }]);
    const body = extractFile(r.text, s.path); if (!body.trim()) throw new Error("khali skill");
    fs.writeFileSync(path.join(dir, s.path), body); return r.brain;
  };
  for (const s of skills) { try { const b = await writeSkill(s); step("Builder", `${s.path} ban gayi (${b})`); } catch (e) { step("Builder", `${s.path} nahi bani: ${String(e.message).slice(0, 120)}`); if (e.code === "BUDGET" || e.code === "BRAINS") break; } }

  // Tester + Fixer
  const runTests = async () => { const t = await testProject(dir, { stack: "node", nodeCheck: deps.nodeCheck !== false }); const extra = assistantChecks(dir); t.issues = [...new Set([...t.issues, ...extra])]; t.ok = t.issues.length === 0; t.checks += 8; return t; };
  let tests = await runTests();
  step("Tester", tests.ok ? `Sab checks pass (${tests.checks}: syntax, JSON, Electron window, extension permissions, persona)` : `${tests.issues.length} masle: ${tests.issues.slice(0, 3).join(" | ")}`);
  for (let round = 1; !tests.ok && round <= opt.maxRounds; round++) {
    const skillIssues = tests.issues.filter((x) => /^skills\//.test(x));
    if (!skillIssues.length) break; // template ke masle AI se theek nahi karwate
    step("Fixer", `Round ${round}/${opt.maxRounds}: skills theek kar raha hoon`);
    for (const x of skillIssues) { const p = x.split(":")[0]; try { await writeSkill({ path: p, purpose: "" }, [x]); } catch { try { fs.rmSync(path.join(dir, p)); } catch {} } }
    tests = await runTests();
  }

  // ZIP
  step("Packager", "ZIP bana raha hoon (README Roman Urdu, INSTALL.bat, START.bat, setup.sh, .env.example)...");
  const card = packageProject(dir, { name: cleanName(path.basename(dir)), stack: "node", task, summary: `${persona.assistantName}: Faheem ka private, free desktop AI assistant - 3D puppy, Urdu / English awaz, browser madad, pehle ijazat. ${aiNote}`.trim(), tests, partial: false, knownSecrets: deps.knownSecrets || [], zipDir: deps.zipDir || zipRoot(), version: deps.version || "3.16.0", project: path.basename(dir), readmeExtra: README_ASSISTANT(persona, picked), kind: "assistant" });
  card.budget = { ...budget }; card.research = research ? { sources: research.sources, trending: (research.trending || []).map((t) => t.repo) } : null;
  step("Packager", `${card.file} - ${(card.size / 1024).toFixed(1)} KB, ${card.files} files - ${card.label}`);
  emit({ type: "zip", card });
  return card;
}
