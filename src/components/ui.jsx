import React from "react";

const DARK = {
  bg: "#0b0b0d",
  bgRaised: "#151517",
  border: "#26262a",
  text: "#f2f2f2",
  textDim: "rgba(242,242,242,0.6)",
  accent: "#7c5cff",
  danger: "#ff6b6b",
  // Shell
  shellBg: "#0b0b0d",
  navBg: "#0b0b0d",
  navBorder: "#26262a",
  // Player
  playerBg: "linear-gradient(180deg, #17171d 0%, #0b0b0d 70%)",
  bubble: "#151517",
  bubbleMine: "#7c5cff",
  bubbleMineText: "#ffffff",
  progressBg: "rgba(255,255,255,0.12)",
};

const LIGHT = {
  bg: "#f5f5f7",
  bgRaised: "#ffffff",
  border: "#e1e1e6",
  text: "#0b0b0d",
  textDim: "rgba(11,11,13,0.6)",
  accent: "#6d4aff",
  danger: "#e03b3b",
  shellBg: "#f5f5f7",
  navBg: "#ffffff",
  navBorder: "#e1e1e6",
  playerBg: "linear-gradient(180deg, #ffffff 0%, #f5f5f7 70%)",
  bubble: "#ffffff",
  bubbleMine: "#6d4aff",
  bubbleMineText: "#ffffff",
  progressBg: "rgba(0,0,0,0.10)",
};

let currentMode = "auto";        // "light" | "dark" | "auto"
let systemPrefersDark = true;    // updated by listener

function resolved() {
  if (currentMode === "auto") return systemPrefersDark ? DARK : LIGHT;
  return currentMode === "dark" ? DARK : LIGHT;
}

// Reactive accessor — every `theme.x` reads the live value
export const theme = new Proxy({}, {
  get(_, key) {
    return resolved()[key];
  },
});

export function getThemeMode() {
  return currentMode;
}

export function setThemeMode(mode) {
  currentMode = mode;
  try { localStorage.setItem("naomi_theme_mode", mode); } catch {}
  applyDocumentTheme();
}

export function initTheme() {
  try {
    const saved = localStorage.getItem("naomi_theme_mode");
    if (saved === "light" || saved === "dark" || saved === "auto") {
      currentMode = saved;
    }
  } catch {}

  // Watch system preference
  if (typeof window !== "undefined" && window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    systemPrefersDark = mq.matches;
    mq.addEventListener("change", (e) => {
      systemPrefersDark = e.matches;
      applyDocumentTheme();
      window.dispatchEvent(new Event("naomi-theme-change"));
    });
  }

  applyDocumentTheme();
}

function applyDocumentTheme() {
  if (typeof document === "undefined") return;
  const t = resolved();
  document.documentElement.style.background = t.bg;
  document.body.style.background = t.bg;
  document.body.style.color = t.text;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", t.bg);
}

export function inputStyle() {
  return {
    width: "100%",
    background: theme.bgRaised,
    border: `1px solid ${theme.border}`,
    borderRadius: 4,
    color: theme.text,
    padding: "10px 12px",
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
  };
}

export function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 12.5, opacity: 0.75, marginBottom: 6 }}>{label}</div>}
      {children}
    </div>
  );
}

export function Button({ children, onClick, disabled, style, variant, type = "button" }) {
  const isOutline = variant === "outline";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: isOutline ? "transparent" : theme.accent,
        color: isOutline ? theme.accent : "#fff",
        border: `1px solid ${theme.accent}`,
        borderRadius: 4,
        padding: "10px 18px",
        fontSize: 13.5,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        fontFamily: "inherit",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function ErrorNote({ message }) {
  if (!message) return null;
  return <div style={{ color: theme.danger, fontSize: 12.5, marginTop: 6, marginBottom: 10 }}>{message}</div>;
}
