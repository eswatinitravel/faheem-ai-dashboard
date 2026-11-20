"use client";
import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Icon from "../components/Icon";
import Background from "../components/Background";
import ThemeBalls from "../components/ThemeBalls";

// v3.17 Workflows: har kaam ki timeline, ijazat (Approve/Reject), audit log, schedules, brains ki tarteeb, Pause All, export.
const TABS = [["jobs", "Kaam"], ["approvals", "Ijazat"], ["schedules", "Schedule"], ["brains", "Brains ki tarteeb"], ["audit", "Audit log"]];
const ROLE_NAME = { coder: "Code", web: "Website", uiux: "UI/UX", writer: "Urdu & Content", business: "Business", travel: "Travel", research: "Research", general: "General" };
const STATUS = { queued: "line mein", running: "chal raha", waiting_for_approval: "ijazat ka intezar", retrying: "dobara koshish", completed: "mukammal", failed: "fail", cancelled: "cancel", dead_letter: "fail (list)", pending: "intezar", approved: "manzoor", rejected: "na-manzoor", used: "istemal ho gayi", expired: "expire", active: "chalu", paused: "ruka", };
const tone = (s) => (["completed", "approved", "used", "active"].includes(s) ? "ok" : ["dead_letter", "failed", "rejected", "expired"].includes(s) ? "bad" : ["running", "retrying", "pending", "waiting_for_approval"].includes(s) ? "run" : "");
const when = (t) => (t ? new Date(t).toLocaleString() : "—");

