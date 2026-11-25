"use client";
// v3.27 AI Team group chat (PiBot Apache-2.0 ke idea se; apna code): Planner → Researcher → Coder → Reviewer.
// Koi bot khud kuch nahi chalata: file/command sirf "Ijazat do" dabane par, ek dafa, isi project ke andar.
import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";

const BOTS = [
  { id: "planner", name: "Planner", color: "#7fe3ff", job: "qadam" },
  { id: "researcher", name: "Researcher", color: "#c08bff", job: "facts" },
  { id: "coder", name: "Coder", color: "#5dffa8", job: "code" },
  { id: "reviewer", name: "Reviewer", color: "#ffc95c", job: "jaanch" },
];
const KEY = (p) => `faheem-teamchat-${p}`;

export default function TeamChat({ project, onFiles }) {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [turn, setTurn] = useState("");
  const [on, setOn] = useState(BOTS.map((b) => b.id));
  const [acts, setActs] = useState({}); // proposal id -> {state, output}
  const ctrl = useRef(null);
  const end = useRef(null);

  useEffect(() => { try { setMsgs(JSON.parse(localStorage.getItem(KEY(project)) || "[]")); } catch { setMsgs([]); } setActs({}); }, [project]);
  useEffect(() => { try { localStorage.setItem(KEY(project), JSON.stringify(msgs.slice(-60))); } catch {} end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, project]);

  async function send(e) {
    e?.preventDefault();
    const t = text.trim(); if (!t || busy || !project) return;
    const history = [...msgs, { role: "user", content: t, at: Date.now() }];
    setMsgs(history); setText(""); setBusy(true);
    const ac = new AbortController(); ctrl.current = ac;
    try {
      const res = await fetch("/api/agent/teamchat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "chat", project, bots: on, history: history.filter((m) => m.role === "user" || m.role === "bot").map(({ role, bot, content }) => ({ role, bot, content })) }), signal: ac.signal });
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      const reader = res.body.getReader(), dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop();
        for (const l of lines) {
          if (!l.trim()) continue;
          let ev; try { ev = JSON.parse(l); } catch { continue; }
          if (ev.type === "turn") setTurn(ev.name);
          else if (ev.type === "reply") setMsgs((m) => [...m, { role: "bot", bot: ev.bot, name: ev.name, content: ev.text, brain: ev.brain, proposals: ev.proposals, at: Date.now() }]);
          else if (ev.type === "error") setMsgs((m) => [...m, { role: "err", bot: ev.bot, name: ev.name, content: ev.text, at: Date.now() }]);
        }
      }
    } catch (err) { setMsgs((m) => [...m, { role: "err", content: err.name === "AbortError" ? "Aap ne roka." : err.message, at: Date.now() }]); }
    setBusy(false); setTurn("");
  }

  async function decide(p, approve) {
    setActs((a) => ({ ...a, [p.id]: { state: "busy" } }));
    const d = await fetch("/api/agent/teamchat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: approve ? "approve" : "reject", project, id: p.id }) }).then((r) => r.json()).catch((e) => ({ ok: false, error: e.message }));
    setActs((a) => ({ ...a, [p.id]: approve ? (d.ok ? { state: "done", output: d.output } : { state: "error", output: d.error }) : { state: "rejected" } }));
    if (approve && d.ok) onFiles?.();
  }

  const strip = (s) => String(s || "").replace(/```(file:[^\n]*|shell|bash|sh|powershell|pwsh|ps1?|cmd|bat|console|terminal)\n[\s\S]*?```/gi, "").trim();
  const color = (id) => BOTS.find((b) => b.id === id)?.color || "var(--muted)";

  return (
    <div className="tc">
      <div className="tc-bots" role="group" aria-label="Team ke bots">
        {BOTS.map((b) => (
          <label key={b.id} className={"tc-bot" + (on.includes(b.id) ? " on" : "")} style={{ "--bc": b.color }} title={`${b.name}: ${b.job}`}>
            <input type="checkbox" checked={on.includes(b.id)} disabled={busy} onChange={(e) => setOn((o) => (e.target.checked ? BOTS.map((x) => x.id).filter((x) => o.includes(x) || x === b.id) : o.filter((x) => x !== b.id)))} />
            <span className="tc-av">{b.name[0]}</span>{b.name}
          </label>
        ))}
        <button className="icon-btn" onClick={() => !busy && setMsgs([])} title="Chat saaf" aria-label="Chat saaf" disabled={busy}><Icon name="trash" size={14} /></button>
      </div>
      <div className="tc-log" data-teamchat-log>
        {msgs.length === 0 && (
          <div className="hello small">
            <h2>AI Team se baat</h2>
            <p className="muted">Ek sawal likhein: Planner qadam banata hai, Researcher facts deta hai, Coder code/command tajweez karta hai, Reviewer jaanchta hai. Koi file ya command aap ke <b>Ijazat do</b> ke baghair nahi chalti.</p>
            <div className="chips">{["Is project ke liye contact form ka plan aur code do", "Mere online store ke liye SEO checklist banao", "index.html mein dark mode button kaise lagayein?"].map((c) => <button key={c} onClick={() => setText(c)}>{c}</button>)}</div>
          </div>
        )}
        {msgs.map((m, i) => m.role === "user"
          ? <div key={i} className="ag-user">{m.content}</div>
          : m.role === "err"
          ? <div key={i} className="ag-err"><Icon name="alert" size={14} /> {m.name ? `${m.name}: ` : ""}{m.content}</div>
          : (
            <div key={i} className="tc-msg" style={{ "--bc": color(m.bot) }}>
              <div className="tc-head"><span className="tc-av">{(m.name || "B")[0]}</span><b>{m.name}</b>{m.brain && <span className="muted">· {m.brain}</span>}</div>
              <div className="tc-text">{strip(m.content) || (m.proposals?.length ? "Tajweez neeche:" : m.content)}</div>
              {m.proposals?.map((p, k) => {
                const a = acts[p.id];
                if (p.kind === "blocked") return <div key={k} className="tc-prop bad"><Icon name="alert" size={13} /> Roki gayi: {p.reason}{p.cmd ? <pre>{p.cmd}</pre> : null}</div>;
                return (
                  <div key={k} className="tc-prop" data-proposal={p.kind}>
                    <div className="tc-ptitle"><Icon name={p.kind === "write" ? "edit" : "play"} size={13} /> {p.kind === "write" ? <>File likhni hai: <code>{p.path}</code> ({p.lines} lines)</> : "Command chalani hai (project folder mein):"}</div>
                    <pre>{p.kind === "write" ? p.preview : p.cmd}</pre>
                    {!a && <div className="btnrow"><button onClick={() => decide(p, true)} data-approve><Icon name="check" size={13} /> Ijazat do</button><button className="danger" onClick={() => decide(p, false)}><Icon name="x" size={13} /> Mana karo</button><span className="muted">10 min mein expire · ek dafa</span></div>}
                    {a?.state === "busy" && <span className="muted">Chal raha…</span>}
                    {a?.state === "rejected" && <span className="tstat bad">Mana kar diya</span>}
                    {a?.state === "done" && <><span className="tstat ok">Ho gaya</span><pre className="tc-out">{a.output}</pre></>}
                    {a?.state === "error" && <span className="tstat bad">{a.output}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        {busy && <div className="ag-brain"><Icon name="clock" size={14} /> {turn ? `${turn} likh raha hai…` : "Team soch rahi hai…"}</div>}
        <div ref={end} />
      </div>
      <form className="ag-input" onSubmit={send}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={busy ? "Team jawab de rahi hai…" : "Team se poochhein… (Enter = bhejo)"} rows={2} disabled={busy}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} aria-label="Team ke liye sawal" />
        {busy ? <button type="button" className="stopbtn" onClick={() => ctrl.current?.abort()}><Icon name="pause" size={13} /> Roko</button> : <button disabled={!text.trim() || !on.length}>Bhejo <Icon name="send" size={13} /></button>}
      </form>
      <style>{`.tc{display:flex;flex-direction:column;min-height:0;flex:1}
.tc-bots{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px 10px;border-bottom:1px solid var(--line)}
.tc-bot{display:inline-flex;gap:6px;align-items:center;font-size:12px;padding:3px 9px 3px 4px;border-radius:99px;border:1px solid var(--line);cursor:pointer;opacity:.55}
.tc-bot.on{opacity:1;border-color:var(--bc);box-shadow:0 0 10px color-mix(in srgb,var(--bc) 30%,transparent)}.tc-bot input{position:absolute;opacity:0;pointer-events:none}
.tc-av{width:20px;height:20px;border-radius:50%;display:inline-grid;place-items:center;font-size:11px;font-weight:700;background:var(--bc,#888);color:#05070f;flex:none}
.tc-log{flex:1;min-height:0;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px}
.tc-msg{border:1px solid var(--line);border-left:3px solid var(--bc);border-radius:12px;padding:10px 12px;background:var(--field);display:grid;gap:6px;min-width:0}
.tc-head{display:flex;gap:6px;align-items:center;font-size:13px}.tc-text{white-space:pre-wrap;font-size:13px;line-height:1.55;overflow-wrap:anywhere}
.tc-prop{border:1px dashed var(--line);border-radius:10px;padding:8px;display:grid;gap:6px;min-width:0}.tc-prop.bad{color:#f87171;font-size:12px}
.tc-prop pre{max-height:200px;overflow:auto;font-size:11.5px;background:rgba(0,0,0,.35);padding:8px;border-radius:8px;margin:0;white-space:pre-wrap;overflow-wrap:anywhere}
.tc-ptitle{font-size:12px;display:flex;gap:6px;align-items:center;flex-wrap:wrap}.tc-out{max-height:160px}`}</style>
    </div>
  );
}
