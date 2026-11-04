// Hey Puppy Chrome extension: page ka text Puppy (127.0.0.1:7341) ko bhejna, sawal poochna,
// aur Puppy ke maange hue fill/click sirf yahan Allow dabane par chalte hain.
const BASE = "http://127.0.0.1:7341";
const $ = (s) => document.querySelector(s);
let token = "";
const call = async (path, body) => {
  const r = await fetch(BASE + path, { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", "X-Puppy-Token": token }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "HTTP " + r.status); return j;
};
const tab = async () => (await chrome.tabs.query({ active: true, currentWindow: true }))[0];

async function readPage() {
  const t = await tab();
  const [res] = await chrome.scripting.executeScript({ target: { tabId: t.id }, func: () => ({ url: location.href, title: document.title, text: (document.body.innerText || "").slice(0, 60000) }) });
  return res.result;
}

async function loadActions() {
  try {
    const { actions } = await call("/actions");
    const box = $("#actions"); box.innerHTML = "";
    if (!actions.length) { box.textContent = "Koi kaam nahi."; return; }
    for (const a of actions) {
      const d = document.createElement("div"); d.className = "act";
      d.textContent = `${a.type === "fill" ? "Bharna" : "Click"}: ${a.selector}${a.type === "fill" ? ` = "${a.value || ""}"` : ""}`;
      const yes = document.createElement("button"); yes.textContent = "Allow";
      const no = document.createElement("button"); no.textContent = "Deny"; no.className = "deny";
      yes.onclick = async () => {
        const t = await tab();
        const [r] = await chrome.scripting.executeScript({ target: { tabId: t.id }, args: [a], func: (a) => {
          const el = document.querySelector(a.selector); if (!el) return { ok: false, result: "element nahi mila" };
          if (a.type === "fill") { el.focus(); el.value = a.value || ""; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); }
          else el.click();
          return { ok: true, result: a.type + " ho gaya" };
        } });
        await call("/actions/done", { id: a.id, allowed: true, ...r.result }); loadActions();
      };
      no.onclick = async () => { await call("/actions/done", { id: a.id, allowed: false, ok: false }); loadActions(); };
      d.append(yes, no); box.appendChild(d);
    }
  } catch (e) { $("#actions").textContent = e.message; }
}

(async () => {
  token = (await chrome.storage.local.get("token")).token || "";
  $("#token").value = token;
  try { const h = await fetch(BASE + "/health").then((r) => r.json()); $("#conn").textContent = `${h.name} se rabta hai.`; } catch { $("#conn").textContent = "Puppy chal nahi raha - START.bat chalayein."; }
  loadActions();
})();
$("#token").addEventListener("change", async (e) => { token = e.target.value.trim(); await chrome.storage.local.set({ token }); loadActions(); });
$("#send").addEventListener("click", async () => { try { await call("/page", await readPage()); $("#answer").textContent = "Page bhej diya. Ab sawal poochein."; } catch (e) { $("#answer").textContent = e.message; } });
$("#ask").addEventListener("click", async () => {
  try { $("#answer").textContent = "Puppy soch raha hai..."; await call("/page", await readPage()); const r = await call("/ask", { q: $("#q").value || "Is page ka khulasa 5 lines mein batao." }); $("#answer").textContent = r.text; loadActions(); }
  catch (e) { $("#answer").textContent = e.message; }
});
