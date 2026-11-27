// Test ke liye chhota MCP server (stdio): echo, add, env_check.
import readline from "readline";
const rl = readline.createInterface({ input: process.stdin });
const send = (o) => process.stdout.write(JSON.stringify(o) + "\n");
const TOOLS = [
  { name: "echo", description: "Text wapas", inputSchema: { type: "object", properties: { text: { type: "string" } } }, annotations: { readOnlyHint: true } },
  { name: "add", description: "Do number jama", inputSchema: { type: "object", properties: { a: { type: "number" }, b: { type: "number" } } } },
  { name: "env_check", description: "Kaun si env mili", inputSchema: { type: "object", properties: {} } },
];
rl.on("line", (l) => {
  const m = JSON.parse(l);
  if (m.method === "initialize") return send({ jsonrpc: "2.0", id: m.id, result: { protocolVersion: m.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: "echo", version: "1" } } });
  if (m.method === "notifications/initialized") return;
  if (m.method === "tools/list") return send({ jsonrpc: "2.0", id: m.id, result: m.params?.cursor ? { tools: TOOLS.slice(2) } : { tools: TOOLS.slice(0, 2), nextCursor: "p2" } });
  if (m.method === "tools/call") {
    const { name, arguments: a } = m.params;
    if (name === "echo") return send({ jsonrpc: "2.0", id: m.id, result: { content: [{ type: "text", text: "echo: " + a.text }] } });
    if (name === "add") return send({ jsonrpc: "2.0", id: m.id, result: { content: [{ type: "text", text: String(a.a + a.b) }] } });
    if (name === "env_check") return send({ jsonrpc: "2.0", id: m.id, result: { content: [{ type: "text", text: JSON.stringify({ secret: process.env.SECRET_NOT_LISTED || null, listed: process.env.MY_KEY || null, lit: process.env.LIT || null }) }] } });
  }
  if (m.id != null) send({ jsonrpc: "2.0", id: m.id, error: { code: -32601, message: "no method" } });
});
