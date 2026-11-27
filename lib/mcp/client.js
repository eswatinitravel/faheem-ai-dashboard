// v3.37 MCP client (bina SDK, sirf Node): Jarvis aur Agent wahi MCP servers chala sakte hain jo Goose / Claude Code chalate hain.
// Idea: Goose (aaif-goose/goose, Apache-2.0) ka extension format: type, cmd, args, env_keys, timeout, available_tools.
// Do raaste: "stdio" (laptop par program, JSON-RPC lines) aur "http" (streamable HTTP, JSON ya SSE jawab).
// Servers ki list: C:\Users\<naam>\.faheem-ai\mcp-servers.json (update par bhi rehti hai).
import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import { getConfig } from "../config.js";

export const MCP_FILE = process.env.FAHEEM_MCP_FILE || path.join(os.homedir(), ".faheem-ai", "mcp-servers.json");
export const PROTOCOL = "2025-06-18";
const CLIENT = { name: "faheem-ai-dashboard", version: "3.37.0" };
const NAME_OK = /^[a-z0-9][a-z0-9_-]{0,39}$/i;
// Sirf yeh Windows/Linux zaroori env variables server ko jate hain; aap ki keys tab hi jab env_keys mein naam ho.
const BASE_ENV = ["PATH", "Path", "PATHEXT", "SYSTEMROOT", "SystemRoot", "windir", "ComSpec", "TEMP", "TMP", "HOME", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "ProgramFiles", "ProgramFiles(x86)", "ProgramData", "LANG", "NODE_EXTRA_CA_CERTS"];

// ---------- Config ----------
function clean(name, s = {}) {
  const type = s.type === "http" || s.type === "streamable_http" || (!s.cmd && s.url) ? "http" : "stdio";
  const out = { name, type, enabled: s.enabled !== false, description: String(s.description || "").slice(0, 200), timeout: Math.min(Math.max(Number(s.timeout) || 60, 5), 600) };
  if (type === "stdio") { out.cmd = String(s.cmd || s.command || ""); out.args = (Array.isArray(s.args) ? s.args : []).map(String).slice(0, 40); }
  else { out.url = String(s.url || s.uri || ""); out.headers = s.headers && typeof s.headers === "object" ? Object.fromEntries(Object.entries(s.headers).map(([k, v]) => [String(k), String(v)])) : {}; }
  out.env = s.env && typeof s.env === "object" ? Object.fromEntries(Object.entries(s.env).map(([k, v]) => [String(k), String(v)])) : {};
  out.env_keys = (Array.isArray(s.env_keys) ? s.env_keys : []).map(String).filter((k) => /^[A-Z0-9_]+$/i.test(k)).slice(0, 20);
  out.available_tools = Array.isArray(s.available_tools) ? s.available_tools.map(String) : []; // khali = sab
  out.auto_tools = Array.isArray(s.auto_tools) ? s.auto_tools.map(String) : []; // in par "haan" nahi poochte (sirf parhne wale)
  return out;
}

export function readServers() {
  let raw = {};
  try { raw = JSON.parse(fs.readFileSync(MCP_FILE, "utf8")); } catch {}
  // Claude/Cursor wala {"mcpServers":{...}} bhi chalta hai, aur Goose wala {"extensions":{...}} bhi.
  const map = raw.servers || raw.mcpServers || raw.extensions || {};
  return Object.entries(map).filter(([n]) => NAME_OK.test(n)).map(([n, s]) => clean(n, s));
}

