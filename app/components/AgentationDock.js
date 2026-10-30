"use client";
// Agentation toolbar (PolyForm Shield 1.0.0, Benji Taylor — github.com/benjitaylor/agentation).
// Dev mode (npm run dev) mein khud chalu; production mein /skills/agentation ke toggle se (is browser mein yaad).
// Package tabhi load hota hai jab toolbar chalu ho.
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Agentation = dynamic(() => import("agentation").then((m) => m.Agentation), { ssr: false });
export const AG_KEY = "faheem-agentation";

export function loadAgentation() {
  try {
    const v = JSON.parse(localStorage.getItem(AG_KEY) || "null");
    if (v && typeof v === "object") return { on: !!v.on, endpoint: String(v.endpoint || "") };
  } catch {}
  return { on: process.env.NODE_ENV === "development", endpoint: "" };
}
export function saveAgentation(v) {
  try { localStorage.setItem(AG_KEY, JSON.stringify(v)); } catch {}
  window.dispatchEvent(new Event(AG_KEY));
}

export default function AgentationDock() {
  const [cfg, setCfg] = useState(null);
  useEffect(() => {
    const f = () => setCfg(loadAgentation());
    f();
    window.addEventListener(AG_KEY, f);
    window.addEventListener("storage", f);
    return () => { window.removeEventListener(AG_KEY, f); window.removeEventListener("storage", f); };
  }, []);
  if (!cfg?.on) return null;
  const ep = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(cfg.endpoint) ? cfg.endpoint.replace(/\/$/, "") : undefined;
  return <Agentation appName="Faheem AI Dashboard" endpoint={ep} />;
}
