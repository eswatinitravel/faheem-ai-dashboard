// Ikhtiyari Telegram bridge (band by default). .env mein TELEGRAM_BOT_TOKEN + TELEGRAM_ALLOWED_CHAT_ID likhein.
// Sirf aap ki chat ID ka jawab deta hai. Har kaam phir bhi laptop par Allow/Deny card se guzarta hai. Free (Telegram Bot API).
function start({ ask, token, allowed }) {
  if (!token || !allowed) return console.log("Telegram: token ya allowed chat id nahi - band.");
  let offset = 0, stopped = false;
  const api = (m, body) => fetch(`https://api.telegram.org/bot${token}/${m}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) }).then((r) => r.json());
  (async function loop() {
    while (!stopped) {
      try {
        const r = await api("getUpdates", { offset, timeout: 30 });
        for (const u of r.result || []) {
          offset = u.update_id + 1;
          const msg = u.message; if (!msg || !msg.text) continue;
          if (String(msg.chat.id) !== String(allowed)) continue;
          const out = await ask(msg.text);
          await api("sendMessage", { chat_id: msg.chat.id, text: out.text || "..." });
        }
      } catch { await new Promise((r) => setTimeout(r, 5000)); }
    }
  })();
  return { stop: () => (stopped = true) };
}
module.exports = { start };
