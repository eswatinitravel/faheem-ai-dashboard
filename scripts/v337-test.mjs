// v3.37 MCP client + Recipes test (bina internet, bina AI): stdio aur HTTP(SSE) servers, env ki hifazat, recipes, Jarvis ki "haan".
import fs from "fs"; import os from "os"; import path from "path"; import http from "http";
import { register } from "module";
register("./ext-resolve-hook.mjs", import.meta.url);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "v337-"));
process.env.HOME = tmp; process.env.USERPROFILE = tmp; process.env.FAHEEM_OPS_DIR = path.join(tmp, "ops");
process.env.FAHEEM_MCP_FILE = path.join(tmp, "mcp.json"); process.env.FAHEEM_RECIPES_DIR = path.join(tmp, "recipes");
process.env.SECRET_NOT_LISTED = "leak"; process.env.MY_KEY = "k123";
import { fileURLToPath } from "url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const t = async (name, fn) => { try { const r = await fn(); if (r === false) throw new Error("false"); pass++; console.log("  ok  ", name); } catch (e) { fail++; console.log("  FAIL", name, "-", e.message); } };

const mcp = await import("../lib/mcp/client.js");
const rec = await import("../lib/mcp/recipes.js");
const fixture = path.join(root, "scripts", "fixtures", "echo-mcp.mjs");

await t("Server save + ghalat naam rad", () => { mcp.saveServer("echo", { cmd: process.execPath, args: [fixture], env_keys: ["MY_KEY"], env: { LIT: "x" }, auto_tools: ["echo"] }); let bad = false; try { mcp.saveServer("../x", { cmd: "a" }); } catch { bad = true; } return bad && mcp.readServers().length === 1; });
await t("Claude format {mcpServers} bhi parhta hai", () => { const f = process.env.FAHEEM_MCP_FILE; const keep = fs.readFileSync(f, "utf8"); fs.writeFileSync(f, JSON.stringify({ mcpServers: { a: { command: "npx", args: ["x"] } } })); const s = mcp.readServers(); fs.writeFileSync(f, keep); return s[0].name === "a" && s[0].cmd === "npx" && s[0].type === "stdio"; });
await t("stdio: tools/list (2 pages) = 3 tools", async () => { const tl = await mcp.listTools("echo"); return tl.length === 3 && tl[0].readOnly && tl[0].auto; });
await t("stdio: tools/call echo + add", async () => (await mcp.callTool("echo", "echo", { text: "salam" })).text === "echo: salam" && (await mcp.callTool("echo", "add", { a: 2, b: 3 })).text === "5");
await t("Env: sirf env_keys + env, baqi keys nahi jati", async () => { const j = JSON.parse((await mcp.callTool("echo", "env_check", {})).text); return j.secret === null && j.listed === "k123" && j.lit === "x"; });
await t("Na-maloom tool rad", async () => { try { await mcp.callTool("echo", "rm_rf", {}); return false; } catch (e) { return /nahi/.test(e.message); } });
await t("available_tools se band tool chhupta hai", async () => { mcp.saveServer("echo2", { cmd: process.execPath, args: [fixture], available_tools: ["echo"] }); return (await mcp.listTools("echo2")).map((x) => x.name).join() === "echo"; });
await t("needsConfirm: auto_tools ke siwa sab par haan", () => !mcp.needsConfirm("echo", "echo") && mcp.needsConfirm("echo", "add") && mcp.needsConfirm("nahi-hai", "x"));
await t("SSE parse", () => mcp.parseSse('event: message\ndata: {"jsonrpc":"2.0","id":7,"result":{"ok":1}}\n\n', 7)?.result?.ok === 1);

// HTTP (streamable) server: init JSON, list SSE, session id, header mein ${KEY}.
let seenAuth = "", seenSession = "";
const srv = http.createServer((req, res) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => {
  const m = b ? JSON.parse(b) : {}; seenAuth = req.headers.authorization || ""; if (m.method !== "initialize") seenSession = req.headers["mcp-session-id"] || "";
  if (m.id == null) { res.writeHead(202); return res.end(); }
  if (m.method === "initialize") { res.writeHead(200, { "content-type": "application/json", "mcp-session-id": "S1" }); return res.end(JSON.stringify({ jsonrpc: "2.0", id: m.id, result: { protocolVersion: "2025-06-18", capabilities: {}, serverInfo: { name: "h" } } })); }
  res.writeHead(200, { "content-type": "text/event-stream" });
  const result = m.method === "tools/list" ? { tools: [{ name: "ping", description: "p", inputSchema: { type: "object" } }] } : { content: [{ type: "text", text: "pong" }] };
  res.end(`event: message\ndata: ${JSON.stringify({ jsonrpc: "2.0", id: m.id, result })}\n\n`);
}); });
await new Promise((r) => srv.listen(0, "127.0.0.1", r));
await t("HTTP: init + SSE tools + call, session aur ${KEY} header", async () => { mcp.saveServer("web", { type: "http", url: `http://127.0.0.1:${srv.address().port}/mcp`, headers: { Authorization: "Bearer ${MY_KEY}" }, env_keys: ["MY_KEY"] }); const tl = await mcp.listTools("web"); const r = await mcp.callTool("web", "ping", {}); return tl[0].name === "ping" && r.text === "pong" && seenAuth === "Bearer k123" && seenSession === "S1"; });

// Recipes
await t("Recipe validate: {{x}} bina parameter = ghalti", () => rec.validateRecipe({ title: "a", prompt: "{{x}}" }).length === 1 && rec.validateRecipe({ title: "a", prompt: "{{x}}", parameters: [{ key: "x" }] }).length === 0);
await t("Recipe render: default + zaroori", () => { const r = { prompt: "Hi {{a}} {{b}}", parameters: [{ key: "a" }, { key: "b", requirement: "optional", default: "z" }] }; let threw = false; try { rec.render(r, {}); } catch { threw = true; } return threw && rec.render(r, { a: "x" }).prompt === "Hi x z"; });
await t("Built-in recipes theek (3)", () => { const l = rec.listRecipes(); return l.filter((r) => r.source === "built-in").length >= 3 && l.every((r) => !r.errors.length); });
await t("Apni recipe save + built-in ko dhaanp leti hai", () => { rec.saveRecipe("vestire-post", { title: "Meri", prompt: "x" }); const r = rec.getRecipe("vestire-post"); rec.deleteRecipe("vestire-post"); return r.title === "Meri" && rec.getRecipe("vestire-post").source === "built-in"; });
await t("TOOL tag parse", () => rec.parseToolTag('ok <<TOOL {"server":"echo","tool":"add","args":{"a":1}}>>').tool === "add" && rec.parseToolTag("koi tag nahi") === null);

// Jarvis: nakli mcp pending + haan = kuch nahi
const { jarvisTurn } = await import("../lib/jarvis/brain.js");
await t("Jarvis: nakli mcp pending + haan rad", async () => { const o = await jarvisTurn({ text: "haan", pending: { name: "mcp", args: { server: "echo", tool: "add" } } }); return !o.action && /purana/.test(o.reply); });
await t("Jarvis: MCP list prompt mein (5 min cache)", async () => /mcpList\(\)/.test(fs.readFileSync(path.join(root, "lib/jarvis/brain.js"), "utf8")));
await t("API route sirf localhost", () => /Sirf isi laptop par/.test(fs.readFileSync(path.join(root, "app/api/mcp/route.js"), "utf8")));

mcp.closeAll(); srv.close();
console.log(`\nv3.37 MCP + recipes tests: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
