// src/components/ui.js

const STORAGE_MODE = "naomi-theme";
const STORAGE_PALETTE = "naomi-music-palette";

export const theme = {
  bg: "var(--bg)",
  bgRaised: "var(--bg-raised)",
  bgAlt: "var(--bg-alt)",
  surface: "var(--surface)",
  card: "var(--card)",
  cardHover: "var(--card-hover)",
  overlay: "var(--overlay)",

  text: "var(--text)",
  textMuted: "var(--text-muted)",
  textDim: "var(--text-dim)",
  textInverse: "var(--text-inverse)",

  border: "var(--border)",
  borderStrong: "var(--border-strong)",
  divider: "var(--divider)",

  accent: "var(--accent)",
  accent2: "var(--accent-2)",
  accentHover: "var(--accent-hover)",
  accentFg: "var(--accent-fg)",
  accentGrad: "var(--accent-grad)",
  accentSoft: "var(--accent-soft)",

  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  info: "var(--info)",

  shadowSm: "var(--shadow-sm)",
  shadowMd: "var(--shadow-md)",
  shadowLg: "var(--shadow-lg)",
  shadowGlow: "var(--shadow-glow)",

  radiusSm: "10px",
  radiusMd: "16px",
  radiusLg: "22px",
  radiusXl: "28px",
  radiusPill: "999px",

  fontBody: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  fontDisplay: 'Georgia, "Iowan Old Style", "Times New Roman", serif',
};

const validModes = ["auto", "light", "dark"];

const validPalettes = [
  "purple",
  "blue",
  "sunset",
  "green",
  "rose",
  "gold",
];

function getSaved(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value || fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // The theme still works if storage is unavailable.
  }
}

function getSystemTheme() {
  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function"
  ) {
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }

  return "dark";
}

function applyMode(mode) {
  if (typeof document === "undefined") return "dark";

  const selectedMode = validModes.includes(mode) ? mode : "dark";
  const resolvedMode =
    selectedMode === "auto" ? getSystemTheme() : selectedMode;

  const root = document.documentElement;

  // CSS uses data-theme="dark" or data-theme="light".
  root.dataset.theme = resolvedMode;

  // Preserve the selected preference separately.
  root.dataset.themeMode = selectedMode;

  return resolvedMode;
}

function applyPalette(palette) {
  if (typeof document === "undefined") return "purple";

  const selectedPalette = validPalettes.includes(palette)
    ? palette
    : "purple";

  // CSS palette selectors should use [data-palette="..."].
  document.documentElement.dataset.palette = selectedPalette;

  return selectedPalette;
}

export function initTheme() {
  if (typeof document === "undefined") return;

  let mode = getSaved(STORAGE_MODE, "dark");
  let palette = getSaved(STORAGE_PALETTE, "purple");

  if (!validModes.includes(mode)) mode = "dark";
  if (!validPalettes.includes(palette)) palette = "purple";

  applyMode(mode);
  applyPalette(palette);

  // Avoid registering multiple system listeners.
  if (typeof window !== "undefined" && window.matchMedia) {
    if (!window.__naomiThemeListenerRegistered) {
      const media = window.matchMedia(
        "(prefers-color-scheme: light)"
      );

      const handleSystemChange = () => {
        if (getThemeMode() === "auto") {
          applyMode("auto");
          window.dispatchEvent(
            new Event("naomi-theme-change")
          );
        }
      };

      if (media.addEventListener) {
        media.addEventListener("change", handleSystemChange);
      } else if (media.addListener) {
        media.addListener(handleSystemChange);
      }

      window.__naomiThemeListenerRegistered = true;
    }
  }

  window.dispatchEvent(new Event("naomi-theme-change"));
  window.dispatchEvent(new Event("naomi-palette-change"));
}

export function setTheme(mode) {
  if (typeof document === "undefined") return;

  const selectedMode = validModes.includes(mode) ? mode : "dark";

  save(STORAGE_MODE, selectedMode);
  applyMode(selectedMode);

  window.dispatchEvent(new Event("naomi-theme-change"));
}

export function setThemeMode(mode) {
  setTheme(mode);
}

export function getThemeMode() {
  const mode = getSaved(STORAGE_MODE, "dark");
  return validModes.includes(mode) ? mode : "dark";
}

export function currentTheme() {
  if (typeof document === "undefined") return "dark";

  return document.documentElement.dataset.theme || "dark";
}

export function toggleTheme() {
  const current = currentTheme();

  // Toggle the visible appearance, regardless of Auto mode.
  setTheme(current === "dark" ? "light" : "dark");
}

export function getThemePalette() {
  const palette = getSaved(STORAGE_PALETTE, "purple");

  return validPalettes.includes(palette) ? palette : "purple";
}

export function setThemePalette(palette) {
  if (typeof document === "undefined") return;

  const selectedPalette = validPalettes.includes(palette)
    ? palette
    : "purple";

  save(STORAGE_PALETTE, selectedPalette);
  applyPalette(selectedPalette);

  window.dispatchEvent(new Event("naomi-palette-change"));
}