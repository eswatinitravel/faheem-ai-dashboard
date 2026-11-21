"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Icon from "./Icon";
import Workspace from "./Workspace";

// v3.18 Front dashboard (Arena jaisa): daayen hissa hamesha nazar aata hai.
// Tabs: Live kaam (preview + agents ki baat-cheet), Brains (is kaam ki line + live lights), Ijazat. Oopar Pause All.
const ROLE_NAME = { coder: "Code", web: "Website", uiux: "UI/UX", writer: "Urdu & Content", business: "Business", travel: "Travel", research: "Research", general: "General" };
const STATE = { wait: "line mein", trying: "kaam kar raha", ok: "jawab diya", fail: "ruk gaya, agla", cooling: "aaraam par" };

export default function LivePanel({ job, log, lineup, onClose, notify }) {
  const [tab, setTab] = useState("live");
  const [ops, setOps] = useState(null);
  const [roleOpen, setRoleOpen] = useState(null);

  const load = useCallback(async () => {
    try { const r = await fetch("/api/ops", { cache: "no-store" }).then((x) => x.json()); if (r.ok) setOps(r); } catch {}
  }, []);
  useEffect(() => { load(); const id = setInterval(load, 6000); return () => clearInterval(id); }, [load]);
  // Kaam shuru ho to Brains tab khud khulay, jawab aaye to Live par wapas.
  // v3.20 Hook: koi kaam khatam/ruk jaye to desktop notification (TUIOS hooks jaisa).
  const [seen, setSeen] = useState(null);
  useEffect(() => {
    const jobs = ops?.jobs; if (!jobs) return;
    const now = Object.fromEntries(jobs.map((j) => [j.id, j.status]));
    if (seen && typeof Notification !== "undefined") {
      for (const j of jobs) {
        const was = seen[j.id];
        if (was && was !== j.status && ["completed", "dead_letter", "waiting_for_approval"].includes(j.status)) {
          const t = { completed: "Kaam ho gaya", dead_letter: "Kaam ruk gaya", waiting_for_approval: "Ijazat chahiye" }[j.status];
          if (Notification.permission === "granted") { try { new Notification(`Faheem AI: ${t}`, { body: j.title }); } catch {} }
          else if (Notification.permission === "default") Notification.requestPermission().catch(() => {});
        }
      }
    }
    setSeen(now);
  }, [ops]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (job?.busy) setTab("brains"); else if (job?.reply) setTab("live"); }, [job?.busy, job?.reply]);

  async function act(body) {
    try {
      const r = await fetch("/api/ops", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((x) => x.json());
      if (!r.ok) notify?.(r.error || "Nahi ho saka"); await load(); return r;
    } catch (e) { notify?.(e.message); }
  }
  async function move(role, order, i, dir) {
    const ids = order.map((b) => b.id); const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await act({ action: "brain_order", role, order: ids });
  }

  const paused = !!ops?.paused;
  const pend = (ops?.approvals || []).filter((a) => a.status === "pending");
  // v3.20 Agent Inbox (TUIOS se idea): har kaam ki haalat ek jagah; ruka hua ya ijazat wala oopar.
  const INBOX_ST = { waiting_for_approval: "ijazat chahiye", dead_letter: "ruk gaya", retrying: "dobara koshish", running: "chal raha", queued: "line mein", completed: "ho gaya", cancelled: "cancel" };
  const RANK = { waiting_for_approval: 0, dead_letter: 1, retrying: 2, running: 3, queued: 4, completed: 5, cancelled: 6 };
  const inbox = [...(ops?.jobs || [])].sort((a, b) => (RANK[a.status] ?? 9) - (RANK[b.status] ?? 9) || String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 30);
  const attn = (ops?.jobs || []).filter((j) => ["waiting_for_approval", "dead_letter"].includes(j.status)).length;
  const running = (ops?.jobs || []).filter((j) => ["running", "queued", "retrying", "waiting_for_approval"].includes(j.status)).length;

  return (
    <aside className="livepanel panel" data-livepanel>
      <div className="lp-head">
        <span className="live-badge"><i /> LIVE</span>
        <b className="lp-title">{job?.agent ? job.agent.name : "Brains ka kaam"}</b>
        <button type="button" className={"lp-pause" + (paused ? " on" : "")} onClick={() => act({ action: paused ? "resume" : "pause" })} data-pause-all title={paused ? "Sab dobara chalu" : "Agent, queue aur schedules foran roko"}>
          <Icon name={paused ? "play" : "x"} size={12} /> {paused ? "Resume" : "Pause All"}
        </button>
        <button type="button" className="icon-btn" onClick={onClose} title="Panel band karein" aria-label="Panel band karein"><Icon name="x" size={14} /></button>
      </div>
      {paused && <div className="lp-banner">Pause All chalu hai: koi naya kaam nahi chale ga.</div>}
      <div className="lp-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "live"} className={tab === "live" ? "on" : ""} onClick={() => setTab("live")}>Live kaam</button>
        <button role="tab" aria-selected={tab === "brains"} className={tab === "brains" ? "on" : ""} onClick={() => setTab("brains")}>Brains{job?.busy ? " •" : ""}</button>
        <button role="tab" aria-selected={tab === "inbox"} className={tab === "inbox" ? "on" : ""} onClick={() => setTab("inbox")} data-inbox-tab>Inbox{attn ? ` (${attn})` : ""}</button>
        <button role="tab" aria-selected={tab === "approvals"} className={tab === "approvals" ? "on" : ""} onClick={() => setTab("approvals")}>Ijazat{pend.length ? ` (${pend.length})` : ""}</button>
      </div>

      <div className="lp-body">
        {tab === "live" && <Workspace job={job} log={log} embedded />}

        {tab === "brains" && (
          <div className="lp-scroll">
            <div className="lp-sec">Is kaam ki line {lineup?.task ? `(${lineup.task})` : ""}</div>
            {!lineup?.brains?.length && <p className="muted lp-empty">Kuch likhein: yahan nazar aaye ga kaun sa brain kis number par kaam kar raha hai.</p>}
            {lineup?.brains?.map((b) => (
              <div key={b.id} className={"lp-brain st-" + b.state} data-brain={b.id}>
                <span className="lp-n">{b.n}</span>
                <span className={"lp-dot st-" + b.state} />
                <span className="lp-bname"><b>{b.name}</b><small>{b.model}</small></span>
                <span className="lp-bstate">{STATE[b.state] || b.state}{b.note ? <small title={b.note}>{b.note}</small> : null}</span>
              </div>
            ))}
            <div className="lp-sec">Har kaam ke brains ki tarteeb <small className="muted">{running ? `· ${running} kaam chal rahe` : ""}</small></div>
            {(ops?.roles || []).map((r) => (
              <div key={r.id} className="lp-role">
                <button type="button" className="lp-rolehead" onClick={() => setRoleOpen(roleOpen === r.id ? null : r.id)} aria-expanded={roleOpen === r.id}>
                  <b>{ROLE_NAME[r.id] || r.id}</b>
                  <span className="muted">{r.order.filter((x) => x.on && x.id !== "ollama").slice(0, 3).map((x) => x.id).join(" > ") || "koi key nahi"}</span>
                  {r.custom && <span className="chip">aap ka</span>}
                </button>
                {roleOpen === r.id && (
                  <div className="lp-order">
                    <small className="muted">{r.why}</small>
                    {r.order.map((b, i) => (
                      <div key={b.id} className={"lp-orow" + (b.on ? "" : " off")}>
                        <span className="lp-n">{i + 1}</span><span className="lp-oname">{b.id}{b.on ? "" : " (key nahi)"}</span>
                        {b.id !== "ollama" && <>
                          <button type="button" className="icon-btn" aria-label="Oopar" title="Oopar" onClick={() => move(r.id, r.order, i, -1)} disabled={i === 0}>↑</button>
                          <button type="button" className="icon-btn" aria-label="Neeche" title="Neeche" onClick={() => move(r.id, r.order, i, 1)}>↓</button>
                        </>}
                      </div>
                    ))}
                    {r.custom && <button type="button" className="chip" onClick={() => act({ action: "brain_order", role: r.id, order: [] })}>Default</button>}
                  </div>
                )}
              </div>
            ))}
            <Link className="lp-more" href="/workflows">Poori tafseel: Workflows (schedule, audit, export)</Link>
          </div>
        )}

        {tab === "inbox" && (
          <div className="lp-scroll" data-inbox>
            {!inbox.length && <p className="muted lp-empty">Abhi koi kaam nahi. Agent, schedule ya workflow chale ga to yahan nazar aaye ga.</p>}
            {inbox.map((j) => (
              <div key={j.id} className={"lp-appr st-" + j.status}>
                <div><b>{j.title}</b> <span className="chip">{INBOX_ST[j.status] || j.status}</span></div>
                <small className="muted">{j.steps?.length ? j.steps[j.steps.length - 1].text : ""}{j.error ? ` · ${String(j.error).slice(0, 140)}` : ""}</small>
                <div className="btnrow">
                  {j.status === "waiting_for_approval" && <button type="button" className="chip" onClick={() => setTab("approvals")}>Ijazat dekho</button>}
                  {j.status === "dead_letter" && <button type="button" className="lp-ok" onClick={() => act({ action: "retry", id: j.id })}>Dobara</button>}
                  {["queued", "running", "retrying", "waiting_for_approval"].includes(j.status) && <button type="button" className="lp-no" onClick={() => act({ action: "cancel", id: j.id })}>Cancel</button>}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "approvals" && (
          <div className="lp-scroll">
            {!pend.length && <p className="muted lp-empty">Abhi koi ijazat nahi maangi gayi. Agent file hatana ya package install karna chahe to yahan Approve / Reject aaye ga.</p>}
            {pend.map((a) => (
              <div key={a.id} className={"lp-appr risk-" + a.risk}>
                <div><b>{a.tool}</b> <span className="chip">risk: {a.risk}</span></div>
                <pre>{JSON.stringify(a.args, null, 2).slice(0, 600)}</pre>
                <div className="btnrow">
                  <button type="button" className="lp-ok" onClick={() => act({ action: "approve", id: a.id })}>Approve</button>
                  <button type="button" className="lp-no" onClick={() => act({ action: "reject", id: a.id })}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
