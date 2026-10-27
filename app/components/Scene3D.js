"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

// v2.6 3D core (Stitch-style): a liquid gradient orb with noise displacement + fresnel glow,
// a soft halo, thin orbit lines and floating dust.
// mode: "idle" | "listening" | "thinking" | "speaking"; levelRef: live mic volume 0..1
const NOISE = `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

export default function Scene3D({ mode = "idle", levelRef }) {
  const mount = useRef(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    const el = mount.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return; // no WebGL: CSS aurora still shows
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 0.1, 100);
    camera.position.z = 8;

    const group = new THREE.Group();
    group.position.x = 0.6;
    scene.add(group);

    const uniforms = {
      uTime: { value: 0 },
      uAmp: { value: 0.22 },
      uColA: { value: new THREE.Color(0x6d5dfc) },
      uColB: { value: new THREE.Color(0x22d3ee) },
      uColC: { value: new THREE.Color(0xf472b6) },
    };
    const orbMat = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      vertexShader: `${NOISE}
        uniform float uTime; uniform float uAmp;
        varying vec3 vN; varying vec3 vView; varying float vD;
        void main(){
          float d = snoise(normal*1.3 + vec3(uTime*0.35)) * uAmp + snoise(normal*3.0 - uTime*0.5) * uAmp*0.35;
          vD = d;
          vec3 p = position + normal * d;
          vec4 mv = modelViewMatrix * vec4(p,1.0);
          vN = normalize(normalMatrix * normal);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 uColA; uniform vec3 uColB; uniform vec3 uColC; uniform float uTime;
        varying vec3 vN; varying vec3 vView; varying float vD;
        void main(){
          float fres = pow(1.0 - max(dot(vN, vView), 0.0), 2.2);
          float mixer = 0.5 + 0.5*sin(vN.y*2.5 + uTime*0.6 + vD*4.0);
          vec3 base = mix(uColA, uColB, mixer);
          base = mix(base, uColC, smoothstep(0.55, 1.0, vN.x*0.5+0.5) * 0.45);
          vec3 col = base*0.55 + fres*mix(uColB, vec3(1.0), 0.35)*1.3;
          gl_FragColor = vec4(col, 0.92);
        }`,
    });
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35, 64), orbMat);
    group.add(orb);

    // soft halo sprite
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, "rgba(140,120,255,0.55)");
    grd.addColorStop(0.4, "rgba(80,180,255,0.18)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.set(6.5, 6.5, 1);
    group.add(halo);

    const rings = [2.2, 2.6].map((r, i) => {
      const m = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.005, 8, 256),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.14 - i * 0.04 })
      );
      m.rotation.x = Math.PI / 2.2 + i * 0.3;
      m.rotation.y = i * 0.5;
      group.add(m);
      return m;
    });

    const count = 900;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 18;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 14 - 4;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const dust = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xc7d2fe, size: 0.025, transparent: true, opacity: 0.5 }));
    scene.add(dust);

    const palette = {
      idle: [0x6d5dfc, 0x22d3ee, 0xf472b6],
      listening: [0x10b981, 0x6ee7b7, 0x22d3ee],
      thinking: [0xf59e0b, 0x8b5cf6, 0xf472b6],
      speaking: [0x22d3ee, 0x818cf8, 0xe879f9],
    };
    const tmp = new THREE.Color();

    let mx = 0, my = 0;
    const onMove = (e) => { mx = (e.clientX / window.innerWidth - 0.5) * 0.6; my = (e.clientY / window.innerHeight - 0.5) * 0.6; };
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
    const scaleV = new THREE.Vector3();
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      const m = modeRef.current;
      smooth += ((levelRef?.current || 0) - smooth) * 0.2;
      const speed = m === "thinking" ? 2.6 : m === "speaking" ? 1.8 : 1;
      uniforms.uTime.value += 0.016 * speed;

      const [a, b, cc] = palette[m] || palette.idle;
      uniforms.uColA.value.lerp(tmp.set(a), 0.05);
      uniforms.uColB.value.lerp(tmp.set(b), 0.05);
      uniforms.uColC.value.lerp(tmp.set(cc), 0.05);

      let amp = 0.2, s = 1 + Math.sin(t * 1.2) * 0.02;
      if (m === "listening") { amp = 0.22 + smooth * 0.6; s = 1 + smooth * 0.35; }
      if (m === "speaking") { amp = 0.3 + Math.abs(Math.sin(t * 8)) * 0.12; s = 1.03; }
      if (m === "thinking") { amp = 0.34; s = 1 + Math.sin(t * 5) * 0.03; }
      uniforms.uAmp.value += (amp - uniforms.uAmp.value) * 0.08;
      group.scale.lerp(scaleV.set(s, s, s), 0.2);

      orb.rotation.y += 0.002 * speed;
      rings.forEach((r, i) => (r.rotation.z += (0.001 + i * 0.0007) * speed));
      dust.rotation.y += 0.0002;
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
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, [levelRef]);

  return <div ref={mount} className="scene" aria-hidden="true" />;
}
