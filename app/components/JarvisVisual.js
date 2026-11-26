"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

// v3.30 Jarvis ka naya look (user ke Pinterest pins se):
//  "torus" = mission-control particle chhalla (Jarvis ka dimaagh)
//  "wave"  = kaali/safed particle lehar, awaz ke saath uthti hai
//  "ghost" = safed ghost, chamakti neeli aankhein (bolte waqt tez)
//  "classic" = purana gola (koi 3D nahi)
export const JV_LOOKS = [
  { id: "torus", name: "Orb chhalla" },
  { id: "wave", name: "Particle lehar" },
  { id: "ghost", name: "Ghost dost" },
  { id: "classic", name: "Classic" },
];
const KEY = "jv-look";
export function savedLook() {
  try { const v = localStorage.getItem(KEY); if (JV_LOOKS.some((l) => l.id === v)) return v; } catch {}
  return "torus";
}
export function saveLook(v) { try { localStorage.setItem(KEY, v); } catch {} }

const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const MODE_COLOR = { idle: 0x6f8cff, listening: 0x5dffa8, thinking: 0xffc95c, speaking: 0xb388ff };

function dotTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.35, "rgba(255,255,255,.55)"); r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function torusPoints() {
  const pts = []; const R = 1.25, r = 0.45;
  for (let i = 0; i < 90; i++) for (let j = 0; j < 30; j++) {
    const u = (i / 90) * Math.PI * 2, v = (j / 30) * Math.PI * 2;
    const jit = 1 + (Math.random() - 0.5) * 0.08;
    pts.push((R + r * Math.cos(v) * jit) * Math.cos(u), r * Math.sin(v) * jit, (R + r * Math.cos(v) * jit) * Math.sin(u));
  }
  return new Float32Array(pts);
}
function wavePoints() {
  const pts = [];
  for (let i = 0; i < 110; i++) for (let j = 0; j < 34; j++) pts.push((i / 109 - 0.5) * 5.2, 0, (j / 33 - 0.5) * 1.6);
  return new Float32Array(pts);
}

