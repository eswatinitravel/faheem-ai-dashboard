"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "./Icon";
import Background from "./Background";
import ThemeBalls from "./ThemeBalls";
import Gallery from "./Gallery";
import { loadAgentation, saveAgentation } from "./AgentationDock";

// v3.11: ek skill ka page — upar kaam karne wala live panel, saath mein side panel (Kaise kaam karta hai + Setup).
const SAMPLE = '<!doctype html><html><head><meta name="viewport" content="width=device-width"><style>body{font-family:Inter;color:#999;background:#fff}.hero{background:linear-gradient(90deg,#6366f1,#a855f7)}.card{border-left:4px solid #6366f1;border-radius:12px;transition:all .3s}</style></head><body><div class="hero"><h1>Welcome to our store</h1></div><div class="card">Card text here for testing</div><img src="a.png"><button onclick="addToCart()">🛒</button></body></html>';
const PROMPTS = {
  impeccable: "Is screenshot ka design audit karo (Impeccable qawaid): AI-slop gradient, side-tab border, kam contrast, overused font, spacing. Har masla aur uska CSS fix batao.",
  hallmark: "Is screenshot ko Hallmark design rules se jaancho: rang/font, gradient, focus style, emoji icons, nakli reviews. Masle aur fix batao.",
  "ui-ux-pro-max": "Is screenshot ka UX review karo (UI UX Pro Max): contrast 4.5:1, 44px buttons, labels, hierarchy, mobile. Fix batao.",
};

function Copy({ text }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="cmdline"><code>{text}</code>
      <button type="button" className="icon-btn" aria-label="Command copy karein" title="Copy" onClick={() => { navigator.clipboard?.writeText(text); setOk(true); setTimeout(() => setOk(false), 1200); }}><Icon name={ok ? "check" : "copy"} size={14} /></button>
    </div>
  );
}

function AuditResult({ d }) {
  if (!d) return null;
  if (d.error) return <p className="warnline">{d.error}</p>;
  if (d.result) {
    const r = d.result;
    if (r.skipped) return <p className="warnline">Tester nahi chala: {r.reason}</p>;
    return (
      <div className="auditres" data-audit>
        <p><b>{r.ok ? "Pass ✓" : "Ghaltiyan mili ✗"}</b> · buttons {r.buttons ?? "?"}, dabaye {r.clicked ?? 0}</p>
        {(r.errors || []).slice(0, 20).map((e, i) => <div key={i} className="tmsg sev-error">{e}</div>)}
      </div>
    );
  }
  if (d.findings) {
    return (
      <div className="auditres" data-audit>
        <p><b>Impeccable ({d.rules} checks):</b> {d.findings.length === 0 ? "Koi masla nahi, shabaash." : `${d.counts?.error ?? 0} error, ${d.counts?.warning ?? 0} warning, ${d.counts?.advisory ?? 0} mashwara`}</p>
        {d.findings.slice(0, 25).map((f, i) => <div key={i} className={`tmsg sev-${f.severity}`}><b>{f.name}</b>{f.snippet ? ` · ${f.snippet}` : ""}<div className="muted small">{f.description}</div></div>)}
      </div>
    );
  }
  return (
    <div className="auditres" data-audit>
      <p><b>{d.clean ? "Saaf ✓ koi masla nahi" : `${d.notes.length} masle`}</b></p>
      {d.notes?.map((n, i) => <div key={i} className="tmsg">{n}</div>)}
    </div>
  );
}

