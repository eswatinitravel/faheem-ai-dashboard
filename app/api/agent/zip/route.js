import fs from "fs";
import path from "path";
import { getProviders, callProvider, isCooling, sortProviders } from "../../../../lib/providers";
import { AGENTS } from "../../../../lib/agents";
import { runtimeTest } from "../../../../lib/runtime";
import { getConfig } from "../../../../lib/config";
import * as MEM from "../../../../lib/memory";
import { makeAsker } from "../../../../lib/agent/team.js";
import { runProjectZip, zipExisting, listZips, getZip, deleteZip, isZipRequest } from "../../../../lib/agent/project-zip.js";
import { runAssistantZip } from "../../../../lib/agent/assistant-zip.js";
import { isAssistantRequest } from "../../../../lib/zip-intent.js";
import { researchAssistants } from "../../../../lib/assistant-research.js";

export const dynamic = "force-dynamic";
export const maxDuration = 1800;
const isLocal = (req) => ["localhost", "127.0.0.1", "[::1]"].includes((req.headers.get("host") || "").split(":")[0]);
const version = () => { try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")).version; } catch { return "3.16.0"; } };
const knownSecrets = () => { try { return Object.values(getConfig()).filter((v) => typeof v === "string" && v.length >= 12); } catch { return []; } };

// v3.16 Project Builder ZIP
// GET                       -> ZIP history list
// GET ?id=..&download=1     -> ZIP file download
// POST { task, project? }   -> ndjson stream: Planner -> Builder -> Tester -> Fixer -> ZIP card
// POST { action:"package", project } -> Agent Mode ke maujooda project ka ZIP (bina AI)
// POST { action:"detect", text }     -> { isZip }
// DELETE ?id=..             -> history se ZIP hatao
export async function GET(req) {
  if (!isLocal(req)) return Response.json({ ok: false, error: "Sirf isi laptop par." }, { status: 403 });
  const u = new URL(req.url); const id = u.searchParams.get("id");
  if (id) {
    const z = getZip(id);
    if (!z) return Response.json({ ok: false, error: "ZIP nahi mila." }, { status: 404 });
    if (u.searchParams.get("download")) return new Response(fs.readFileSync(z.path), { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${z.name}.zip"`, "Cache-Control": "no-store" } });
    return Response.json({ ok: true, zip: { ...z, path: undefined } });
  }
  return Response.json({ ok: true, zips: listZips() });
}

export async function DELETE(req) {
  if (!isLocal(req)) return Response.json({ ok: false, error: "Sirf isi laptop par." }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ ok: false, error: "id chahiye" }, { status: 400 });
  return Response.json({ ok: deleteZip(id) });
}

export async function POST(req) {
  if (!isLocal(req)) return Response.json({ ok: false, error: "Sirf isi laptop par." }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ ok: false, error: "Ghalat JSON" }, { status: 400 });
  if (body.action === "detect") return Response.json({ ok: true, isZip: isZipRequest(body.text), isAssistant: isAssistantRequest(body.text) });
  if (body.action === "package") {
    if (!String(body.project || "").trim()) return Response.json({ ok: false, error: "Project ka naam chahiye." }, { status: 400 });
    try { const card = await zipExisting(body.project, { deps: { runtimeTest, knownSecrets: knownSecrets(), version: version() } }); return Response.json({ ok: true, card }); }
    catch (e) { return Response.json({ ok: false, error: e.message }, { status: 400 }); }
  }
  const task = String(body.task || "").trim().slice(0, 4000);
  if (!task) return Response.json({ ok: false, error: "Kaam likhein." }, { status: 400 });
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      let open = true;
      const emit = (o) => { if (!open) return; try { ctrl.enqueue(enc.encode(JSON.stringify({ ...o, at: Date.now() }) + "\n")); } catch { open = false; } };
      try {
        const ask = makeAsker({ providers: getProviders(), call: (p, m) => callProvider(p, m, 180000), isCooling, sort: sortProviders, agents: AGENTS });
        // v3.16 Private Assistant Builder: "mere laptop ke liye free AI assistant banao" -> Hey Puppy ZIP
        if (body.mode === "assistant" || isAssistantRequest(task)) await runAssistantZip({ task, features: Array.isArray(body.features) ? body.features.map(String).slice(0, 12) : [], emit, signal: req.signal, deps: { ask, researchFn: () => researchAssistants(), knownSecrets: knownSecrets(), version: version() } });
        else await runProjectZip({ task, project: body.project, emit, signal: req.signal, deps: { ask, runtimeTest, memory: MEM, knownSecrets: knownSecrets(), version: version() } });
      } catch (e) { emit({ type: "error", text: e.message }); }
      open = false; try { ctrl.close(); } catch {}
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
