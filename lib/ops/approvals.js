// v3.17 Approvals (Arena se): exact kaam + exact arguments par bandhi, SHA-256 hash, 10 minute expiry, sirf ek dafa.
import crypto from "crypto";
import { readJson, writeJson, newId } from "./store.js";
import { audit, redact } from "./audit.js";

export const TTL_MS = Number(process.env.APPROVAL_TTL_MS) || 10 * 60 * 1000;
const RISK = { high: ["delete_file", "run_command", "send_email", "publish", "purchase", "browse"], medium: ["write_file", "edit_file", "open_link", "web_fetch"] };

const stable = (v) => (v && typeof v === "object" ? Array.isArray(v) ? `[${v.map(stable).join(",")}]` : `{${Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + stable(v[k])).join(",")}}` : JSON.stringify(v));
export const hashArgs = (tool, args) => crypto.createHash("sha256").update(tool + "\n" + stable(args ?? {})).digest("hex");
export const riskOf = (tool) => (RISK.high.includes(tool) ? "high" : RISK.medium.includes(tool) ? "medium" : "low");

const load = () => readJson("approvals.json", []);
const save = (list) => writeJson("approvals.json", list.slice(-300));

function expireOld(list, now = Date.now()) {
  for (const a of list) if (a.status === "pending" && Date.parse(a.expiresAt) <= now) { a.status = "expired"; audit("approval_expired", `${a.tool} expire`, { id: a.id }); }
  return list;
}

export function requestApproval({ tool, args = {}, reason = "", source = "agent", jobId = null }) {
  const list = expireOld(load());
  const a = { id: newId("apr"), tool, args: JSON.parse(redact(args) || "{}"), hash: hashArgs(tool, args), reason: String(reason).slice(0, 400), source, jobId,
    risk: riskOf(tool), status: "pending", createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + TTL_MS).toISOString() };
  list.push(a); save(list);
  audit("approval_requested", `${tool} ki ijazat maangi (${a.risk})`, { id: a.id, jobId });
  return a;
}

export function decide(id, approve, editedArgs) {
  const list = expireOld(load());
  const a = list.find((x) => x.id === id);
  if (!a) throw new Error("Approval nahi mili");
  if (a.status !== "pending") throw new Error(`Approval pehle hi ${a.status} hai`);
  if (approve && editedArgs) { a.args = JSON.parse(redact(editedArgs) || "{}"); a.hash = hashArgs(a.tool, editedArgs); a.edited = true; }
  a.status = approve ? "approved" : "rejected";
  a.decidedAt = new Date().toISOString();
  save(list);
  audit(approve ? "approved" : "rejected", `${a.tool} ${approve ? "manzoor" : "na-manzoor"}${a.edited ? " (badal kar)" : ""}`, { id });
  return a;
}

// Kaam chalne se theek pehle: wahi tool + wahi arguments + manzoor + expire nahi + pehle istemal nahi.
export function consume(id, tool, args) {
  const list = expireOld(load());
  const a = list.find((x) => x.id === id);
  const fail = (why) => { audit("approval_mismatch", why, { id, tool }); save(list); return { ok: false, why }; };
  if (!a) return fail("Approval nahi mili");
  if (a.status === "used") return fail("Approval pehle istemal ho chuki");
  if (a.status !== "approved") return fail(`Approval ${a.status} hai`);
  if (a.tool !== tool || a.hash !== hashArgs(tool, args)) return fail("Kaam ya arguments manzoor shuda se alag hain");
  a.status = "used"; a.usedAt = new Date().toISOString(); save(list);
  audit("approval_used", `${tool} chala`, { id });
  return { ok: true, approval: a };
}

export const listApprovals = () => expireOld(load()).slice().reverse();
export const pendingApprovals = () => listApprovals().filter((a) => a.status === "pending");

// Agent ke liye: wahi kaam pehle manzoor ho chuka? to istemal karo; warna nayi ijazat maango (ek hi pending).
export function gate(tool, args, reason, source = "agent") {
  const h = hashArgs(tool, args);
  const list = listApprovals();
  const ok = list.find((a) => a.hash === h && a.status === "approved");
  if (ok) { const r = consume(ok.id, tool, args); if (r.ok) return { allowed: true, id: ok.id }; }
  const pend = list.find((a) => a.hash === h && a.status === "pending");
  if (pend) return { allowed: false, id: pend.id, message: `Ijazat ka intezar (${pend.id}). Faheem /workflows par Approve kare, phir yahi kaam dobara chalayein.` };
  const a = requestApproval({ tool, args, reason, source });
  return { allowed: false, id: a.id, message: `Yeh kaam (${tool}, ${a.risk} risk) ijazat maangta hai: ${a.id}. Faheem /workflows par Approve kare, phir yahi kaam dobara chalayein. Tab tak doosra kaam karein.` };
}
