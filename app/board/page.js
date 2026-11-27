"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "../components/Icon";
import Background from "../components/Background";
import ThemeBalls from "../components/ThemeBalls";

// v3.38 Task board: Backlog -> Karna hai -> Chal raha -> Review -> Done. Jarvis wale card "Chalao" se chalte hain,
// natija comment banta hai aur card Review mein aap ki haan ka intezar karta hai.
const post = (body) => fetch("/api/board", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()).catch((e) => ({ ok: false, error: e.message }));
const EVERY = [["", "Band"], ["30m", "Har 30 min"], ["2h", "Har 2 ghante"], ["daily@09:00", "Roz 9 baje"], ["daily@18:00", "Roz 6 baje sham"]];
const when = (t) => { try { return new Date(t).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };

export default function Board() {
  const [d, setD] = useState(null);
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(null); // card id
  const [form, setForm] = useState({ title: "", detail: "", assignee: "aap", priority: "normal", recipe: "", due: "" });
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [drag, setDrag] = useState(null);

  const load = useCallback(async () => { const r = await fetch("/api/board", { cache: "no-store" }).then((x) => x.json()).catch((e) => ({ ok: false, error: e.message })); if (r.ok) setD(r); else setMsg(r.error || "Load nahi hua"); }, []);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);
  const say = (t) => { setMsg(t); setTimeout(() => setMsg(""), 4000); };
  async function act(body, okMsg) { const r = await post(body); if (r.ok) { if (okMsg) say(okMsg); await load(); } else say(r.error || "Masla"); return r; }

  async function add(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const r = await act({ action: "add", card: form }, "Card ban gaya");
    if (r.ok) setForm({ ...form, title: "", detail: "", due: "" });
  }
  async function run(id, allowTools = false) { setBusy(id); await act({ action: "run", id, allowTools }, "Kaam ho gaya, Review dekhein"); setBusy(""); }
  const card = useMemo(() => d?.cards?.find((c) => c.id === open) || null, [d, open]);
  const recipe = d?.recipes?.find((r) => r.id === card?.recipe);
  const order = { high: 0, normal: 1, low: 2 };

  return (
    <main className="optpage">
      <Background />
      <header className="topbar">
        <Link href="/" className="icon-btn" title="Wapas chat" aria-label="Wapas chat"><Icon name="back" /></Link>
        <div className="brand"><img src="/icon.png" alt="" className="logo" /> Task Board</div>
        <div className="top-actions"><Link className="icon-btn" href="/mcp" title="MCP + Recipes" aria-label="MCP + Recipes"><Icon name="layers" /></Link><ThemeBalls /></div>
      </header>
      <div className="toolspage">
        <form onSubmit={add} className="card panel bd-add" data-board-add>
          <label htmlFor="bt" className="sr">Naya kaam</label>
          <input id="bt" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Naya kaam, jaise: Eid collection ke 5 captions" required />
          <label htmlFor="ba" className="sr">Kis ka</label>
          <select id="ba" value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })}><option value="aap">Mera</option><option value="jarvis">Jarvis</option></select>
          <label htmlFor="bp" className="sr">Ahmiyat</label>
          <select id="bp" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option value="high">Zaroori</option><option value="normal">Aam</option><option value="low">Baad mein</option></select>
          {form.assignee === "jarvis" && <><label htmlFor="br" className="sr">Recipe</label><select id="br" value={form.recipe} onChange={(e) => setForm({ ...form, recipe: e.target.value })}><option value="">Seedha AI</option>{(d?.recipes || []).map((r) => <option key={r.id} value={r.id}>Recipe: {r.title}</option>)}</select></>}
          <button type="submit"><Icon name="check" size={13} /> Daalo</button>
          {msg && <span className="tstat" role="status">{msg}</span>}
        </form>

        <div className="bd-cols" data-board>
          {(d?.columns || []).map((col) => {
            const cards = (d.cards || []).filter((c) => c.column === col.id).sort((a, b) => (order[a.priority] - order[b.priority]) || b.updatedAt.localeCompare(a.updatedAt));
            return (
              <section key={col.id} className={"bd-col bd-" + col.id} data-col={col.id} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag) act({ action: "move", id: drag, column: col.id }); setDrag(null); }} aria-label={col.name}>
                <h3>{col.name} <span className="muted">{cards.length}</span></h3>
                {cards.map((c) => (
                  <article key={c.id} className={"bd-card p-" + c.priority + (open === c.id ? " on" : "")} draggable onDragStart={() => setDrag(c.id)} data-card={c.id}>
                    <button className="bd-title" onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id}>{c.title}</button>
                    <div className="bd-meta muted">{c.assignee === "jarvis" ? "Jarvis" : "Mera"}{c.recipe ? ` · ${c.recipe}` : ""}{c.every ? ` · autopilot ${c.every}` : ""}{c.comments?.length ? ` · ${c.comments.length} notes` : ""}</div>
                    {c.column === "review" && c.pendingCall && <div className="bd-need">Ijazat chahiye: {c.pendingCall.server}.{c.pendingCall.tool}</div>}
                    <div className="bd-btns">
                      {c.assignee === "jarvis" && c.column !== "done" && c.column !== "doing" && !c.pendingCall && <button onClick={() => run(c.id)} disabled={busy === c.id}>{busy === c.id ? "Chal raha…" : "Chalao"}</button>}
                      {c.column === "review" && c.pendingCall && <button onClick={() => run(c.id, true)} disabled={busy === c.id}>Haan, chalao</button>}
                      {c.column === "review" && <><button onClick={() => act({ action: "approve", id: c.id }, "Done")}>Approve</button><button onClick={() => act({ action: "reject", id: c.id }, "Wapas bheja")}>Wapas</button></>}
                    </div>
                  </article>
                ))}
              </section>
            );
          })}
        </div>

        {card && (
          <section className="card panel bd-detail" data-card-detail>
            <h3>{card.title}</h3>
            <p className="muted">Bana {when(card.createdAt)} · chala {card.runs || 0} dafa{card.due ? ` · aakhri din ${card.due}` : ""}</p>
            <label htmlFor="bdd">Tafseel</label>
            <textarea id="bdd" rows={3} defaultValue={card.detail} key={card.id + "d"} onBlur={(e) => e.target.value !== card.detail && act({ action: "update", id: card.id, card: { detail: e.target.value } }, "Save")} />
            {recipe?.parameters?.length > 0 && recipe.parameters.map((p) => (
              <div key={p.key}><label htmlFor={"bv-" + p.key}>{p.key} <span className="muted">{p.description}</span></label>
                <input id={"bv-" + p.key} key={card.id + p.key} defaultValue={card.values?.[p.key] ?? p.default ?? ""} onBlur={(e) => act({ action: "update", id: card.id, card: { values: { ...(card.values || {}), [p.key]: e.target.value } } })} /></div>
            ))}
            <div className="bd-row">
              <label htmlFor="bdc">Column</label>
              <select id="bdc" value={card.column} onChange={(e) => act({ action: "move", id: card.id, column: e.target.value })}>{d.columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <label htmlFor="bda">Kis ka</label>
              <select id="bda" value={card.assignee} onChange={(e) => act({ action: "update", id: card.id, card: { assignee: e.target.value } })}><option value="aap">Mera</option><option value="jarvis">Jarvis</option></select>
              {card.assignee === "jarvis" && <><label htmlFor="bdr">Recipe</label><select id="bdr" value={card.recipe || ""} onChange={(e) => act({ action: "update", id: card.id, card: { recipe: e.target.value } })}><option value="">Seedha AI</option>{d.recipes.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}</select>
                <label htmlFor="bdp">Autopilot</label><select id="bdp" value={card.every || ""} onChange={(e) => act({ action: "autopilot", id: card.id, every: e.target.value }, e.target.value ? "Autopilot chalu" : "Autopilot band")}>{EVERY.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></>}
            </div>
            <div className="bd-log" aria-live="polite">
              {(card.comments || []).slice().reverse().map((m, i) => <div key={i} className={"bd-c by-" + m.by}><b>{m.by === "jarvis" ? "Jarvis" : "Aap"}</b> <span className="muted">{when(m.at)}</span><p>{m.text}</p></div>)}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if (note.trim()) act({ action: "comment", id: card.id, text: note }).then(() => setNote("")); }} className="bd-row">
              <label htmlFor="bdn" className="sr">Note</label>
              <input id="bdn" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note likhein (Jarvis agli dafa parhta hai)" />
              <button type="submit">Likho</button>
              <button type="button" onClick={() => { if (confirm("Card hata dein?")) act({ action: "delete", id: card.id }, "Hata diya").then(() => setOpen(null)); }}>Hatao</button>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}
