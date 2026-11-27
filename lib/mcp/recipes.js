// v3.37 Recipes (skills jo baar baar chalein): Goose ke recipe format ka chhota hissa (JSON), idea only, code nahi.
// { version, title, description, instructions, prompt, parameters:[{key, input_type, requirement, default, description}],
//   extensions:["mcp server naam"], retry:{ max_retries, checks:[{type:"contains", text}|{type:"mcp", server, tool, args}] } }
// Built-in: <dashboard>/recipes/*.json. Aap ki apni: C:\Users\<naam>\.faheem-ai\recipes\*.json (update par nahi mitti).
import fs from "fs";
import os from "os";
import path from "path";
import { getProviders, callProvider, isCooling } from "../providers.js";
import { listTools, callTool, needsConfirm } from "./client.js";

export const USER_DIR = process.env.FAHEEM_RECIPES_DIR || path.join(os.homedir(), ".faheem-ai", "recipes");
const BUILTIN_DIR = path.join(process.cwd(), "recipes");
const ID_OK = /^[a-z0-9][a-z0-9-]{0,47}$/;
const MAX_STEPS = 8;

export function validateRecipe(r) {
  const errs = [];
  if (!r || typeof r !== "object") return ["Recipe JSON object honi chahiye."];
  if (!String(r.title || "").trim()) errs.push("title chahiye.");
  if (!String(r.prompt || r.instructions || "").trim()) errs.push("prompt ya instructions chahiye.");
  if (r.parameters && !Array.isArray(r.parameters)) errs.push("parameters list honi chahiye.");
  for (const p of r.parameters || []) if (!/^[a-z_][a-z0-9_]*$/i.test(String(p?.key || ""))) errs.push(`parameter key ghalat: ${p?.key}`);
  if (r.extensions && !Array.isArray(r.extensions)) errs.push("extensions list honi chahiye (MCP server naam).");
  // Recipe mein {{naam}} ho to parameters mein bhi ho.
  const keys = new Set((r.parameters || []).map((p) => p.key));
  for (const m of String((r.prompt || "") + (r.instructions || "")).matchAll(/\{\{\s*([a-z_][a-z0-9_]*)\s*\}\}/gi)) if (!keys.has(m[1])) errs.push(`{{${m[1]}}} parameters mein nahi.`);
  return errs;
}

function readDir(dir, source) {
  let files = []; try { files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")); } catch {}
  return files.map((f) => {
    try { const r = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); return { id: f.replace(/\.json$/, ""), source, ...r, errors: validateRecipe(r) }; }
    catch (e) { return { id: f.replace(/\.json$/, ""), source, title: f, errors: ["JSON parh nahi saka: " + e.message] }; }
  });
}

export function listRecipes() {
  const mine = readDir(USER_DIR, "aap ki");
  const ids = new Set(mine.map((r) => r.id));
  return [...mine, ...readDir(BUILTIN_DIR, "built-in").filter((r) => !ids.has(r.id))];
}
export const getRecipe = (id) => listRecipes().find((r) => r.id === id) || null;

export function saveRecipe(id, r) {
  if (!ID_OK.test(String(id || ""))) throw new Error("Recipe id: chhote a-z, 0-9 aur - (48 tak).");
  const errs = validateRecipe(r); if (errs.length) throw new Error(errs.join(" "));
  fs.mkdirSync(USER_DIR, { recursive: true });
  const { errors, source, id: _i, ...body } = r;
  fs.writeFileSync(path.join(USER_DIR, id + ".json"), JSON.stringify({ version: "1.0.0", ...body }, null, 2));
  return getRecipe(id);
}
export function deleteRecipe(id) { if (ID_OK.test(id)) try { fs.unlinkSync(path.join(USER_DIR, id + ".json")); } catch {} }

export function render(r, values = {}) {
  const vals = {};
  for (const p of r.parameters || []) {
    let v = values[p.key];
    if (v == null || v === "") v = p.default;
    if ((v == null || v === "") && p.requirement !== "optional") throw new Error(`"${p.key}" bharna zaroori hai${p.description ? ` (${p.description})` : ""}.`);
    if (p.input_type === "number" && v !== "" && v != null && isNaN(Number(v))) throw new Error(`"${p.key}" number hona chahiye.`);
    vals[p.key] = v == null ? "" : String(v).slice(0, 2000);
  }
  const fill = (t) => String(t || "").replace(/\{\{\s*([a-z_][a-z0-9_]*)\s*\}\}/gi, (_, k) => vals[k] ?? "");
  return { instructions: fill(r.instructions), prompt: fill(r.prompt), values: vals };
}

