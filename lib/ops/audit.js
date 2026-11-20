// v3.17 Audit log (Nexa + Arena se): har zaroori kaam ka record. Keys / tokens kabhi likhe nahi jaate.
import { appendLine, readLines } from "./store.js";

const SECRET = [/\bsk-[A-Za-z0-9_-]{12,}\b/g, /\bAIza[0-9A-Za-z_-]{20,}\b/g, /\bgsk_[A-Za-z0-9]{20,}\b/g, /\bghp_[A-Za-z0-9]{20,}\b/g, /\bhf_[A-Za-z0-9]{20,}\b/g, /(bearer\s+)[A-Za-z0-9._-]{16,}/gi, /("?(?:api_?key|token|password|secret)"?\s*[:=]\s*"?)[^\s",}]{6,}/gi];

export function redact(v) {
  let s = typeof v === "string" ? v : JSON.stringify(v ?? "");
  for (const re of SECRET) s = s.replace(re, (m, pre) => (typeof pre === "string" && m.startsWith(pre) ? pre : "") + "[chhupa]");
  return s.length > 600 ? s.slice(0, 600) + "…" : s;
}

export function audit(event, summary, meta = {}) {
  const row = { at: new Date().toISOString(), event, summary: redact(String(summary || "")), meta: JSON.parse(redact(meta) || "{}") };
  try { appendLine("audit.jsonl", row); } catch {}
  return row;
}

export const listAudit = (limit = 200) => readLines("audit.jsonl", limit);
