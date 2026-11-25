"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "../components/Icon";
import Background from "../components/Background";
import ThemeBalls from "../components/ThemeBalls";

// v3.27 Status tiles + App launcher (Dashy MIT, Homarr Apache-2.0, Heimdall MIT ke ideas; apna code).
const ST = { ok: "Chal raha", warn: "Dhyan", bad: "Band / masla", off: "Band (marzi)" };
const ago = (t) => { const s = Math.max(0, Math.round((Date.now() - t) / 1000)); return s < 60 ? `${s}s pehle` : `${Math.round(s / 60)} min pehle`; };
const ICONS = ["external", "globe", "chat", "mic", "bot", "brain", "layers", "phone", "palette", "loop", "grid", "github", "folder", "book", "image", "zap", "rocket", "cart", "box", "monitor", "sparkle"];

export default function Status() {
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tiles, setTiles] = useState([]);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", group: "Apni", icon: "external" });
  const [msg, setMsg] = useState("");
  const [, tick] = useState(0);

  const load = useCallback(async (force) => {
    setBusy(true);
    const d = await fetch(`/api/status${force ? "?force=1" : ""}`, { cache: "no-store" }).then((r) => r.json()).catch((e) => ({ ok: false, error: e.message }));
    setBusy(false);
    if (d.ok) setS(d); else setMsg(d.error || "Status nahi mila");
  }, []);
  useEffect(() => { load(); const t = setInterval(() => load(), 60000); const u = setInterval(() => tick((x) => x + 1), 5000); return () => { clearInterval(t); clearInterval(u); }; }, [load]);
  useEffect(() => { fetch("/api/launcher").then((r) => r.json()).then((d) => setTiles(d.tiles || [])).catch(() => {}); }, []);

  async function saveTiles(next) {
    const d = await fetch("/api/launcher", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save", tiles: next }) }).then((r) => r.json()).catch((e) => ({ ok: false, error: e.message }));
    if (d.ok) { setTiles(d.tiles); setMsg("Save ho gaya"); setTimeout(() => setMsg(""), 1500); } else setMsg(d.error || "Save nahi hua");
  }
  async function reset() {
    if (!confirm("Saari tiles default par wapas?")) return;
    const d = await fetch("/api/launcher", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reset" }) }).then((r) => r.json());
    setTiles(d.tiles || []);
  }
  function add(e) {
    e.preventDefault();
    let url = form.url.trim();
    if (url && !/^https?:\/\//i.test(url) && !url.startsWith("/")) url = "https://" + url;
    if (!form.name.trim() || !url) return;
    saveTiles([...tiles, { ...form, url, id: form.name }]);
    setForm({ name: "", url: "", group: form.group, icon: "external" });
  }
  const move = (i, dir) => { const n = [...tiles]; const j = i + dir; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; saveTiles(n); };

  const shown = useMemo(() => { const k = q.trim().toLowerCase(); return k ? tiles.filter((t) => `${t.name} ${t.url} ${t.group}`.toLowerCase().includes(k)) : tiles; }, [tiles, q]);
  const groups = useMemo(() => [...new Set(shown.map((t) => t.group))], [shown]);
  const services = s?.items?.filter((x) => x.group === "services") || [];
  const brains = s?.items?.filter((x) => x.group === "brains") || [];
  const Tile = ({ x }) => (
    <div className={"st-tile st-" + x.state} data-status={x.state} title={x.detail}>
      <div className="st-top"><span className="st-dot" aria-hidden="true" /><b>{x.name}</b><span className="st-ms">{x.ms ? `${x.ms} ms` : ""}</span></div>
      <div className="st-detail">{x.detail}</div>
      <div className="st-sub muted">{ST[x.state]} · {x.sub ? `${x.sub} · ` : ""}{ago(x.at)}</div>
    </div>
  );

  return (
    <main className="optpage">
      <Background />
      <header className="topbar">
        <Link href="/" className="icon-btn" title="Wapas chat" aria-label="Wapas chat"><Icon name="back" /></Link>
        <div className="brand"><img src="/icon.png" alt="" className="logo" /> Status + Launcher</div>
        <div className="top-actions"><Link className="icon-btn" href="/connect" title="Phone se jodo" aria-label="Phone se jodo"><Icon name="phone" /></Link><ThemeBalls /></div>
      </header>
      <div className="toolspage st">
        <div className="toolsbar">
          <button onClick={() => load(true)} disabled={busy}><Icon name="loop" size={14} /> {busy ? "Check ho raha…" : "Abhi check karo"}</button>
          <span className="muted">{s ? `Har 60s khud · aakhri check ${ago(s.at)} · ` : "Pehla check…"}{s ? Object.entries(s.counts || {}).map(([k, v]) => `${ST[k]}: ${v}`).join(" · ") : ""}</span>
          {msg && <span className="tstat">{msg}</span>}
        </div>

        <section className="card panel">
          <h3><Icon name="monitor" size={16} /> Services</h3>
          <div className="st-grid">{services.map((x) => <Tile key={x.id} x={x} />)}{!s && <p className="muted">Load ho raha hai…</p>}</div>
        </section>
        <section className="card panel">
          <h3><Icon name="brain" size={16} /> Brains ({brains.length})</h3>
          <p className="muted">Sirf sasta <code>/models</code> ping (koi chat token kharch nahi). Peela = limit/busy, laal = key ghalat ya raabta nahi. Poori jaanch: <Link href="/brains">Brains Rooms</Link>.</p>
          <div className="st-grid">{brains.map((x) => <Tile key={x.id} x={x} />)}</div>
        </section>

        <section className="card panel">
          <div className="st-lhead">
            <h3><Icon name="rocket" size={16} /> App launcher</h3>
            <label htmlFor="stq" className="sr">Talaash</label>
            <input id="stq" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tiles mein dhoondo (naam, link, group)…" data-launcher-search />
            <button onClick={() => setEdit((v) => !v)} aria-pressed={edit}><Icon name="edit" size={13} /> {edit ? "Mukammal" : "Badlo"}</button>
          </div>
          {groups.map((g) => (
            <div key={g} className="st-group">
              <div className="st-gname">{g}</div>
              <div className="st-lgrid">
                {shown.filter((t) => t.group === g).map((t) => {
                  const i = tiles.indexOf(t);
                  return (
                    <div key={t.id} className="st-app">
                      <a href={t.url} target={t.url.startsWith("/") ? undefined : "_blank"} rel="noreferrer" title={t.url}><Icon name={t.icon} size={18} /><span>{t.name}</span></a>
                      {edit && <div className="st-ed"><button onClick={() => move(i, -1)} aria-label="Pehle">↑</button><button onClick={() => move(i, 1)} aria-label="Baad">↓</button><button onClick={() => saveTiles(tiles.filter((_, k) => k !== i))} aria-label={`${t.name} hatao`}><Icon name="trash" size={12} /></button></div>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {!shown.length && <p className="muted">Kuch nahi mila.</p>}
          {edit && (
            <form className="btnrow st-add" onSubmit={add}>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Naam" aria-label="Naam" maxLength={40} />
              <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://… ya /page" aria-label="Link" style={{ flex: 2 }} />
              <input value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })} placeholder="Group" aria-label="Group" maxLength={24} />
              <select value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} aria-label="Icon">{ICONS.map((x) => <option key={x}>{x}</option>)}</select>
              <button disabled={!form.name.trim() || !form.url.trim()}><Icon name="plus" size={13} /> Tile jodo</button>
              <button type="button" onClick={reset}>Default</button>
            </form>
          )}
          <p className="muted">Tiles is laptop par <code>data/launcher.json</code> mein (update par mehfooz).</p>
        </section>
        <p className="muted small">Ideas: Dashy (MIT) · Homarr (Apache-2.0) · Heimdall (MIT). Code apna; in ka koi code shamil nahi.</p>
      </div>
      <style>{`.st > .card{margin-bottom:14px}.st-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,220px),1fr));gap:10px}
.st-tile{border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--field);display:grid;gap:4px;min-width:0;border-left:3px solid #64748b}
.st-ok{border-left-color:#22c55e}.st-warn{border-left-color:#f59e0b}.st-bad{border-left-color:#f87171}.st-off{border-left-color:#64748b;opacity:.8}
.st-top{display:flex;gap:8px;align-items:center;min-width:0}.st-top b{font-size:13px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.st-dot{width:9px;height:9px;border-radius:50%;flex:none;background:#64748b}.st-ok .st-dot{background:#22c55e;box-shadow:0 0 8px #22c55e}.st-warn .st-dot{background:#f59e0b;box-shadow:0 0 8px #f59e0b}.st-bad .st-dot{background:#f87171;box-shadow:0 0 8px #f87171}
.st-ms{font-size:11px;color:var(--muted);flex:none}.st-detail{font-size:12px;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.st-sub{font-size:11px}
.st-lhead{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.st-lhead h3{margin-right:auto}.st-lhead input{flex:1;min-width:200px;max-width:420px}
.st-gname{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:6px 0}
.st-lgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,150px),1fr));gap:8px}
.st-app{position:relative;min-width:0}.st-app a{display:flex;gap:8px;align-items:center;padding:12px;border-radius:12px;border:1px solid var(--line);background:var(--field);color:var(--text);text-decoration:none;font-size:13px;min-height:48px}
.st-app a:hover,.st-app a:focus-visible{border-color:var(--accent);box-shadow:0 0 14px color-mix(in srgb,var(--accent) 35%,transparent)}.st-app a span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.st-ed{position:absolute;top:-6px;right:-4px;display:flex;gap:2px}.st-ed button{padding:1px 6px;font-size:11px;min-height:0}
.st-add input{min-width:120px;flex:1}`}</style>
    </main>
  );
}