function CodePanel({ skill }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  async function run(body) {
    setBusy(true); setRes(null);
    const d = await fetch("/api/skills", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: skill.id, ...body }) }).then((r) => r.json()).catch((e) => ({ error: e.message }));
    setBusy(false); setRes(d.ok === false && d.error ? { error: d.error } : d);
  }
  const label = skill.id === "browser-tester" ? "Test chalao" : "Audit karo";
  // Gallery page se "?file=" aaye to khud chala dein.
  useEffect(() => { const f = new URLSearchParams(location.search).get("file"); if (f) run({ file: f }); }, []); // eslint-disable-line
  return (
    <>
      <section className="card panel" data-skill-panel={skill.id}>
        <h3>Live: apna HTML/CSS jaanchein</h3>
        <form onSubmit={(e) => { e.preventDefault(); if (code.trim()) run({ html: code }); }}>
          <label htmlFor="skcode" className="sr">HTML code</label>
          <textarea id="skcode" className="auditbox" rows={8} value={code} onChange={(e) => setCode(e.target.value)} placeholder="<!doctype html> ... yahan paste karein, ya neeche Gallery se .html file bhejein" />
          <div className="toolsbar">
            <button type="submit" disabled={busy || !code.trim()}>{busy ? "Chal raha…" : label}</button>
            <button type="button" className="ghost" onClick={() => setCode(SAMPLE)}>Misaal (kharab page) load karein</button>
          </div>
        </form>
        <AuditResult d={res} />
      </section>
      <Gallery title="Gallery · is skill ke liye files" onUse={(f) => run({ file: f.name })} useLabel={label} chatPrompt={PROMPTS[skill.id] || "Is file ko dekho."} />
    </>
  );
}

function UupmPanel({ skill }) {
  const [q, setQ] = useState("luxury fashion ecommerce");
  const [ds, setDs] = useState(null);
  const [err, setErr] = useState("");
  async function gen(e) {
    e?.preventDefault(); setErr(""); setDs(null);
    const d = await fetch(`/api/design?q=${encodeURIComponent(q)}`).then((r) => r.json()).catch((e) => ({ error: e.message }));
    if (d.ok) setDs(d.system); else setErr(d.error || "Nahi mila");
  }
  const c = ds?.colors || {};
  return (
    <>
      <section className="card panel" data-skill-panel="uupm-search">
        <h3>Live: design system dhoondein</h3>
        <form className="toolsbar" onSubmit={gen}>
          <label htmlFor="uq" className="sr">Business</label>
          <input id="uq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="jaise: restaurant food delivery" />
          <button type="submit">Banao</button>
        </form>
        {err && <p className="warnline">{err}</p>}
        {ds && (
          <div className="dsmini" data-product={ds.product}>
            <p><b>{ds.product}</b> · {ds.style.name}</p>
            <div className="swatches">{["primary", "secondary", "accent", "background", "foreground"].filter((k) => c[k]).map((k) => <span key={k} className="swatch" style={{ background: c[k] }} title={`${k} ${c[k]}`}><b>{k}</b><span>{c[k]}</span></span>)}</div>
            <p className="muted">Font: {ds.typography.heading} + {ds.typography.body} · Page: {ds.landing.name}</p>
            <Link className="linkbtn" href="/design">Poora Design Studio kholein</Link>
          </div>
        )}
      </section>
      <CodePanel skill={skill} />
    </>
  );
}

function FaheemDesignPanel() {
  const [doc, setDoc] = useState(null);
  useEffect(() => { fetch("/api/skills?id=faheem-design").then((r) => r.json()).then((d) => setDoc(d.doc || "")).catch(() => setDoc("")); }, []);
  return (
    <>
      <section className="card panel" data-skill-panel="faheem-design">
        <h3>SKILL.md (jo Hermes ko milta hai)</h3>
        {doc === null ? <p className="muted">Load ho raha hai…</p> : doc ? <pre className="csscode skilldoc">{doc}</pre> : <p className="warnline">SKILL.md nahi mila.</p>}
        <Copy text="hermes skills install eswatinitravel/faheem-ai-dashboard/hermes-skills/faheem-design" />
      </section>
      <Gallery title="Gallery · design ki misaalen" chatPrompt="Is design ko faheem-design qawaid ke hisaab se jaancho aur behtar banane ke 5 qadam batao." />
    </>
  );
}

