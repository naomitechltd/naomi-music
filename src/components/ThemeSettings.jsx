
import React, { useEffect, useState } from "react";
import {
  getThemeMode,
  getThemePalette,
  setTheme,
  setThemePalette,
} from "./ui";

const palettes = [
  { id: "purple", name: "Purple", color: "#8057ff" },
  { id: "blue", name: "Ocean", color: "#00bfae" },
  { id: "sunset", name: "Sunset", color: "#f08a36" },
  { id: "green", name: "Forest", color: "#64c878" },
  { id: "rose", name: "Rose", color: "#f06ca8" },
  { id: "gold", name: "Gold", color: "#e5ad42" },
];

export default function ThemeSettings() {
  const [mode, setMode] = useState(getThemeMode());
  const [palette, setPalette] = useState(getThemePalette());

  useEffect(() => {
    const sync = () => {
      setMode(getThemeMode());
      setPalette(getThemePalette());
    };

    window.addEventListener("naomi-theme-change", sync);
    window.addEventListener("naomi-palette-change", sync);

    return () => {
      window.removeEventListener("naomi-theme-change", sync);
      window.removeEventListener("naomi-palette-change", sync);
    };
  }, []);

  return (
    <section className="theme-settings">
      <div className="theme-settings__header">
        <div>
          <h2>Appearance</h2>
          <p>Personalise your Naomi Music experience.</p>
        </div>
        <span className="theme-settings__icon">◐</span>
      </div>

      <h3>Display mode</h3>
      <div className="theme-settings__modes">
        {[
          { id: "dark", label: "Dark", icon: "☾" },
          { id: "light", label: "Light", icon: "☀" },
          { id: "auto", label: "System", icon: "◉" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            className={`theme-mode ${mode === item.id ? "is-active" : ""}`}
            aria-pressed={mode === item.id}
            onClick={() => {
              setTheme(item.id);
              setMode(item.id);
            }}
          >
            <span className="theme-mode__icon">{item.icon}</span>
            <span>{item.label}</span>
            {mode === item.id && <span aria-hidden="true">✓</span>}
          </button>
        ))}
      </div>

      <h3>Accent colour</h3>
      <p className="theme-settings__description">
        Choose the colour used for buttons, highlights and accents.
      </p>

      <div className="theme-palette-grid">
        {palettes.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`theme-palette ${palette === item.id ? "is-active" : ""}`}
            aria-pressed={palette === item.id}
            onClick={() => {
              setThemePalette(item.id);
              setPalette(item.id);
            }}
          >
            <span
              className="theme-palette__swatch"
              style={{ background: item.color }}
            />
            <span>{item.name}</span>
            {palette === item.id && (
              <span className="theme-palette__check">✓</span>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
