// v3.11 Compound notes: Compound Engineering ka aakhri qadam ("compound") — har project ki seekhi hui baatein
// data/compound/notes.json mein (sirf isi laptop par, update se nahi mitti). Agla kaam shuru karne se pehle parhein.
import fs from "fs";
import path from "path";

export const notesFile = () => path.resolve(/*turbopackIgnore: true*/ process.env.FAHEEM_COMPOUND_FILE || path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "compound", "notes.json"));
export const STEPS = ["brainstorm", "plan", "work", "review", "compound"];

function read() { try { const d = JSON.parse(fs.readFileSync(notesFile(), "utf8")); return Array.isArray(d) ? d : []; } catch { return []; } }
function write(list) { fs.mkdirSync(path.dirname(notesFile()), { recursive: true }); fs.writeFileSync(notesFile(), JSON.stringify(list, null, 1)); }

export const cleanProject = (p) => String(p || "").toLowerCase().replace(/[^a-z0-9-_ ]+/g, "").trim().replace(/\s+/g, "-").slice(0, 40) || "general";

export function listNotes(project) {
  const all = read();
  return project ? all.filter((n) => n.project === cleanProject(project)) : all;
}

export function addNote({ project, step = "compound", title, text }) {
  const t = String(title || "").trim().slice(0, 120), body = String(text || "").trim().slice(0, 4000);
  if (!t || !body) return { ok: false, error: "Title aur seekh dono likhein" };
  if (!STEPS.includes(step)) return { ok: false, error: "Ghalat step" };
  const all = read();
  if (all.length >= 2000) return { ok: false, error: "Bahut notes (2000) — purane mitayein" };
  const note = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), project: cleanProject(project), step, title: t, text: body, at: new Date().toISOString() };
  all.unshift(note); write(all);
  return { ok: true, note };
}

export function deleteNote(id) {
  const all = read();
  const left = all.filter((n) => n.id !== id);
  if (left.length === all.length) return { ok: false, error: "Note nahi mila" };
  write(left); return { ok: true };
}

// Agent/Hermes ko dene ke liye markdown (docs/solutions jaisa).
export function toMarkdown(project) {
  const list = listNotes(project);
  return `# Compound notes — ${cleanProject(project)}\n\n` + (list.map((n) => `## ${n.title}\n_${n.step} · ${n.at.slice(0, 10)}_\n\n${n.text}\n`).join("\n") || "_Abhi koi note nahi._\n");
}
