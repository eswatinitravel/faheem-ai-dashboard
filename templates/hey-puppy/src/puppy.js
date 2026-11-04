// Hey Puppy 3D: apna Three.js procedural safed puppy (koi bahar ka model nahi) + Meta-AI jaisa glowing orb (Settings se).
// Emotions: happy (dum hilana), excited (chhalang), sad, sleepy, curious (sar tedha), listening (kaan khade), thinking, playful (bhonkna), love (dil).
import * as THREE from "../node_modules/three/build/three.module.js";

const api = window.api || { on: () => {}, mood: () => {}, showChat: () => {}, drag: () => {}, poke: () => {}, getAvatar: async () => "puppy" };
const stage = document.getElementById("stage");
const bubble = document.getElementById("bubble");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power", preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setClearColor(0x000000, 0);
stage.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
cam.position.set(0, 1.2, 7.2); cam.lookAt(0, 0.9, 0);
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7fb0, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.3); sun.position.set(3, 5, 4); scene.add(sun);

const white = new THREE.MeshStandardMaterial({ color: 0xfbfaf7, roughness: 0.75 });
const cream = new THREE.MeshStandardMaterial({ color: 0xefe6da, roughness: 0.8 });
const dark = new THREE.MeshStandardMaterial({ color: 0x1b1b22, roughness: 0.35 });
const pink = new THREE.MeshStandardMaterial({ color: 0xff8fa8, roughness: 0.6 });
const red = new THREE.MeshStandardMaterial({ color: 0xff4d6d, roughness: 0.4, emissive: 0x551020 });
const sph = (r, m, s = [1, 1, 1]) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 18), m); o.scale.set(...s); return o; };

// ---------- Puppy ----------
const puppy = new THREE.Group(); scene.add(puppy);
const body = sph(0.75, white, [1.25, 0.9, 0.9]); body.position.set(0, 0.85, 0); puppy.add(body);
const chest = sph(0.45, cream, [1, 1, 0.8]); chest.position.set(0.55, 0.85, 0); puppy.add(chest);
const headPivot = new THREE.Group(); headPivot.position.set(0.85, 1.45, 0); puppy.add(headPivot);
const head = sph(0.55, white); headPivot.add(head);
const snout = sph(0.28, cream, [1.2, 0.85, 1]); snout.position.set(0.42, -0.12, 0); headPivot.add(snout);
const nose = sph(0.09, dark); nose.position.set(0.74, -0.04, 0); headPivot.add(nose);
const eyeL = sph(0.075, dark), eyeR = sph(0.075, dark); eyeL.position.set(0.38, 0.12, 0.25); eyeR.position.set(0.38, 0.12, -0.25); headPivot.add(eyeL, eyeR);
const blushL = sph(0.07, pink, [1, 0.6, 1]), blushR = blushL.clone(); blushL.position.set(0.3, -0.08, 0.38); blushR.position.set(0.3, -0.08, -0.38); headPivot.add(blushL, blushR);
const tongue = sph(0.08, pink, [1, 0.5, 1.2]); tongue.position.set(0.55, -0.32, 0); tongue.visible = false; headPivot.add(tongue);
const earL = new THREE.Group(), earR = new THREE.Group(); earL.position.set(-0.05, 0.38, 0.32); earR.position.set(-0.05, 0.38, -0.32);
const earMeshL = sph(0.2, cream, [0.6, 1.4, 0.35]); earMeshL.position.y = -0.18; earL.add(earMeshL);
const earMeshR = earMeshL.clone(); earR.add(earMeshR); headPivot.add(earL, earR);
const legs = [];
for (const [x, z] of [[0.55, 0.35], [0.55, -0.35], [-0.55, 0.35], [-0.55, -0.35]]) { const g = new THREE.Group(); g.position.set(x, 0.55, z); const l = sph(0.17, white, [1, 2.1, 1]); l.position.y = -0.3; g.add(l); puppy.add(g); legs.push(g); }
const tailPivot = new THREE.Group(); tailPivot.position.set(-0.9, 1.1, 0); puppy.add(tailPivot);
const tail = sph(0.12, white, [1, 2.6, 1]); tail.position.y = 0.28; tailPivot.add(tail); tailPivot.rotation.z = 0.7;
// Dil (love) aur Zzz (sleepy) - shapes, emoji nahi
const heart = new THREE.Group();
{ const a = sph(0.12, red), b = sph(0.12, red), c = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.25, 20), red); a.position.set(-0.08, 0, 0); b.position.set(0.08, 0, 0); c.rotation.z = Math.PI; c.position.y = -0.14; heart.add(a, b, c); }
heart.position.set(0.9, 2.4, 0); heart.visible = false; scene.add(heart);
const thinkDots = new THREE.Group(); for (let i = 0; i < 3; i++) { const d = sph(0.06 + i * 0.02, white); d.position.set(1.3 + i * 0.22, 2.1 + i * 0.22, 0); thinkDots.add(d); } thinkDots.visible = false; scene.add(thinkDots);