export function saveServer(name, spec) {
  if (!NAME_OK.test(String(name || ""))) throw new Error("Naam sirf a-z, 0-9, - aur _ (40 tak).");
  const s = clean(name, spec);
  if (s.type === "stdio" && !s.cmd) throw new Error("cmd chahiye (jaise npx).");
  if (s.type === "http" && !/^https?:\/\//i.test(s.url)) throw new Error("url http(s):// se shuru ho.");
  let raw = {}; try { raw = JSON.parse(fs.readFileSync(MCP_FILE, "utf8")); } catch {}
  const servers = raw.servers || raw.mcpServers || raw.extensions || {};
  const { name: _n, ...rest } = s;
  servers[name] = rest;
  fs.mkdirSync(path.dirname(MCP_FILE), { recursive: true });
  fs.writeFileSync(MCP_FILE, JSON.stringify({ servers }, null, 2), { mode: 0o600 });
  close(name);
  return s;
}

export function removeServer(name) {
  let raw = {}; try { raw = JSON.parse(fs.readFileSync(MCP_FILE, "utf8")); } catch {}
  const servers = raw.servers || raw.mcpServers || raw.extensions || {};
  delete servers[name];
  fs.mkdirSync(path.dirname(MCP_FILE), { recursive: true });
  fs.writeFileSync(MCP_FILE, JSON.stringify({ servers }, null, 2), { mode: 0o600 });
  close(name);
}

export function serverEnv(s, extra = null) {
  if (!extra) { extra = { ...process.env }; try { for (const [k, v] of Object.entries(getConfig())) if (v) extra[k] = v; } catch {} }
  const env = {};
  for (const k of BASE_ENV) if (process.env[k] != null) env[k] = process.env[k];
  for (const k of s.env_keys || []) if (extra[k] != null) env[k] = String(extra[k]);
  Object.assign(env, s.env || {});
  return env;
}

// ---------- Connections ----------
const POOL = (globalThis.__faheemMcp ||= new Map()); // name -> conn
const IDLE_MS = 10 * 60 * 1000;

function winQuote(a) { return /[\s"&|<>^]/.test(a) ? `"${String(a).replace(/"/g, '\\"')}"` : a; }

class StdioConn {
  constructor(s) { this.s = s; this.id = 0; this.wait = new Map(); this.buf = ""; this.err = ""; }
  start() {
    const s = this.s;
    const win = process.platform === "win32";
    // Windows par npx/uvx asal mein .cmd hain; Node unhein bina shell nahi chalata.
    const shell = win && !/\.exe$/i.test(s.cmd);
    const cmd = shell ? [s.cmd, ...s.args].map(winQuote).join(" ") : s.cmd;
    this.p = spawn(cmd, shell ? [] : s.args, { shell, windowsHide: true, stdio: ["pipe", "pipe", "pipe"], env: serverEnv(s) });
    this.p.stdout.setEncoding("utf8");
    this.p.stdout.on("data", (d) => { this.buf += d; let i; while ((i = this.buf.indexOf("\n")) >= 0) { const line = this.buf.slice(0, i).trim(); this.buf = this.buf.slice(i + 1); if (line) this.onLine(line); } });
    this.p.stderr.on("data", (d) => { this.err = (this.err + d).slice(-2000); });
    const dead = (why) => { this.closed = true; for (const [, w] of this.wait) w.reject(new Error(why + (this.err ? " — " + this.err.trim().split("\n").slice(-2).join(" ") : ""))); this.wait.clear(); POOL.delete(s.name); };
    this.p.on("error", (e) => dead("Server shuru nahi hua: " + e.message));
    this.p.on("exit", (c) => dead("Server band ho gaya (code " + c + ")"));
  }
  onLine(line) {
    let m; try { m = JSON.parse(line); } catch { return; }
    if (m.id != null && this.wait.has(m.id) && (m.result !== undefined || m.error)) { const w = this.wait.get(m.id); this.wait.delete(m.id); m.error ? w.reject(new Error(m.error.message || "MCP error")) : w.resolve(m.result); return; }
    // Server ki apni request (ping, roots/list): khali jawab, taake atke nahi.
    if (m.id != null && m.method) this.write({ jsonrpc: "2.0", id: m.id, result: m.method === "roots/list" ? { roots: [] } : {} });
  }
  write(obj) { if (!this.closed) this.p.stdin.write(JSON.stringify(obj) + "\n"); }
  request(method, params, ms) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => { this.wait.delete(id); reject(new Error(`${method}: ${Math.round(ms / 1000)}s mein jawab nahi`)); }, ms);
      this.wait.set(id, { resolve: (v) => { clearTimeout(t); resolve(v); }, reject: (e) => { clearTimeout(t); reject(e); } });
      this.write({ jsonrpc: "2.0", id, method, params });
    });
  }
  notify(method, params) { this.write({ jsonrpc: "2.0", method, ...(params ? { params } : {}) }); }
  close() { try { this.p.stdin.end(); this.p.kill(); } catch {} this.closed = true; }
}

export function parseSse(text, id) {
  let found = null;
  for (const block of String(text).split(/\r?\n\r?\n/)) {
    const data = block.split(/\r?\n/).filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trimStart()).join("\n");
    if (!data) continue;
    try { const m = JSON.parse(data); if (m.id === id && (m.result !== undefined || m.error)) found = m; } catch {}
  }
  return found;
}

class HttpConn {
  constructor(s) { this.s = s; this.id = 0; this.session = ""; }
  start() {}
  headers() {
    const h = { "Content-Type": "application/json", Accept: "application/json, text/event-stream", "MCP-Protocol-Version": PROTOCOL };
    // Header ki value mein ${KEY} ho to env_keys / Options keys se bhari jati hai (key file mein likhni nahi parti).
    const env = serverEnv(this.s);
    for (const [k, v] of Object.entries(this.s.headers || {})) h[k] = v.replace(/\$\{([A-Z0-9_]+)\}/gi, (_, n) => env[n] || "");
    if (this.session) h["Mcp-Session-Id"] = this.session;
    return h;
  }
  async post(body, ms) {
    const r = await fetch(this.s.url, { method: "POST", headers: this.headers(), body: JSON.stringify(body), signal: AbortSignal.timeout(ms) });
    const sid = r.headers.get("mcp-session-id"); if (sid) this.session = sid;
    return r;
  }
  async request(method, params, ms) {
    const id = ++this.id;
    const r = await this.post({ jsonrpc: "2.0", id, method, params }, ms);
    if (!r.ok) throw new Error(`${method}: HTTP ${r.status}`);
    const ct = r.headers.get("content-type") || "";
    const txt = await r.text();
    const m = ct.includes("text/event-stream") ? parseSse(txt, id) : JSON.parse(txt);
    if (!m) throw new Error(`${method}: jawab nahi mila`);
    if (m.error) throw new Error(m.error.message || "MCP error");
    return m.result;
  }
  notify(method, params) { this.post({ jsonrpc: "2.0", method, ...(params ? { params } : {}) }, 10000).catch(() => {}); }
  close() { if (this.session) fetch(this.s.url, { method: "DELETE", headers: this.headers(), signal: AbortSignal.timeout(5000) }).catch(() => {}); }
}

