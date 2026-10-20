import React from "react";
import { theme } from "./ui";

export function NavBar({ currentUser, onLogout }) {
  const initial = currentUser?.name?.charAt(0)?.toUpperCase() || "J";

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 24px",
        background: "color-mix(in oklab, var(--bg) 85%, transparent)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: `1px solid ${theme.border}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Logo / Brand */}
        <h1
          style={{
            margin: 0,
            fontFamily: theme.fontDisplay,
            fontSize: 24,
            color: theme.text,
            letterSpacing: "-0.03em",
          }}
        >
          Naomi <span style={{ color: theme.accent }}>Music</span>
        </h1>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Avatar */}
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: theme.accentGrad,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: theme.accentFg,
            fontWeight: 700,
            fontSize: 16,
            cursor: "pointer",
            boxShadow: theme.shadowGlow,
          }}
        >
          {initial}
        </div>

        {/* Menu Button */}
        <button
          style={{
            background: "none",
            border: "none",
            color: theme.text,
            cursor: "pointer",
            padding: 8,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>
    </header>
  );
}