function AgentationPanel() {
  const [cfg, setCfg] = useState(null);
  useEffect(() => setCfg(loadAgentation()), []);
  if (!cfg) return null;
  const set = (v) => { const n = { ...cfg, ...v }; setCfg(n); saveAgentation(n); };
  const epOk = !cfg.endpoint || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(cfg.endpoint);
  return (
    <section className="card panel" data-skill-panel="agentation">
      <h3>Live: toolbar</h3>
      <label className="toggle"><input type="checkbox" checked={cfg.on} onChange={(e) => set({ on: e.target.checked })} /> Toolbar dikhayein (neeche daayen kona, har page par)</label>
      <label htmlFor="agep" className="muted">MCP endpoint (khali = sirf copy, server ke baghair)</label>
      <input id="agep" value={cfg.endpoint} onChange={(e) => set({ endpoint: e.target.value.trim() })} placeholder="http://localhost:4747" />
      {!epOk && <p className="warnline">Sirf localhost endpoint chalega (jaise http://localhost:4747).</p>}
      <p className="muted">{cfg.on ? "Chalu ✓ — neeche daayen kone mein Agentation icon dabayein, phir kisi element par click." : "Band. Dev mode (npm run dev) mein yeh khud chalu hota hai."}</p>
      <h3>Agent se jorein (MCP)</h3>
      <Copy text="npx -y agentation-mcp server" />
      <Copy text={'npx add-mcp "npx -y agentation-mcp server"'} />
      <Copy text="npx agentation-mcp doctor" />
    </section>
  );
}

function HermesPanel() {
  const list = [["faheem-design", "chhoti, free models ke liye", "/skills/faheem-design"], ["hallmark", "poori design qawaid (MIT)", "/skills/hallmark"], ["ui-ux-pro-max", "design database (MIT)", "/skills/ui-ux-pro-max"], ["impeccable", "62 checks + commands (Apache-2.0)", "/skills/impeccable"]];
  return (
    <section className="card panel" data-skill-panel="hermes">
      <h3>Yeh 4 skills install hoti hain</h3>
      <div className="plist">{list.map(([n, d, h], i) => <Link key={n} href={h} className="pitem"><span className="led ok" /><div><b>{i + 1}/4 {n}</b><small>{d}</small></div></Link>)}</div>
      <p className="muted">Dashboard folder mein <code>HERMES-SKILLS.bat</code> double-click karein. Hermes na mile to saaf message aata hai.</p>
      <Copy text="HERMES-SKILLS.bat" />
    </section>
  );
}

function LinkPanel({ skill }) {
  const [info, setInfo] = useState("");
  useEffect(() => {
    if (skill.id === "tools-board") fetch("/api/tools").then((r) => r.json()).then((d) => setInfo(`${d.providers?.length || 0} brains abhi tayyar: ${(d.providers || []).map((p) => p.id).join(", ")}`)).catch(() => {});
    if (skill.id === "design-studio") fetch("/api/design?rules=impeccable").then((r) => r.json()).then((d) => setInfo(`Impeccable ${d.count} rules · engine ${d.available ? "tayyar ✓" : "nahi mila"}`)).catch(() => {});
  }, [skill.id]);
  return (
    <section className="card panel" data-skill-panel="link">
      <h3>Live</h3>
      {info && <p className="muted" data-live-info>{info}</p>}
      <Link className="linkbtn bigopen" href={skill.href}><Icon name={skill.icon} size={16} /> {skill.name} kholein</Link>
    </section>
  );
}

function PlaywrightPanel({ gallery = true }) {
  const [url, setUrl] = useState("http://localhost:3000/skills");
  const [html, setHtml] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const [avail, setAvail] = useState(null);
  useEffect(() => { fetch("/api/skills?id=playwright").then((r) => r.json()).then((d) => setAvail(d.playwright)).catch(() => {}); }, []);
  async function run(body) {
    setBusy(true); setRes(null);
    const d = await fetch("/api/skills", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: "playwright", action: "playwright", ...body }) }).then((r) => r.json()).catch((e) => ({ ok: false, error: e.message }));
    setBusy(false); setRes(d);
  }
  return (
    <>
      <section className="card panel" data-skill-panel="playwright">
        <h3>Live: Run Playwright check (asli browser)</h3>
        <p className="muted">{avail ? (avail.library ? `playwright-core ${avail.version} tayyar · browser: Edge/Chrome (khud dhoondta hai)` : "playwright-core nahi mila — dashboard folder mein npm install") : "Check ho raha…"}</p>
        <form className="toolsbar" onSubmit={(e) => { e.preventDefault(); if (url.trim()) run({ url }); }}>
          <label htmlFor="pwurl" className="sr">URL</label>
          <input id="pwurl" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://localhost:3000 ya https://…" />
          <button type="submit" disabled={busy}>{busy ? "Browser chal raha…" : "URL check karo"}</button>
        </form>
        <label htmlFor="pwhtml" className="sr">HTML</label>
        <textarea id="pwhtml" className="auditbox" rows={4} value={html} onChange={(e) => setHtml(e.target.value)} placeholder="Ya HTML paste karein" />
        <div className="toolsbar"><button type="button" disabled={busy || !html.trim()} onClick={() => run({ html })}>HTML check karo</button><button type="button" className="ghost" onClick={() => setHtml(SAMPLE)}>Misaal load karein</button></div>
        {res && (
          <div className="auditres" data-audit data-pw>
            {res.error && <p className="warnline">{res.error}</p>}
            {res.available !== false && !res.error && <p><b>{res.ok ? "Pass ✓" : "Masle mile ✗"}</b> · {res.browser} · {res.title ? `"${res.title}" · ` : ""}buttons {res.buttons}, dabaye {res.clicked} · {(res.ms / 1000).toFixed(1)}s</p>}
            {(res.errors || []).map((e, i) => <div key={"e" + i} className="tmsg sev-error">JS: {e}</div>)}
            {(res.failed || []).map((e, i) => <div key={"f" + i} className="tmsg sev-warning">Request: {e}</div>)}
            {res.screenshot && <a href={res.screenshot.url} target="_blank" rel="noreferrer"><img className="pwshot" src={res.screenshot.url} alt="Playwright screenshot" /></a>}
          </div>
        )}
      </section>
      {gallery && <Gallery title="Gallery · .html file ka Playwright check" onUse={(f) => run({ file: f.name })} useLabel="Playwright check" chatPrompt="Is screenshot mein page ke masle batao." />}
    </>
  );
}

