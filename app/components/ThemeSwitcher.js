// ThemeSwitcher.js
"use client";

import { useState, useEffect } from "react";

const THEMES = [
  { id: "default", label: "Metallic" },
  { id: "cyberpunk", label: "Cyberpunk" },
  { id: "nordic", label: "Nordic" },
  { id: "emerald", label: "Emerald" },
];

export default function ThemeSwitcher() {
  const [mode, setMode] = useState("dark");
  const [theme, setTheme] = useState("default");

  // Synchronize dynamic attributes onto <html>
  useEffect(() => {
    document.documentElement.setAttribute("data-mode", mode);
    document.documentElement.setAttribute("data-theme", theme);
  }, [mode, theme]);

  return (
    <div style={switcherStyles.bar}>
      {/* Dark / Light Toggle */}
      <button
        onClick={() => setMode(mode === "dark" ? "light" : "dark")}
        style={switcherStyles.toggleBtn}
      >
        {mode === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode"}
      </button>

      {/* Palette Selector */}
      <div style={switcherStyles.presetGroup}>
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            style={{
              ...switcherStyles.themeBtn,
              borderColor:
                theme === t.id ? "var(--accent)" : "var(--border-color)",
              fontWeight: theme === t.id ? "700" : "400",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const switcherStyles = {
  bar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    padding: "12px 16px",
    marginBottom: "24px",
    borderRadius: "8px",
    backgroundColor: "var(--bg-card)",
    border: "1px solid var(--border-color)",
  },
  toggleBtn: {
    padding: "6px 12px",
    borderRadius: "6px",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-main)",
    color: "var(--text-main)",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: "600",
  },
  presetGroup: {
    display: "flex",
    gap: "6px",
  },
  themeBtn: {
    padding: "4px 10px",
    borderRadius: "4px",
    border: "1px solid",
    backgroundColor: "var(--bg-main)",
    color: "var(--text-main)",
    cursor: "pointer",
    fontSize: "0.8rem",
  },
};
