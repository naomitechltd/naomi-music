
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
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Continue even if browser storage is unavailable.
  }
}

function getSystemTheme() {
  if (
    typeof window !== "undefined" &&
    window.matchMedia
  ) {
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }

  return "dark";
}

function applyMode(mode) {
  const resolvedMode = mode === "auto" ? getSystemTheme() : mode;

  document.documentElement.dataset.theme = resolvedMode;
  document.documentElement.dataset.themeMode = mode;

  return resolvedMode;
}

export function initTheme() {
  if (typeof document === "undefined") return;

  let mode = getSaved(STORAGE_MODE, "dark");

  // Support existing saved settings.
  if (!validModes.includes(mode)) mode = "dark";

  const palette = getSaved(STORAGE_PALETTE, "purple");

  applyMode(mode);

  document.documentElement.dataset.palette =
    validPalettes.includes(palette) ? palette : "purple";

  // Follow system appearance while Auto mode is active.
  if (typeof window !== "undefined" && window.matchMedia) {
    const media = window.matchMedia("(prefers-color-scheme: light)");

    if (media.addEventListener) {
      media.addEventListener("change", () => {
        const currentMode = getSaved(STORAGE_MODE, "dark");

        if (currentMode === "auto") {
          applyMode("auto");
          window.dispatchEvent(new Event("naomi-theme-change"));
        }
      });
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

export function currentTheme() {
  if (typeof document === "undefined") return "dark";

  return document.documentElement.dataset.theme || "dark";
}

export function getThemeMode() {
  return getSaved(STORAGE_MODE, "dark");
}

export function setThemeMode(mode) {
  setTheme(mode);
}

export function toggleTheme() {
  setTheme(currentTheme() === "dark" ? "light" : "dark");
}

export function getThemePalette() {
  return getSaved(STORAGE_PALETTE, "purple");
}

export function setThemePalette(palette) {
  if (typeof document === "undefined") return;

  const selectedPalette = validPalettes.includes(palette)
    ? palette
    : "purple";

  document.documentElement.dataset.palette = selectedPalette;
  save(STORAGE_PALETTE, selectedPalette);

  window.dispatchEvent(new Event("naomi-palette-change"));
}
