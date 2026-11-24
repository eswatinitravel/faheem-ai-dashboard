// OpenAI-style model list so tools like Dyad can see "faheem-free".
export const dynamic = "force-dynamic";
import { preflight, withCors } from "../../../../lib/cors";
export const OPTIONS = (req) => preflight(req);
export async function GET(req) {
  return withCors(req, Response.json({ object: "list", data: [{ id: "faheem-free", object: "model", owned_by: "faheem-ai" }] }));
}
