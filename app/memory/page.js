"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "../components/Icon";
import Background from "../components/Background";
import ThemeBalls from "../components/ThemeBalls";

// v3.13 Yaad-dasht (Persistent Memory): pasand, project khulase, seekh. Sab isi laptop par (~/.faheem-ai/memory).
const LABEL = { preference: "Pasand", project: "Project khulasa", lesson: "Seekh (ghalti → hal)", note: "Note" };
const EMPTY = { type: "preference", title: "", text: "", project: "", tags: "", pinned: false };

export default function MemoryPage() {
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState("");
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState("");
  const fileRef = useRef(null);

  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(""), 2200); };
  const load = useCallback(async (query = q, ty = type) => {
    const u = new URLSearchParams(); if (query) u.set("q", query); if (ty) u.set("type", ty);
    const d = await fetch(`/api/memory?${u}`).then((r) => r.json()).catch(() => ({}));
    setItems(d.items || []); setSettings(d.settings || null); setStats(d.stats || null);
  }, [q, type]);
  useEffect(() => { load("", ""); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const post = (body) => fetch("/api/memory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()).catch((e) => ({ ok: false, error: e.message }));

  async function save(e) {
    e.preventDefault();
    const item = { ...form, tags: String(form.tags || "").split(",").map((t) => t.trim()).filter(Boolean) };
    const d = editId ? await post({ action: "update", id: editId, item }) : await post({ action: "add", item });
    if (!d.ok) return flash("⚠ " + (d.error || "Save nahi hua"));
    flash(editId ? "Badal diya ✓" : d.duplicate ? "Pehle se yaad hai ✓" : "Yaad rakh liya ✓");
    setForm(EMPTY); setEditId(""); load();
  }
  function edit(it) { setEditId(it.id); setForm({ type: it.type, title: it.title, text: it.text, project: it.project, tags: (it.tags || []).join(", "), pinned: !!it.pinned }); window.scrollTo?.(0, 0); }
  async function del(it) { if (!confirm(`"${it.title}" mita dein?`)) return; const d = await post({ action: "delete", id: it.id }); flash(d.ok ? "Mita diya ✓" : "⚠ " + d.error); load(); }
  async function setS(patch) { const d = await post({ action: "settings", settings: patch }); if (d.ok) { setSettings(d.settings); flash("Save ✓"); } }
  async function importFile(f) {
    if (!f) return;
    let data; try { data = JSON.parse(await f.text()); } catch { return flash("⚠ File JSON nahi"); }
    const d = await post({ action: "import", data, mode: "merge" });
    flash(d.ok ? `Import: ${d.added} nayi, ${d.skipped} chhor di` : "⚠ " + d.error); load();
  }
  async function showPreview() {
    const d = await fetch(`/api/memory?preview=${encodeURIComponent(q || "website design")}`).then((r) => r.json()).catch(() => ({}));
    setPreview(d.context || "(Kuch nahi jaye ga — memory band hai ya koi mutalliq yaad nahi.)");
  }

  return (
    <main className="optpage memorypage" data-memory-page>
      <Background />
      <header className="topbar">
        <Link href="/" className="icon-btn" title="Wapas chat" aria-label="Wapas chat"><Icon name="back" /></Link>
        <div className="brand"><Icon name="brain" /> Yaad-dasht (Memory)</div>
        <div className="top-actions"><span className="ok-text">{msg}</span><Link href="/skills" className="icon-btn" title="Skills" aria-label="Skills"><Icon name="grid" /></Link><Link href="/options" className="icon-btn" title="Options" aria-label="Options"><Icon name="more" /></Link><ThemeBalls /></div>
      </header>

      <div className="memgrid">
        <section className="card panel memside">
          <h3>Memory on / off</h3>
          {settings && (<>
            <label className="toggle"><input type="checkbox" checked={settings.enabled !== false} onChange={(e) => setS({ enabled: e.target.checked })} data-memory-switch /><span>{settings.enabled !== false ? "On — chat, Agent aur Team ko yaad milti hai" : "Band — kuch nahi bheja jata"}</span></label>
            <label className="toggle"><input type="checkbox" checked={settings.autoLessons !== false} onChange={(e) => setS({ autoLessons: e.target.checked })} /><span>Test fail → pass ho to seekh khud save</span></label>
            <label className="toggle"><input type="checkbox" checked={settings.autoSummary !== false} onChange={(e) => setS({ autoSummary: e.target.checked })} /><span>Kaam khatam par project khulasa khud save</span></label>
            <label className="muted">Prompt mein zyada se zyada (tokens)</label>
            <select value={settings.maxTokens} onChange={(e) => setS({ maxTokens: Number(e.target.value) })}>
              {[150, 300, 500, 800].map((n) => <option key={n} value={n}>{n} tokens{n === 300 ? " (default)" : n <= 150 ? " (sab se halka)" : ""}</option>)}
            </select>
          </>)}
          {stats && <p className="muted small">Kul {stats.total} yaadein · {Object.entries(stats.by).map(([k, v]) => `${LABEL[k]}: ${v}`).join(" · ")}</p>}
          <div className="memactions">
            <a className="ghost linkbtn" href="/api/memory?export=1" download><Icon name="download" size={14} /> Export (JSON)</a>
            <button className="ghost" onClick={() => fileRef.current?.click()}><Icon name="upload" size={14} /> Import</button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { importFile(e.target.files?.[0]); e.target.value = ""; }} />
          </div>
          <p className="muted small">Jagah: <code>{stats?.dir || "~/.faheem-ai/memory"}</code> — ZIP update se nahi mitti (keys.json ki tarah).</p>
        </section>

        <section className="card panel">
          <h3>{editId ? "Yaad badlein" : "Nayi yaad"}</h3>
          <form onSubmit={save} className="memform" data-memory-form>
            <div className="memrow">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} aria-label="Qism">
                {Object.entries(LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} placeholder="Project (marzi)" aria-label="Project" />
            </div>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Unwan (jaise: Vestire ke rang)" aria-label="Unwan" />
            <textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="Kya yaad rakhna hai… (jaise: Vestire ke brand rang aur font)" rows={3} aria-label="Text" required />
            <div className="memrow">
              <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Tags, comma se" aria-label="Tags" />
              <label className="toggle"><input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} /><span>Hamesha bhejo (pin)</span></label>
            </div>
            <div className="memrow">
              <button type="submit">{editId ? "Save karein" : "Yaad rakho"}</button>
              {editId && <button type="button" className="ghost" onClick={() => { setEditId(""); setForm(EMPTY); }}>Cancel</button>}
            </div>
          </form>
        </section>

        <section className="card panel memlist">
          <div className="memrow">
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") load(); }} placeholder="Talaash karein… (BM25 keyword search)" aria-label="Talaash" data-memory-search />
            <select value={type} onChange={(e) => { setType(e.target.value); load(q, e.target.value); }} aria-label="Qism filter">
              <option value="">Sab qisam</option>
              {Object.entries(LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button onClick={() => load()}>Dhoondo</button>
            <button className="ghost" onClick={showPreview} title="Is sawal par prompt mein kya jaye ga">Prompt preview</button>
          </div>
          {preview && <pre className="mempreview" data-memory-preview>{preview}</pre>}
          {items.length === 0 && <p className="muted">Koi yaad nahi mili.</p>}
          {items.map((it) => (
            <article key={it.id} className="memitem" data-memory-item={it.type}>
              <div className="memhead">
                <span className={"memtag t-" + it.type}>{LABEL[it.type]}</span>
                {it.pinned && <span className="memtag">pin</span>}
                {it.project && <span className="memtag">{it.project}</span>}
                <b>{it.title}</b>
                {it._score !== undefined && <small className="muted">score {it._score}</small>}
              </div>
              <p>{it.text}</p>
              <div className="memfoot">
                <small className="muted">{String(it.updated || "").slice(0, 10)} · {it.source}{it.uses ? ` · ${it.uses} dafa istemal` : ""}{it.tags?.length ? ` · #${it.tags.join(" #")}` : ""}</small>
                <span><button className="ghost" onClick={() => edit(it)}>Badlein</button> <button className="ghost" onClick={() => del(it)}><Icon name="trash" size={14} /> Mitayein</button></span>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
