"use client";
// v3.35 Excel Report: .xlsx / .csv daalein -> safai ki jaanch, har column ka khulasa, chart, saaf CSV aur report download.
// Sab kuch isi browser mein (file kahin upload nahi hoti). Fiverr Excel cleaning gig ke liye.
import { useMemo, useState } from "react";
import Link from "next/link";
import { readXlsx, readCsv, analyze, cleanRows, toCsv } from "../../lib/xlsx-lite";

const fmt = (n) => (n == null ? "" : Math.abs(n) >= 1000 ? n.toLocaleString("en-US", { maximumFractionDigits: 0 }) : String(Math.round(n * 100) / 100));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function Bars({ data }) {
  if (!data.length) return <p className="xl-muted">Chart ke liye data nahi.</p>;
  const max = Math.max(...data.map((d) => d[1]), 1), h = 26;
  return (
    <svg viewBox={`0 0 520 ${data.length * h + 6}`} className="xl-chart" role="img" aria-label="Chart">
      {data.map(([k, v], i) => (
        <g key={i} transform={`translate(0 ${i * h + 3})`}>
          <text x="0" y="16" fontSize="12" fill="currentColor">{String(k).slice(0, 22)}</text>
          <rect x="170" y="3" height="18" rx="4" width={Math.max(2, (v / max) * 290)} fill="#2f7cff" />
          <text x={176 + (v / max) * 290} y="16" fontSize="12" fill="currentColor">{fmt(v)}</text>
        </g>
      ))}
    </svg>
  );
}

