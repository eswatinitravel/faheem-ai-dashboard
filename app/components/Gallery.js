"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "./Icon";

// v3.11 Gallery: drag-drop ya click se pictures/files (kai ek sath), preview grid, mitayein,
// aur skill ko bhejein (HTML/CSS audit) ya chat mein bhejein (picture vision brain dekhta hai).
const EXT = ["png", "jpg", "jpeg", "webp", "gif", "html", "htm", "css", "txt", "md", "json", "pdf"];
const MAX = 10 * 1024 * 1024;
const ext = (n) => (String(n).toLowerCase().match(/\.([a-z0-9]+)$/) || [])[1] || "";
const kb = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");

export function sendToChat(router, f, prompt) {
  try { sessionStorage.setItem("faheem-handoff", JSON.stringify({ url: f.url, name: f.original || f.name, prompt })); } catch {}
  router.push("/");
}

export default function Gallery({ onUse, useLabel = "Skill ko bhejein", chatPrompt, title = "Gallery" }) {
  const router = useRouter();
  const [files, setFiles] = useState(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const input = useRef(null);

  const load = useCallback(() => {
    fetch("/api/gallery", { cache: "no-store" }).then((r) => r.json()).then((d) => { if (d.ok) setFiles(d.files); else { setFiles([]); setMsg(d.error || "Gallery nahi khuli"); } }).catch((e) => { setFiles([]); setMsg(e.message); });
  }, []);
  useEffect(load, [load]);

  async function upload(list) {
    const all = Array.from(list || []);
    const bad = all.filter((f) => !EXT.includes(ext(f.name)) || f.size > MAX || !f.size);
    const good = all.filter((f) => !bad.includes(f)).slice(0, 12);
    const notes = bad.map((f) => `${f.name}: ${!EXT.includes(ext(f.name)) ? "qism allowed nahi" : f.size ? "10MB se bari" : "khali"}`);
    if (!good.length) { setMsg(notes.join(" · ") || "Koi file nahi"); return; }
    setBusy(true); setMsg("Upload ho raha hai…");
    const fd = new FormData(); good.forEach((f) => fd.append("files", f));
    const d = await fetch("/api/gallery", { method: "POST", body: fd }).then((r) => r.json()).catch((e) => ({ ok: false, error: e.message }));
    setBusy(false);
    for (const r of d.rejected || []) notes.push(`${r.name}: ${r.error}`);
    if (d.error) notes.push(d.error);
    setMsg(`${(d.saved || []).length} file upload ✓${notes.length ? " · " + notes.join(" · ") : ""}`);
    load();
  }
  async function remove(f) {
    if (!confirm(`"${f.original}" mitayein?`)) return;
    await fetch(`/api/gallery?file=${encodeURIComponent(f.name)}`, { method: "DELETE" }).catch(() => {});
    load();
  }

  return (
    <section className="card panel gallery" data-gallery>
      <h3><Icon name="image" size={16} /> {title}</h3>
      <div className={"dropzone" + (drag ? " on" : "")} role="button" tabIndex={0} aria-label="Files upload karein: yahan chhoren ya click karein"
        onClick={() => input.current?.click()} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}>
        <Icon name="upload" size={22} />
        <b>{busy ? "Upload ho raha hai…" : "Pictures ya files yahan chhoren, ya click karein"}</b>
        <small className="muted">png, jpg, webp, gif, html, css, txt, md, json, pdf · har file 10MB tak · ek dafa 12 files</small>
        <input ref={input} type="file" hidden multiple accept={EXT.map((e) => "." + e).join(",")} onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
      </div>
      {msg && <p className="muted small" aria-live="polite">{msg}</p>}
      {files === null && <p className="muted">Load ho raha hai…</p>}
      {files?.length === 0 && <p className="muted">Abhi koi file nahi.</p>}
      <div className="ggrid">
        {files?.map((f) => (
          <figure key={f.name} className="gitem" data-file={f.name}>
            {f.kind === "image" ? <img src={f.url} alt={f.original} loading="lazy" /> : <div className="gfile"><Icon name="clip" size={22} /><span>.{ext(f.name)}</span></div>}
            <figcaption title={f.original}>{f.original}<small>{kb(f.size)}</small></figcaption>
            <div className="gacts">
              {onUse && f.kind === "code" && <button type="button" onClick={() => onUse(f)} title={useLabel}><Icon name="play" size={13} /> {useLabel}</button>}
              {(f.kind === "image" || f.kind === "text" || f.kind === "code") && <button type="button" className="ghost" onClick={() => sendToChat(router, f, chatPrompt)} title="Chat mein bhejein"><Icon name="chat" size={13} /> Chat</button>}
              <a className="icon-btn" href={f.url} target="_blank" rel="noreferrer" aria-label={`${f.original} kholein`} title="Kholein"><Icon name="search" size={14} /></a>
              <button type="button" className="icon-btn" onClick={() => remove(f)} aria-label={`${f.original} mitayein`} title="Mitayein"><Icon name="trash" size={14} /></button>
            </div>
          </figure>
        ))}
      </div>
    </section>
  );
}
