import { account, saveAccount, myRepos, searchRepos, downloadRepo, downloadSkills, listLocal, removeLocal, openFolder } from "../../../lib/github";
import { audit } from "../../../lib/ops/audit";
import { isPaused } from "../../../lib/ops/control";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isLocal(req) {
  const host = (req.headers.get("host") || "").split(":")[0];
  return ["localhost", "127.0.0.1", "[::1]"].includes(host);
}
const bad = (error, status = 400) => Response.json({ ok: false, error }, { status });
const log = (a, t, m) => { try { audit(a, t, m); } catch {} };

// v3.19 GitHub page: account, repos, search, repo download, skill download.
export async function GET(req) {
  if (!isLocal(req)) return bad("Sirf isi laptop par.", 403);
  const url = new URL(req.url);
  try {
    const what = url.searchParams.get("what");
    if (what === "repos") return Response.json({ ok: true, repos: await myRepos() });
    if (what === "search") return Response.json({ ok: true, repos: await searchRepos(url.searchParams.get("q") || "") });
    return Response.json({ ok: true, account: account(), local: listLocal() });
  } catch (e) { return bad(e.message); }
}

export async function POST(req) {
  if (!isLocal(req)) return bad("Sirf isi laptop par.", 403);
  const origin = req.headers.get("origin");
  if (origin && !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin)) return bad("Ghalat origin.", 403);
  const b = await req.json().catch(() => ({}));
  try {
    switch (b.action) {
      case "account": { const a = saveAccount({ user: b.user, token: b.token }); log("github_account", `GitHub: ${a.user}${a.tokenSet ? " (token laga)" : ""}`); return Response.json({ ok: true, account: a }); }
      case "repo": {
        if (isPaused()) return bad("Pause All chalu hai.");
        const r = await downloadRepo(b.input); log("github_repo", `Repo download: ${r.repo}`, { files: r.files }); return Response.json({ ok: true, result: r, local: listLocal() });
      }
      case "skill": {
        if (isPaused()) return bad("Pause All chalu hai.");
        const r = await downloadSkills(b.input); log("github_skill", `Skill: ${r.skills.map((s) => s.name).join(", ")} (${r.repo})`); return Response.json({ ok: true, result: r, local: listLocal() });
      }
      case "remove": { removeLocal(b.kind, b.name); log("github_remove", `${b.kind} hataya: ${b.name}`); return Response.json({ ok: true, local: listLocal() }); }
      case "open": return Response.json({ ok: true, path: openFolder(b.path) });
      default: return bad("Ghalat action");
    }
  } catch (e) { return bad(e.message); }
}