export default function ExcelPage() {
  const [rows, setRows] = useState(null), [name, setName] = useState(""), [err, setErr] = useState("");
  const [group, setGroup] = useState(0), [value, setValue] = useState(-1);
  const rep = useMemo(() => (rows ? analyze(rows) : null), [rows]);

  async function load(f) {
    setErr(""); setRows(null); if (!f) return;
    try {
      const r = /\.csv$/i.test(f.name) ? readCsv(await f.text()) : /\.xlsx$/i.test(f.name) ? await readXlsx(await f.arrayBuffer()) : null;
      if (!r) throw new Error("Sirf .xlsx ya .csv file. Purani .xls ko Excel mein \"Save As .xlsx\" karein.");
      if (r.length < 2) throw new Error("File mein data kam hai (headers + kam az kam 1 row).");
      setName(f.name.replace(/\.(xlsx|csv)$/i, "")); setRows(r); setGroup(0);
      const a = analyze(r); setValue(a.cols.findIndex((c) => c.numeric));
    } catch (e) { setErr(e.message); }
  }

  const chart = useMemo(() => {
    if (!rep || !rows) return [];
    if (value < 0 || value === group) return rep.cols[group]?.top || [];
    const m = {};
    for (const r of rows.slice(1)) { const k = String(r[group] ?? "").trim(); const n = Number(String(r[value] ?? "").replace(/[, ]/g, "")); if (k && Number.isFinite(n)) m[k] = (m[k] || 0) + n; }
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [rep, rows, group, value]);

  function download(text, file, type) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = file; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function reportHtml() {
    const cols = rep.cols.map((c) => `<tr><td>${esc(c.name)}</td><td>${c.filled}</td><td>${c.empty}</td><td>${c.unique}</td><td>${c.numeric ? "Number" : "Text"}</td><td>${c.numeric ? `${fmt(c.sum)} / ${fmt(c.avg)} / ${fmt(c.min)}-${fmt(c.max)}` : esc(c.top.slice(0, 3).map(([k, n]) => `${k} (${n})`).join(", "))}</td></tr>`).join("");
    const bars = chart.map(([k, v]) => `<tr><td>${esc(k)}</td><td><div style="background:#2f7cff;height:14px;width:${Math.max(2, (v / Math.max(...chart.map((d) => d[1]), 1)) * 300)}px"></div></td><td>${fmt(v)}</td></tr>`).join("");
    return `<!doctype html><meta charset="utf-8"><title>Report: ${esc(name)}</title><style>body{font:14px system-ui;margin:24px;color:#111}table{border-collapse:collapse;margin:8px 0 20px}td,th{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#f3f5f9}</style>
<h1>Data Report: ${esc(name)}</h1><p>${rep.rowCount} rows, ${rep.colCount} columns. Khali rows: ${rep.emptyRows}. Duplicate rows: ${rep.dupRows}. Extra spaces wale cells: ${rep.extraSpaces}.</p>
<h2>Columns</h2><table><tr><th>Column</th><th>Bhare</th><th>Khali</th><th>Alag values</th><th>Qisam</th><th>Sum / Avg / Min-Max ya top values</th></tr>${cols}</table>
<h2>${esc(rep.header[group] || "")}${value >= 0 && value !== group ? " ke hisaab se " + esc(rep.header[value]) : ""}</h2><table>${bars}</table>`;
  }

  return (
    <main className="xl">
      <div className="xl-top"><Link href="/">← Wapas</Link><h1>Excel Report</h1></div>
      <label className="xl-drop" data-excel-drop>
        <input type="file" accept=".xlsx,.csv" onChange={(e) => load(e.target.files?.[0])} data-excel-input />
        <span>.xlsx ya .csv file chunein (file isi laptop par rehti hai)</span>
      </label>
      {err && <p className="xl-err" role="alert">{err}</p>}
      {rep && (
        <>
          <section className="xl-card" data-excel-summary>
            <b>{name}</b>: {rep.rowCount} rows, {rep.colCount} columns
            <div className="xl-badges">
              <span className={rep.emptyRows ? "bad" : "ok"}>Khali rows: {rep.emptyRows}</span>
              <span className={rep.dupRows ? "bad" : "ok"}>Duplicate rows: {rep.dupRows}</span>
              <span className={rep.extraSpaces ? "bad" : "ok"}>Extra spaces: {rep.extraSpaces}</span>
            </div>
            <div className="xl-actions">
              <button onClick={() => download(toCsv(cleanRows(rows)), `${name}-saaf.csv`, "text/csv;charset=utf-8")} data-excel-clean>Saaf CSV download</button>
              <button onClick={() => download(reportHtml(), `${name}-report.html`, "text/html;charset=utf-8")} data-excel-report>Report download</button>
            </div>
          </section>
          <section className="xl-card">
            <div className="xl-pick">
              <label>Group: <select value={group} onChange={(e) => setGroup(+e.target.value)}>{rep.header.map((h, i) => <option key={i} value={i}>{h}</option>)}</select></label>
              <label>Value: <select value={value} onChange={(e) => setValue(+e.target.value)}><option value={-1}>Ginti (count)</option>{rep.cols.map((c, i) => c.numeric && <option key={i} value={i}>{c.name} (sum)</option>)}</select></label>
            </div>
            <Bars data={chart} />
          </section>
          <section className="xl-card xl-scroll">
            <table className="xl-table"><thead><tr><th>Column</th><th>Bhare</th><th>Khali</th><th>Alag</th><th>Qisam</th><th>Sum</th><th>Avg</th><th>Min</th><th>Max</th></tr></thead>
              <tbody>{rep.cols.map((c, i) => <tr key={i}><td>{c.name}</td><td>{c.filled}</td><td>{c.empty}</td><td>{c.unique}</td><td>{c.numeric ? "Number" : "Text"}</td><td>{fmt(c.sum)}</td><td>{fmt(c.avg)}</td><td>{fmt(c.min)}</td><td>{fmt(c.max)}</td></tr>)}</tbody></table>
          </section>
          <section className="xl-card xl-scroll">
            <table className="xl-table"><thead><tr>{rep.header.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
              <tbody>{rows.slice(1, 51).map((r, i) => <tr key={i}>{rep.header.map((_, k) => <td key={k}>{r[k]}</td>)}</tr>)}</tbody></table>
            {rows.length > 51 && <p className="xl-muted">Pehli 50 rows dikh rahi hain.</p>}
          </section>
        </>
      )}
      <style>{`.xl{max-width:1000px;margin:0 auto;padding:20px;color:var(--text,#e6eefc)}.xl-top{display:flex;gap:14px;align-items:center}.xl-top h1{font-size:22px;margin:0}
.xl-drop{display:block;border:2px dashed #2a3f5f;border-radius:14px;padding:22px;text-align:center;margin:14px 0;cursor:pointer}.xl-drop input{display:block;margin:0 auto 8px}
.xl-card{background:rgba(255,255,255,.04);border:1px solid #1e3550;border-radius:14px;padding:14px;margin:12px 0}.xl-badges{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
.xl-badges span{padding:4px 10px;border-radius:99px;font-size:13px}.xl-badges .ok{background:#123d2a}.xl-badges .bad{background:#4a2410}
.xl-actions{display:flex;gap:8px;flex-wrap:wrap}.xl-actions button{padding:8px 14px;border:0;border-radius:10px;background:#2f7cff;color:#fff;cursor:pointer}
.xl-pick{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:8px}.xl-chart{width:100%;max-width:620px;height:auto}.xl-scroll{overflow:auto}
.xl-table{border-collapse:collapse;font-size:13px;min-width:100%}.xl-table td,.xl-table th{border:1px solid #1e3550;padding:4px 8px;text-align:left;white-space:nowrap}
.xl-err{color:#ff8a8a}.xl-muted{color:#7f95b3;font-size:13px}`}</style>
    </main>
  );
}