// ---------- Orb (Meta-AI jaisa glowing gradient) ----------
const orbMat = new THREE.ShaderMaterial({
  transparent: true,
  uniforms: { t: { value: 0 }, energy: { value: 0.5 } },
  vertexShader: "varying vec3 vN; varying vec3 vP; void main(){ vN=normalize(normalMatrix*normal); vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
  fragmentShader: "uniform float t; uniform float energy; varying vec3 vN; varying vec3 vP; void main(){ float f=pow(1.0-abs(vN.z),2.0); vec3 a=vec3(0.36,0.42,1.0), b=vec3(0.85,0.30,0.95), c=vec3(0.15,0.85,0.95); float k=0.5+0.5*sin(vP.y*3.0+t*1.6); float j=0.5+0.5*sin(vP.x*2.5-t*1.1); vec3 col=mix(mix(a,b,k),c,j*0.6); gl_FragColor=vec4(col*(0.75+energy*0.6)+f*0.6, 0.55+f*0.45); }",
});
const orb = new THREE.Mesh(new THREE.SphereGeometry(1.0, 48, 32), orbMat); orb.position.set(0, 1.1, 0); orb.visible = false; scene.add(orb);

let avatar = "puppy";
function setAvatar(a) { avatar = a === "orb" ? "orb" : "puppy"; puppy.visible = avatar === "puppy"; orb.visible = avatar === "orb"; }

// ---------- State ----------
const MOODS = ["happy", "excited", "sad", "sleepy", "curious", "listening", "thinking", "playful", "love"];
let mood = "happy", mode = "sit", dir = -1, moodUntil = 0;
const SAY = { happy: "", excited: "Wah!", sad: "Oh...", sleepy: "Zzz", curious: "Hmm?", listening: "Sun raha hoon", thinking: "Soch raha hoon...", playful: "Woof! Woof!", love: "Pyar!" };
function say(t, ms = 2500) { if (!t) return; bubble.textContent = t; bubble.classList.add("on"); clearTimeout(say.t); say.t = setTimeout(() => bubble.classList.remove("on"), ms); }
function setMood(m) { if (!MOODS.includes(m)) return; mood = m; moodUntil = performance.now() + (m === "listening" || m === "thinking" ? 60000 : 6000); say(SAY[m]); document.body.dataset.mood = m; }
function setState(s) { if (!s) return; mode = s.mode || mode; if (s.dir) dir = s.dir; document.body.dataset.mode = mode; if (mode === "sleep") setMood("sleepy"); }