export default function Workflows() {
  const [d, setD] = useState(null);
  const [tab, setTab] = useState("jobs");
  const [open, setOpen] = useState(null);
  const [msg, setMsg] = useState("");
  const [ask, setAsk] = useState({ prompt: "", role: "general" });
  const [sch, setSch] = useState({ prompt: "", every: "daily@09:00", kind: "prompt" });

  const load = useCallback(() => fetch("/api/ops", { cache: "no-store" }).then((r) => r.json()).then(setD).catch((e) => setMsg(e.message)), []);
  useEffect(() => { load(); const t = setInterval(load, 3000); return () => clearInterval(t); }, [load]);

  async function act(body) {
    setMsg("");
    const r = await fetch("/api/ops", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((x) => x.json()).catch((e) => ({ ok: false, error: e.message }));
    if (!r.ok) setMsg(r.error || "Ghalti");
    load();
    return r;
  }
  function move(role, order, i, dir) {
    const ids = order.map((o) => o.id).filter((x) => x !== "ollama");
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    act({ action: "brain_order", role, order: ids });
  }

  const pend = d?.approvals?.filter((a) => a.status === "pending").length || 0;
  return (
    <main className="optpage">
      <Background />
      <header className="topbar">
        <Link href="/" className="icon-btn" title="Wapas chat" aria-label="Wapas chat"><Icon name="back" /></Link>
        <div className="brand"><img src="/icon.png" alt="" className="logo" /> Workflows · kaam, ijazat aur brains</div>
        <div className="top-actions">
          <a className="icon-btn" href="/api/ops?export=1" title="Saara data export (keys ke baghair)" aria-label="Export"><Icon name="download" /></a>
          <ThemeBalls />
        </div>
      </header>
      <div className="toolspage wf">
        <div className="toolsbar">
          {d?.paused
            ? <button onClick={() => act({ action: "resume" })}><Icon name="play" size={14} /> Resume — automation dobara chalu</button>
            : <button className="danger" onClick={() => act({ action: "pause" })}><Icon name="pause" size={14} /> Pause All</button>}
          <span className="muted">{d ? `${d.paused ? "Sab ruka hua hai · " : ""}${Object.entries(d.counts || {}).map(([k, v]) => `${STATUS[k] || k}: ${v}`).join(" · ") || "Abhi koi kaam nahi"}` : "Load ho raha hai…"}</span>
          {msg && <span className="tstat bad">{msg}</span>}
        </div>
        <div className="pagetabs" role="tablist">
          {TABS.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{label}{id === "approvals" && pend ? ` (${pend})` : ""}</button>)}
        </div>

        {tab === "jobs" && <section className="card panel">
          <form className="btnrow" onSubmit={(e) => { e.preventDefault(); act({ action: "ask", ...ask }).then((r) => r.ok && setAsk({ ...ask, prompt: "" })); }}>
            <input value={ask.prompt} onChange={(e) => setAsk({ ...ask, prompt: e.target.value })} placeholder="Background mein kaam do (jawab yahan aur notifications mein)" style={{ flex: 1 }} />
            <select value={ask.role} onChange={(e) => setAsk({ ...ask, role: e.target.value })}>{Object.entries(ROLE_NAME).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <button disabled={!ask.prompt.trim()}><Icon name="send" size={14} /> Line mein daalo</button>
          </form>
          {!d?.jobs?.length && <p className="muted">Abhi koi kaam nahi. Har kaam pehle save hota hai, fail ho to 1s, 2s, 5s, 10s, 30s baad 5 dafa tak dobara.</p>}
          <table className="wftable"><tbody>
            {d?.jobs?.map((j) => <Fragment key={j.id}>
              <tr onClick={() => setOpen(open === j.id ? null : j.id)} style={{ cursor: "pointer" }}>
                <td><span className={"tstat " + tone(j.status)}>{STATUS[j.status] || j.status}</span></td>
                <td>{j.title}</td><td className="muted">{j.attempts}/{j.maxAttempts}</td><td className="muted">{when(j.createdAt)}</td>
                <td className="btnrow">
                  {["dead_letter", "failed", "cancelled"].includes(j.status) && <button onClick={(e) => { e.stopPropagation(); act({ action: "retry", id: j.id }); }}>Retry</button>}
                  {!["completed", "cancelled"].includes(j.status) && <button onClick={(e) => { e.stopPropagation(); act({ action: "cancel", id: j.id }); }}>Cancel</button>}
                </td>
              </tr>
              {open === j.id && <tr><td colSpan={5}>
                <ol className="wfsteps">{j.steps.map((s, i) => <li key={i}><span className="muted">{new Date(s.at).toLocaleTimeString()}</span> {s.text}</li>)}</ol>
                {j.error && <p className="tstat bad">{j.error}</p>}
                {j.result && <pre className="wfresult">{typeof j.result === "string" ? j.result : j.result.text ? `${j.result.brain}:\n${j.result.text}` : JSON.stringify(j.result, null, 2)}</pre>}
              </td></tr>}
            </Fragment>)}
          </tbody></table>
        </section>}

        {tab === "approvals" && <section className="card panel">
          <p className="muted">Har ijazat exact kaam aur exact arguments par bandhi hai, 10 minute mein expire, aur sirf ek dafa chalti hai. Kuch badla to nayi ijazat.</p>
          {!d?.approvals?.length && <p className="muted">Koi ijazat nahi maangi gayi.</p>}
          {d?.approvals?.map((a) => <div key={a.id} className={"wfcard risk-" + a.risk}>
            <div className="btnrow"><b>{a.tool}</b><span className={"tstat " + tone(a.status)}>{STATUS[a.status] || a.status}</span><span className="chip">risk: {a.risk}</span><span className="muted">{a.source} · {when(a.createdAt)} · expire {when(a.expiresAt)}</span></div>
            {a.reason && <p>{a.reason}</p>}
            <pre className="wfresult">{JSON.stringify(a.args, null, 2)}</pre>
            {a.status === "pending" && <div className="btnrow">
              <button onClick={() => act({ action: "approve", id: a.id })}><Icon name="check" size={14} /> Approve</button>
              <button className="danger" onClick={() => act({ action: "reject", id: a.id })}><Icon name="x" size={14} /> Reject</button>
            </div>}
          </div>)}
        </section>}

        {tab === "schedules" && <section className="card panel">
          <form className="btnrow" onSubmit={(e) => { e.preventDefault(); act({ action: "schedule", ...sch }).then((r) => r.ok && setSch({ ...sch, prompt: "" })); }}>
            <input value={sch.prompt} onChange={(e) => setSch({ ...sch, prompt: e.target.value })} placeholder="Misaal: aaj ke kaam ki list banao" style={{ flex: 1 }} />
            <select value={sch.kind} onChange={(e) => setSch({ ...sch, kind: e.target.value })}><option value="prompt">AI kaam</option><option value="reminder">Yaad-dihani</option></select>
            <input value={sch.every} onChange={(e) => setSch({ ...sch, every: e.target.value })} title='"15m", "2h", "daily@09:00" ya "once"' style={{ width: 130 }} />
            <button disabled={!sch.prompt.trim()}><Icon name="clock" size={14} /> Schedule</button>
          </form>
          {!d?.schedules?.length && <p className="muted">Koi schedule nahi. Waqt: "15m", "2h", "daily@09:00" (laptop ka waqt) ya "once" (1 minute baad).</p>}
          <table className="wftable"><tbody>{d?.schedules?.map((s) => <tr key={s.id}>
            <td><span className={"tstat " + tone(s.status)}>{STATUS[s.status] || s.status}</span></td>
            <td>{s.title}<br /><small className="muted">{s.kind === "reminder" ? "Yaad-dihani" : "AI kaam"} · {s.every} · agla {when(s.nextRunAt)} · pichla {when(s.lastRunAt)} · {s.history?.length || 0} dafa chala</small></td>
            <td className="btnrow">
              <button onClick={() => act({ action: "run_now", id: s.id })}><Icon name="play" size={14} /> Run Now</button>
              <button onClick={() => act({ action: "schedule_status", id: s.id, status: s.status === "paused" ? "active" : "paused" })}>{s.status === "paused" ? "Chalu" : "Roko"}</button>
              <button className="danger" onClick={() => act({ action: "schedule_status", id: s.id, status: "deleted" })} aria-label="Hatao"><Icon name="trash" size={14} /></button>
            </td>
          </tr>)}</tbody></table>
          {!!d?.notifications?.length && <><h3>Taaza natije</h3><ul className="wfsteps">{d.notifications.slice(0, 10).map((n, i) => <li key={i}><span className="muted">{when(n.at)}</span> <b>{n.title}</b>{n.brain ? ` (${n.brain})` : ""}: {String(n.text).slice(0, 300)}</li>)}</ul></>}
        </section>}

        {tab === "brains" && <section className="card panel">
          <p className="muted">Har kaam ke liye key wale brains is tarteeb mein chalte hain; limit ya ghalti par agla. Bina-key brains, live list, AI Horde aur Ollama hamesha aakhir mein. Hara = key lagi hai.</p>
          <div className="wfroles">{d?.roles?.map((r) => <div key={r.id} className="wfcard">
            <div className="btnrow"><b>{ROLE_NAME[r.id] || r.id}</b>{r.custom && <span className="chip">aap ka order</span>}{r.custom && <button onClick={() => act({ action: "brain_order", role: r.id, order: [] })}>Default</button>}</div>
            <small className="muted">{r.why}</small>
            <ol className="wforder">{r.order.map((o, i) => <li key={o.id} className={o.on ? "on" : ""}>
              <span>{o.id}</span>
              {o.id !== "ollama" && <span className="btnrow"><button aria-label="Oopar" onClick={() => move(r.id, r.order, i, -1)}>↑</button><button aria-label="Neeche" onClick={() => move(r.id, r.order, i, 1)}>↓</button></span>}
            </li>)}</ol>
          </div>)}</div>
        </section>}

        {tab === "audit" && <section className="card panel">
          {!d?.audit?.length && <p className="muted">Abhi koi record nahi.</p>}
          <table className="wftable"><tbody>{d?.audit?.map((a, i) => <tr key={i}><td className="muted">{when(a.at)}</td><td><span className="chip">{a.event}</span></td><td>{a.summary}</td></tr>)}</tbody></table>
        </section>}
      </div>
    </main>
  );
}
