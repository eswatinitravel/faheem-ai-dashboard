// v3.16 Project Builder ZIP ka intent: "project bana kar zip do", "zip folder do", "make ... and give zip".
// Server (lib/agent/project-zip.js) aur chat page dono yahi istemal karte hain (is file mein fs nahi).
export const ZIP_WORD = /\b(zip|zip\s*file|zip\s*folder|zipped|\.zip)\b/i;
export const MAKE_WORD = /\b(bana|banao|bana\s*do|bana\s*kar|bna|bnao|bnado|tayyar|make|build|create|generate|de\s*do|dedo|do|dein|dena|chahiye|chahye|give|send|package|pack|bhejo|download)\b/i;
export const NOT_ZIP = /\b(unzip|extract|kholun|kholoon|kaise\s+kholo|open\s+(a|the|this|my)\s+zip|zip\s+kaise\s+khol|zip\s+code|postal)\b/i;
export function isZipRequest(text) {
  const t = String(text || "");
  if (!ZIP_WORD.test(t) || NOT_ZIP.test(t)) return false;
  return MAKE_WORD.test(t);
}


// v3.16 Private Assistant Builder: "mere laptop ke liye free AI assistant banao", "hey puppy assistant bana do", "make me a desktop assistant".
export const ASSISTANT_WORD = /\b(assistant|assistent|asistant|personal\s+ai|ai\s+companion|desktop\s+companion|hey\s*puppy|puppy\s+assistant|jarvis)\b/i;
export const ASSISTANT_MAKE = /\b(banao|bana\s*do|bana\s*kar|bana\s*de|bnao|bnado|tayyar\s+karo|make|build|create|generate|chahiye)\b/i;
export function isAssistantRequest(text) {
  const t = String(text || "");
  if (!ASSISTANT_WORD.test(t) || !ASSISTANT_MAKE.test(t)) return false;
  if (/\b(kya\s+hai|what\s+is|explain|samjhao|compare|review)\b/i.test(t) && !/\b(banao|bana\s*do|make|build|create)\b/i.test(t)) return false;
  return true;
}
