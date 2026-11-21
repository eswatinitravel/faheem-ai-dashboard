// v3.24: laptop par faster-whisper laga hai? (5 minute cache)
import { execFile } from "child_process";
export const PY = process.platform === "win32" ? "python" : "python3";
let ready = null, checkedAt = 0;
export function localSttReady() {
  if (ready !== null && Date.now() - checkedAt < 300000) return Promise.resolve(ready);
  return new Promise((res) => execFile(PY, ["-c", "import faster_whisper"], { timeout: 15000, windowsHide: true }, (e) => { ready = !e; checkedAt = Date.now(); res(ready); }));
}
