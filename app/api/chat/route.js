import { getProviders, callProvider, isCooling } from "../../../lib/providers";
import { AGENTS, BASE, routeAgent } from "../../../lib/agents";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  const providers = getProviders().map((p) => ({ id: p.id, name: p.name, model: p.model, cooling: !!isCooling(p.id), keyless: !!p.keyless }));
  const agents = AGENTS.map((a) => ({ id: a.id, name: a.name, icon: a.icon }));
  return Response.json({ providers, agents });
}

// What should the live workspace show while the agents work?
function detectTask(text) {
  const t = text.toLowerCase();
  if (/(video|vedio|vidio|reel|clip|animation)/.test(t)) return "video";
  if (/(picture|pic\b|image|photo|tasveer|tasweer|tasvir|logo|poster|banner|wallpaper|drawing|draw)/.test(t)) return "image";
  if (/(website|web site|landing|html|page bana|homepage|store bana|section|navbar|hero)/.test(t)) return "web";
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

  const agent = routeAgent(lastUser, body?.agent);
  const rawText = typeof lastMsg?.content === "string" ? lastMsg.content : lastUser;
  const task = detectTask(rawText);

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

      if (images.length) step("Vision Agent", providers.some((p) => p.vision) ? `🖼 ${images.length} picture mili — Gemini dekh raha hai.` : `🖼 ${images.length} picture mili — dekhne ke liye Gemini key chahiye (Options > Keys).`);
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
      for (const p of providers) {
        if (isCooling(p.id)) { skipped.push(`${p.name}: cooling down`); step("Brain", `⏭ ${p.name} abhi aaraam par — agla.`); continue; }
        step("Brain", `⚡ ${p.name} se jawab maang raha hoon…`);
        try {
          const reply = await callProvider(p, images.length ? (p.vision ? visionMessages : blindMessages) : messages);
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
