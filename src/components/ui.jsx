// src/components/ui.js

// Every key here resolves to a CSS variable defined in theme.css,
// so switching data-theme="dark" / "light" restyles the whole app live.
export const theme = {
  // ---- surfaces & text ----
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

  // ---- lines ----
  border: "var(--border)",
  borderStrong: "var(--border-strong)",
  divider: "var(--divider)",

  // ---- brand / accent ----
  accent: "var(--accent)",
  accent2: "var(--accent-2)",
  accentHover: "var(--accent-hover)",
  accentFg: "var(--accent-fg)",
  accentGrad: "var(--accent-grad)",
  accentSoft: "var(--accent-soft)",

  // ---- status ----
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  info: "var(--info)",

  // ---- shadows ----
  shadowSm: "var(--shadow-sm)",
  shadowMd: "var(--shadow-md)",
  shadowLg: "var(--shadow-lg)",
  shadowGlow: "var(--shadow-glow)",

  // ---- radii (plain, no vars needed) ----
  radiusSm: "10px",
  radiusMd: "16px",
  radiusLg: "22px",
  radiusXl: "28px",
  radiusPill: "999px",

  // ---- typography ----
  fontBody: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  fontDisplay: 'Georgia, "Iowan Old Style", "Times New Roman", serif',
};

export function initTheme() {
  try {
    const saved = localStorage.getItem("naomi-theme");
    document.documentElement.dataset.theme = saved === "light" ? "light" : "dark";
  } catch {
    document.documentElement.dataset.theme = "dark";
  }
}

export function setTheme(mode) {
  document.documentElement.dataset.theme = mode === "light" ? "light" : "dark";
  try { localStorage.setItem("naomi-theme", mode); } catch {}
  window.dispatchEvent(new Event("naomi-theme-change"));
}

export function currentTheme() {
  return document.documentElement.dataset.theme || "dark";
}

export function toggleTheme() {
  setTheme(currentTheme() === "dark" ? "light" : "dark");
}