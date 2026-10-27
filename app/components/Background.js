"use client";
import { useEffect, useRef } from "react";

// Aura background with small glowing dots moving fast (colour follows the theme's --dot).
export default function Background() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current, ctx = c.getContext("2d");
    let w, h, raf, dots = [];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      w = c.width = innerWidth * dpr; h = c.height = innerHeight * dpr;
      c.style.width = innerWidth + "px"; c.style.height = innerHeight + "px";
      const n = Math.round((innerWidth * innerHeight) / 16000);
      dots = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 3.2 * dpr, vy: (Math.random() - 0.5) * 3.2 * dpr,
        r: (Math.random() * 1.4 + 0.6) * dpr, a: Math.random() * 0.6 + 0.4,
      }));
    };
    resize();
    addEventListener("resize", resize);
    const draw = () => {
      const col = getComputedStyle(document.documentElement).getPropertyValue("--dot").trim() || "255,60,60";
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0) d.x = w; if (d.x > w) d.x = 0; if (d.y < 0) d.y = h; if (d.y > h) d.y = 0;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${col},${d.a})`;
        ctx.shadowColor = `rgba(${col},0.9)`;
        ctx.shadowBlur = 8 * dpr;
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", resize); };
  }, []);
  return (
    <>
      <div className="aura" aria-hidden="true" />
      <canvas ref={ref} className="dots" aria-hidden="true" />
    </>
  );
}
