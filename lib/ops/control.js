// v3.17 Pause All (Nexa): ek button se saari automation (Agent, queue, schedule) foran ruk jaati hai.
import { readJson, writeJson } from "./store.js";
import { audit } from "./audit.js";

export const isPaused = () => !!readJson("control.json", {}).paused;

export function setPaused(paused, by = "user") {
  writeJson("control.json", { paused: !!paused, at: new Date().toISOString(), by });
  audit(paused ? "pause_all" : "resume_all", paused ? "Saari automation rok di gayi" : "Automation dobara chalu");
  return isPaused();
}
