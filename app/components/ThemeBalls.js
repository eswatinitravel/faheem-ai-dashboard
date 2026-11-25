"use client";
import { useEffect, useState } from "react";
import { THEMES, applyTheme, savedTheme } from "../../lib/prefs";

export default function ThemeBalls() {
  const [theme, setTheme] = useState("neon-blue");
  useEffect(() => { const t = applyTheme(savedTheme()); setTheme(t); const f = (e) => setTheme(e.detail); window.addEventListener("faheem-theme", f); return () => window.removeEventListener("faheem-theme", f); }, []);
  return (
    <div className="balls" role="group" aria-label="Theme">
      {THEMES.map((t) => (
        <button key={t.id} title={t.name} className={"ball" + (theme === t.id ? " on" : "")} style={{ background: t.ball }}
          onClick={() => { setTheme(t.id); applyTheme(t.id); }} />
      ))}
    </div>
  );
}