// ---------- Animation (30fps had, tab chhupa = ruk) ----------
let last = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (document.hidden || now - last < 33) return; last = now;
  const t = now / 1000, m = performance.now() > moodUntil && mode !== "sleep" ? "happy" : mood;
  puppy.rotation.y = dir > 0 ? -0.6 : Math.PI + 0.6; // 3/4 chehra camera ki taraf
  // defaults
  let wag = 0.15, wagSpeed = 4, jump = 0, headTilt = 0, headDown = 0, earUp = 0, eyeClose = 1;
  heart.visible = false; thinkDots.visible = false; tongue.visible = false;
  if (m === "happy") { wag = 0.6; wagSpeed = 12; tongue.visible = true; }
  if (m === "excited") { wag = 0.8; wagSpeed = 18; jump = Math.abs(Math.sin(t * 7)) * 0.45; tongue.visible = true; }
  if (m === "sad") { wag = 0.05; headDown = 0.35; earUp = -0.5; tailPivot.rotation.z = 1.9; }
  if (m === "sleepy") { wag = 0; headDown = 0.55; eyeClose = 0.15; earUp = -0.3; }
  if (m === "curious") { headTilt = 0.35 * Math.sin(t * 1.5) + 0.25; earUp = 0.3; }
  if (m === "listening") { earUp = 0.9; headTilt = 0.15; wag = 0.25; }
  if (m === "thinking") { thinkDots.visible = true; thinkDots.children.forEach((d, i) => (d.position.y = 2.1 + i * 0.22 + Math.sin(t * 4 + i) * 0.05)); headTilt = -0.2; }
  if (m === "playful") { wag = 0.9; wagSpeed = 20; jump = Math.abs(Math.sin(t * 9)) * 0.2; tongue.visible = Math.sin(t * 9) > 0; headDown = Math.sin(t * 9) * 0.12; }
  if (m === "love") { heart.visible = true; heart.position.y = 2.3 + Math.sin(t * 3) * 0.12; heart.scale.setScalar(1 + Math.sin(t * 6) * 0.12); wag = 0.7; wagSpeed = 10; }
  if (m !== "sad") tailPivot.rotation.z = 0.7;
  tailPivot.rotation.x = Math.sin(t * wagSpeed) * wag;
  headPivot.rotation.x = headTilt; headPivot.rotation.z = -headDown;
  earL.rotation.z = earR.rotation.z = -0.3 - earUp * 0.6; earL.rotation.x = 0.25; earR.rotation.x = -0.25;
  eyeL.scale.y = eyeR.scale.y = eyeClose * (Math.sin(t * 0.7) > 0.985 ? 0.1 : 1);
  // chalna / baithna / sona
  const walking = mode === "walk" && m !== "sleepy";
  legs.forEach((g, i) => { g.rotation.z = walking ? Math.sin(t * 10 + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * 0.5 : 0; });
  const sitting = mode === "sit" && !walking, sleeping = mode === "sleep" || m === "sleepy";
  body.rotation.z = sitting ? 0.35 : 0; legs[2].visible = legs[3].visible = !sitting || true;
  puppy.position.y = (sleeping ? -0.35 : sitting ? -0.1 : 0) + jump + (walking ? Math.abs(Math.sin(t * 10)) * 0.05 : 0);
  orbMat.uniforms.t.value = t; orbMat.uniforms.energy.value = m === "listening" || m === "thinking" ? 1 : m === "sleepy" ? 0.1 : 0.5;
  orb.scale.setScalar(1 + Math.sin(t * (m === "listening" ? 6 : 2)) * 0.04);
  renderer.render(scene, cam);
}
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); }
addEventListener("resize", resize); resize();
if (reduce) { setTimeout(() => renderer.render(scene, cam), 50); } else requestAnimationFrame(frame);

// ---------- Drag + clicks ----------
let dragging = false, lx = 0, ly = 0, moved = 0;
stage.addEventListener("mousedown", (e) => { dragging = true; lx = e.screenX; ly = e.screenY; moved = 0; api.poke(); });
addEventListener("mousemove", (e) => { if (!dragging) return; const dx = e.screenX - lx, dy = e.screenY - ly; lx = e.screenX; ly = e.screenY; moved += Math.abs(dx) + Math.abs(dy); if (dx || dy) api.drag(dx, dy); });
addEventListener("mouseup", () => { if (dragging && moved < 4) { setMood(Math.random() < 0.5 ? "playful" : "love"); } dragging = false; });
stage.addEventListener("dblclick", () => api.showChat());

api.on("mood", setMood);
api.on("state", setState);
api.on("avatar", setAvatar);
api.getAvatar().then(setAvatar).catch(() => {});
window.puppy = { setMood, setState, setAvatar, MOODS, get mood() { return mood; }, get avatar() { return avatar; } };
setMood("happy");
