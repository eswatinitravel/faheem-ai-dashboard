"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Background from "../components/Background";
import ThemeBalls from "../components/ThemeBalls";

// v3.8: Har AI brain ka apna chat board. "Sab test karo" ek ek karke har brain ko sawal bhejta hai.
function ToolCard({ p, register }) {
  const [log, setLog] = useState([]);
  const [text, setText] = useState("");
  const [stat, setStat] = useState(p.cooling ? { c: "bad", t: "limit" } : { c: "", t: "tayyar" });
  const box = useRef(null);
  useEffect(() => { box.current?.scrollTo(0, 1e6); }, [log]);

  async function send(msg) {
    const content = (msg ?? text).trim();
    if (!content) return null;
    setText("");
    const hist = [...log.filter((m) => !m.err).map(({ role, content }) => ({ role, content })), { role: "user", content }];
    setLog((l) => [...l, { role: "user", content }]);
    setStat({ c: "run", t: "soch raha…" });
    const r = await fetch("/api/tools", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: p.id, messages: hist }) })
      .then((x) => x.json()).catch((e) => ({ ok: false, error: e.message }));
    if (r.ok) { setLog((l) => [...l, { role: "assistant", content: r.text }]); setStat({ c: "ok", t: `✓ ${(r.ms / 1000).toFixed(1)}s` }); }
    else { setLog((l) => [...l, { role: "assistant", content: r.error, err: true }]); setStat({ c: "bad", t: "✗ fail" }); }
    return r;
  }
  useEffect(() => register(p.id, send));

  return (
    <section className="card panel toolcard" data-provider={p.id}>
      <header>
        <div><b>{p.name}</b><small>{p.model}{p.keyless ? " · bina key" : ""}</small></div>
        <span className={"tstat " + stat.c}>{stat.t}</span>
      </header>
      <div className="tlog" ref={box}>
        {!log.length && <span className="muted">Is brain se seedha baat karein.</span>}
        {log.map((m, i) => <div key={i} className={"tmsg" + (m.role === "user" ? " me" : "") + (m.err ? " err" : "")}>{m.content}</div>)}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`${p.name} se poochein…`} />
        <button type="submit" disabled={stat.c === "run"}>➤</button>
      </form>
    </section>
  );
}

export default function Tools() {
  const [providers, setProviders] = useState(null);
  const [q, setQ] = useState("Salam! Ek line mein batao tum kaun ho?");
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState("");
  const senders = useRef({});
  const register = (id, fn) => { senders.current[id] = fn; };

  useEffect(() => { fetch("/api/tools", { cache: "no-store" }).then((r) => r.json()).then((d) => setProviders(d.providers || [])).catch(() => setProviders([])); }, []);

  async function testAll() {
    setRunning(true); setSummary("");
    let ok = 0, bad = 0;
    for (const p of providers) {
      setSummary(`Test: ${p.name}…`);
      const r = await senders.current[p.id]?.(q);
      if (r?.ok) ok++; else bad++;
    }
    setSummary(`Mukammal: ${ok} chale ✓, ${bad} fail ✗ (kul ${providers.length})`);
    setRunning(false);
  }

  return (
    <main className="optpage">
      <Background />
      <header className="topbar">
        <Link href="/" className="icon-btn" title="Wapas chat">←</Link>
        <div className="brand"><img src="/icon.png" alt="" className="logo" /> Tools · har brain ka chat board</div>
        <div className="top-actions"><Link href="/options" className="icon-btn" title="Keys">⚙</Link><ThemeBalls /></div>
      </header>
      <div className="toolspage">
        <div className="toolsbar">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sab brains se ek hi sawal" />
          <button onClick={testAll} disabled={running || !providers?.length}>{running ? "Chal raha hai…" : "▶ Sab 1 by 1 test karo"}</button>
          <span className="muted">{summary}</span>
        </div>
        {providers === null && <p className="muted">Brains load ho rahe hain…</p>}
        {providers?.length === 0 && <p className="muted">Koi brain nahi mila. ⚙ se free keys lagayein.</p>}
        <div className="toolsgrid">{providers?.map((p) => <ToolCard key={p.id} p={p} register={register} />)}</div>
      </div>
    </main>
  );
}
