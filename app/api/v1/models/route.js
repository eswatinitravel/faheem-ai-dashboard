// OpenAI-style model list so tools like Dyad can see "faheem-free".
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({ object: "list", data: [{ id: "faheem-free", object: "model", owned_by: "faheem-ai" }] });
}