function GraphifyPanel() {
  const [graphs, setGraphs] = useState(null);
  const [view, setView] = useState("");
  useEffect(() => { fetch("/api/skills?id=graphify").then((r) => r.json()).then((d) => { setGraphs(d.graphs || []); if (d.graphs?.[0]) setView(d.graphs[0].url); }).catch(() => setGraphs([])); }, []);
  return (
    <>
      <section className="card panel" data-skill-panel="graphify">
        <h3>Live: graph dekhein</h3>
        {graphs === null && <p className="muted">Projects dekh raha…</p>}
        {graphs?.length === 0 && <p className="muted">Agent Mode ke kisi project mein abhi graphify-out/graph.html nahi. Project folder mein agent se <code>/graphify .</code> chalayein, ya graph.html neeche Gallery mein upload karke "Graph dekhein" dabayein.</p>}
        {graphs?.length > 0 && <div className="chips left">{graphs.map((g) => <button key={g.project} type="button" className="chip" onClick={() => setView(g.url)}>{g.project}</button>)}{graphs.map((g) => g.report && <a key={g.project + "r"} className="chip" href={g.report} target="_blank" rel="noreferrer">{g.project}: GRAPH_REPORT.md</a>)}</div>}
        {view && <iframe className="graphframe" src={view} title="Graphify graph" sandbox="allow-scripts" />}
      </section>
      <Gallery title="Gallery · graph.html upload karein" onUse={(f) => setView(f.url + "&view=1")} useLabel="Graph dekhein" chatPrompt="Is file ko dekho." />
    </>
  );
}

