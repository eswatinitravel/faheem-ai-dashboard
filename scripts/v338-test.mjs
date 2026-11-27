// v3.38 Task board test (bina AI, bina internet): cards, columns, Review, Jarvis run (nakli brain/recipe), autopilot schedule, awaz.
import fs from "fs"; import os from "os"; import path from "path";
import { register } from "module";
register("./ext-resolve-hook.mjs", import.meta.url);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "v338-"));
process.env.HOME = tmp; process.env.USERPROFILE = tmp; process.env.FAHEEM_OPS_DIR = path.join(tmp, "ops");
process.env.FAHEEM_MCP_FILE = path.join(tmp, "mcp.json"); process.env.FAHEEM_RECIPES_DIR = path.join(tmp, "recipes");
import { fileURLToPath } from "url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
let pass = 0, fail = 0;
const t = async (name, fn) => { try { const r = await fn(); if (r === false) throw new Error("false"); pass++; console.log("  ok  ", name); } catch (e) { fail++; console.log("  FAIL", name, "-", e.message); } };

const B = await import("../lib/board.js");
let a, j;
await t("Card banao (default: Karna hai, mera)", () => { a = B.addCard({ title: "  Eid captions  " }); return a.column === "todo" && a.assignee === "aap" && a.title === "Eid captions"; });
await t("Khali naam rad, ghalat column rad", () => { let x = 0; try { B.addCard({ title: " " }); } catch { x++; } try { B.moveCard(a.id, "hacked"); } catch { x++; } return x === 2; });
await t("Move + comment + update", () => { B.moveCard(a.id, "doing"); B.addComment(a.id, "pehla note"); const c = B.updateCard(a.id, { priority: "high", detail: "5 captions" }); return c.column === "doing" && c.comments.length === 1 && c.priority === "high"; });
await t("Mera card Jarvis nahi chalata", async () => { try { await B.runCard(a.id); return false; } catch (e) { return /aap ka/.test(e.message); } });
await t("Jarvis card (seedha AI): natija comment, Review mein", async () => { j = B.addCard({ title: "Plan likho", assignee: "jarvis" }); const c = await B.runCard(j.id, { deps: { ask: async () => "Yeh raha plan" } }); return c.column === "review" && c.runs === 1 && /Yeh raha plan/.test(c.comments.at(-1).text) && c.lastOk; });
await t("Review: Approve = Done, Wapas = Karna hai", () => { const c1 = B.review(j.id, true); const k = B.addCard({ title: "x", assignee: "jarvis", column: "review" }); const c2 = B.review(k.id, false, "aur chhota"); return c1.column === "done" && c2.column === "todo" && /aur chhota/.test(c2.comments.at(-1).text); });
await t("Recipe tool par ruk kar ijazat (pendingCall), allowTools par chalta hai", async () => {
  const r = B.addCard({ title: "Folder", assignee: "jarvis", recipe: "folder-summary" });
  let allowSeen = null;
  const recipes = { runRecipe: async (id, v, o) => { allowSeen = o.allowTools; return o.allowTools ? { ok: true, answer: "10 files", steps: [{ server: "files", tool: "list_directory", ok: true }] } : { ok: false, needConfirm: true, call: { server: "files", tool: "list_directory" }, answer: "" }; } };
  const c1 = await B.runCard(r.id, { deps: { recipes } });
  const ok1 = c1.column === "review" && c1.pendingCall?.tool === "list_directory" && allowSeen === false;
  const c2 = await B.runCard(r.id, { allowTools: true, deps: { recipes } });
  return ok1 && !c2.pendingCall && /10 files/.test(c2.comments.at(-1).text) && /list_directory/.test(c2.comments.at(-1).text);
});
await t("AI fail = masla comment, card phir bhi Review (atakta nahi)", async () => { const x = B.addCard({ title: "fail", assignee: "jarvis" }); const c = await B.runCard(x.id, { deps: { ask: async () => { throw new Error("koi brain nahi"); } } }); return c.column === "review" && !c.lastOk && /koi brain nahi/.test(c.comments.at(-1).text); });
await t("Autopilot: board schedule banta/hat-ta hai", async () => { const S = await import("../lib/ops/scheduler.js"); const c = await B.setAutopilot(j.id, "daily@09:00"); const s = S.listSchedules().find((x) => x.id === c.scheduleId); const off = await B.setAutopilot(j.id, ""); return s?.kind === "board" && s.prompt === j.id && !off.scheduleId && !S.listSchedules().some((x) => x.id === c.scheduleId); });
await t("Autopilot sirf Jarvis card par", async () => { try { await B.setAutopilot(a.id, "2h"); return false; } catch (e) { return /Jarvis/.test(e.message); } });
await t("Scheduler 'board' job enqueue karta hai, handler registered", () => /kind === "board" \? enqueue\("board"/.test(read("lib/ops/scheduler.js")) && /registerHandler\("board"/.test(read("lib/ops/handlers.js")));
await t("Summary", () => { const s = B.summary(); return s.total >= 5 && typeof s.by.review === "number"; });
await t("Delete", () => { const n = B.listCards().length; B.deleteCard(a.id); return B.listCards().length === n - 1 && !B.getCard(a.id); });

const { boardTurn } = await import("../lib/jarvis/brain.js");
await t("Awaz: 'board par likho: kapre order karo' = mera card", () => { const r = boardTurn("board par likho: kapre order karo"); const c = B.getCard(r.action.args.id); return c.assignee === "aap" && c.title === "kapre order karo"; });
await t("Awaz: 'jarvis ke liye board par daalo X' = Jarvis card", () => { const r = boardTurn("Jarvis ke liye board par daalo Eid sale ka plan"); return B.getCard(r.action.args.id).assignee === "jarvis"; });
await t("Awaz: 'board par kya hai' = khulasa; aam baat = null", () => /Board par/.test(boardTurn("board par kya hai?").reply) && boardTurn("aaj mausam kaisa hai") === null);
await t("API sirf localhost + page link", () => /Sirf isi laptop par/.test(read("app/api/board/route.js")) && /href="\/board"/.test(read("app/page.js")));

console.log(`\nv3.38 board tests: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
