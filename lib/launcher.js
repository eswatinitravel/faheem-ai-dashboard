// v3.27 App launcher tiles (Dashy / Homarr / Heimdall ke "start page" idea se; apna code).
// User ki tiles data/launcher.json mein (git se bahar, UPDATE.bat mein mehfooz).
import fs from "fs";
import path from "path";

const FILE = () => path.join(process.cwd(), "data", "launcher.json");
export const MAX_TILES = 60;
export const DEFAULT_TILES = [
  { id: "chat", name: "Chat", url: "/", group: "Dashboard", icon: "chat" },
  { id: "jarvis", name: "Jarvis", url: "/jarvis", group: "Dashboard", icon: "mic" },
  { id: "agent", name: "Agent + AI Team", url: "/agent", group: "Dashboard", icon: "bot" },
  { id: "workflows", name: "Workflows", url: "/workflows", group: "Dashboard", icon: "layers" },
  { id: "brains", name: "Brains Rooms", url: "/brains", group: "Dashboard", icon: "brain" },
  { id: "connect", name: "Phone se jodo", url: "/connect", group: "Dashboard", icon: "phone" },
  { id: "design", name: "Design Studio", url: "/design", group: "Dashboard", icon: "palette" },
  { id: "ollama", name: "Ollama", url: "http://localhost:11434", group: "Laptop", icon: "brain" },
  { id: "n8n", name: "n8n (agar laga ho)", url: "http://localhost:5678", group: "Laptop", icon: "loop" },
  { id: "tuios", name: "TUIOS web", url: "http://localhost:7681", group: "Laptop", icon: "grid" },
  { id: "penpot", name: "Penpot (design)", url: "https://design.penpot.app", group: "Web", icon: "palette" },
  { id: "repo", name: "Dashboard GitHub", url: "https://github.com/eswatinitravel/faheem-ai-dashboard", group: "Web", icon: "github" },
];
const ICONS = new Set(["chat", "mic", "bot", "layers", "brain", "phone", "palette", "loop", "grid", "github", "globe", "folder", "book", "image", "zap", "rocket", "cart", "box", "monitor", "sparkle", "external"]);

export function cleanTile(t, i = 0) {
  const name = String(t?.name || "").replace(/\s+/g, " ").trim().slice(0, 40);
  const url = String(t?.url || "").trim().slice(0, 500);
  if (!name || !url) return null;
  if (!/^https?:\/\/[^\s]+$/i.test(url) && !/^\/[^\s/][^\s]*$|^\/$/.test(url)) return null; // sirf http(s) ya apna /page
  const id = String(t?.id || name).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || `tile-${i}`;
  return { id, name, url, group: String(t?.group || "Apni").trim().slice(0, 24) || "Apni", icon: ICONS.has(t?.icon) ? t.icon : "external" };
}
export function cleanTiles(list) {
  const seen = new Set(), out = [];
  for (const [i, t] of (Array.isArray(list) ? list : []).entries()) {
    const c = cleanTile(t, i); if (!c) continue;
    while (seen.has(c.id)) c.id += "-2";
    seen.add(c.id); out.push(c);
    if (out.length >= MAX_TILES) break;
  }
  return out;
}
export function readTiles() {
  try { const j = JSON.parse(fs.readFileSync(FILE(), "utf8")); if (Array.isArray(j.tiles)) return { tiles: cleanTiles(j.tiles), custom: true }; } catch {}
  return { tiles: DEFAULT_TILES, custom: false };
}
export function saveTiles(list) {
  const tiles = cleanTiles(list);
  fs.mkdirSync(path.dirname(FILE()), { recursive: true });
  fs.writeFileSync(FILE(), JSON.stringify({ tiles, updated: Date.now() }, null, 1));
  return tiles;
}
export function resetTiles() { try { fs.rmSync(FILE(), { force: true }); } catch {} return DEFAULT_TILES; }
