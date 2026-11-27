"use client";
// v3.32 Jarvis Phone: Jarvis page ke andar QR. Phone camera se scan = Jarvis Remote khulta hai,
// "Add to Home screen" se phone par app ki tarah lag jata hai. Phone aur laptop ek hi Wi-Fi par.
import { useEffect, useMemo, useState } from "react";
import { qrSvg } from "../../lib/qr";

export default function JarvisPhone({ onClose }) {
  const [d, setD] = useState(null), [err, setErr] = useState("");
  const load = () => fetch("/api/phone", { cache: "no-store" }).then((r) => r.json()).then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const turnOn = async () => {
    const r = await fetch("/api/phone", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "enable", value: true }) }).then((x) => x.json()).catch((e) => ({ error: e.message }));
    if (r?.error) setErr(r.error); else setD(r);
  };
  // v3.35: HTTPS chal raha ho to wahi (phone page ka apna mic chalta hai)
  const url = d?.ip && d?.key ? (d.httpsPort ? `https://${d.ip}:${d.httpsPort}/m.html#k=${d.key}` : `http://${d.ip}:${d.port || 3000}/m.html#k=${d.key}`) : "";
  const svg = useMemo(() => { try { return url ? qrSvg(url, { scale: 5 }) : ""; } catch { return ""; } }, [url]);
  return (
    <div className="jvp-back" role="dialog" aria-label="Jarvis Phone" onClick={onClose}>
      <div className="jvp" onClick={(e) => e.stopPropagation()}>
        <div className="jvp-head"><b>Jarvis Phone</b><button onClick={onClose} aria-label="Band">✕</button></div>
        {err && <p className="jvp-err">{err}</p>}
        {!d ? <p>Load ho raha hai...</p> : !d.enabled ? (
          <>
            <p>Phone se Jarvis ko hukum dene ke liye Phone connect ON karein. Wi-Fi par sirf Jarvis Remote aur key wala raasta khulega.</p>
            <button className="jvp-on" onClick={turnOn}>Phone connect ON karo</button>
          </>
        ) : !url ? <p>Laptop ka Wi-Fi IP nahi mila. Wi-Fi se jur kar dobara kholein.</p> : (
          <>
            <div className="jvp-qr" dangerouslySetInnerHTML={{ __html: svg }} />
            <ol>
              <li>Phone aur laptop ek hi Wi-Fi par hon.</li>
              <li>Phone camera se QR scan karein, Jarvis Remote khul jaye ga.</li>
              <li>Chrome menu (⋮) &gt; <b>Add to Home screen</b>: phone par Jarvis ka icon lag jaye ga.</li>
              <li>{d.httpsPort ? "Pehli dafa \"Not secure\" aaye to Advanced > Proceed dabayein (apna laptop hai). Phir 🎤 button se bolein." : "Keyboard ka mic daba kar bolein. Seedha 🎤 button ke liye dashboard folder mein PHONE-HTTPS.bat chalayein."}</li>
              <li>Kaam laptop par hoga, jawab phone par bolega.</li>
            </ol>
            <p className="jvp-small">Key QR ke andar hai, kisi aur ko scan na karne dein. Nayi key: /connect &gt; Rotate.</p>
          </>
        )}
      </div>
      <style>{`.jvp-back{position:fixed;inset:0;background:rgba(0,0,0,.6);display:grid;place-items:center;z-index:60}
.jvp{background:#0a1220;border:1px solid #1e3550;border-radius:16px;padding:16px;width:min(92vw,360px);color:#cfe8ff;font-size:14px}
.jvp-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.jvp-head button{background:none;border:0;color:#cfe8ff;font-size:18px;cursor:pointer}
.jvp-qr{background:#fff;border-radius:12px;padding:8px;width:220px;margin:6px auto}.jvp-qr svg{width:100%;height:auto;display:block}
.jvp ol{padding-left:18px;margin:8px 0}.jvp-small{color:#6b8aa8;font-size:12px}.jvp-err{color:#ff8a8a}
.jvp-on{width:100%;padding:12px;border:0;border-radius:10px;background:#2f7cff;color:#fff;font-size:15px;cursor:pointer}`}</style>
    </div>
  );
}
