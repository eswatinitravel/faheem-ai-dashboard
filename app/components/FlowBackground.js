"use client";
import { useEffect, useRef } from "react";

// v3.15 "Flowstate" 3D background — GetLayers.ai ke free templates se inspired (apna shader, un ka koi code/prompt nahi).
// Halka: 1 WebGL quad, half-resolution, 30fps had, tab chhupa ho to ruk jata hai, reduced-motion par sirf ek frame.
const FRAG = `precision mediump float;
uniform vec2 r; uniform float t; uniform vec3 c1; uniform vec3 c2; uniform vec3 c3;
float n(vec2 p){ return sin(p.x)*sin(p.y); }
void main(){
  vec2 uv = gl_FragCoord.xy / r; vec2 p = (gl_FragCoord.xy - .5*r) / r.y;
  float a = t*.12;
  for(int i=1;i<5;i++){ float f=float(i); p += vec2(.55/f*sin(f*p.y*1.6+a+f*.7), .45/f*cos(f*p.x*1.3-a*1.2+f)); }
  float band = .5+.5*sin(p.x*2.2+p.y*1.4);
  float glow = smoothstep(.15,.0,abs(sin(p.y*3.0+p.x)*.5));
  vec3 col = mix(c1, c2, band); col = mix(col, c3, glow*.55);
  float v = smoothstep(1.25,.25,length(uv-.5)*1.6);
  gl_FragColor = vec4(col*(.35+.65*v), 1.);
}`;
const VERT = "attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }";
const hex = (h, d) => { const m = String(h || "").trim().match(/^#?([0-9a-f]{6})$/i); if (!m) return d; const n = parseInt(m[1], 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

export default function FlowBackground() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; const gl = c && c.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) { c?.setAttribute("data-fallback", "1"); return; }
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(pr); gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (n) => gl.getUniformLocation(pr, n);
    const css = getComputedStyle(document.documentElement);
    gl.uniform3fv(U("c1"), hex(css.getPropertyValue("--bg"), [0.02, 0.02, 0.03]));
    gl.uniform3fv(U("c2"), hex(css.getPropertyValue("--accent"), [1, 0.23, 0.23]));
    gl.uniform3fv(U("c3"), hex(css.getPropertyValue("--accent2"), [1, 0.48, 0.35]));
    const scale = 0.5;
    const size = () => { c.width = Math.max(1, Math.round(innerWidth * scale)); c.height = Math.max(1, Math.round(innerHeight * scale)); gl.viewport(0, 0, c.width, c.height); gl.uniform2f(U("r"), c.width, c.height); };
    size(); addEventListener("resize", size);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, last = 0; const t0 = performance.now();
    const draw = (now) => { gl.uniform1f(U("t"), (now - t0) / 1000); gl.drawArrays(gl.TRIANGLES, 0, 3); };
    const loop = (now) => { raf = requestAnimationFrame(loop); if (document.hidden || now - last < 33) return; last = now; draw(now); };
    if (reduce) draw(t0 + 4000); else raf = requestAnimationFrame(loop);
    c.setAttribute("data-running", reduce ? "0" : "1");
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", size); };
  }, []);
  return <canvas ref={ref} className="flowbg" aria-hidden="true" data-flowbg />;
}
