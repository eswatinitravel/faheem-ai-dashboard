import { selfImprove } from "../../../../lib/jarvis/brain.js";
import { addNotes, deleteNote, readNotes, stats } from "../../../../lib/jarvis/memory.js";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

// Self-Improve: log parhna -> naye qawaid (foran lagte hain, har ek Delete ho sakta hai) + code ke mashware.
export async function POST(req) {
  let b = {}; try { b = await req.json(); } catch {}
  if (b.deleteId) return Response.json({ notes: deleteNote(b.deleteId) });
  if (Array.isArray(b.add)) return Response.json({ notes: addNotes(b.add, "user") });
  const r = await selfImprove();
  const notes = r.notes?.length ? addNotes(r.notes) : readNotes();
  return Response.json({ ...r, added: r.notes || [], notes, stats: stats() });
}
