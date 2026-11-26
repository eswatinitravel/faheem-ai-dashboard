// v3.28 safety tests (bina server, bina internet): CSRF / DNS-rebinding guard, run_command allowlist,
// raaz wali files (keys) se agent door, preview sandbox header.
import fs from "fs"; import os from "os"; import path from "path";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "safety-"));
process.env.HOME = tmp; process.env.USERPROFILE = tmp; process.env.GROQ_API_KEY = "gsk_test_parent_only"; process.env.FAHEEM_OPS_DIR = path.join(tmp, "ops");
import { fileURLToPath } from "url";
const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const G = await import("../lib/request-guard.js");
const T = await import("../lib/agent/tools.js");

let pass = 0, fail = 0;
const t = async (name, fn) => { try { const r = await fn(); if (r === false) throw new Error("false"); pass++; console.log("  ok  ", name); } catch (e) { fail++; console.log("  FAIL", name, "-", e.message); } };

// ---- CSRF guard ----
const req = (method, pathname, h = {}) => G.csrfCheck({ method, pathname, headers: { host: "localhost:3000", ...h } });
const JSONH = { "content-type": "application/json" };
await t("GET hamesha theek", () => req("GET", "/api/keys", { origin: "https://evil.com" }) === null);
await t("Dashboard ka apna JSON POST theek", () => req("POST", "/api/keys", { ...JSONH, origin: "http://localhost:3000", "sec-fetch-site": "same-origin" }) === null);
await t("127.0.0.1 / [::1] same-origin theek", () => G.csrfCheck({ method: "POST", pathname: "/api/agent", headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000", ...JSONH } }) === null && G.csrfCheck({ method: "POST", pathname: "/api/agent", headers: { host: "[::1]:3000", origin: "http://[::1]:3000", ...JSONH } }) === null);
await t("Doosri website ka Origin = 403", () => req("POST", "/api/agent", { ...JSONH, origin: "https://evil.com" })?.status === 403);
await t("Doosra localhost port = 403", () => req("POST", "/api/settings", { ...JSONH, origin: "http://localhost:5173" })?.status === 403);
await t("Origin null (sandbox) = 403", () => req("POST", "/api/keys", { ...JSONH, origin: "null" })?.status === 403);
await t("Sec-Fetch-Site cross-site = 403 (Origin na ho tab bhi)", () => req("DELETE", "/api/gallery", { "sec-fetch-site": "cross-site" })?.status === 403);
await t("Extension origin theek", () => req("POST", "/api/jarvis", { ...JSONH, origin: "chrome-extension://abcdefghijklmnop", "sec-fetch-site": "cross-site" }) === null);
await t("text/plain body (form / no-cors fetch) = 415", () => req("POST", "/api/keys", { "content-type": "text/plain;charset=UTF-8", "content-length": "20" })?.status === 415);
await t("form-urlencoded = 415", () => req("POST", "/api/settings", { "content-type": "application/x-www-form-urlencoded" })?.status === 415);
await t("Jarvis 'haan' bina JSON = 415", () => req("POST", "/api/jarvis", { "content-type": "text/plain", "content-length": "40" })?.status === 415);
await t("multipart sirf upload routes par", () => req("POST", "/api/gallery", { "content-type": "multipart/form-data; boundary=x" }) === null && req("POST", "/api/transcribe", { "content-type": "multipart/form-data; boundary=x" }) === null && req("POST", "/api/jarvis/stt", { "content-type": "multipart/form-data; boundary=x" }) === null && req("POST", "/api/agent", { "content-type": "multipart/form-data; boundary=x" })?.status === 415);
await t("Bina body POST/DELETE (update, zip delete) theek", () => req("POST", "/api/update", { origin: "http://localhost:3000" }) === null && req("DELETE", "/api/agent/zip", {}) === null);
await t("/api/v1 par guard nahi (Bearer)", () => req("POST", "/api/v1/chat/completions", { "content-type": "text/plain", origin: "https://x.com" }) === null);
await t("Pages (non-/api) par guard nahi", () => req("POST", "/agent", { origin: "https://evil.com" }) === null);
await t("Host check (guard band): domain naam rad, IP / localhost theek", () => !G.hostOkWhenGuardOff("evil.com:3000") && !G.hostOkWhenGuardOff("") && G.hostOkWhenGuardOff("localhost:3000") && G.hostOkWhenGuardOff("127.0.0.1:3000") && G.hostOkWhenGuardOff("[::1]:3000") && G.hostOkWhenGuardOff("192.168.1.5:3000"));
await t("proxy.js guard istemal karta hai", () => { const s = fs.readFileSync(path.join(ROOT_DIR, "proxy.js"), "utf8"); return /csrfCheck/.test(s) && /hostOkWhenGuardOff/.test(s) && (s.match(/return pass\(request\)/g) || []).length >= 2; });

// ---- run_command allowlist ----
const ok = (c, pl = "linux") => T.checkCommand(c, pl) === null;
await t("Allowlist: node/npm/npx/python/python3/py/pip/git", () => ["node a.js", "npm run build", "npx vite build", "python app.py", "python3 app.py", "py -3 app.py", "pip list", "git status", "node.exe a.js", "npm.cmd test"].every((c) => ok(c)));
await t("Baqi sab rad (cmd, powershell, curl, cat, ls, echo, path wala node)", () => ["cmd /c dir", "powershell -c x", "curl http://x", "cat .env", "ls", "echo hi", "type keys.json", "C:\\x\\node.exe a.js", "/usr/bin/node a.js", "bun run x"].every((c) => !ok(c)));
await t("Zanjeer band: ; & && | ` $( ${ > < newline", () => ["node a.js; rm -rf x", "node a.js && del x", "node a.js & calc", "npm test | x", "node `x`", "node $(whoami)", "node ${HOME}", "node a.js > o.txt", "node < i.txt", "node a.js\ncalc", "node a.js\rcalc"].every((c) => !ok(c) && !ok(c, "win32")));
await t("Quote ke andar (bina shell) => ka text theek", () => ok('node -e "console.log([1].map(x => x > 0))"'));
await t("Windows npm/npx (shell): quote ke andar bhi meta / %VAR% rad", () => !ok('npm run x "a&b"', "win32") && !ok("npm test %PATH%", "win32") && !ok("npx x ^& calc", "win32") && ok("npm run build", "win32"));
await t("Khatarnak: git push, reset --hard, ../", () => ["git push origin main", "git reset --hard", "node ../x.js"].every((c) => !ok(c)));
await t("Raaz file command mein rad", () => !ok("node .env") && !ok("python read.py keys.json") && !ok("node x.js ~/.faheem-ai/keys.json"));
await t("Ghalat quote rad", () => !ok('node "abc'));
await t("splitCommand quotes", () => { const p = T.splitCommand(`node -e "a b" 'c d' e`); return JSON.stringify([...p]) === JSON.stringify(["node", "-e", "a b", "c d", "e"]); });
await t("Child env mein keys nahi", () => { const e = T.childEnv({ PATH: "/bin", GROQ_API_KEY: "x", GITHUB_TOKEN: "y", MY_SECRET: "z", OPENAI_APIKEY: "w" }); return e.PATH === "/bin" && !("GROQ_API_KEY" in e) && !("GITHUB_TOKEN" in e) && !("MY_SECRET" in e) && !("OPENAI_APIKEY" in e) && e.CI === "1"; });
await t("Install par ab bhi ijazat (approval gate)", async () => { const dir = T.projectDir("gate-test"); const r = String(await T.runTool(dir, "r1", "run_command", { cmd: "npm install left-pad" })); return !/^exit /.test(r); });
await t("Asli chalana: node bina shell", async () => { const dir = T.projectDir("run-test"); const r = String(await T.runTool(dir, "r2", "run_command", { cmd: 'node -e "console.log(1 > 0, typeof process.env.GROQ_API_KEY)"' })); return /exit 0/.test(r) && /true undefined/.test(r); });

// ---- raaz wali files ----
const dir = T.projectDir("secret-test");
fs.writeFileSync(path.join(dir, ".env"), "GROQ_API_KEY=gsk_secret123");
fs.writeFileSync(path.join(dir, ".env.example"), "GROQ_API_KEY=");
fs.writeFileSync(path.join(dir, "app.js"), "console.log('gsk')");
fs.mkdirSync(path.join(tmp, ".faheem-ai"), { recursive: true });
const KEYS = path.join(tmp, ".faheem-ai", "keys.json");
fs.writeFileSync(KEYS, JSON.stringify({ GROQ_API_KEY: "gsk_secret123" }));
let linked = false; try { fs.symlinkSync(KEYS, path.join(dir, "notes.txt")); linked = true; } catch {}
await t("read_file .env rad, .env.example theek", async () => /raaz/.test(await T.runTool(dir, "r", "read_file", { path: ".env" })) && /GROQ_API_KEY=/.test(await T.runTool(dir, "r", "read_file", { path: ".env.example" })));
await t("search raaz file nahi parhta", async () => { const r = String(await T.runTool(dir, "r", "search", { query: "gsk" })); return /app\.js/.test(r) && !/secret123/.test(r); });
await t("list_files: raaz folder rad", async () => { fs.mkdirSync(path.join(dir, ".env.d"), { recursive: true }); return /raaz/.test(await T.runTool(dir, "r", "list_files", { path: ".env.d" })); });
await t("isSecretPath: keys.json, data/, .env", () => T.isSecretPath(KEYS) && T.isSecretPath(path.join(process.cwd(), "data", "keys.backup.json")) && T.isSecretPath(path.join(dir, ".env")) && !T.isSecretPath(path.join(dir, "app.js")));
await t("Symlink se keys.json tak rasai nahi", async () => { if (!linked) return true; let r; try { r = String(await T.runTool(dir, "r", "read_file", { path: "notes.txt" })); } catch (e) { r = e.message; } return !/secret123/.test(r) && /bahar|raaz/.test(r); });
await t("Project se bahar (../) rad", () => { try { T.safe(dir, "../x"); return false; } catch { return true; } });

// ---- preview sandbox ----
await t("Preview: CSP sandbox bina allow-same-origin", () => { const s = fs.readFileSync(path.join(ROOT_DIR, "app/api/agent/preview/[project]/[...path]/route.js"), "utf8"); const m = s.match(/"Content-Security-Policy": "([^"]+)"/); return !!m && /^sandbox\b/.test(m[1]) && /allow-scripts/.test(m[1]) && !/allow-same-origin/.test(m[1]) && /\.\.\.SANDBOX/.test(s); });

try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
console.log(`\nv3.28 safety tests: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
