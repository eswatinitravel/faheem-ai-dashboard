// v3.19 GitHub: dashboard aap ke GitHub account (default eswatinitravel) se juda.
// Koi bhi repo download (tarball -> tar se nikalna, Windows 10+ mein tar pehle se hai), aur skills (SKILL.md wale folders) install.
// Files: C:\Users\<naam>\.faheem-ai\repos\<owner>\<repo>  aur  C:\Users\<naam>\.faheem-ai\skills\<skill>
import fs from "fs";
import os from "os";
import path from "path";
import { execFile, spawn } from "child_process";
import { getConfig, writeSaved, readSaved } from "./config.js";

const HOME = () => path.join(/*turbopackIgnore: true*/ os.homedir(), ".faheem-ai");
export const REPOS_DIR = () => path.join(HOME(), "repos");
export const SKILLS_DIR = () => path.join(HOME(), "skills");
const ACC = () => path.join(HOME(), "github.json");
export const DEFAULT_USER = "eswatinitravel";

const safe = (s) => String(s || "").replace(/[^A-Za-z0-9._-]/g, "-").replace(/^\.+/, "").slice(0, 100) || "x";

export function account() {
  let a = {}; try { a = JSON.parse(fs.readFileSync(ACC(), "utf8")); } catch {}
  const tok = getConfig().GITHUB_TOKEN || "";
  return { user: a.user || DEFAULT_USER, tokenSet: !!tok, tokenPreview: tok ? tok.slice(0, 4) + "…" + tok.slice(-4) : "" };
}

