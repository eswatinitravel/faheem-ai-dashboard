// v3.17 Data export (Nexa): saara apna data ek JSON mein. API keys kabhi shamil nahi.
import fs from "fs";
import os from "os";
import path from "path";
import { readJson, readLines } from "./store.js";

export function exportAll() {
  const home = path.join(os.homedir(), ".faheem-ai");
  const safeRead = (f) => { try { return JSON.parse(fs.readFileSync(path.join(home, f), "utf8")); } catch { return null; } };
  return {
    exportedAt: new Date().toISOString(),
    note: "API keys is file mein shamil nahi.",
    jobs: readJson("jobs.json", []), approvals: readJson("approvals.json", []), schedules: readJson("schedules.json", []),
    audit: readLines("audit.jsonl", 5000), notifications: readLines("notifications.jsonl", 2000),
    brainOrder: safeRead("brain-order.json"), memory: safeRead("memory.json"), learned: safeRead("learned.json"),
  };
}
