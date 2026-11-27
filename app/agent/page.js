"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "../components/Icon";
import Background from "../components/Background";
import VersionBadge from "../components/VersionBadge";
import { prepareFiles } from "../../lib/attach";
import { loadPrefs, savePrefs } from "../../lib/prefs";
import ZipCard, { ZipHistory } from "../components/ZipCard";
import TeamChat from "../components/TeamChat";

const ICON = { list_files: <Icon name="folder" size={14} />, read_file: <Icon name="file" size={14} />, write_file: <Icon name="edit" size={14} />, edit_file: <Icon name="edit" size={14} />, delete_file: <Icon name="trash" size={14} />, search: <Icon name="search" size={14} />, run_command: <Icon name="play" size={14} />, check: <Icon name="dot" size={14} />, test: <Icon name="dot" size={14} />, web_fetch: <Icon name="globe" size={14} />, image_url: <Icon name="palette" size={14} /> };

// Agent Mode — Cursor jaisa: baayen files, beech mein agent ka kaam, daayen live preview / code.
export default function AgentPage() {
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState("");
  const [files, setFiles] = useState([]);
  const [open, setOpen] = useState("");
  const [code, setCode] = useState("");
  const [tab, setTab] = useState("preview");
  const [events, setEvents] = useState([]);
  const [todo, setTodo] = useState([]);
  const [task, setTask] = useState("");
  const [busy, setBusy] = useState(false);
  const [imgs, setImgs] = useState([]);
  const [stamp, setStamp] = useState(Date.now());
  const [team, setTeam] = useState(false); // v3.13 Team mode (default band)
  const [planFirst, setPlanFirst] = useState(true); // v3.33 Plan pehle (default On)
  const [zipCard, setZipCard] = useState(null); // v3.16 ZIP button ka card
  const [zipBusy, setZipBusy] = useState(false);
  const [pane, setPane] = useState("agent"); // v3.27: "agent" | "team" (AI Team group chat)
  const ctrlRef = useRef(null);
  const endRef = useRef(null);
  const fileRef = useRef(null);

  const loadProjects = useCallback(async () => {
    const d = await fetch("/api/agent/projects").then((r) => r.json()).catch(() => ({ projects: [] }));
    setProjects(d.projects || []);
    return d.projects || [];
  }, []);
  const loadFiles = useCallback(async (p = project) => {
    if (!p) return;
    const d = await fetch(`/api/agent/files?project=${encodeURIComponent(p)}`).then((r) => r.json()).catch(() => ({}));
    setFiles(d.files || []);
  }, [project]);
  const openFile = useCallback(async (path, p = project) => {
    setOpen(path); setTab("code");
    const d = await fetch(`/api/agent/files?project=${encodeURIComponent(p)}&path=${encodeURIComponent(path)}`).then((r) => r.json()).catch(() => ({}));
    setCode(d.content ?? d.error ?? "");
  }, [project]);

  useEffect(() => {
    loadProjects().then((ps) => {
      const last = localStorage.getItem("faheem-agent-project");
      const pick = (last && ps.find((x) => x.name === last)?.name) || ps[0]?.name || "vestire-collection";
      setProject(pick);
    });
  }, [loadProjects]);
  useEffect(() => {
    if (!project) return;
    localStorage.setItem("faheem-agent-project", project);
    setEvents([]); setTodo([]); setOpen(""); setCode("");
    loadFiles(project);
  }, [project, loadFiles]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [events]);
  useEffect(() => { setTeam(!!loadPrefs().teamMode); const f = (e) => setTeam(!!e.detail?.teamMode); window.addEventListener("faheem-prefs", f); return () => window.removeEventListener("faheem-prefs", f); }, []);
  useEffect(() => { try { if (localStorage.getItem("faheem-agent-pane") === "team") setPane("team"); } catch {} }, []);
  useEffect(() => { try { if (localStorage.getItem("faheem-agent-planfirst") === "0") setPlanFirst(false); } catch {} }, []);
  function togglePlan(v) { setPlanFirst(v); try { localStorage.setItem("faheem-agent-planfirst", v ? "1" : "0"); } catch {} }

  // v3.33: pehle plan, aap ki ijazat ke baad kaam.
  async function askPlan(t) {
    setBusy(true); setTask("");
    setEvents((e) => [...e, { type: "user", text: t }, { type: "thought", text: "Plan bana raha hoon..." }]);
    try {
      const d = await fetch("/api/agent/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project, task: t }) }).then((r) => r.json());
      if (d.error) throw new Error(d.error);
      setEvents((e) => [...e, { type: "plan", task: t, plan: d.plan, brain: d.brain }]);
    } catch (err) { setEvents((e) => [...e, { type: "error", text: err.message }]); }
    setBusy(false);
  }
  function approvePlan(i, edited) {
    const ev = events[i]; if (!ev) return;
    setEvents((e) => e.map((x, k) => (k === i ? { ...x, approved: true } : x)));
    run(`${ev.task}\n\nApproved plan (follow it step by step):\n${edited}`, { approved: true });
  }
  function pickPane(v) { setPane(v); try { localStorage.setItem("faheem-agent-pane", v); } catch {} }
  function toggleTeam(v) { setTeam(v); savePrefs({ ...loadPrefs(), teamMode: v }); }

  async function newProject() {
    const name = prompt("Naye project ka naam (jaise vestire-store):");
    if (!name) return;
    const d = await fetch("/api/agent/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }).then((r) => r.json());
    await loadProjects(); setProject(d.name);
  }

  async function run(text, opts = {}) {
    const t = (typeof text === "string" ? text : task).trim();
    if (!t || busy || !project) return;
    if (planFirst && !team && !opts.approved && !imgs.length) return askPlan(t);
    setBusy(true); setTask("");
    setEvents((e) => [...e, { type: "user", text: t, imgs: imgs.map((i) => i.dataUrl) }]);
    const sendImgs = imgs; setImgs([]);
    const ctrl = new AbortController(); ctrlRef.current = ctrl;
    try {
      const res = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project, task: t, team, images: sendImgs.map((i) => ({ dataUrl: i.dataUrl })) }), signal: ctrl.signal });
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop();
        for (const l of lines) {
          if (!l.trim()) continue;
          let ev; try { ev = JSON.parse(l); } catch { continue; }
          if (ev.type === "todo") { setTodo(ev.items); continue; }
          if (ev.type === "result") { setEvents((e) => e.map((x) => (x.type === "tool" && x.id === ev.id ? { ...x, ok: ev.ok, out: ev.text } : x))); continue; }
          if (ev.type === "file") { loadFiles(); setStamp(Date.now()); if (/\.html?$/i.test(ev.path)) setTab("preview"); continue; }
          setEvents((e) => [...e, ev]);
        }
      }
    } catch (err) {
      setEvents((e) => [...e, { type: "error", text: err.name === "AbortError" ? "Aap ne roka." : err.message }]);
    }
    setBusy(false); loadFiles(); setStamp(Date.now());
  }

  // v3.16: is project ka ZIP (README + INSTALL.bat + setup.sh + .env.example ke sath; tests bina AI).
  async function makeZip() {
    if (!project) return;
    setZipBusy(true); setZipCard(null);
    try {
      const d = await fetch("/api/agent/zip", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "package", project }) }).then((r) => r.json());
      if (d.ok) { setZipCard(d.card); window.dispatchEvent(new Event("faheem-zip-changed")); } else alert(d.error || "ZIP nahi bana.");
    } catch (e) { alert(e.message); }
    setZipBusy(false);
  }

  async function undo() {
    const d = await fetch("/api/agent/undo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project }) }).then((r) => r.json());
    setEvents((e) => [...e, { type: "thought", text: "" + d.message }]);
    loadFiles(); setStamp(Date.now()); if (open) openFile(open);
  }

  async function addImages(list) {
    const got = (await prepareFiles(list)).filter((f) => f.kind === "image");
    setImgs((x) => [...x, ...got].slice(0, 3));
  }

  const htmlFiles = files.filter((f) => !f.dir && /\.html?$/i.test(f.path));
  const previewPath = open && /\.html?$/i.test(open) ? open : htmlFiles.find((f) => /(^|\/)index\.html$/i.test(f.path))?.path || htmlFiles[0]?.path || "index.html";
  const previewUrl = `/api/agent/preview/${encodeURIComponent(project)}/${previewPath}?t=${stamp}`;

  return (
    <main className="agentpage">
      <Background />
      <header className="topbar">
        <div className="brand"><Link href="/" className="icon-btn" title="Chat" aria-label="Chat"><Icon name="back" /></Link> <Icon name="bot" /> Agent Mode <span className={"stat " + (busy ? "thinking" : "idle")} /></div>
        <div className="top-actions">
          <select value={project} onChange={(e) => setProject(e.target.value)} className="ag-select" disabled={busy}>
            {!projects.find((p) => p.name === project) && project && <option value={project}>{project}</option>}
            {projects.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
          </select>
          <label className="teamtoggle" title="Team mode: Designer → Coder → Tester → Reviewer (sirf bare kaam: website/store). Brains limit par hon to khud single agent."><input type="checkbox" checked={team} onChange={(e) => toggleTeam(e.target.checked)} disabled={busy} data-team-toggle /><Icon name="users" size={15} /> Team</label>
          <label className="teamtoggle" title="Plan pehle: Agent pehle plan dikhata hai, aap Approve karein to kaam shuru."><input type="checkbox" checked={planFirst} onChange={(e) => togglePlan(e.target.checked)} disabled={busy} data-plan-toggle /><Icon name="check" size={15} /> Plan pehle</label>
          <button className="icon-btn" title="Naya project" aria-label="Naya project" onClick={newProject} disabled={busy}><Icon name="plus" /></button>
          <button className="icon-btn" title="Aakhri run wapas (Undo)" aria-label="Undo" onClick={undo} disabled={busy}><Icon name="undo" /></button>
          <button className="icon-btn agentlink" title="Is project ka ZIP (INSTALL.bat + README ke sath)" aria-label="Project ZIP" onClick={makeZip} disabled={busy || zipBusy || !project} data-agent-zip><Icon name="box" size={15} /> {zipBusy ? "ZIP..." : "ZIP"}</button>
          <Link className="icon-btn" href="/options" title="Options" aria-label="Options"><Icon name="more" /></Link>
        </div>
      </header>

      <div className="ag-grid">
        <aside className="ag-files panel">
          <div className="ag-h">Files</div>
          {files.length === 0 && <small className="muted">Khali project. Neeche kaam likhein.</small>}
          {files.map((f) => (
            <button key={f.path} className={"ag-file" + (f.dir ? " dir" : "") + (open === f.path ? " on" : "")} style={{ paddingLeft: 8 + (f.path.split("/").length - 1) * 12 }} onClick={() => !f.dir && openFile(f.path)} disabled={f.dir}>
              {f.dir ? <Icon name="folder" size={14} /> : <Icon name="file" size={14} />} {f.path.split("/").pop()}
            </button>
          ))}
          {todo.length > 0 && (<>
            <div className="ag-h" style={{ marginTop: 12 }}>{team ? "Team board" : "Plan"}</div>
            {todo.map((t, i) => <div key={i} className={"ag-todo" + (/^\s*\[x\]/i.test(t) ? " done" : "")}>{t.replace(/^\s*\[[ x]\]\s*/i, /^\s*\[x\]/i.test(t) ? "" : "○ ")}</div>)}
          </>)}
          {zipCard && <ZipCard card={zipCard} />}
          <ZipHistory />
        </aside>

        <section className="ag-chat panel">
          <div className="ws-tabs ag-panes" role="tablist" aria-label="Agent ya AI Team">
            <button role="tab" aria-selected={pane === "agent"} className={pane === "agent" ? "on" : ""} onClick={() => pickPane("agent")}><Icon name="bot" size={13} /> Agent</button>
            <button role="tab" aria-selected={pane === "team"} className={pane === "team" ? "on" : ""} onClick={() => pickPane("team")} data-teamchat-tab><Icon name="users" size={13} /> AI Team chat</button>
          </div>
          {pane === "team" ? <TeamChat project={project} onFiles={() => { loadFiles(); setStamp(Date.now()); }} /> : <>
          <div className="ag-log">
            {events.length === 0 && (
              <div className="hello small">
                <h2>Kya banayein?</h2>
                <p className="muted">Agent khud plan banata hai, files likhta hai, test karta hai aur ghaltiyan theek karta hai — jaise Cursor.</p>
                {team && <p className="muted small-note" data-team-note>Team mode on: bara kaam Designer → Coder → Tester → Reviewer mein bantega (budget guard ke sath). Chhota kaam single agent hi karega.</p>}
                <div className="chips">
                  {["Vestire Collection ka poora online store banao: Home, Shop, Product, Cart, Checkout, About, Contact", "Is project mein cart ka button aur behtar karo aur mobile menu theek karo", "Ek portfolio website banao Faheem Ahmed ke liye"].map((c) => <button key={c} onClick={() => setTask(c)}>{c}</button>)}
                </div>
              </div>
            )}
            {events.map((e, i) => {
              if (e.type === "user") return <div key={i} className="ag-user">{e.text}{e.imgs?.length > 0 && <div className="ag-imgs">{e.imgs.map((u, k) => <img key={k} src={u} alt="" />)}</div>}</div>;
              if (e.type === "plan") return <PlanCard key={i} ev={e} busy={busy} onApprove={(txt) => approvePlan(i, txt)} onCancel={() => setEvents((x) => x.map((y, k) => (k === i ? { ...y, approved: "cancel" } : y)))} />;
              if (e.type === "thought") return <div key={i} className="ag-thought"><Icon name="chat" size={14} /> {e.text}</div>;
              if (e.type === "brain") return <div key={i} className="ag-brain">{e.text}</div>;
              if (e.type === "handoff" || e.type === "team") return <div key={i} className="ag-handoff">{e.text}</div>;
              if (e.type === "tool") return (
                <details key={i} className={"ag-tool " + (e.ok === undefined ? "run" : e.ok ? "ok" : "bad")}>
                  <summary>{ICON[e.name] || <Icon name="tool" size={14} />} <b>{e.name}</b> <span>{e.label}</span> {e.ok === undefined ? "…" : e.ok ? <Icon name="check" size={14} /> : <Icon name="alert" size={14} />}</summary>
                  {e.out && <pre>{e.out}</pre>}
                </details>
              );
              if (e.type === "done") return <div key={i} className="ag-done">{e.partial ? <Icon name="pause" size={14} /> : <Icon name="check" size={14} />} {e.summary}{e.files?.length > 0 && <small> · Files: {e.files.join(", ")}</small>}</div>;
              if (e.type === "error") return <div key={i} className="ag-err"><Icon name="alert" size={14} /> {e.text}</div>;
              return null;
            })}
            {busy && <div className="ag-brain"><Icon name="clock" size={14} /> Agent kaam kar raha hai…</div>}
            <div ref={endRef} />
          </div>
          {imgs.length > 0 && <div className="ag-imgs pending">{imgs.map((im, k) => <span key={k}><img src={im.dataUrl} alt="" /><button onClick={() => setImgs(imgs.filter((_, j) => j !== k))} aria-label="Hatao"><Icon name="x" size={12} /></button></span>)}</div>}
          <div className="ag-input" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addImages(e.dataTransfer.files); }}>
            <button className="icon-btn" title="Picture lagayein (design reference)" aria-label="Picture lagayein" onClick={() => fileRef.current?.click()} disabled={busy}><Icon name="clip" /></button>
            <input ref={fileRef} aria-label="File chunein" type="file" accept="image/*" multiple hidden onChange={(e) => { addImages(e.target.files); e.target.value = ""; }} />
            <textarea value={task} placeholder={busy ? "Agent kaam kar raha hai…" : "Kaam likhein… (Enter = chalao, Shift+Enter = nayi line)"} onChange={(e) => setTask(e.target.value)}
              onPaste={(e) => { const f = [...e.clipboardData.files]; if (f.length) { e.preventDefault(); addImages(f); } }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(); } }} disabled={busy} rows={2} />
            {busy ? <button className="stopbtn" onClick={() => ctrlRef.current?.abort()}><Icon name="pause" size={13} /> Roko</button> : <button onClick={() => run()} disabled={!task.trim()}>Chalao <Icon name="send" size={13} /></button>}
          </div>
          </>}
        </section>

        <section className="ag-view panel">
          <div className="ws-tabs">
            <button className={tab === "preview" ? "on" : ""} onClick={() => setTab("preview")}>Live Preview</button>
            <button className={tab === "code" ? "on" : ""} onClick={() => setTab("code")}>Code{open ? ` · ${open.split("/").pop()}` : ""}</button>
            {htmlFiles.length > 0 && project && <a className="ag-open" href={previewUrl} target="_blank" rel="noreferrer" title="Nayi window mein kholein"><Icon name="external" size={14} /> </a>}
          </div>
          {tab === "preview" && (!project || htmlFiles.length === 0)
            ? <div className="ag-code muted" style={{ display: "grid", placeItems: "center", textAlign: "center" }}>Abhi koi HTML file nahi. Agent website banaye ga to preview yahan dikhe ga.</div>
            : tab === "preview"
            ? <iframe key={previewUrl} className="ag-frame" src={previewUrl} title="preview" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals" />
            : <pre className="ag-code">{open ? code : "Baayen se koi file chunein."}</pre>}
        </section>
      </div>
      <VersionBadge />
    </main>
  );
}


// v3.33 Plan card: plan badlein, phir Approve.
function PlanCard({ ev, busy, onApprove, onCancel }) {
  const [txt, setTxt] = useState(ev.plan);
  const done = ev.approved === true, cancelled = ev.approved === "cancel";
  return (
    <div className="ag-thought" style={{ display: "grid", gap: 6 }} data-plan-card>
      <b>Plan{ev.brain ? ` · ${ev.brain}` : ""}{done ? " · Approved" : cancelled ? " · Cancel" : ""}</b>
      <textarea value={txt} onChange={(e) => setTxt(e.target.value)} rows={Math.min(12, txt.split("\n").length + 1)} disabled={done || cancelled} style={{ width: "100%", font: "inherit", background: "transparent", color: "inherit", border: "1px solid var(--line, #334)", borderRadius: 8, padding: 8 }} />
      {!done && !cancelled && <div style={{ display: "flex", gap: 8 }}><button className="btn primary" disabled={busy} onClick={() => onApprove(txt)}>Approve aur chalao</button><button className="btn" disabled={busy} onClick={onCancel}>Cancel</button></div>}
    </div>
  );
}
