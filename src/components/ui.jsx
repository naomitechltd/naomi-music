import React from "react";

export const theme = {
  bg: "#0b0b0d",
  bgRaised: "#151517",
  border: "#26262a",
  text: "#f2f2f2",
  textDim: "rgba(242,242,242,0.6)",
  accent: "#7c5cff",
  danger: "#ff6b6b",
};

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