function ParticleScene({ kind, mode, level }) {
  const box = useRef(null);
  const live = useRef({ mode, level });
  live.current = { mode, level };
  useEffect(() => {
    const el = box.current; if (!el) return;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { return; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
    cam.position.set(0, kind === "wave" ? 1.3 : 1.6, kind === "wave" ? 3.4 : 4.2); cam.lookAt(0, 0, 0);
    const base = kind === "wave" ? wavePoints() : torusPoints();
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(base); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const tex = dotTexture();
    const mat = new THREE.PointsMaterial({ size: kind === "wave" ? 0.05 : 0.06, map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: MODE_COLOR.idle });
    const pts = new THREE.Points(geo, mat); scene.add(pts);
    // Bokeh: dheeme bade dots peeche
    const bg = new Float32Array(120 * 3); for (let i = 0; i < bg.length; i++) bg[i] = (Math.random() - 0.5) * (i % 3 === 2 ? 3 : 7);
    const bgGeo = new THREE.BufferGeometry(); bgGeo.setAttribute("position", new THREE.BufferAttribute(bg, 3));
    const bgMat = new THREE.PointsMaterial({ size: 0.12, map: tex, transparent: true, opacity: 0.25, depthWrite: false, color: 0xffffff });
    scene.add(new THREE.Points(bgGeo, bgMat));
    const fit = () => { const w = el.clientWidth || 300, h = el.clientHeight || 200; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    fit(); const ro = new ResizeObserver(fit); ro.observe(el);
    const still = reduced(); const col = new THREE.Color(MODE_COLOR.idle); let raf = 0, t = 0, amp = 0;
    const frame = () => {
      const { mode: m, level: lv } = live.current;
      const target = m === "speaking" ? 0.35 + Math.random() * 0.25 : m === "listening" ? Math.min(1, lv * 2.5) : m === "thinking" ? 0.25 : 0.06;
      amp += (target - amp) * 0.12; t += m === "thinking" ? 0.035 : 0.016;
      col.lerp(new THREE.Color(MODE_COLOR[m] || MODE_COLOR.idle), 0.06); mat.color.copy(col);
      if (kind === "wave") {
        for (let k = 0; k < pos.length; k += 3) { const x = base[k], z = base[k + 2]; pos[k + 1] = Math.sin(x * 1.6 + t * 2) * 0.18 * (1 + amp * 3) + Math.cos(z * 3 + t * 1.3) * 0.08 * (1 + amp * 2); }
      } else {
        const s = 1 + amp * 0.18;
        for (let k = 0; k < pos.length; k += 3) { const n = Math.sin(base[k] * 4 + t * 3) * Math.cos(base[k + 2] * 4 + t * 2) * 0.06 * amp; pos[k] = base[k] * (s + n); pos[k + 1] = base[k + 1] * (s + n * 2); pos[k + 2] = base[k + 2] * (s + n); }
        pts.rotation.y += m === "thinking" ? 0.012 : 0.004;
      }
      geo.attributes.position.needsUpdate = true;
      renderer.render(scene, cam);
      if (!still && !document.hidden) raf = requestAnimationFrame(frame); else raf = 0;
    };
    const vis = () => { if (!document.hidden && !raf && !still) raf = requestAnimationFrame(frame); };
    document.addEventListener("visibilitychange", vis);
    frame();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener("visibilitychange", vis); geo.dispose(); bgGeo.dispose(); mat.dispose(); bgMat.dispose(); tex.dispose(); renderer.dispose(); renderer.domElement.remove(); };
  }, [kind]);
  return <div ref={box} className="jvv-canvas" data-jv-look={kind} aria-hidden="true" />;
}

function Ghost({ mode, level }) {
  const glow = mode === "speaking" ? 1 : mode === "listening" ? 0.55 + Math.min(0.45, level * 2) : mode === "thinking" ? 0.4 : 0.3;
  return (
    <svg className={"jvv-ghost " + mode} viewBox="0 0 120 150" aria-hidden="true" data-jv-look="ghost">
      <defs>
        <radialGradient id="jvg-body" cx="50%" cy="35%" r="70%"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#c9d3ee" /></radialGradient>
        <radialGradient id="jvg-eye"><stop offset="0" stopColor="#e9fbff" /><stop offset=".35" stopColor="#4fd2ff" /><stop offset="1" stopColor="#0a3d8f" /></radialGradient>
        <filter id="jvg-blur"><feGaussianBlur stdDeviation="4" /></filter>
      </defs>
      <path d="M60 8c-27 0-44 22-44 50v62c0 6 5 9 9 5l8-8 9 9c3 3 7 3 10 0l8-8 8 8c3 3 7 3 10 0l9-9 8 8c4 4 9 1 9-5V58C104 30 87 8 60 8z" fill="url(#jvg-body)" />
      <ellipse cx="60" cy="58" rx="30" ry="24" fill="#dfe7fb" />
      {[45, 75].map((x) => (
        <g key={x}>
          <circle cx={x} cy="58" r="13" fill="#4fd2ff" opacity={glow * 0.8} filter="url(#jvg-blur)" />
          <circle cx={x} cy="58" r="9" fill="url(#jvg-eye)" opacity={0.55 + glow * 0.45} />
          <circle cx={x - 3} cy="55" r="2" fill="#fff" />
        </g>
      ))}
      {mode === "speaking" && <ellipse cx="60" cy="80" rx="5" ry={2 + Math.random() * 3} fill="#7d8bb5" />}
    </svg>
  );
}

export default function JarvisVisual({ look, mode, level }) {
  if (look === "classic") return null;
  return (
    <div className={"jvv " + look}>
      {look === "ghost" ? <Ghost mode={mode} level={level} /> : <ParticleScene kind={look} mode={mode} level={level} />}
    </div>
  );
}
