"use client";
import { useEffect, useState } from "react";
import { THEMES, applyTheme, savedTheme } from "../../lib/prefs";

export default function ThemeBalls() {
  const [theme, setTheme] = useState("aura");
  useEffect(() => { const t = savedTheme(); setTheme(t); applyTheme(t); }, []);
  return (
    <div className="balls" role="group" aria-label="Theme">
      {THEMES.map((t) => (
        <button key={t.id} title={t.name} className={"ball" + (theme === t.id ? " on" : "")} style={{ background: t.ball }}
          onClick={() => { setTheme(t.id); applyTheme(t.id); }} />
      ))}
    </div>
  );
}
