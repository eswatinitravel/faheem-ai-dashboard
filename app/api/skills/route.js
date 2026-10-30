// v3.11 Skills API:
//   GET                        -> saari skills (list)
//   GET ?id=faheem-design      -> ek skill + (agar ho) SKILL.md ka text
//   POST { id, html?, css?, file? } -> skill ko chalayein (file = Gallery ki .html/.css/.txt)
//     hallmark       -> designCheck (bina AI)
//     ui-ux-pro-max  -> uxCheck (contrast, 44px, alt, labels…)
//     impeccable     -> 62 checks (native engine)
//     browser-tester -> jsdom mein chala kar buttons dabata hai (sirf isi laptop par)
import fs from "fs";
import path from "path";
import { SKILLS, getSkill } from "../../../lib/skills";
import { designCheck } from "../../../lib/design";
import { uxCheck } from "../../../lib/uupm/index.js";
import { detectHtml, RULE_COUNT } from "../../../lib/impeccable/index.js";
import { runtimeTest } from "../../../lib/runtime";
import { resolveFile, TYPES, extOf } from "../../../lib/gallery";
import { playwrightCheck, playwrightAvailable } from "../../../lib/playwright-check";
import { listNotes, addNote, deleteNote, toMarkdown, STEPS } from "../../../lib/compound-notes";
import { listProjects, ROOT as PROJECTS } from "../../../lib/agent/tools";
import { getConfig } from "../../../lib/config";

const MCP21 = "https://21st.dev/api/mcp";
const mask = (v) => (v ? `${v.slice(0, 4)}••••${v.slice(-4)}` : "");