function CompoundPanel() {
  const [project, setProject] = useState("vestire-store");
  const [d, setD] = useState(null);
  const [form, setForm] = useState({ step: "compound", title: "", text: "" });
  const [msg, setMsg] = useState("");
  const load = (pr = project) => fetch(`/api/skills?id=compound-engineering&project=${encodeURIComponent(pr)}`).then((r) => r.json()).then(setD).catch(() => {});
  useEffect(() => { load(); }, []); // eslint-disable-line
  async function add(e) {
    e.preventDefault();
    const r = await fetch("/api/skills", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: "compound-engineering", action: "add", project, ...form }) }).then((x) => x.json()).catch((er) => ({ ok: false, error: er.message }));
    setMsg(r.ok ? "Save ✓" : r.error); if (r.ok) setForm({ ...form, title: "", text: "" }); load();
  }
  async function del(id) { await fetch("/api/skills", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: "compound-engineering", action: "delete", noteId: id }) }); load(); }
  return (
    <section className="card panel" data-skill-panel="compound">
      <h3>Live: Compound notes (har project ki seekh)</h3>
      <div className="steps-row">{(d?.steps || ["brainstorm", "plan", "work", "review", "compound"]).map((st, i) => <span key={st} className="agent-chip">{i + 1}. {st}</span>)}</div>
      <form className="toolsbar" onSubmit={(e) => { e.preventDefault(); load(); }}>
        <label htmlFor="cproj" className="sr">Project</label>
        <input id="cproj" value={project} onChange={(e) => setProject(e.target.value)} placeholder="project ka naam" />
        <button type="submit" className="ghost">Kholo</button>
      </form>
      <form onSubmit={add} className="cform">
        <label htmlFor="cstep" className="sr">Step</label>
        <select id="cstep" value={form.step} onChange={(e) => setForm({ ...form, step: e.target.value })}>{(d?.steps || ["compound"]).map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <label htmlFor="ctitle" className="sr">Title</label>
        <input id="ctitle" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Seekh ka unwan (jaise: Cart button par focus style)" />
        <label htmlFor="ctext" className="sr">Seekh</label>
        <textarea id="ctext" rows={3} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="Kya hua, kyun, agli dafa kya karna hai" />
        <button type="submit" disabled={!form.title.trim() || !form.text.trim()}>Note save karo</button>
        {msg && <small className="muted">{msg}</small>}
      </form>
      <div className="auditres">{d?.notes?.map((n) => <div key={n.id} className="tmsg" data-note><b>{n.title}</b> <span className="agent-chip">{n.step}</span><div className="small">{n.text}</div><button type="button" className="ghost small" onClick={() => del(n.id)}>Mitao</button></div>)}</div>
      {d?.markdown && <><h3>Agent ke liye copy</h3><Copy text={d.markdown} /></>}
    </section>
  );
}