// Tool call ka tag: <<TOOL {"server":"x","tool":"y","args":{}}>>
export function parseToolTag(text) {
  const m = String(text).match(/<<TOOL\s*(\{[\s\S]*?\})\s*>>/);
  if (!m) return null;
  try { const j = JSON.parse(m[1]); return j.server && j.tool ? { server: String(j.server), tool: String(j.tool), args: j.args && typeof j.args === "object" ? j.args : {} } : null; } catch { return null; }
}

async function brain(messages) {
  let last;
  for (const p of getProviders().filter((x) => !isCooling(x.id))) {
    try { const t = String(await callProvider(p, messages, 90000) || "").trim(); if (t) return { text: t, brain: p.name || p.id }; } catch (e) { last = e; }
  }
  throw new Error("Koi AI brain jawab nahi de raha" + (last ? `: ${last.message}` : "."));
}

async function runChecks(r, answer) {
  for (const c of r.retry?.checks || []) {
    if (c.type === "contains" && !String(answer).toLowerCase().includes(String(c.text || "").toLowerCase())) return `Jawab mein "${c.text}" nahi.`;
    if (c.type === "mcp") { try { const out = await callTool(c.server, c.tool, c.args || {}); if (!out.ok) return `Check ${c.tool} fail: ${out.text.slice(0, 200)}`; } catch (e) { return `Check ${c.tool}: ${e.message}`; } }
  }
  return null;
}

// allowTools = aap ne "is recipe ke tools bina pooche chalao" tick kiya. Warna sirf auto_tools chalte hain, baqi par ruk kar poochte hain.
export async function runRecipe(id, values = {}, { allowTools = false, onStep = () => {} } = {}) {
  const r = getRecipe(id);
  if (!r) throw new Error(`Recipe "${id}" nahi mili.`);
  if (r.errors?.length) throw new Error(r.errors.join(" "));
  const { instructions, prompt } = render(r, values);
  const exts = Array.isArray(r.extensions) ? r.extensions : [];
  const catalog = [];
  for (const s of exts) {
    try { for (const t of await listTools(s)) catalog.push(`- ${s}.${t.name}: ${t.description.slice(0, 160)} | args: ${JSON.stringify(t.inputSchema?.properties ? Object.fromEntries(Object.entries(t.inputSchema.properties).slice(0, 8).map(([k, v]) => [k, v?.type || "any"])) : {})}`); }
    catch (e) { onStep({ type: "warn", text: `${s}: ${e.message}` }); }
  }
  const sys = [
    "You are Faheem's recipe runner. Follow the recipe instructions exactly and finish with a short final answer in the user's language (Roman Urdu if unsure).",
    catalog.length ? `You can call ONE tool per turn by ending your message with: <<TOOL {"server":"name","tool":"tool_name","args":{...}}>>\nThen wait for the TOOL RESULT. Never invent results. Available tools:\n${catalog.join("\n")}` : "No tools are available; answer directly.",
    instructions ? "RECIPE INSTRUCTIONS:\n" + instructions : "",
  ].filter(Boolean).join("\n\n");
  const tries = Math.min(Number(r.retry?.max_retries) || 0, 3) + 1;
  let lastFail = "";
  for (let attempt = 1; attempt <= tries; attempt++) {
    const msgs = [{ role: "system", content: sys }, { role: "user", content: (prompt || "Recipe chalao.") + (lastFail ? `\n\n(Pichli koshish fail: ${lastFail}. Theek karo.)` : "") }];
    const steps = [];
    for (let i = 0; i < MAX_STEPS; i++) {
      const { text, brain: b } = await brain(msgs);
      const call = parseToolTag(text);
      const said = text.replace(/<<TOOL[\s\S]*?>>/g, "").trim();
      if (!call) {
        const fail = await runChecks(r, said);
        if (!fail) return { ok: true, answer: said, steps, brain: b, attempt };
        lastFail = fail; onStep({ type: "retry", text: fail }); break;
      }
      if (!exts.includes(call.server)) { msgs.push({ role: "assistant", content: text }, { role: "user", content: `TOOL RESULT: "${call.server}" is recipe mein nahi.` }); continue; }
      if (!allowTools && needsConfirm(call.server, call.tool)) return { ok: false, needConfirm: true, call, steps, answer: said || `${call.server}.${call.tool} chalana chahta hoon. Ijazat dein?` };
      onStep({ type: "tool", text: `${call.server}.${call.tool}` });
      let res; try { res = await callTool(call.server, call.tool, call.args); } catch (e) { res = { ok: false, text: e.message }; }
      steps.push({ ...call, ok: res.ok, result: res.text.slice(0, 600) });
      msgs.push({ role: "assistant", content: text }, { role: "user", content: `TOOL RESULT (${res.ok ? "ok" : "error"}):\n${res.text.slice(0, 3000)}` });
    }
    if (!lastFail) lastFail = `${MAX_STEPS} qadam poore, jawab nahi bana.`;
  }
  return { ok: false, answer: "Recipe poori nahi hui: " + lastFail };
}
