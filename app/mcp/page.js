"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Icon from "../components/Icon";
import Background from "../components/Background";
import ThemeBalls from "../components/ThemeBalls";

// v3.37 MCP + Recipes: Goose / Claude Code wale MCP servers yahan jodo; Jarvis aur recipes inhein istemal karte hain.
const EXAMPLE = `{
  "type": "stdio",
  "cmd": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "C:\\\\Users\\\\Faheem\\\\Documents"],
  "env_keys": [],
  "auto_tools": ["list_directory", "read_text_file"],
  "timeout": 60
}`;
const post = (body) => fetch("/api/mcp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()).catch((e) => ({ ok: false, error: e.message }));

export default function Mcp() {
  const [d, setD] = useState(null);
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("");
  const [spec, setSpec] = useState(EXAMPLE);
  const [tools, setTools] = useState({});
  const [busy, setBusy] = useState("");
  const [run, setRun] = useState({ id: "", values: {}, allow: false, out: null });
  const [try_, setTry] = useState({ server: "", tool: "", args: "{}", out: "" });

  const load = useCallback(async () => { const r = await fetch("/api/mcp", { cache: "no-store" }).then((x) => x.json()).catch((e) => ({ ok: false, error: e.message })); if (r.ok) setD(r); else setMsg(r.error || "Load nahi hua"); }, []);
  useEffect(() => { load(); }, [load]);
  const say = (t) => { setMsg(t); setTimeout(() => setMsg(""), 4000); };

  async function add(e) {
    e.preventDefault();
    let s; try { s = JSON.parse(spec); } catch (er) { return say("JSON ghalat: " + er.message); }
    const r = await post({ action: "save_server", name: name.trim(), spec: s });
    if (r.ok) { say(`${name} save ho gaya`); setName(""); load(); } else say(r.error);
  }
  async function test(n) {
    setBusy(n); const r = await post({ action: "test", name: n }); setBusy("");
    if (r.ok) { setTools((t) => ({ ...t, [n]: r.tools })); say(`${n}: ${r.tools.length} tools mile`); } else say(`${n}: ${r.error}`);
  }
  async function remove(n) { if (!confirm(`${n} hata dein?`)) return; await post({ action: "remove_server", name: n }); load(); }
  async function callTry(e) {
    e.preventDefault();
    let args; try { args = JSON.parse(try_.args || "{}"); } catch (er) { return say("args JSON ghalat"); }
    setBusy("call"); const r = await post({ action: "call", name: try_.server, tool: try_.tool, args }); setBusy("");
    setTry((x) => ({ ...x, out: r.text || r.error || "" }));
  }
  async function runRecipe(e, allow) {
    e?.preventDefault?.();
    setBusy("recipe"); const r = await post({ action: "run_recipe", id: run.id, values: run.values, allowTools: allow ?? run.allow }); setBusy("");
    setRun((x) => ({ ...x, out: r }));
  }
  const recipe = d?.recipes?.find((r) => r.id === run.id);

  return (
    <main className="optpage">
      <Background />
      <header className="topbar">
        <Link href="/" className="icon-btn" title="Wapas chat" aria-label="Wapas chat"><Icon name="back" /></Link>
        <div className="brand"><img src="/icon.png" alt="" className="logo" /> MCP + Recipes</div>
        <div className="top-actions"><ThemeBalls /></div>
      </header>
      <div className="toolspage st">
        <div className="toolsbar"><span className="muted">Servers ki file: <code>{d?.file || "…"}</code> · apni recipes: <code>{d?.recipesDir || "…"}</code></span>{msg && <span className="tstat" role="status">{msg}</span>}</div>

        <section className="card panel" data-mcp-servers>
          <h3><Icon name="layers" size={16} /> MCP servers ({d?.servers?.length || 0})</h3>
          <p className="muted">Jo MCP server Goose, Claude Code ya Cursor mein chalta hai, wahi yahan. Jarvis har tool se pehle "haan" poochta hai, siwaye un ke jo aap <code>auto_tools</code> mein likhein (sirf parhne wale rakhein).</p>
          {(d?.servers || []).map((s) => (
            <div key={s.name} className="st-tile" data-mcp-server={s.name}>
              <div className="st-top"><b>{s.name}</b><span className="st-ms">{s.type}{s.enabled ? "" : " · band"}</span></div>
              <div className="st-detail"><code>{s.type === "stdio" ? [s.cmd, ...(s.args || [])].join(" ") : s.url}</code></div>
              <div className="st-sub"><button onClick={() => test(s.name)} disabled={busy === s.name}>{busy === s.name ? "Jod raha…" : "Test + tools"}</button> <button onClick={() => remove(s.name)}>Hatao</button></div>
              {tools[s.name] && <ul className="muted">{tools[s.name].map((t) => <li key={t.name}><b>{t.name}</b>{t.auto ? " (bina pooche)" : ""}: {t.description.slice(0, 120)}</li>)}</ul>}
            </div>
          ))}
          <form onSubmit={add} className="st-add">
            <label htmlFor="mcpn">Naam</label>
            <input id="mcpn" value={name} onChange={(e) => setName(e.target.value)} placeholder="files" required pattern="[A-Za-z0-9][A-Za-z0-9_-]{0,39}" />
            <label htmlFor="mcps">Server JSON (Goose / Claude format dono chalte hain)</label>
            <textarea id="mcps" rows={9} value={spec} onChange={(e) => setSpec(e.target.value)} spellCheck={false} />
            <button type="submit"><Icon name="check" size={13} /> Save</button>
          </form>
          <p className="muted">Key chahiye? <code>env_keys</code> mein naam likhein (jaise <code>GITHUB_TOKEN</code>); value Options → Keys se aati hai, file mein nahi likhni parti. HTTP server: <code>{`{"type":"http","url":"https://…","headers":{"Authorization":"Bearer \${GITHUB_TOKEN}"},"env_keys":["GITHUB_TOKEN"]}`}</code></p>
        </section>

        <section className="card panel">
          <h3><Icon name="zap" size={16} /> Tool aazmao</h3>
          <form onSubmit={callTry} className="st-add">
            <label htmlFor="ts">Server</label>
            <select id="ts" value={try_.server} onChange={(e) => setTry({ ...try_, server: e.target.value })}><option value="">…</option>{(d?.servers || []).map((s) => <option key={s.name}>{s.name}</option>)}</select>
            <label htmlFor="tt">Tool</label>
            <input id="tt" value={try_.tool} onChange={(e) => setTry({ ...try_, tool: e.target.value })} placeholder="list_directory" />
            <label htmlFor="ta">args (JSON)</label>
            <textarea id="ta" rows={3} value={try_.args} onChange={(e) => setTry({ ...try_, args: e.target.value })} spellCheck={false} />
            <button type="submit" disabled={busy === "call" || !try_.server || !try_.tool}>{busy === "call" ? "Chal raha…" : "Chalao"}</button>
          </form>
          {try_.out && <pre className="mcp-out">{try_.out}</pre>}
        </section>

        <section className="card panel" data-recipes>
          <h3><Icon name="book" size={16} /> Recipes ({d?.recipes?.length || 0})</h3>
          <p className="muted">Baar baar wale kaam ek dafa likho, phir ek click. Format Goose recipe jaisa (JSON): title, prompt, parameters, extensions, retry.</p>
          <form onSubmit={(e) => runRecipe(e)} className="st-add">
            <label htmlFor="rid">Recipe</label>
            <select id="rid" value={run.id} onChange={(e) => setRun({ id: e.target.value, values: {}, allow: false, out: null })}><option value="">…</option>{(d?.recipes || []).map((r) => <option key={r.id} value={r.id}>{r.title} ({r.source}){r.errors?.length ? " (ghalti)" : ""}</option>)}</select>
            {recipe && <p className="muted">{recipe.description} {recipe.extensions?.length ? `· tools: ${recipe.extensions.join(", ")}` : ""}</p>}
            {recipe?.errors?.length > 0 && <p className="tstat">{recipe.errors.join(" ")}</p>}
            {(recipe?.parameters || []).map((p) => (
              <div key={p.key}>
                <label htmlFor={"rp-" + p.key}>{p.key}{p.requirement === "optional" ? "" : " *"} <span className="muted">{p.description}</span></label>
                <input id={"rp-" + p.key} value={run.values[p.key] ?? p.default ?? ""} onChange={(e) => setRun({ ...run, values: { ...run.values, [p.key]: e.target.value } })} />
              </div>
            ))}
            {recipe?.extensions?.length > 0 && <label><input type="checkbox" checked={run.allow} onChange={(e) => setRun({ ...run, allow: e.target.checked })} /> Is dafa is recipe ke tools bina pooche chalao</label>}
            <button type="submit" disabled={!recipe || busy === "recipe" || recipe?.errors?.length > 0}>{busy === "recipe" ? "Chal rahi…" : "Recipe chalao"}</button>
          </form>
          {run.out && (
            <div className="mcp-out" role="status">
              <p>{run.out.answer || run.out.error}</p>
              {run.out.needConfirm && <button onClick={() => runRecipe(null, true)}>Haan, {run.out.call.server}.{run.out.call.tool} chalao</button>}
              {(run.out.steps || []).map((s, i) => <p key={i} className="muted">{s.ok ? "theek" : "masla"} {s.server}.{s.tool}: {String(s.result).slice(0, 160)}</p>)}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
