// v3.20 Model Autopilot (idea: Linger ka "Model Autopilot", code apna).
// Laptop ka RAM/GPU dekh kar behtareen Ollama model batata hai, check karta hai laga hai ya nahi, aur ek click se pull.
import os from "os";
import { fetchWithTimeout, TIMEOUTS } from "./net.js";
import { execFile } from "child_process";

const OLLAMA = () => (process.env.OLLAMA_URL || "http://localhost:11434").replace(/\/$/, "");

// Tier: kitni memory, kaun sa model (chhote se bade). VRAM ho to woh, warna RAM ka hissa.
const TIERS = [
  { min: 0, model: "llama3.2:1b", why: "bohat kam memory: sirf chhota model" },
  { min: 4, model: "llama3.2:3b", why: "4-8 GB: tez aur halka" },
  { min: 8, model: "qwen2.5:7b", why: "8-12 GB: achi Urdu/English aur code" },
  { min: 13, model: "qwen2.5:14b", why: "12-16 GB: zyada samajhdar" },
  { min: 22, model: "qwen2.5-coder:32b", why: "24 GB+: code ke liye behtareen" },
];
const CODER = { 4: "qwen2.5-coder:3b", 8: "qwen2.5-coder:7b", 13: "qwen2.5-coder:14b", 22: "qwen2.5-coder:32b" };

function run(cmd, args, ms = 4000) {
  return new Promise((res) => {
    try { execFile(cmd, args, { timeout: ms, windowsHide: true }, (e, out) => res(e ? "" : String(out || ""))); } catch { res(""); }
  });
}

export async function detectHardware() {
  const ramGb = +(os.totalmem() / 1073741824).toFixed(1);
  let gpu = null;
  const nv = await run("nvidia-smi", ["--query-gpu=name,memory.total", "--format=csv,noheader,nounits"]);
  if (nv.trim()) { const [name, mb] = nv.trim().split("\n")[0].split(",").map((s) => s.trim()); gpu = { name, vramGb: +(Number(mb) / 1024).toFixed(1) }; }
  const apple = process.platform === "darwin" && os.arch() === "arm64";
  // Apple chips RAM share karte hain (~70% model ke liye); NVIDIA par VRAM; baqi CPU par RAM ka ~50%.
  const budget = gpu ? gpu.vramGb + Math.min(ramGb * 0.25, 8) : apple ? ramGb * 0.7 : ramGb * 0.6;
  return { os: `${os.type()} ${os.arch()}`, cpu: os.cpus()?.[0]?.model || "", cores: os.cpus()?.length || 0, ramGb, gpu, apple, budgetGb: +budget.toFixed(1) };
}

export function recommend(hw) {
  const t = [...TIERS].reverse().find((x) => hw.budgetGb >= x.min) || TIERS[0];
  return { model: t.model, coder: CODER[t.min] || null, why: t.why, speed: hw.gpu || hw.apple ? "GPU par tez" : "sirf CPU: thora aahista" };
}

export async function ollamaStatus() {
  try {
    const r = await fetch(`${OLLAMA()}/api/tags`, { cache: "no-store", signal: AbortSignal.timeout(3000) });
    if (!r.ok) return { running: false, models: [] };
    const d = await r.json();
    return { running: true, models: (d.models || []).map((m) => ({ name: m.name, gb: +((m.size || 0) / 1073741824).toFixed(1) })) };
  } catch { return { running: false, models: [] }; }
}

export async function autopilot(current = "llama3.2:3b") {
  const hw = await detectHardware();
  const rec = recommend(hw);
  const ol = await ollamaStatus();
  const has = (m) => ol.models.some((x) => x.name === m || x.name === `${m}:latest`);
  return { hw, rec, ollama: ol, installed: { model: has(rec.model), coder: rec.coder ? has(rec.coder) : false }, current: current };
}

// Pull: Ollama khud download karta hai; hum stream ko aakhri status tak parhte hain.
export async function pullModel(name) {
  if (!/^[a-z0-9._:-]{2,60}$/i.test(String(name || ""))) throw new Error("Model ka naam ghalat hai");
  // v3.29: model kai GB ka ho sakta hai — had ek ghanta, phir saaf paigham (pehle hamesha ruka reh sakta tha).
  let r;
  try { r = await fetchWithTimeout(`${OLLAMA()}/api/pull`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, stream: false }) }, { ms: TIMEOUTS.ollamaPull, what: "Ollama (model download)" }); }
  catch (e) { if (e.timeout) throw e; throw new Error("Ollama se raabta nahi hua. Kya Ollama chal raha hai? (ollama.com se install karein)"); }
  if (!r.ok) throw new Error(`Ollama: ${r.status}. Kya Ollama chal raha hai? (ollama.com se install karein)`);
  const d = await r.json().catch(() => ({}));
  if (d.error) throw new Error(d.error);
  return { ok: true, status: d.status || "success" };
}
