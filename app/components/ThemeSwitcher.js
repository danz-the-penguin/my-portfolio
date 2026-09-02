// ThemeSwitcher.js
"use client";

import { useState, useEffect } from "react";

// 1. Define your available theme palettes here.
// The `id` must exactly match the `[data-theme="YOUR_ID"]` CSS blocks in `app/globals.css`.
const THEMES = [
  { id: "default", label: "Metallic" },
  { id: "cyberpunk", label: "Cyberpunk" },
  { id: "nordic", label: "Nordic" },
  { id: "emerald", label: "Emerald" },
];

export default function ThemeSwitcher() {
  const [mode, setMode] = useState("dark");
  const [theme, setTheme] = useState("default");
  const [rainbowOn, setRainbowOn] = useState(true);

  // 1. On mount, read existing preferences from localStorage or System
  useEffect(() => {
    const savedMode = localStorage.getItem("theme");
    if (savedMode) {
      setMode(savedMode);
    } else {
      const systemPrefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      setMode(systemPrefersDark ? "dark" : "light");
    }

    const savedTheme = localStorage.getItem("palette");
    if (savedTheme) setTheme(savedTheme);

    const savedRainbow = localStorage.getItem("rainbow");
    if (savedRainbow !== null) setRainbowOn(savedRainbow === "on");
  }, []);

  // 2. Synchronize state changes to <html> and localStorage
  useEffect(() => {
    document.documentElement.setAttribute("data-mode", mode);
    localStorage.setItem("theme", mode);

    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("palette", theme);

    document.documentElement.setAttribute(
      "data-rainbow",
      rainbowOn ? "on" : "off",
    );
    localStorage.setItem("rainbow", rainbowOn ? "on" : "off");
  }, [mode, theme, rainbowOn]);

  return (
    <div style={switcherStyles.bar}>
      <div style={switcherStyles.toggleGroup}>
        {/* Dark / Light Slider */}
        <ToggleSwitch
          width="80px"
          label={mode === "light" ? "Light" : "Dark"}
          isOn={mode === "dark"}
          onToggle={() => setMode(mode === "light" ? "dark" : "light")} // Fixed logic here
          inactiveIcon="🌞"
          activeIcon="🌚"
        />

        {/* Rainbow FX Slider */}
        <ToggleSwitch
          width="100px"
          label="Rainbow"
          isOn={rainbowOn}
          onToggle={() => setRainbowOn(!rainbowOn)}
          activeIcon="🌈"
          inactiveIcon="🌐"
        />
      </div>

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
    position: "relative",
    zIndex: 10,
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
  toggleGroup: {
    display: "flex",
    gap: "8px",
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

// ==========================================
// 2. TOGGLE SWITCH COMPONENT
// ==========================================
function ToggleSwitch({
  label,
  isOn,
  onToggle,
  activeIcon,
  inactiveIcon,
  width = "135px",
}) {
  return (
    <div
      onClick={onToggle}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        // You can change the width of the sliders below by modifying the width prop!
        width: width,
        height: "28px",
        backgroundColor: isOn ? "var(--accent)" : "var(--bg-main)",
        border: "1px solid",
        borderColor: isOn ? "var(--accent)" : "var(--border-color)",
        borderRadius: "14px",
        cursor: "pointer",
        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        userSelect: "none",
      }}
    >
      {/* Label Text */}
      <span
        style={{
          position: "absolute",
          left: isOn ? "12px" : "auto",
          right: isOn ? "auto" : "12px",
          fontSize: "0.75rem",
          fontWeight: "700",
          color: isOn ? "#fff" : "var(--text-main)",
          pointerEvents: "none",
        }}
      >
        {label}
      </span>

      {/* Sliding Circle */}
      <div
        style={{
          position: "absolute",
          top: "2px",
          left: isOn ? "calc(100% - 24px)" : "2px",
          width: "22px",
          height: "22px",
          backgroundColor: "#fff",
          borderRadius: "50%",
          transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.7rem",
        }}
      >
        {isOn ? activeIcon : inactiveIcon}
      </div>
    </div>
  );
}
