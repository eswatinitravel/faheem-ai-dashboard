"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

// 3D core: layered wireframe orb, orbit rings and a star field.
// mode: "idle" | "listening" | "thinking" | "speaking"; levelRef: live mic volume 0..1
export default function Scene3D({ mode = "idle", levelRef }) {
  const mount = useRef(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    const el = mount.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, el.clientWidth / el.clientHeight, 0.1, 100);
    camera.position.z = 7;

    const group = new THREE.Group();
    scene.add(group);
    const outerMat = new THREE.MeshBasicMaterial({ color: 0x8b5cf6, wireframe: true, transparent: true, opacity: 0.45 });
    const innerMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, wireframe: true, transparent: true, opacity: 0.75 });
    const outer = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 4), outerMat);
    const inner = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95, 2), innerMat);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 32), new THREE.MeshBasicMaterial({ color: 0xc4b5fd, transparent: true, opacity: 0.25 }));
    group.add(outer, inner, glow);

    const rings = [2.3, 2.75, 3.2].map((r, i) => {
      const m = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.008, 8, 200),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0x8b5cf6 : 0x22d3ee, transparent: true, opacity: 0.45 - i * 0.1 })
      );
      m.rotation.x = Math.PI / 2.3 + i * 0.25;
      m.rotation.y = i * 0.6;
      group.add(m);
      return m;
    });

    const count = 2200;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 5 + Math.random() * 16;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      pos[i * 3 + 2] = r * Math.cos(ph);
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const stars = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xc7d2fe, size: 0.03, transparent: true, opacity: 0.85 }));
    scene.add(stars);

    const colors = {
      idle: [0x8b5cf6, 0x22d3ee],
      listening: [0x10b981, 0x6ee7b7],
      thinking: [0xf59e0b, 0x8b5cf6],
      speaking: [0x22d3ee, 0xe879f9],
    };
    const cA = new THREE.Color(), cB = new THREE.Color();

    let mx = 0, my = 0;
    const onMove = (e) => { mx = (e.clientX / window.innerWidth - 0.5) * 0.8; my = (e.clientY / window.innerHeight - 0.5) * 0.8; };
    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("resize", onResize);

    let raf;
    let smooth = 0;
    const start = performance.now();
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      const m = modeRef.current;
      const level = levelRef?.current || 0;
      smooth += (level - smooth) * 0.2;
      const speed = m === "thinking" ? 3.5 : m === "speaking" ? 2 : 1;

      const [a, b] = colors[m] || colors.idle;
      outerMat.color.lerp(cA.set(a), 0.05);
      innerMat.color.lerp(cB.set(b), 0.05);

      outer.rotation.y += 0.003 * speed;
      outer.rotation.x += 0.0012 * speed;
      inner.rotation.y -= 0.006 * speed;
      inner.rotation.z += 0.002 * speed;
      rings.forEach((r, i) => (r.rotation.z += (0.0015 + i * 0.0008) * speed));

      let s = 1 + Math.sin(t * 1.5) * 0.03;
      if (m === "listening") s = 1 + smooth * 0.9;
      if (m === "speaking") s = 1 + Math.abs(Math.sin(t * 9)) * 0.08 + Math.sin(t * 3.7) * 0.03;
      if (m === "thinking") s = 1 + Math.sin(t * 6) * 0.06;
      group.scale.lerp(new THREE.Vector3(s, s, s), 0.25);
      glow.material.opacity = 0.2 + (s - 1) * 1.2;

      stars.rotation.y += 0.0004;
      camera.position.x += (mx - camera.position.x) * 0.03;
      camera.position.y += (-my - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [levelRef]);

  return <div ref={mount} className="scene" aria-hidden="true" />;
}
