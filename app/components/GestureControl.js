"use client";
// v3.27 Jarvis "Haath se control": MediaPipe Hands (Google, Apache-2.0) sirf toggle On par CDN se aata hai.
// Camera ki ijazat bhi sirf tab. Kuch na chale (internet, camera, GPU) to chup chaap band aur wajah batata hai.
import { useEffect, useRef, useState } from "react";
import { createGestureTracker } from "../../lib/jarvis/gestures";

export const MP_VER = "1.2.3";
const MP_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VER}/vision_bundle.mjs`;
const MP_WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VER}/wasm`;
const MP_MODEL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
// Bundler is URL ko na chhede: asli browser import.
const cdnImport = (u) => new Function("u", "return import(u)")(u);

const LABEL = { palm: "Khula haath: sunna shuru/band", "swipe-left": "Swipe baayen", "swipe-right": "Swipe daayen", pinch: "Pinch: select" };

export default function GestureControl({ enabled, onPalm, onSwipe, onStatus, onOff }) {
  const videoRef = useRef(null);
  const [cursor, setCursor] = useState(null);
  const [last, setLast] = useState("");
  const [ready, setReady] = useState(false);
  const cb = useRef({});
  cb.current = { onPalm, onSwipe, onStatus, onOff };

  useEffect(() => {
    if (!enabled) return;
    let stop = false, raf = 0, stream = null, lm = null, hover = null;
    const tracker = createGestureTracker();
    const say = (m) => cb.current.onStatus?.(m);
    const fail = (m) => { say(m); cb.current.onOff?.(); };
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) return fail("Is browser mein camera nahi mil saka.");
      say("Haath control load ho raha hai (MediaPipe, pehli dafa ~8 MB)…");
      let vision;
      try { vision = await cdnImport(MP_URL); } catch { return fail("Haath control nahi chala: MediaPipe CDN nahi khula (internet check karein)."); }
      if (stop) return;
      try {
        const files = await vision.FilesetResolver.forVisionTasks(MP_WASM);
        const make = (delegate) => vision.HandLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: MP_MODEL, delegate }, runningMode: "VIDEO", numHands: 1, minHandDetectionConfidence: 0.6, minTrackingConfidence: 0.5 });
        lm = await make("GPU").catch(() => make("CPU"));
      } catch { return fail("Haath control nahi chala: hand model download nahi hua."); }
      if (stop) { try { lm.close(); } catch {} return; }
      try { stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: "user" }, audio: false }); }
      catch (e) { try { lm.close(); } catch {} return fail(e?.name === "NotAllowedError" ? "Camera ki ijazat nahi mili. Address bar mein camera Allow karein." : "Camera nahi mila ya koi aur app istemal kar rahi hai."); }
      if (stop) { stream.getTracks().forEach((t) => t.stop()); return; }
      const v = videoRef.current;
      v.srcObject = stream; await v.play().catch(() => {});
      setReady(true);
      say("Haath control On: khula haath = sunna, swipe = badlo, pinch = select.");
      let lastT = 0;
      const loop = () => {
        if (stop) return;
        raf = requestAnimationFrame(loop);
        const now = performance.now();
        if (now - lastT < 66 || v.readyState < 2) return; // ~15 fps kaafi hai
        lastT = now;
        let res = null; try { res = lm.detectForVideo(v, now); } catch { return; }
        const out = tracker.update(res?.landmarks?.[0], now);
        const cur = out.cursor ? { x: out.cursor.x * window.innerWidth, y: out.cursor.y * window.innerHeight, pinch: !!out.pinching } : null;
        setCursor(cur);
        const el = cur ? document.elementFromPoint(cur.x, cur.y)?.closest("button, a, [role=button], input, select") : null;
        if (el !== hover) { hover?.classList.remove("gx-hover"); el?.classList.add("gx-hover"); hover = el; }
        for (const e of out.events) {
          setLast(LABEL[e] || e);
          if (e === "palm") cb.current.onPalm?.();
          else if (e === "swipe-left" || e === "swipe-right") cb.current.onSwipe?.(e === "swipe-right" ? 1 : -1);
          else if (e === "pinch" && el && !el.closest("[data-gesture-ignore]")) { if (/^(INPUT|SELECT)$/.test(el.tagName)) el.focus(); else el.click(); }
        }
      };
      loop();
    })();
    return () => {
      stop = true; cancelAnimationFrame(raf); setReady(false); setCursor(null);
      document.querySelectorAll(".gx-hover").forEach((x) => x.classList.remove("gx-hover"));
      try { stream?.getTracks().forEach((t) => t.stop()); } catch {}
      try { lm?.close(); } catch {}
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <>
      <style>{`.gx-cam{position:fixed;right:12px;bottom:12px;width:132px;border-radius:12px;overflow:hidden;border:1px solid var(--hi,rgba(127,227,255,.5));box-shadow:0 0 18px color-mix(in srgb,var(--accent,#1e8cff) 40%,transparent);z-index:60;background:#000c;pointer-events:none}
.gx-cam video{width:100%;display:block;transform:scaleX(-1);opacity:.85}.gx-cam span{position:absolute;left:0;right:0;bottom:0;font-size:10px;padding:2px 6px;background:#000a;color:#cfe8ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gx-cur{position:fixed;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;border:2px solid var(--accent,#7fe3ff);box-shadow:0 0 12px var(--accent,#7fe3ff);pointer-events:none;z-index:70;transition:transform .08s}.gx-cur.p{transform:scale(.6);background:var(--accent,#7fe3ff)}
.gx-hover{outline:2px solid var(--accent,#7fe3ff)!important;outline-offset:2px}`}</style>
      <div className="gx-cam" aria-hidden="true"><video ref={videoRef} muted playsInline /><span>{ready ? last || "Haath dikhayein" : "Load…"}</span></div>
      {cursor && <div className={"gx-cur" + (cursor.pinch ? " p" : "")} style={{ left: cursor.x, top: cursor.y }} />}
    </>
  );
}