export function close(name) { const c = POOL.get(name); if (c) { try { c.conn.close(); } catch {} POOL.delete(name); } }
export function closeAll() { for (const n of [...POOL.keys()]) close(n); }

async function connect(s) {
  const have = POOL.get(s.name);
  if (have && !have.conn.closed) { have.last = Date.now(); return have; }
  const conn = s.type === "http" ? new HttpConn(s) : new StdioConn(s);
  conn.start();
  const ms = s.timeout * 1000;
  const init = await conn.request("initialize", { protocolVersion: PROTOCOL, capabilities: {}, clientInfo: CLIENT }, Math.min(ms, 60000));
  conn.notify("notifications/initialized");
  const entry = { conn, info: init?.serverInfo || {}, last: Date.now(), tools: null };
  POOL.set(s.name, entry);
  clearInterval(entry.timer);
  entry.timer = setInterval(() => { if (Date.now() - entry.last > IDLE_MS) { clearInterval(entry.timer); close(s.name); } }, 60000);
  entry.timer.unref?.();
  return entry;
}

export function findServer(name) { return readServers().find((s) => s.name === name) || null; }

export async function listTools(name) {
  const s = findServer(name);
  if (!s) throw new Error(`MCP server "${name}" nahi mila.`);
  if (!s.enabled) throw new Error(`MCP server "${name}" band hai.`);
  const e = await connect(s);
  if (e.tools) return e.tools;
  let tools = [], cursor;
  for (let i = 0; i < 10; i++) {
    const r = await e.conn.request("tools/list", cursor ? { cursor } : {}, s.timeout * 1000);
    tools.push(...(r?.tools || []));
    cursor = r?.nextCursor; if (!cursor) break;
  }
  if (s.available_tools.length) tools = tools.filter((t) => s.available_tools.includes(t.name));
  e.tools = tools.map((t) => ({ name: t.name, description: String(t.description || "").slice(0, 400), inputSchema: t.inputSchema || { type: "object" }, readOnly: !!t.annotations?.readOnlyHint, auto: s.auto_tools.includes(t.name) }));
  return e.tools;
}

// Natija hamesha chhota text (Jarvis bolta hai, Agent parhta hai).
export function resultText(r, max = 4000) {
  const parts = (r?.content || []).map((c) => c.type === "text" ? c.text : c.type === "resource" ? (c.resource?.text || c.resource?.uri || "") : c.type === "image" ? "[tasveer]" : "");
  if (!parts.length && r?.structuredContent) parts.push(JSON.stringify(r.structuredContent));
  const t = parts.join("\n").trim();
  return t.length > max ? t.slice(0, max) + " …" : t;
}

export async function callTool(name, tool, args = {}) {
  const s = findServer(name);
  if (!s) throw new Error(`MCP server "${name}" nahi mila.`);
  const tools = await listTools(name);
  if (!tools.some((t) => t.name === tool)) throw new Error(`"${tool}" tool "${name}" mein nahi (ya available_tools mein band).`);
  const e = await connect(s);
  e.last = Date.now();
  const r = await e.conn.request("tools/call", { name: tool, arguments: args && typeof args === "object" ? args : {} }, s.timeout * 1000);
  return { ok: !r?.isError, text: resultText(r), raw: r };
}

// Kya is tool ko bina "haan" chala sakte hain? Sirf jab aap ne auto_tools mein likha ho.
export function needsConfirm(name, tool) {
  const s = findServer(name);
  return !(s && s.auto_tools.includes(tool));
}

// Jarvis / Agent ke system prompt ke liye chhoti list (cache se; pehli dafa server chalate hain).
export async function toolCatalog({ max = 30, ms = 8000 } = {}) {
  const servers = readServers().filter((x) => x.enabled);
  const lists = await Promise.all(servers.map((s) => Promise.race([listTools(s.name), new Promise((_, rj) => setTimeout(() => rj(new Error("slow")), ms))]).then((tools) => ({ s, tools }), () => ({ s, tools: [] }))));
  const out = [];
  for (const { s, tools } of lists) for (const t of tools) if (out.length < max) out.push({ server: s.name, tool: t.name, description: t.description.slice(0, 140), params: Object.keys(t.inputSchema?.properties || {}).slice(0, 8) });
  return out;
}
