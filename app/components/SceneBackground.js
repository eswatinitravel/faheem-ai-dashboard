"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// v3.16 Main chatboard background (Options > Display > Background): "desert" (default) / "dna" / "off".
// Purple Desert = getlayers.ai free layer video. DNA = apna Three.js helix (GetLayers ka premium DNA istemal nahi).
export const BG_SCENES = [
  { id: "desert", name: "Purple Desert (GetLayers free video)" },
  { id: "dna", name: "DNA (apna 3D helix, halka)" },
  { id: "off", name: "Off" },
];
export const DESERT = { src: "/backgrounds/purple-desert.mp4", poster: "/backgrounds/purple-desert.webp" };

const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function DesertVideo() {
  const ref = useRef(null);
  const [still, setStill] = useState(false);
  useEffect(() => {
    setStill(reduced());
    const vis = () => { const v = ref.current; if (!v) return; if (document.hidden) v.pause(); else v.play?.().catch(() => {}); };
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, []);
  return still
    ? <img className="bgscene-media" src={DESERT.poster} alt="" data-bg-poster />
    : <video ref={ref} className="bgscene-media" src={DESERT.src} poster={DESERT.poster} autoPlay muted loop playsInline preload="auto" data-bg-video />;
}

// DNA double helix: 30fps had, half resolution, tab chhupa = ruk, reduced motion = ek ruka hua frame.
export function DnaHelix() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "low-power" }); } catch { return; }
    const scale = 0.5;
    renderer.setPixelRatio(1);
    el.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%"; renderer.domElement.style.height = "100%";
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 100); cam.position.set(0, 0, 16);
    scene.add(new THREE.AmbientLight(0xb8b2d8, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(4, 6, 8); scene.add(key);
    const rim = new THREE.PointLight(0x8f7fd9, 2.2, 40); rim.position.set(-6, -4, 6); scene.add(rim);
    const helix = new THREE.Group();
    const violet = new THREE.MeshStandardMaterial({ color: 0x9d8ee0, metalness: 0.6, roughness: 0.25, transparent: true, opacity: 0.9 });
    const silver = new THREE.MeshStandardMaterial({ color: 0xdedbea, metalness: 0.85, roughness: 0.2, transparent: true, opacity: 0.85 });
    const rung = new THREE.MeshStandardMaterial({ color: 0xc9c4e0, metalness: 0.4, roughness: 0.4, transparent: true, opacity: 0.35 });
    const ball = new THREE.SphereGeometry(0.32, 16, 12);
    const N = 44, H = 22, R = 2.2;
    for (let i = 0; i < N; i++) {
      const t = i / N, a = t * Math.PI * 6, y = (t - 0.5) * H;
      const p1 = new THREE.Vector3(Math.cos(a) * R, y, Math.sin(a) * R), p2 = new THREE.Vector3(-Math.cos(a) * R, y, -Math.sin(a) * R);
      const m1 = new THREE.Mesh(ball, violet); m1.position.copy(p1); helix.add(m1);
      const m2 = new THREE.Mesh(ball, silver); m2.position.copy(p2); helix.add(m2);
      if (i % 2 === 0) {
        const len = p1.distanceTo(p2);
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, len, 6), rung);
        c.position.copy(p1).add(p2).multiplyScalar(0.5);
        c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize());
        helix.add(c);
      }
    }
    helix.rotation.z = 0.5; helix.position.x = 4.5;
    scene.add(helix);
    const size = () => { const w = el.clientWidth || innerWidth, h = el.clientHeight || innerHeight; renderer.setSize(Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale)), false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    size(); addEventListener("resize", size);
    let raf = 0, last = 0; const still = reduced();
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden || now - last < 33) return; // 30fps had
      last = now;
      helix.rotation.y = now * 0.00035;
      renderer.render(scene, cam);
    };
    if (still) { helix.rotation.y = 0.6; renderer.render(scene, cam); } else raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", size); renderer.dispose(); try { el.removeChild(renderer.domElement); } catch {} };
  }, []);
  return <div ref={ref} className="bgscene-media dna" data-bg-dna />;
}

export default function SceneBackground({ scene = "desert" }) {
  if (scene === "off") return null;
  return (
    <div className="bgscene" aria-hidden="true" data-bgscene={scene}>
      {scene === "dna" ? <DnaHelix /> : <DesertVideo />}
      <div className="bgscene-shade" />
    </div>
  );
}
