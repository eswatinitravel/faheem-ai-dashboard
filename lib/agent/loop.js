import fs from "fs";
import path from "path";
import { getProviders, callProvider, isCooling, visionProviders } from "../providers";
import { TOOL_DOCS, runTool, projectDir, tree, checkCode, projectDesignCheck } from "./tools";
import { DESIGN_RULES } from "../design";
import { designBrief } from "../uupm/index.js";
import { runtimeTest } from "../runtime";

const MAX_STEPS = 40;

const SYSTEM = (dir, files, memory) => `You are Faheem Coder, an autonomous coding agent (like Cursor's agent) inside Faheem's AI dashboard on his Windows laptop.
You work inside ONE project folder and you change files only by using tools. You loop: think → act with tools → read the results → continue, until the task is truly done and checked.

HOW TO REPLY (every turn):
THOUGHT: 1-3 short lines — what you know and what you will do next.
Then one or more actions (max 6 per turn), each exactly like:
<action tool="read_file">{"path":"index.html"}</action>
<action tool="write_file" path="index.html">
<!DOCTYPE html>
...the COMPLETE raw file content, no markdown fences...
</action>
<action tool="edit_file" path="style.css"><old>exact old text</old><new>new text</new></action>

TOOLS:${TOOL_DOCS}

RULES:
- First turn on a new task: make a short plan with the todo tool, then start building. Do not ask the user questions; make sensible choices.
- Never invent tool results. Wait for results before relying on them.
- Before editing an existing file, read it first. Prefer edit_file for small changes; write_file for new files or full rewrites.
- Files must be COMPLETE and working: no "...", no "rest of code", no TODO stubs. If a file is very long, write it in parts with mode="append".
- Websites: plain HTML/CSS/JS that opens directly in a browser (index.html at project root). Responsive, polished. Every button, cart, form, filter and menu must really work (localStorage for cart). For multi-page stores use either several .html files linked together or hash routing.
- For any website or UI, follow the DESIGN RULES below.
- Pictures: never placeholder sites. Use https://image.pollinations.ai/prompt/<url-encoded description>?width=800&height=800&nologo=true (or the image_url tool) with a specific description per picture.
- Prices in PKR (Rs) for Pakistani businesses unless the user says otherwise. Keep the user's business name exactly.
- After writing, run the check tool, then the test tool on each HTML page (it opens the page in a hidden browser and clicks every button). Fix every issue it reports. Only then call finish with a short summary in simple Roman Urdu (what was built, which files, how to open).
- Reply in the user's language in the summary (Roman Urdu or English).

${DESIGN_RULES}

PROJECT FOLDER: ${dir}
CURRENT FILES:
${files || "(khali — naya project)"}
${memory ? `\nEARLIER WORK IN THIS PROJECT (latest last):\n${memory}` : ""}`;

function parseActions(text) {
  const out = [];
  const re = /<action\s+tool="([a-z_]+)"([^>]*)>([\s\S]*?)<\/action>/g;
  let m;
  while ((m = re.exec(text))) {
    const [, tool, attrs, inner] = m;
    const args = {};
    for (const a of attrs.matchAll(/([a-z_]+)="([^"]*)"/g)) args[a[1]] = a[2];
    let body = inner;
    if (tool === "edit_file") {
      const o = inner.match(/<old>([\s\S]*?)<\/old>/), n = inner.match(/<new>([\s\S]*?)<\/new>/);
      args.old = o ? o[1] : ""; args.new = n ? n[1] : "";
      body = null;
    } else if (tool !== "write_file") {
      const j = inner.trim();
      if (j.startsWith("{")) { try { Object.assign(args, JSON.parse(j)); } catch { try { Object.assign(args, JSON.parse(j.replace(/,\s*}/g, "}"))); } catch {} } }
      body = null;
    } else {
      body = inner.replace(/^\s*```[a-z]*\s*\n/i, "").replace(/\n```\s*$/, "");
    }
    out.push({ tool, args, body });
  }
  // Jawab beech mein kat gaya (write_file band nahi hua)?
  const cut = /<action\s+tool="write_file"[^>]*>(?![\s\S]*<\/action>)/.test(text.slice(text.lastIndexOf("<action")));
  return { actions: out, cut };
}

