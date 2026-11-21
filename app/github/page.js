"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Icon from "../components/Icon";
import Background from "../components/Background";
import ThemeBalls from "../components/ThemeBalls";

// v3.19 GitHub: account juda, apni repos, koi bhi repo download, skills (SKILL.md) install.
const TABS = [["mine", "Meri repos"], ["download", "Repo download"], ["skills", "Skill download"], ["local", "Laptop par"]];
const SKILL_IDEAS = [
  ["obra/superpowers", "Superpowers (brainstorm, plan, TDD, debugging, review)"],
  ["https://github.com/alirezarezvani/claude-skills/tree/main/engineering-team", "Claude-Skills: Engineering (code, review, DevOps, security)"],
  ["https://github.com/alirezarezvani/claude-skills/tree/main/product-team", "Claude-Skills: Product (PRD, roadmap, UX)"],
  ["https://github.com/alirezarezvani/claude-skills/tree/main/marketing-skill", "Claude-Skills: Marketing (SEO, copy, ads)"],
  ["https://github.com/alirezarezvani/claude-skills/tree/main/finance", "Claude-Skills: Finance (budget, SaaS metrics)"],
  ["https://github.com/alirezarezvani/claude-skills/tree/main/c-level-advisor", "Claude-Skills: CEO/CTO advisor"],
  ["anthropics/skills", "Anthropic ki official skills (docx, pdf, pptx, xlsx, design)"],
  ["https://github.com/Nutlope/hallmark/tree/main/skills/hallmark", "Hallmark design rules"],
  ["nextlevelbuilder/ui-ux-pro-max-skill", "UI UX Pro Max"],
];

