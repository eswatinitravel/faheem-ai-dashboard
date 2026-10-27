import vm from "vm";
import { getProviders, callProvider, isCooling, visionProviders } from "../../../lib/providers";
import { AGENTS, BASE, routeAgent } from "../../../lib/agents";
import { DESIGN_RULES, designCheck } from "../../../lib/design";
import { runtimeTest } from "../../../lib/runtime";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  const providers = getProviders().map((p) => ({ id: p.id, name: p.name, model: p.model, cooling: !!isCooling(p.id), keyless: !!p.keyless }));
  const agents = AGENTS.map((a) => ({ id: a.id, name: a.name, icon: a.icon }));
  return Response.json({ providers, agents });
}

// What should the live workspace show while the agents work?
function detectTask(text, hasImage = false) {
  const t = text.toLowerCase();
  if (/(website|web site|webpage|web page|\bsite\b|landing|html|pages?\s*(bana|banao|banado|design|build)|homepage|home page|online store|e-?commerce|store bana|store ka|shop bana|web app|navbar|hero section|portfolio site|all pages|sari pages|saray pages|tamam pages)/.test(t)) return "web";
  // Picture ke sath "is jaisa bana do / same design / copy" = website ka reference.
  if (hasImage && /(jais[aiey]|same|copy|clone|replica|is tarah|isi tarah|aisa hi|aisi hi|design|layout|bana|build|create|make|store|shop|page)/.test(t)) return "web";
  if (/(video|vedio|vidio|reel|clip|animation)/.test(t)) return "video";
  if (/(picture|pic\b|image|photo|tasveer|tasweer|tasvir|logo|poster|banner|wallpaper|drawing|draw)/.test(t)) return "image";
  if (/(code|script|function|python|javascript|react|api|bug|error)/.test(t)) return "code";
  return "text";
}

// Files ko text mein badlein: text files ka mawad, picture/video ka naam.
function attachText(m) {
  const list = Array.isArray(m.attachments) ? m.attachments : [];
  if (!list.length) return m.content;
  const parts = [m.content || ""];
  for (const a of list) {
    if (a.kind === "text" && a.text) parts.push(`\n\n--- File: ${a.name} ---\n${String(a.text).slice(0, 40000)}\n--- end ---`);
    else if (a.kind === "image") parts.push(`\n[Picture attached: ${a.name}]`);
    else if (a.kind === "video") parts.push(`\n[Video attached: ${a.name}, ${a.duration ? Math.round(a.duration) + "s, " : ""}${a.width ? a.width + "x" + a.height : ""}]`);
    else parts.push(`\n[File attached: ${a.name} (${a.type || "file"}, ${Math.round((a.size || 0) / 1024)} KB)]`);
  }
  return parts.join("");
}