// Agent projects jin mein Graphify ka graph bana ho (graphify-out/graph.html).
function graphs() {
  return listProjects().filter((p) => fs.existsSync(path.join(PROJECTS, p.name, "graphify-out", "graph.html"))).map((p) => ({
    project: p.name, url: `/api/agent/preview/${encodeURIComponent(p.name)}/graphify-out/graph.html`,
    report: fs.existsSync(path.join(PROJECTS, p.name, "graphify-out", "GRAPH_REPORT.md")) ? `/api/agent/preview/${encodeURIComponent(p.name)}/graphify-out/GRAPH_REPORT.md` : null,
  }));
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isLocal(req) {
  const host = (req.headers.get("host") || "").split(":")[0];
  return ["localhost", "127.0.0.1", "[::1]"].includes(host);
}

export async function GET(req) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ ok: true, count: SKILLS.length, skills: SKILLS.map(({ id, name, tag, summary, license, panel, href }) => ({ id, name, tag, summary, license, panel, href: href || `/skills/${id}` })) });
  const s = getSkill(id);
  if (!s) return Response.json({ ok: false, error: "Skill nahi mili" }, { status: 404 });
  const local = isLocal(req);
  let doc = null, extra = {};
  if (id === "graphify" && local) extra.graphs = graphs();
  if (id === "compound-engineering" && local) { const pr = new URL(req.url).searchParams.get("project"); extra.notes = listNotes(pr); extra.steps = STEPS; if (pr) extra.markdown = toMarkdown(pr); }
  if (id === "21st-mcp" && local) { const k = getConfig().TWENTYFIRST_API_KEY || ""; extra.key = { set: !!k, preview: mask(k) }; extra.mcpUrl = MCP21; }
  if (id === "playwright" || id === "browser-tester") extra.playwright = await playwrightAvailable();
  if (id === "faheem-design") { try { doc = fs.readFileSync(path.join(process.cwd(), "hermes-skills", "faheem-design", "SKILL.md"), "utf8"); } catch {} }
  return Response.json({ ok: true, skill: s, doc, ...extra });
}

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const s = getSkill(b.id);
  if (!s) return Response.json({ ok: false, error: "Skill nahi mili" }, { status: 404 });
  // --- Action wale tools (sirf isi laptop par) ---
  if (b.action) {
    if (!isLocal(req)) return Response.json({ ok: false, error: "Sirf isi laptop par." }, { status: 403 });
    if (b.action === "playwright" && (s.id === "playwright" || s.id === "browser-tester")) {
      let html = b.html ? String(b.html).slice(0, 2_000_000) : "";
      if (b.file) { const p = resolveFile(b.file); if (!p || !fs.existsSync(p) || TYPES[extOf(b.file)].kind !== "code") return Response.json({ ok: false, error: "Gallery ki .html file chunein" }, { status: 400 }); html = fs.readFileSync(p, "utf8"); }
      const url = b.url ? String(b.url).trim().slice(0, 2000) : "";
      if (!url && !html.trim()) return Response.json({ ok: false, error: "URL ya HTML dein" }, { status: 400 });
      return Response.json(await playwrightCheck({ url, html }));
    }
    if (s.id === "compound-engineering") {
      if (b.action === "add") { const r = addNote(b); return Response.json(r, { status: r.ok ? 200 : 400 }); }
      if (b.action === "delete") { const r = deleteNote(String(b.noteId || "")); return Response.json(r, { status: r.ok ? 200 : 404 }); }
    }
    if (s.id === "21st-mcp" && b.action === "test") {
      const key = getConfig().TWENTYFIRST_API_KEY || "";
      if (!key) return Response.json({ ok: false, error: "21st key nahi lagi. Options → Keys → Tool keys mein paste karein (free: 21st.dev/mcp)." });
      try {
        const r = await fetch(MCP21, { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "x-api-key": key }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "faheem-ai-dashboard", version: "3.11.0" } } }), signal: AbortSignal.timeout(20000) });
        const t = await r.text();
        if (r.ok) return Response.json({ ok: true, status: r.status, text: "Key sahi ✓ — 21st MCP se jur gaya." });
        return Response.json({ ok: false, status: r.status, error: r.status === 401 ? "Key qubool nahi (401) — 21st.dev/mcp se nayi key lein." : `HTTP ${r.status}: ${t.slice(0, 120)}` });
      } catch (e) { return Response.json({ ok: false, error: e.message }); }
    }
    return Response.json({ ok: false, error: "Ghalat action" }, { status: 400 });
  }
  let html = String(b.html || "").slice(0, 2_000_000), css = String(b.css || "").slice(0, 1_000_000);
  if (b.file) {
    if (!isLocal(req)) return Response.json({ ok: false, error: "Gallery sirf isi laptop par." }, { status: 403 });
    const p = resolveFile(b.file);
    if (!p || !fs.existsSync(p)) return Response.json({ ok: false, error: "Gallery file nahi mili" }, { status: 404 });
    if (TYPES[extOf(b.file)].kind === "image" || extOf(b.file) === "pdf") return Response.json({ ok: false, error: "Yeh skill code (HTML/CSS) jaanchti hai. Picture ke liye 'Chat mein bhejein' (vision brain) istemal karein." }, { status: 400 });
    const text = fs.readFileSync(p, "utf8").slice(0, 2_000_000);
    if (extOf(b.file) === "css") css = text; else html = text;
  }
  if (!html.trim() && !css.trim()) return Response.json({ ok: false, error: "HTML/CSS khali hai" }, { status: 400 });
  try {
    if (s.id === "hallmark") { const notes = designCheck(html + "\n<style>" + css + "</style>"); return Response.json({ ok: true, id: s.id, clean: notes.length === 0, notes }); }
    if (s.id === "ui-ux-pro-max") { const r = uxCheck(html, css); return Response.json({ ok: true, id: s.id, clean: r.ok, notes: r.issues }); }
    if (s.id === "impeccable") { const r = await detectHtml(html, css); return Response.json({ ok: !!r.ok, id: s.id, rules: RULE_COUNT, ...r }); }
    if (s.id === "browser-tester") {
      if (!isLocal(req)) return Response.json({ ok: false, error: "Browser Tester sirf isi laptop par." }, { status: 403 });
      const r = await runtimeTest({ html: css ? html.replace("</head>", `<style>${css}</style></head>`) : html });
      return Response.json({ ok: true, id: s.id, result: r });
    }
    return Response.json({ ok: false, error: "Is skill ka koi audit nahi — upar ka link kholein." }, { status: 400 });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