// Purane turns chhote karein taake context limit na toote.
function compact(history) {
  const keep = 8;
  if (history.length <= keep * 2) return history;
  const old = history.slice(0, history.length - keep * 2);
  const recent = history.slice(-keep * 2);
  const summary = old.filter((m) => m.role === "assistant").map((m) => (m.content.match(/THOUGHT:[^\n]*/) || [""])[0] + " " + [...m.content.matchAll(/<action tool="([a-z_]+)"[^>]*?(?:path="([^"]*)")?[^>]*>/g)].map((a) => a[1] + (a[2] ? `(${a[2]})` : "")).join(", ")).join("\n").slice(-3000);
  return [{ role: "user", content: `(Pichle steps ka khulasa)\n${summary}` }, { role: "assistant", content: "THOUGHT: Theek, aage barhta hoon." }, ...recent];
}

function shrinkForHistory(reply) {
  return reply.replace(/(<action\s+tool="write_file"[^>]*>)([\s\S]*?)(<\/action>)/g, (_, a, b, c) => `${a}[${b.split("\n").length} lines likhi]${c}`).slice(0, 6000);
}

function memoryFile(dir) { return path.join(dir, ".faheem-agent.json"); }
export function readMemory(dir) { try { return JSON.parse(fs.readFileSync(memoryFile(dir), "utf8")); } catch { return []; } }
function saveMemory(dir, entry) {
  const m = readMemory(dir); m.push(entry);
  try { fs.writeFileSync(memoryFile(dir), JSON.stringify(m.slice(-20), null, 1)); } catch {}
}

export async function runAgent({ project, task, images = [], emit, signal }) {
  const dir = projectDir(project);
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const providers = getProviders();
  const order = ["gemini", "groq", "zai", "mistral", "openrouter", "llm7", "pollinations", "ollama"];
  providers.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

  // 👁 Picture ho to pehle vision brain se design ka bayan.
  let design = "";
  if (images.length) {
    const vp = visionProviders(providers).filter((v) => !isCooling(v.id));
    if (!vp.length) emit({ type: "thought", text: "⚠ Picture dekhne ke liye Gemini ya Groq key chahiye (Options → Keys). Sirf text se kaam karunga." });
    for (const v of vp) {
      emit({ type: "brain", text: `👁 ${v.name} picture parh raha hai…` });
      try {
        design = (await callProvider(v, [
          { role: "system", content: "You are a senior UI designer. Describe this design so a developer can rebuild it exactly: layout, header/nav, search, hero, every section in order, category names, product card structure, grid columns, colors (hex), fonts, spacing, buttons, footer. If several pages are shown, describe each page. Max 450 words." },
          { role: "user", content: [{ type: "text", text: "Describe this design." }, ...images.map((im) => ({ type: "image_url", image_url: { url: im.dataUrl } }))] },
        ], 90000)).trim();
        emit({ type: "thought", text: "👁 Picture samajh li: " + design.replace(/\s+/g, " ").slice(0, 300) + "…" });
        break;
      } catch (e) { emit({ type: "thought", text: `⚠ ${v.name} picture nahi parh saka: ${e.message.slice(0, 160)}` }); }
    }
    if (!design && vp.length) { emit({ type: "error", text: "Picture parhi nahi ja saki, is liye andaze se nahi banaya. Upar wali wajah dekhein (key ya limit)." }); return; }
  }

  const fileList = tree(dir, 200).map((f) => (f.dir ? `${f.path}/` : `${f.path} (${f.size}b)`)).join("\n");
  const memory = readMemory(dir).slice(-5).map((m) => `- ${m.task.slice(0, 160)} → ${m.summary.slice(0, 300)}`).join("\n");
  const userTask = `TASK: ${task}${design ? `\n\nREFERENCE DESIGN from the attached picture (match it closely):\n${design}` : ""}`;
  // Task system mein bhi, taake lambi baat-cheet chhoti hone par bhi kaam yaad rahe.
  const brief = /website|site|store|shop|page|landing|ui|design|dukaan|app|dashboard|html/i.test(task) ? designBrief(task) : "";
  const system = { role: "system", content: `${SYSTEM(dir, fileList, memory)}${brief ? `\n\n${brief}` : ""}\n\nCURRENT ${userTask}` };
  let history = [{ role: "user", content: userTask }];
  let finished = false, stopped = false, noAction = 0, finishTries = 0, brainIdx = 0;
  const changed = new Set();

  for (let step = 1; step <= MAX_STEPS && !finished; step++) {
    if (signal?.aborted) { emit({ type: "error", text: "Roka gaya." }); return; }
    // Brain se agla qadam.
    let reply = "", used = null;
    // Free brains kabhi kabhi busy hote hain: 3 chakkar, beech mein intezar.
    for (let round = 0; round < 3 && !reply && !signal?.aborted; round++) {
      if (round) { emit({ type: "brain", text: `⏳ Sab brains busy — ${round * 20} second intezar, phir dobara…` }); await new Promise((r) => setTimeout(r, round * 20000)); }
      const live = providers.filter((p) => !isCooling(p.id));
      for (let k = 0; k < live.length && !reply; k++) {
        const p = live[(brainIdx + k) % live.length];
        try {
          reply = await callProvider(p, [system, ...compact(history)], 180000);
          used = p; brainIdx = (brainIdx + k) % live.length;
        } catch (e) { emit({ type: "brain", text: `⏭ ${p.name}: ${e.message.slice(0, 90)}` }); }
      }
    }
    if (!reply) {
      stopped = true;
      saveMemory(dir, { at: Date.now(), task, summary: `Adhoora: brains busy. Ban chuki files: ${[...changed].join(", ") || "koi nahi"}.`, files: [...changed] });
      emit({ type: "error", text: `Koi AI brain jawab nahi de saka (sab busy/limit). ${changed.size ? `Ban chuki files mehfooz hain (${[...changed].join(", ")}). ` : ""}Gemini ya Groq ki free key lagane se agent kahin zyada bharosemand chalta hai. "Jaari rakho" likh kar wahin se aage chalayein.` });
      break;
    }
    emit({ type: "brain", text: `⚡ Step ${step} · ${used.name}` });

    const thought = (reply.match(/THOUGHT:\s*([\s\S]*?)(?=<action|$)/i) || [, ""])[1].trim();
    if (thought) emit({ type: "thought", text: thought.slice(0, 600) });
    const { actions, cut } = parseActions(reply);
    history.push({ role: "assistant", content: shrinkForHistory(reply) });

    if (!actions.length) {
      noAction++;
      if (cut) { history.push({ role: "user", content: "Aapka jawab beech mein kat gaya (file poori nahi aayi). Bari file ko hisson mein likhein: pehla hissa write_file, baaki write_file mode=\"append\"." }); continue; }
      if (noAction >= 2 && changed.size) { finished = true; emit({ type: "done", summary: thought || reply.slice(0, 800), files: [...changed] }); break; }
      history.push({ role: "user", content: "Koi <action> nahi mila. Bataye gaye format mein tool use karein, ya kaam mukammal ho to finish." });
      continue;
    }
    noAction = 0;

    const results = [];
    for (const a of actions) {
      if (signal?.aborted) break;
      const id = `${step}-${results.length}`;
      const label = a.args.path || a.args.cmd || a.args.query || a.args.url || a.args.prompt || "";
      if (a.tool === "todo") { emit({ type: "todo", items: Array.isArray(a.args.items) ? a.args.items : [] }); results.push(`[todo] ok`); continue; }
      if (a.tool === "finish") {
        const problems = [];
        for (const f of tree(dir, 200)) if (!f.dir && /\.(html?|m?js|json)$/i.test(f.path)) { const iss = checkCode(f.path, fs.readFileSync(path.join(dir, f.path), "utf8")); if (iss.length) problems.push(`${f.path}: ${iss.join("; ")}`); }
        const dIss = projectDesignCheck(dir); if (dIss.length) problems.push(dIss.join("; "));
        // Browser test: har HTML page (max 3) chala kar buttons dabayein.
        for (const f of tree(dir, 200).filter((x) => !x.dir && /\.html?$/i.test(x.path)).slice(0, 3)) {
          const rt = await runtimeTest({ file: path.join(dir, f.path) });
          if (!rt.skipped && !rt.ok) problems.push(`${f.path} (browser test): ${rt.errors.join("; ")}`);
        }
        if (problems.length && finishTries < 2) {
          finishTries++;
          emit({ type: "tool", id, name: "check", label: "finish se pehle jaanch" });
          emit({ type: "result", id, ok: false, text: problems.join("\n").slice(0, 400) });
          results.push(`[finish rok diya] Pehle yeh masle theek karein:\n${problems.join("\n")}`);
          continue;
        }
        finished = true;
        const summary = a.args.summary || thought || "Kaam mukammal.";
        saveMemory(dir, { at: Date.now(), task, summary, files: [...changed] });
        emit({ type: "done", summary, files: [...changed] });
        break;
      }
      emit({ type: "tool", id, name: a.tool, label: String(label).slice(0, 120) });
      let res;
      try { res = await runTool(dir, runId, a.tool, a.args, a.body, signal); }
      catch (e) { res = `Ghalti: ${e.message}`; }
      const ok = !/^(Ghalti|File nahi|Ijazat nahi|Khatarnak|<old>|Khali content)|CHECK masle|exit [1-9]/.test(res);
      emit({ type: "result", id, ok, text: String(res).slice(0, 500) });
      if (["write_file", "edit_file", "delete_file"].includes(a.tool) && a.args.path) { changed.add(a.args.path); emit({ type: "file", path: a.args.path }); }
      results.push(`[${a.tool} ${label}]\n${String(res).slice(0, a.tool === "read_file" ? 15000 : 6000)}`);
    }
    if (finished) break;
    if (cut) results.push("(Note: aapka aakhri write_file kat gaya tha — us file ko mode=\"append\" se poora karein.)");
    history.push({ role: "user", content: `TOOL RESULTS:\n${results.join("\n\n")}` });
  }
  if (!finished && !stopped && !signal?.aborted) {
    const summary = `Steps khatam (${MAX_STEPS}). ${changed.size ? `Badli files: ${[...changed].join(", ")}.` : ""} "Jaari rakho" likh kar aage chalayein.`;
    saveMemory(dir, { at: Date.now(), task, summary, files: [...changed] });
    emit({ type: "done", summary, files: [...changed], partial: true });
  }
}