function TwentyFirstPanel() {
  const [d, setD] = useState(null);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch("/api/skills?id=21st-mcp").then((r) => r.json()).then(setD).catch(() => {}); }, []);
  async function test() { setBusy(true); const r = await fetch("/api/skills", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: "21st-mcp", action: "test" }) }).then((x) => x.json()).catch((e) => ({ ok: false, error: e.message })); setBusy(false); setRes(r); }
  const cfg = `{\n  "mcpServers": {\n    "21st": {\n      "type": "http",\n      "url": "https://21st.dev/api/mcp",\n      "headers": { "x-api-key": "<aap ki 21st key>" }\n    }\n  }\n}`;
  return (
    <section className="card panel" data-skill-panel="21st">
      <h3>Live: key</h3>
      <p className="muted" data-key-status>{d ? (d.key?.set ? `Key lagi hui: ${d.key.preview}` : "Key nahi lagi — Options → Brains & Keys → 'Tool keys' mein paste karein (free: 21st.dev/mcp).") : "…"}</p>
      <div className="toolsbar"><button type="button" onClick={test} disabled={busy}>{busy ? "Test ho raha…" : "Key test karo"}</button><Link className="linkbtn" href="/options">Keys kholein</Link></div>
      {res && <p className={res.ok ? "ok-text" : "warnline"} data-21st-test>{res.ok ? res.text : res.error}</p>}
      <h3>Manual MCP config</h3>
      <pre className="csscode">{cfg}</pre>
      <Copy text="npx @21st-dev/cli@latest init --client claude --write" />
    </section>
  );
}

function Panel({ skill }) {
  if (skill.panel === "uupm") return <UupmPanel skill={skill} />;
  if (skill.panel === "browser-tester") return <><CodePanel skill={skill} /><PlaywrightPanel gallery={false} /></>;
  if (["hallmark", "impeccable"].includes(skill.panel)) return <CodePanel skill={skill} />;
  if (skill.panel === "faheem-design") return <FaheemDesignPanel />;
  if (skill.panel === "agentation") return <AgentationPanel />;
  if (skill.panel === "hermes") return <HermesPanel />;
  if (skill.panel === "playwright") return <PlaywrightPanel />;
  if (skill.panel === "graphify") return <GraphifyPanel />;
  if (skill.panel === "compound") return <CompoundPanel />;
  if (skill.panel === "21st") return <TwentyFirstPanel />;
  return <LinkPanel skill={skill} />;
}

export default function SkillView({ skill }) {
  return (
    <main className="optpage">
      <Background />
      <header className="topbar">
        <Link href="/skills" className="icon-btn" title="Saari skills" aria-label="Saari skills"><Icon name="back" /></Link>
        <div className="brand"><Icon name={skill.icon} /> {skill.name}</div>
        <div className="top-actions"><Link href="/gallery" className="icon-btn" title="Gallery" aria-label="Gallery"><Icon name="image" /></Link><Link href="/" className="icon-btn" title="Chat" aria-label="Chat"><Icon name="chat" /></Link><ThemeBalls /></div>
      </header>
      <div className="skillwrap">
        <div className="skillmain">
          <section className="card panel">
            <span className="agent-chip skilltag">{skill.tag}</span>
            <h2 className="skillh">{skill.name}</h2>
            <p>{skill.summary}</p>
          </section>
          <Panel skill={skill} />
        </div>
        <aside className="skillside card panel" aria-label="Kaise kaam karta hai aur Setup">
          <h3>Kaise kaam karta hai</h3>
          <ol className="steps">{skill.how.map((s, i) => <li key={i}>{s}</li>)}</ol>
          <h3>Setup</h3>
          <ol className="steps">{skill.setup.map((s, i) => <li key={i}>{s}</li>)}</ol>
          {skill.commands.length > 0 && <><h3>Commands</h3>{skill.commands.map((c) => <Copy key={c} text={c} />)}</>}
          <h3>Hermes</h3>
          <p className="muted">Saari design skills ek dafa mein: <code>HERMES-SKILLS.bat</code> <Link href="/skills/hermes-installer">(tafseel)</Link></p>
          <h3>License</h3>
          <p className="muted">{skill.license}</p>
          {skill.files?.length > 0 && <p className="muted small">Files: {skill.files.join(", ")}</p>}
          {skill.links?.length > 0 && <div className="chips left">{skill.links.map(([l, h]) => (h.startsWith("/") ? <Link key={h} className="chip" href={h}>{l}</Link> : <a key={h} className="chip" href={h} target="_blank" rel="noreferrer">{l}</a>))}</div>}
        </aside>
      </div>
    </main>
  );
}
