// v3.17 Ops store: chhoti JSON files ~/.faheem-ai/ops/ mein. Har likhai pehle .tmp phir rename (crash par file kharab nahi hoti).
import fs from "fs";
import os from "os";
import path from "path";

export const opsDir = () => process.env.FAHEEM_OPS_DIR || path.join(/*turbopackIgnore: true*/ os.homedir(), ".faheem-ai", "ops");

export function readJson(name, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(opsDir(), name), "utf8")); } catch { return fallback; }
}

export function writeJson(name, value) {
  const dir = opsDir();
  fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, name);
  const tmp = `${f}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, f);
  return value;
}

export function appendLine(name, obj) {
  const dir = opsDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(path.join(dir, name), JSON.stringify(obj) + "\n");
}

export function readLines(name, limit = 200) {
  try {
    const lines = fs.readFileSync(path.join(opsDir(), name), "utf8").trim().split("\n").filter(Boolean);
    return lines.slice(-limit).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean).reverse();
  } catch { return []; }
}

export const newId = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
