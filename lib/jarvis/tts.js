// v3.26.1: laptop par KittenTTS 2 nano (offline Urdu/Hindi) ke liye pip packages lage hain? (5 minute cache)
import { execFile } from "child_process";
import { PY } from "./stt.js";
let ready = null, checkedAt = 0;
export function kittenReady() {
  if (ready !== null && Date.now() - checkedAt < 300000) return Promise.resolve(ready);
  return new Promise((res) => execFile(PY, ["-c", "import onnxruntime, numpy, phonemizer, espeakng_loader"], { timeout: 20000, windowsHide: true }, (e) => { ready = !e; checkedAt = Date.now(); res(ready); }));
}
export const KITTEN_VOICES = ["priya", "ananya", "arjun", "vikram"];
