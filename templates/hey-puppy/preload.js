// Renderer ko sirf yeh mehdood API milti hai (contextIsolation on).
const { contextBridge, ipcRenderer } = require("electron");
const on = (ch, fn) => { const h = (_e, v) => fn(v); ipcRenderer.on(ch, h); return () => ipcRenderer.removeListener(ch, h); };
contextBridge.exposeInMainWorld("api", {
  ask: (t) => ipcRenderer.invoke("ask", t),
  transcribe: (data, mime) => ipcRenderer.invoke("transcribe", { data, mime }),
  isWake: (t) => ipcRenderer.invoke("is-wake", t),
  allow: (id, allowed) => ipcRenderer.invoke("allow", { id, allowed }),
  settings: () => ipcRenderer.invoke("settings"),
  saveSettings: (s) => ipcRenderer.invoke("save-settings", s),
  memory: () => ipcRenderer.invoke("memory"),
  forget: (i) => ipcRenderer.invoke("forget", i),
  getAvatar: () => ipcRenderer.invoke("get-avatar"),
  mood: (m) => ipcRenderer.send("mood", m),
  showChat: () => ipcRenderer.send("show-chat"),
  drag: (dx, dy) => ipcRenderer.send("puppy-drag", { dx, dy }),
  poke: () => ipcRenderer.send("poke"),
  on,
});
