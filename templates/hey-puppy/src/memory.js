// Mustaqil yaad-dasht (laptop par hi): pasand/napasand, "seekha hua" sabaq, skills, action log, reminders.
const fs = require("fs");
const path = require("path");

function createStore(dir, skillsDir) {
  fs.mkdirSync(dir, { recursive: true });
  const file = (n) => path.join(dir, n);
  const read = (n, d) => { try { return JSON.parse(fs.readFileSync(file(n), "utf8")); } catch { return d; } };
  const write = (n, v) => { fs.writeFileSync(file(n), JSON.stringify(v, null, 1)); return v; };
  const store = {
    dir,
    memory: () => read("memory.json", { prefs: [] }).prefs,
    remember(fact) {
      const m = read("memory.json", { prefs: [] }); const f = String(fact || "").trim().slice(0, 300);
      if (f && !m.prefs.includes(f)) { m.prefs.push(f); m.prefs = m.prefs.slice(-200); write("memory.json", m); }
      return m.prefs;
    },
    forget(i) { const m = read("memory.json", { prefs: [] }); m.prefs.splice(i, 1); write("memory.json", m); return m.prefs; },
    lessons: () => read("seekha-hua.json", []).map((l) => l.text),
    addLesson(text, kind = "lesson") {
      const l = read("seekha-hua.json", []); const t = String(text || "").trim().slice(0, 300);
      if (t && !l.some((x) => x.text === t)) { l.push({ at: new Date().toISOString(), kind, text: t }); write("seekha-hua.json", l.slice(-200)); }
    },
    // Har kaam ke baad: ghalti -> sabaq, user ki tasheeh -> sabaq.
    learnFromTask({ userText, toolResults = [] }) {
      if (/^\s*(nahi|nahin|ghalat|no,|wrong|aisa nahi)/i.test(userText || "")) store.addLesson(`Faheem ki tasheeh: "${String(userText).slice(0, 160)}"`, "correction");
      for (const r of toolResults) if (!r.ok) store.addLesson(`${r.name} fail hua (${String(r.result).slice(0, 100)}) - agli dafa pehle check karo.`, "fix");
    },
    skills() {
      try { return fs.readdirSync(skillsDir).filter((f) => f.endsWith(".md") && f !== "README.md").map((f) => ({ name: f.replace(/\.md$/, ""), text: fs.readFileSync(path.join(skillsDir, f), "utf8") })); } catch { return []; }
    },
    addSkill(name, text) {
      const n = String(name || "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "skill";
      fs.mkdirSync(skillsDir, { recursive: true }); fs.writeFileSync(path.join(skillsDir, n + ".md"), String(text || "").slice(0, 4000)); return n;
    },
    log(entry) { fs.appendFileSync(file("action-log.jsonl"), JSON.stringify({ at: new Date().toISOString(), ...entry }) + "\n"); },
    readLog(n = 50) { try { return fs.readFileSync(file("action-log.jsonl"), "utf8").trim().split("\n").filter(Boolean).slice(-n).map((l) => JSON.parse(l)); } catch { return []; } },
    reminders: () => read("reminders.json", []),
    saveReminders: (r) => write("reminders.json", r),
    settings: () => read("settings.json", {}),
    saveSettings: (s) => write("settings.json", { ...read("settings.json", {}), ...s }),
  };
  return store;
}

module.exports = { createStore };