export function saveAccount({ user, token }) {
  if (typeof user === "string") {
    const u = user.trim().replace(/^https?:\/\/github\.com\//i, "").split("/")[0];
    if (u && !/^[A-Za-z0-9-]{1,39}$/.test(u)) throw new Error("GitHub username ghalat hai");
    fs.mkdirSync(HOME(), { recursive: true });
    fs.writeFileSync(ACC(), JSON.stringify({ user: u || DEFAULT_USER }, null, 2));
  }
  if (typeof token === "string") writeSaved({ ...readSaved(), GITHUB_TOKEN: token });
  return account();
}

async function gh(url, { raw } = {}) {
  const tok = getConfig().GITHUB_TOKEN;
  const headers = { "User-Agent": "faheem-ai-dashboard", Accept: raw ? "application/vnd.github+json" : "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (tok) headers.Authorization = `Bearer ${tok}`;
  const r = await fetch(url, { headers, redirect: "follow" });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    if (r.status === 404) throw new Error("Repo nahi mila (ya private hai: GitHub token lagayein).");
    if (r.status === 401) throw new Error("GitHub token ghalat ya expire hai.");
    if (r.status === 403) throw new Error("GitHub limit poori (token lagane se 5000/ghanta).");
    throw new Error(`GitHub ${r.status}: ${t.slice(0, 120)}`);
  }
  return raw ? r : r.json();
}

// "owner/repo", "https://github.com/owner/repo", ".../tree/main/skills/x", ".../blob/main/a/SKILL.md"
export function parseRepo(input) {
  let s = String(input || "").trim().replace(/\.git$/, "").replace(/^git@github\.com:/, "");
  s = s.replace(/^https?:\/\/(www\.)?github\.com\//i, "").replace(/^\/+|\/+$/g, "");
  const parts = s.split(/[?#]/)[0].split("/").filter(Boolean);
  if (parts.length < 2) throw new Error('Repo likhein: "owner/repo" ya GitHub link');
  const [owner, repo, kind, ref, ...rest] = parts;
  if (!/^[A-Za-z0-9-]{1,39}$/.test(owner) || !/^[A-Za-z0-9._-]{1,100}$/.test(repo)) throw new Error("Repo ka naam ghalat hai");
  let sub = (kind === "tree" || kind === "blob") ? rest.join("/") : "";
  if (kind === "blob" && /SKILL\.md$/i.test(sub)) sub = sub.replace(/\/?SKILL\.md$/i, "");
  return { owner, repo, ref: (kind === "tree" || kind === "blob") ? ref : "", sub };
}

export async function myRepos() {
  const a = account();
  const list = a.tokenSet
    ? await gh("https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner")
    : await gh(`https://api.github.com/users/${a.user}/repos?per_page=100&sort=updated`);
  return list.map(slim);
}

export async function searchRepos(q) {
  const r = await gh(`https://api.github.com/search/repositories?per_page=20&q=${encodeURIComponent(String(q).slice(0, 200))}`);
  return (r.items || []).map(slim);
}

const slim = (x) => ({ full: x.full_name, desc: x.description || "", stars: x.stargazers_count, private: !!x.private, branch: x.default_branch, updated: x.pushed_at, url: x.html_url });

const run = (cmd, args, opts = {}) => new Promise((ok, no) => execFile(cmd, args, { windowsHide: true, maxBuffer: 1 << 24, ...opts }, (e, so, se) => (e ? no(new Error((se || e.message).toString().slice(0, 300))) : ok(so))));

async function fetchTarball(owner, repo, ref) {
  const r = await gh(`https://api.github.com/repos/${owner}/${repo}/tarball${ref ? "/" + encodeURIComponent(ref) : ""}`, { raw: true });
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > 300 * 1024 * 1024) throw new Error("Repo 300MB se bara hai");
  const tmp = path.join(os.tmpdir(), `faheem-gh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  fs.mkdirSync(tmp, { recursive: true });
  const tgz = path.join(tmp, "repo.tar.gz");
  fs.writeFileSync(tgz, buf);
  const out = path.join(tmp, "x");
  fs.mkdirSync(out);
  await run("tar", ["-xzf", tgz, "-C", out, "--strip-components=1"]);
  fs.rmSync(tgz, { force: true });
  return { tmp, dir: out, bytes: buf.length };
}

function countFiles(d) { let n = 0; for (const e of fs.readdirSync(d, { withFileTypes: true })) n += e.isDirectory() ? countFiles(path.join(d, e.name)) : 1; return n; }

export async function downloadRepo(input) {
  const { owner, repo, ref } = parseRepo(input);
  const { tmp, dir, bytes } = await fetchTarball(owner, repo, ref);
  const dest = path.join(REPOS_DIR(), safe(owner), safe(repo));
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(dir, dest, { recursive: true });
  fs.rmSync(tmp, { recursive: true, force: true });
  return { repo: `${owner}/${repo}`, path: dest, files: countFiles(dest), mb: +(bytes / 1048576).toFixed(1) };
}

function findSkills(root, max = 200) {
  const found = [];
  const walk = (d, depth) => {
    if (found.length >= max || depth > 6) return;
    let ents = []; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    if (ents.some((e) => e.isFile() && /^skill\.md$/i.test(e.name))) { found.push(d); return; }
    for (const e of ents) if (e.isDirectory() && !["node_modules", ".git"].includes(e.name)) walk(path.join(d, e.name), depth + 1);
  };
  walk(root, 0);
  return found;
}

function skillMeta(dir) {
  const f = fs.readdirSync(dir).find((n) => /^skill\.md$/i.test(n));
  const txt = f ? fs.readFileSync(path.join(dir, f), "utf8").slice(0, 4000) : "";
  const fm = txt.match(/^---\s*\n([\s\S]*?)\n---/);
  const get = (k) => (fm ? (fm[1].match(new RegExp(`^${k}:\\s*(.+)$`, "m")) || [])[1] : "") || "";
  return { name: get("name").replace(/^["']|["']$/g, "").trim(), description: get("description").replace(/^["']|["']$/g, "").trim() };
}

export async function downloadSkills(input) {
  const { owner, repo, ref, sub } = parseRepo(input);
  const { tmp, dir } = await fetchTarball(owner, repo, ref);
  try {
    const root = sub ? path.join(dir, ...sub.split("/")) : dir;
    if (!root.startsWith(dir) || !fs.existsSync(root)) throw new Error(`Folder "${sub}" repo mein nahi`);
    const dirs = findSkills(root);
    if (!dirs.length) throw new Error("Is repo/folder mein koi SKILL.md nahi mila. Poora repo chahiye to \"Repo download\" use karein.");
    fs.mkdirSync(SKILLS_DIR(), { recursive: true });
    const out = [];
    for (const d of dirs) {
      const m = skillMeta(d);
      const name = safe(m.name || path.basename(d));
      const dest = path.join(SKILLS_DIR(), name);
      fs.rmSync(dest, { recursive: true, force: true });
      fs.cpSync(d, dest, { recursive: true });
      fs.writeFileSync(path.join(dest, ".source.json"), JSON.stringify({ repo: `${owner}/${repo}`, sub: path.relative(dir, d).split(path.sep).join("/"), at: new Date().toISOString() }, null, 2));
      out.push({ name, description: m.description, path: dest });
    }
    return { repo: `${owner}/${repo}`, skills: out };
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

export function listLocal() {
  const repos = [];
  try { for (const o of fs.readdirSync(REPOS_DIR())) for (const r of fs.readdirSync(path.join(REPOS_DIR(), o))) repos.push({ repo: `${o}/${r}`, path: path.join(REPOS_DIR(), o, r) }); } catch {}
  const skills = [];
  try {
    for (const n of fs.readdirSync(SKILLS_DIR())) {
      const d = path.join(SKILLS_DIR(), n);
      if (!fs.statSync(d).isDirectory()) continue;
      let src = {}; try { src = JSON.parse(fs.readFileSync(path.join(d, ".source.json"), "utf8")); } catch {}
      skills.push({ name: n, ...skillMeta(d), name: n, source: src.repo || "", path: d });
    }
  } catch {}
  return { repos, skills, reposDir: REPOS_DIR(), skillsDir: SKILLS_DIR() };
}

export function removeLocal(kind, name) {
  const base = kind === "skill" ? SKILLS_DIR() : REPOS_DIR();
  const target = path.resolve(base, ...String(name).split("/").map(safe));
  if (!target.startsWith(base + path.sep)) throw new Error("Ghalat naam");
  fs.rmSync(target, { recursive: true, force: true });
  return true;
}

export function openFolder(p) {
  const base = HOME();
  const target = path.resolve(p || base);
  if (!target.startsWith(base)) throw new Error("Sirf .faheem-ai ke folder");
  fs.mkdirSync(target, { recursive: true });
  const cmd = process.platform === "win32" ? "explorer" : process.platform === "darwin" ? "open" : "xdg-open";
  try { spawn(cmd, [target], { detached: true, stdio: "ignore", windowsHide: false }).unref(); } catch {}
  return target;
}

// Chat ke liye: installed skills ki chhoti list (naam + kaam), taa ke brain jaane kaun si skill maujood hai.
export function skillsContext(max = 15) {
  try {
    const s = listLocal().skills.slice(0, max);
    if (!s.length) return "";
    return "Installed skills (from GitHub, in ~/.faheem-ai/skills):\n" + s.map((x) => `- ${x.name}: ${(x.description || "").slice(0, 140)}`).join("\n");
  } catch { return ""; }
}

// Message mein kisi installed skill ka naam ho to us ki SKILL.md (chhoti) prompt mein.
export function skillFor(text) {
  try {
    const t = String(text || "").toLowerCase();
    const hit = listLocal().skills.find((s) => s.name.length > 2 && t.includes(s.name.toLowerCase()));
    if (!hit) return "";
    const f = fs.readdirSync(hit.path).find((n) => /^skill\.md$/i.test(n));
    return f ? `Use this installed skill "${hit.name}":\n` + fs.readFileSync(path.join(hit.path, f), "utf8").slice(0, 6000) : "";
  } catch { return ""; }
}
