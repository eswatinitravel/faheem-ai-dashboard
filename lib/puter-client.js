// v3.14 Puter.js brain (sirf browser mein). Koi API key nahi — ek dafa Puter account sign-in.
// "Free mahana hissa, had likhi nahi" — isliye backup hai, pehla brain nahi. Script sirf zaroorat par load hoti hai.
export const PUTER_SRC = "https://js.puter.com/v2/";
export const PUTER_CHAT_MODEL = "gpt-5-nano";
export const PUTER_IMAGE_MODEL = "gemini-3.1-flash-image";

let loading = null;
export function loadPuter() {
  if (typeof window === "undefined") return Promise.reject(new Error("sirf browser mein"));
  if (window.puter) return Promise.resolve(window.puter);
  if (loading) return loading;
  loading = new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = PUTER_SRC; s.async = true;
    s.onload = () => (window.puter ? res(window.puter) : rej(new Error("Puter.js load hua magar chala nahi")));
    s.onerror = () => { loading = null; rej(new Error("Puter.js load nahi hua (internet?)")); };
    document.head.appendChild(s);
  });
  return loading;
}
export async function puterSignedIn() { try { const p = await loadPuter(); return !!p.auth.isSignedIn(); } catch { return false; } }
export async function puterSignIn() { const p = await loadPuter(); if (!p.auth.isSignedIn()) await p.auth.signIn(); return true; }

export function puterText(r) {
  if (typeof r === "string") return r;
  const c = r?.message?.content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return c.map((x) => x?.text || "").join("");
  return String(r?.text || r?.toString?.() || "");
}

// messages: [{role, content}]; image: dataUrl (sirf aakhri sawal ke sath)
export async function puterChat(messages, image) {
  const p = await loadPuter();
  if (!p.auth.isSignedIn()) await p.auth.signIn();
  const last = messages[messages.length - 1]?.content || "";
  const r = image ? await p.ai.chat(last, image, { model: PUTER_CHAT_MODEL }) : await p.ai.chat(messages, { model: PUTER_CHAT_MODEL });
  return puterText(r);
}

// Tasveer edit (image-to-image). Natija: data URL ya https link.
export async function puterEditImage(prompt, dataUrl) {
  const p = await loadPuter();
  if (!p.auth.isSignedIn()) await p.auth.signIn();
  const img = await p.ai.txt2img(prompt, { model: PUTER_IMAGE_MODEL, input_image: dataUrl });
  return img?.src || "";
}