// Tester ke tez checks (bina AI ke).
function staticCheck(code, ask) {
  const out = [];
  if (!code || code.length < 300) return ["No complete ```html code block was returned."];
  if (!/<\/html>/i.test(code)) out.push("The page is cut off: it must end with </html>.");
  if (/via\.placeholder|placehold\.(co|it)|placekitten|dummyimage|example\.com\/.*\.(jpg|png)/i.test(code)) out.push("Placeholder image URLs are used; replace every image with a pollinations.ai image URL.");
  if (/\.\.\.\s*(rest|more|other)|<!--\s*(add|more|repeat)/i.test(code)) out.push("Code contains unfinished parts (\"...\" or 'add more'); write everything out.");
  const called = [...code.matchAll(/on\w+\s*=\s*"\s*([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1]);
  for (const f of new Set(called)) {
    if (!new RegExp(`function\\s+${f}\\b|${f}\\s*=\\s*(async\\s*)?(function|\\()`).test(code) && !["alert", "confirm", "event", "this", "window", "document", "history", "location"].includes(f)) out.push(`Function ${f}() is called but never defined.`);
  }
  // Asli test: har <script> ko JavaScript engine se compile karke dekhein.
  for (const m of code.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { new vm.Script(m[1]); } catch (e) { out.push(`JavaScript syntax error: ${e.message}. Fix it.`); }
  }
  const opens = (code.match(/<script\b/gi) || []).length, closes = (code.match(/<\/script>/gi) || []).length;
  if (opens !== closes) out.push("A <script> tag is not closed.");
  if (/cart/i.test(ask) && !/cart/i.test(code)) out.push("The cart requested by the user is missing.");
  if (/form|contact/i.test(ask) && !/<form/i.test(code)) out.push("The contact form requested by the user is missing.");
  return out;
}

function imageUrl(prompt, seed, w = 768, h = 768) {
  const clean = prompt.replace(/\b(bana(o|do|dein|kar do)?|banao|mujhe|meri|mere|ek|aik|ki|ka|ke|ko|do|dein|please|plz|liye|lie|wali|wala|walay|picture|image|photo|tasveer|tasweer|video|vedio)\b/gi, " ").replace(/\s+/g, " ").trim() || prompt;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(clean.slice(0, 300))}?width=${w}&height=${h}&nologo=true&seed=${seed}`;
}

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }
  const history = Array.isArray(body?.messages) ? body.messages.slice(-20) : [];
  const clean = history
    .filter((m) => m && typeof m.content === "string" && ["user", "assistant"].includes(m.role) && m.meta !== "error")
    .map((m) => ({ role: m.role, content: attachText(m) }));
  const lastUser = [...clean].reverse().find((m) => m.role === "user")?.content || "";
  // Sirf aakhri message ki pictures AI ko dikhayein (vision brain ho to).
  const lastMsg = [...history].reverse().find((m) => m?.role === "user");
  const images = (lastMsg?.attachments || []).filter((a) => a.kind === "image" && typeof a.dataUrl === "string" && a.dataUrl.startsWith("data:image/")).slice(0, 4);

  const rawText = typeof lastMsg?.content === "string" ? lastMsg.content : lastUser;
  const task = detectTask(rawText, images.length > 0);
  // Website ka kaam hamesha Website Master ko (warna "Vestire" jaisa lafz Business Master ko bhej deta tha).
  const agent = task === "web" && (!body?.agent || body.agent === "auto") ? routeAgent("", "web") : routeAgent(lastUser, body?.agent);

  const system = [{ role: "system", content: `${BASE}\n\n${agent.prompt}` }];
  if (task === "web") system.push({ role: "system", content: "When you build a page or section, include ONE complete self-contained ```html code block (inline CSS/JS, no external build) so it can be previewed live." });
  if (task === "image" || task === "video") system.push({ role: "system", content: "The dashboard is generating the picture(s) for the user right now with a free image model. Briefly describe what is being created (style, colors, composition) in 2-4 lines and offer one improvement idea. Do not say you cannot create images." });
  if (body?.voice) system.push({ role: "system", content: "The user is talking by voice and your reply will be read aloud. Answer in 1-4 short spoken sentences, no markdown, no lists, no code unless asked." });
  if (body?.voice && body?.voiceLang === "ur") system.push({ role: "system", content: "Write this spoken reply in proper Urdu script (اردو رسم الخط), not Roman Urdu and not English." });
  if (!images.length && /\[Video attached/.test(lastUser)) system.push({ role: "system", content: "The user attached a video. You cannot watch it; you only know its name, length and size. Help based on what they wrote and ask them to describe the part they need help with." });
  const messages = [...system, ...clean];
  // Vision brain ke liye aakhri message mein pictures jor dein.
  const visionMessages = images.length ? messages.map((m, i) => (i === messages.length - 1 && m.role === "user") ? { role: "user", content: [{ type: "text", text: m.content }, ...images.map((a) => ({ type: "image_url", image_url: { url: a.dataUrl } }))] } : m) : messages;
  const blindMessages = images.length ? [...messages.slice(0, -1), { role: "system", content: "The user attached a picture, but this AI brain cannot see images. Say so in one short line and suggest adding a free Gemini key in Options > Keys so pictures can be understood; still help with their text." }, messages.at(-1)] : messages;

  const providers = getProviders();
  const order = agent.prefer;
  const rank = (id) => {
    if (body?.provider && body.provider !== "auto" && id === body.provider) return -1;
    if (images.length && providers.find((p) => p.id === id)?.vision) return -0.5;
    if (id === "pollinations") return 50;
    if (id === "llm7") return 51;
    if (id === "ollama") return 60;
    const i = order.indexOf(id);
    return i < 0 ? 40 : i;
  };
  providers.sort((a, b) => rank(a.id) - rank(b.id));

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const emit = (o) => ctrl.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      const step = (who, text) => emit({ type: "step", who, text, at: Date.now() });

      step("Master Agent", "Request padhi — kaam samajh raha hoon.");
      step("Master Agent", `Yeh kaam ${agent.icon} ${agent.name} ko diya.`);
      emit({ type: "task", task, agent: { id: agent.id, name: agent.name, icon: agent.icon } });

      if (images.length) step("Vision Agent", visionProviders(providers).length ? `🖼 ${images.length} picture mili — ${visionProviders(providers).map((v) => v.name).join(" / ")} dekhega.` : `🖼 ${images.length} picture mili — dekhne ke liye Gemini ya Groq key chahiye (Options > Keys).`);
      if (task === "image") {
        const seed = Math.floor(Math.random() * 1e6);
        step("Image Agent", "🎨 Tasveer ban rahi hai (free image model)…");
        emit({ type: "image", urls: [imageUrl(rawText, seed), imageUrl(rawText, seed + 1)] });
      } else if (task === "video") {
        const seed = Math.floor(Math.random() * 1e6);
        step("Video Agent", "🎬 Free video model abhi nahi — 4 frames ka storyboard bana raha hoon jo video ki tarah chalega.");
        emit({ type: "video", urls: [0, 1, 2, 3].map((i) => imageUrl(`${rawText}, cinematic frame ${i + 1} of 4, consistent scene`, seed + i, 960, 540)) });
      } else if (task === "web") {
        step(agent.name, "🌐 Page ka design aur code likh raha hoon — tayyar hote hi live dikhega.");
      } else if (task === "code") {
        step(agent.name, "💻 Code likh raha hoon.");
      }

      const skipped = [];
      // Ek brain se jawab: providers ki line mein jo pehle chale.
      const ask = async (msgs, label) => {
        for (const p of providers) {
          if (isCooling(p.id)) continue;
          try {
            let r;
            const withImg = (m) => (images.length && p.vision ? m.map((x, i) => (i === m.length - 1 && x.role === "user" && typeof x.content === "string") ? { role: "user", content: [{ type: "text", text: x.content }, ...images.map((a) => ({ type: "image_url", image_url: { url: a.dataUrl } }))] } : x) : m);
            const mm = withImg(msgs);
            try { r = await callProvider(p, mm, 120000); }
            catch (e) {
              const w = +(String(e.message).match(/retry in (\d+)s/) || [])[1];
              if (!(w >= 0 && w <= 12)) throw e;
              await new Promise((ok) => setTimeout(ok, (w + 2) * 1000));
              r = await callProvider(p, mm, 120000);
            }
            if (!r || !String(r).trim()) throw new Error("empty reply");
            return { reply: r, p };
          } catch (err) {
            skipped.push(`${p.name}: ${err.message}`);
            step("Brain", `⏭ ${label}: ${p.name} — ${err.message.slice(0, 60)}`);
          }
        }
        throw new Error("Koi brain jawab nahi de saka.");
      };

      // ---- Website / code: Plan → Build → Test → Fix ----
      if (task === "web" || (task === "code" && /html|page|website|store|site|landing/i.test(rawText))) {
        try {
          // Banner sirf tab jab saaf manga ho (attached picture ka zikr banner nahi).
          const wantsBanner = /\b(banner|logo|poster)\b/i.test(rawText);
          // 👁 Vision Agent: pehle Gemini picture ko tafseel se parhta hai; yeh bayan phir har brain ko milta hai.
          let design = "", visionErr = "";
          if (images.length) {
            const vp = visionProviders(providers).filter((x) => !isCooling(x.id));
            if (!vp.length) step("👁 Vision Agent", "⚠ Gemini/Groq key nahi mili — picture dekhi nahi ja sakti. Options > Keys mein key daalein.");
            for (const v of vp) {
              step("👁 Vision Agent", `${v.name} picture ko tafseel se parh raha hai…`);
              try {
                design = (await callProvider(v, [
                  { role: "system", content: "You are a senior UI designer. Describe this website screenshot so a developer can rebuild it exactly: overall layout, header/nav items, search bar, hero/banner, every section in order, category list names, product card structure (image, name, price, rating, badges), grid columns, colors (hex), fonts, spacing, buttons, footer. Be specific and complete, max 350 words." },
                  { role: "user", content: [{ type: "text", text: "Describe this design." }, ...images.map((im) => ({ type: "image_url", image_url: { url: im.dataUrl } }))] },
                ], 90000)).trim();
                step("👁 Vision Agent", "✓ Picture parh li: " + design.replace(/\s+/g, " ").slice(0, 220) + "…");
                break;
              } catch (e) {
                visionErr = `${v.name}: ${e.message.slice(0, 300)}`;
                step("👁 Vision Agent", `⚠ ${v.name} picture nahi parh saka: ${e.message.slice(0, 120)}`);
              }
            }
            if (!design) {
              // Andaze se ghalat website banane ke bajaye saaf bata dein ke masla kya hai.
              const why = vp.length ? (visionErr || "Vision brain ne jawab nahi diya") : "Gemini ya Groq key load nahi hui";
              const msg = `⚠ **Picture dekhi nahi ja saki, is liye website nahi banayi** (andaze se ghalat banti).\n\n**Wajah:** ${why}\n\n**Hal:** ⋯ Options → Keys mein Groq (gsk_…) ya Gemini key daal kar Save karein, phir tray icon → Restart. Agar key pehle se hai to yeh wajah wali line Hark ko bhej dein.`;
              emit({ type: "done", reply: msg, provider: "Vision Agent", model: "-", agent: { id: agent.id, name: agent.name, icon: agent.icon }, skipped, task: "text" });
              ctrl.close();
              return;
            }
          }
          const request = design ? `${rawText}\n\nREFERENCE DESIGN (rebuild this closely):\n${design}` : rawText;
          step("🧠 Planner Agent", "Soch raha hoon: kaam ko hisson mein baant raha hoon…");
          const plan = (await ask([
            { role: "system", content: "You are a senior product planner. Write a short numbered build plan (max 8 lines) for EXACTLY the user's request: keep their business name, products, currency (PKR if Pakistani) and language. Sections, exact features, interactions, realistic data, colors. If a design reference picture is attached, describe its layout and style and follow it. No code." },
            { role: "user", content: request },
          ], "Plan")).reply.trim();
          if (wantsBanner) {
            const seed = Math.floor(Math.random() * 1e6);
            const topic = plan.replace(/[*#`_]/g, "").split("\n").filter(Boolean).slice(0, 2).join(" ").slice(0, 220);
            step("Image Agent", "🎨 Banner bhi sath ban raha hai…");
            emit({ type: "image", urls: [imageUrl(`${topic}, professional wide website hero banner, no text`, seed, 1280, 512)] });
          }
          step("🧠 Planner Agent", plan.split("\n").filter(Boolean).slice(0, 8).join(" · ").slice(0, 400));

          const RULES = `Build rules (must follow all):
- Return ONE complete self-contained \`\`\`html code block: <!DOCTYPE html> to </html>, inline CSS and JS, nothing missing, no "..." or "rest of code".
- Every feature in the plan must actually work (buttons, cart count, forms with validation and a success message, menus on mobile).
- Images: NEVER use placeholder sites. Use https://image.pollinations.ai/prompt/<url-encoded description>?width=600&height=400&nologo=true with a specific description per image.
- Modern, responsive, polished design. Mobile-friendly.
- Stay on the user's exact request (their business, products, currency). Use only the business name the user gives (or the one in the reference picture); do NOT call it Vestire unless the user says Vestire. If a reference picture is attached, match its layout and look closely.
- JavaScript must be valid: every template literal opened with a backtick is closed with a backtick.
- If the user asks for "all pages" / complete store / multiple pages: build them all inside this ONE file as a single-page app with hash routing (#home, #shop, #product, #cart, #checkout, #about, #contact, #account): working header nav, category filters and sort, product detail with size/color, cart with quantity and totals saved in localStorage, checkout form with validation and order confirmation.
- After the code block, write 3-5 short lines saying what was built.

${DESIGN_RULES}`;
          step(agent.name, "🔨 Plan ke mutabiq poora code likh raha hoon…");
          // Sirf naya request + plan: purani chat (jaise pichla store) naye kaam mein na mile.
          const fresh = [...system, { role: "system", content: `Plan:\n${plan}\n\n${RULES}` }, { role: "user", content: design ? `${lastUser}\n\nREFERENCE DESIGN (rebuild this closely):\n${design}` : lastUser }];
          let { reply, p } = await ask(fresh, "Build");
          let fixes = 0, left = [];
          for (let round = 1; round <= 3; round++) {
            const code = (reply.match(/```html\s*([\s\S]*?)```/i) || [])[1] || "";
            const issues = staticCheck(code, rawText);
            const tips = code ? designCheck(code) : [];
            // Design tips sirf pehle 2 rounds mein theek karwayein; asli ghaltiyan har round.
            if (round < 3) issues.push(...tips);
            step("🧪 Tester Agent", `Test ${round}: code check kar raha hoon…`);
            if (!issues.length && code) {
              // Browser Tester: page ko chhupe browser mein chala kar har button dabata hai.
              step("🧪 Browser Tester", "Page chala kar har button daba raha hoon…");
              const rt = await runtimeTest({ html: code });
              if (rt.skipped) step("🧪 Browser Tester", "Browser test is dafa nahi chala — baaki tests jari.");
              else if (rt.ok) step("🧪 Browser Tester", `✅ ${rt.clicked} buttons/links dabaye — koi JavaScript ghalti nahi.`);
              else issues.push(...rt.errors.map((e) => `Runtime error when the page runs: ${e}`));
            }
            if (!issues.length) {
              try {
                const rv = (await ask([
                  { role: "system", content: "You are a strict QA tester. Read the HTML and find real bugs: features from the plan that are missing or broken, JS errors, undefined functions, broken layout. Reply ONLY with JSON: {\"ok\":true} or {\"ok\":false,\"issues\":[\"...\"]} (max 5 issues)." },
                  { role: "user", content: `Plan:\n${plan}\n\nHTML:\n${code.slice(0, 60000)}` },
                ], "Test")).reply;
                const j = JSON.parse((rv.match(/\{[\s\S]*\}/) || ["{}"])[0]);
                if (j.ok === false && Array.isArray(j.issues)) issues.push(...j.issues.slice(0, 5));
              } catch { step("🧪 Tester Agent", "AI tester abhi masroof — basic tests pass."); }
            }
            left = issues;
            if (!issues.length) { step("🧪 Tester Agent", "✅ Sab test pass — koi galti nahi mili."); break; }
            step("🧪 Tester Agent", `⚠ ${issues.length} masle: ${issues.join(" | ").slice(0, 300)}`);
            if (round === 3) break;
            step("🔧 Fixer Agent", "Masle theek kar raha hoon…");
            ({ reply, p } = await ask([...fresh, { role: "assistant", content: reply }, { role: "user", content: `Fix ALL these problems and return the COMPLETE corrected page again:\n- ${issues.join("\n- ")}\n\n${RULES}` }], "Fix"));
            fixes++;
          }
          const real = left.filter((x) => !x.startsWith("Design:"));
          step(agent.name, real.length ? `⚠ Ban gaya, lekin ${real.length} masle baqi: ${real.join(" | ").slice(0, 200)}` : `✓ Tayyar${fixes ? ` (${fixes} dafa theek kiya)` : ""}${left.length ? ` · design tips: ${left.join(" | ").slice(0, 160)}` : ""}.`);
          emit({ type: "done", reply: `**Plan**\n${plan}\n\n${reply}`, provider: p.name, model: p.model, agent: { id: agent.id, name: agent.name, icon: agent.icon }, skipped, task: "web" });
          ctrl.close();
          return;
        } catch (err) {
          step("Master Agent", `Pipeline ruk gayi (${err.message}) — seedha jawab le raha hoon.`);
        }
      }

      for (const p of providers) {
        if (isCooling(p.id)) { skipped.push(`${p.name}: cooling down`); step("Brain", `⏭ ${p.name} abhi aaraam par — agla.`); continue; }
        step("Brain", `⚡ ${p.name} se jawab maang raha hoon…`);
        try {
          const vpp = images.length && !p.vision && p.visionModel ? { ...p, model: p.visionModel } : p;
          const reply = await callProvider(vpp, images.length ? (vpp.vision || vpp.visionModel === vpp.model ? visionMessages : blindMessages) : messages);
          step(agent.name, "✓ Jawab tayyar.");
          emit({ type: "done", reply, provider: p.name, model: p.model, agent: { id: agent.id, name: agent.name, icon: agent.icon }, skipped, task });
          ctrl.close();
          return;
        } catch (err) {
          skipped.push(`${p.name}: ${err.message}`);
          step("Brain", `⏭ ${p.name}: ${err.message.slice(0, 80)} — agla try.`);
        }
      }
      emit({ type: "error", error: "Koi provider jawab nahi de saka.", details: skipped });
      ctrl.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache" } });
}