export default function GitHubPage() {
  const [d, setD] = useState(null);
  const [tab, setTab] = useState("mine");
  const [repos, setRepos] = useState(null);
  const [q, setQ] = useState("");
  const [found, setFound] = useState(null);
  const [input, setInput] = useState("");
  const [skillIn, setSkillIn] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState(null);
  const [acc, setAcc] = useState({ user: "", token: "" });

  const load = useCallback(async () => {
    try { const r = await fetch("/api/github", { cache: "no-store" }).then((x) => x.json()); if (r.ok) { setD(r); setAcc((a) => ({ ...a, user: a.user || r.account.user })); } } catch {}
  }, []);
  const loadRepos = useCallback(async () => {
    setRepos(null);
    const r = await fetch("/api/github?what=repos", { cache: "no-store" }).then((x) => x.json()).catch((e) => ({ ok: false, error: e.message }));
    if (r.ok) setRepos(r.repos); else { setRepos([]); setMsg({ bad: true, text: r.error }); }
  }, []);
  useEffect(() => { load(); loadRepos(); }, [load, loadRepos]);

  async function post(body, label) {
    setBusy(label); setMsg(null);
    try {
      const r = await fetch("/api/github", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((x) => x.json());
      if (!r.ok) setMsg({ bad: true, text: r.error }); else if (r.local) setD((x) => ({ ...x, local: r.local }));
      return r;
    } catch (e) { setMsg({ bad: true, text: e.message }); } finally { setBusy(""); }
  }
  async function getRepo(full) {
    const r = await post({ action: "repo", input: full }, "repo:" + full);
    if (r?.ok) setMsg({ text: `${r.result.repo} download ho gaya: ${r.result.files} files, ${r.result.mb} MB. Folder: ${r.result.path}`, path: r.result.path });
  }
  async function getSkill(src) {
    const r = await post({ action: "skill", input: src }, "skill:" + src);
    if (r?.ok) setMsg({ text: `${r.result.skills.length} skill install: ${r.result.skills.map((s) => s.name).join(", ")}. Chat mein skill ka naam likhein to brain usay istemal kare ga.`, path: d?.local?.skillsDir });
  }
  async function saveAcc(e) {
    e.preventDefault();
    const r = await post({ action: "account", user: acc.user, token: acc.token || undefined }, "acc");
    if (r?.ok) { setAcc((a) => ({ ...a, token: "" })); setD((x) => ({ ...x, account: r.account })); setMsg({ text: `GitHub juda: ${r.account.user}` }); loadRepos(); }
  }
  async function search(e) {
    e.preventDefault(); if (!q.trim()) return;
    setFound(null);
    const r = await fetch("/api/github?what=search&q=" + encodeURIComponent(q)).then((x) => x.json()).catch((er) => ({ ok: false, error: er.message }));
    if (r.ok) setFound(r.repos); else { setFound([]); setMsg({ bad: true, text: r.error }); }
  }
  const open = (p) => post({ action: "open", path: p }, "open");
  const a = d?.account;

  const RepoRow = ({ r }) => (
    <div className="gh-row">
      <div className="gh-main">
        <a href={r.url} target="_blank" rel="noreferrer"><b>{r.full}</b></a>{r.private && <span className="chip">private</span>}
        <small className="muted">{r.desc || "—"}</small>
      </div>
      <span className="muted gh-stars">★ {r.stars}</span>
      <button type="button" onClick={() => getRepo(r.full)} disabled={!!busy}>{busy === "repo:" + r.full ? "Download ho raha…" : <><Icon name="download" size={13} /> Download</>}</button>
      <button type="button" className="ghost" onClick={() => getSkill(r.full)} disabled={!!busy} title="Is repo ki SKILL.md wali skills install karein">Skills</button>
    </div>
  );

  return (
    <main className="optpage">
      <Background />
      <header className="topbar">
        <Link href="/" className="icon-btn" title="Wapas chat" aria-label="Wapas chat"><Icon name="back" /></Link>
        <div className="brand"><img src="/icon.png" alt="" className="logo" /> GitHub · repos aur skills</div>
        <div className="top-actions"><ThemeBalls /></div>
      </header>
      <div className="toolspage gh">
        <form className="card panel gh-acc" onSubmit={saveAcc}>
          <div className="gh-acchead">
            <b>GitHub account</b>
            {a && <span className={"tstat " + (a.tokenSet ? "ok" : "")}>{a.user}{a.tokenSet ? ` · token laga (${a.tokenPreview})` : " · sirf public (token nahi)"}</span>}
            {a && <a href={`https://github.com/${a.user}`} target="_blank" rel="noreferrer" className="chip"><Icon name="external" size={12} /> GitHub par kholo</a>}
          </div>
          <div className="gh-accrow">
            <label className="sr" htmlFor="ghu">Username</label>
            <input id="ghu" value={acc.user} onChange={(e) => setAcc({ ...acc, user: e.target.value })} placeholder="eswatinitravel" />
            <label className="sr" htmlFor="ght">Token</label>
            <input id="ght" type="password" value={acc.token} onChange={(e) => setAcc({ ...acc, token: e.target.value })} placeholder={a?.tokenSet ? "Naya token (khali = wahi rahe)" : "GitHub token (private repos ke liye, ikhtiyari)"} autoComplete="off" />
            <button type="submit" disabled={!!busy}>Jorein</button>
          </div>
          <small className="muted">Token banayein: <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">github.com/settings/personal-access-tokens</a> (Contents: Read). Token sirf isi laptop par rehta hai.</small>
        </form>

        {msg && <div className={"gh-msg " + (msg.bad ? "bad" : "ok")}>{msg.text}{msg.path && <button type="button" className="chip" onClick={() => open(msg.path)}><Icon name="folder" size={12} /> Folder kholo</button>}</div>}

        <div className="pagetabs" role="tablist">
          {TABS.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{label}{id === "local" && d ? ` (${d.local.repos.length + d.local.skills.length})` : ""}</button>)}
        </div>

        {tab === "mine" && <section className="card panel">
          <div className="btnrow"><b>{a?.user} ki repos</b><button type="button" className="ghost" onClick={loadRepos}><Icon name="loop" size={13} /> Taaza</button></div>
          {!repos && <p className="muted">Load ho raha hai…</p>}
          {repos && !repos.length && <p className="muted">Koi repo nahi mili.</p>}
          {repos?.map((r) => <RepoRow key={r.full} r={r} />)}
        </section>}

        {tab === "download" && <section className="card panel">
          <b>Koi bhi repo download</b>
          <form className="gh-accrow" onSubmit={(e) => { e.preventDefault(); if (input.trim()) getRepo(input.trim()); }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="https://github.com/owner/repo  ya  owner/repo" aria-label="Repo link" />
            <button type="submit" disabled={!!busy || !input.trim()}>{busy.startsWith("repo:") ? "Download ho raha…" : "Download"}</button>
          </form>
          <b style={{ marginTop: 14 }}>GitHub par talaash</b>
          <form className="gh-accrow" onSubmit={search}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="misaal: ai agent, todo app, claude skills" aria-label="Talaash" />
            <button type="submit">Dhoondo</button>
          </form>
          {found && !found.length && <p className="muted">Kuch nahi mila.</p>}
          {found?.map((r) => <RepoRow key={r.full} r={r} />)}
        </section>}

        {tab === "skills" && <section className="card panel">
          <b>Skill download</b>
          <small className="muted">Repo ya folder ka link dein. Jahan bhi SKILL.md mile, woh skill install ho jaye gi. Chat mein skill ka naam likhein to brain usay parh kar kaam kare ga.</small>
          <form className="gh-accrow" onSubmit={(e) => { e.preventDefault(); if (skillIn.trim()) getSkill(skillIn.trim()); }}>
            <input value={skillIn} onChange={(e) => setSkillIn(e.target.value)} placeholder="https://github.com/owner/repo/tree/main/skills/naam" aria-label="Skill link" />
            <button type="submit" disabled={!!busy || !skillIn.trim()}>{busy.startsWith("skill:") ? "Install ho rahi…" : "Install"}</button>
          </form>
          <div className="gh-ideas">
            {SKILL_IDEAS.map(([src, label]) => <button key={src} type="button" className="chip" onClick={() => getSkill(src)} disabled={!!busy}>{label}</button>)}
          </div>
        </section>}

        {tab === "local" && <section className="card panel">
          <div className="btnrow"><b>Skills ({d?.local.skills.length || 0})</b><button type="button" className="ghost" onClick={() => open(d?.local.skillsDir)}><Icon name="folder" size={13} /> Folder</button></div>
          {!d?.local.skills.length && <p className="muted">Abhi koi skill nahi.</p>}
          {d?.local.skills.map((s) => <div key={s.name} className="gh-row"><div className="gh-main"><b>{s.name}</b><small className="muted">{s.description || "—"}{s.source ? ` · ${s.source}` : ""}</small></div>
            <button type="button" className="ghost" onClick={() => open(s.path)}>Kholo</button>
            <button type="button" className="ghost" onClick={() => post({ action: "remove", kind: "skill", name: s.name }, "rm")} aria-label="Hatao"><Icon name="trash" size={13} /></button></div>)}
          <div className="btnrow" style={{ marginTop: 14 }}><b>Repos ({d?.local.repos.length || 0})</b><button type="button" className="ghost" onClick={() => open(d?.local.reposDir)}><Icon name="folder" size={13} /> Folder</button></div>
          {!d?.local.repos.length && <p className="muted">Abhi koi repo download nahi hui.</p>}
          {d?.local.repos.map((r) => <div key={r.repo} className="gh-row"><div className="gh-main"><b>{r.repo}</b><small className="muted">{r.path}</small></div>
            <button type="button" className="ghost" onClick={() => open(r.path)}>Kholo</button>
            <button type="button" className="ghost" onClick={() => post({ action: "remove", kind: "repo", name: r.repo }, "rm")} aria-label="Hatao"><Icon name="trash" size={13} /></button></div>)}
        </section>}
      </div>
    </main>
  );
}
