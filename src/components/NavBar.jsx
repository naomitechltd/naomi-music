
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { theme } from "./ui";

export function NavBar({ currentUser, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const initial =
    currentUser?.name?.charAt(0)?.toUpperCase() || "J";

  const goTo = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 20px",
        background: "color-mix(in oklab, var(--bg) 85%, transparent)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: `1px solid ${theme.border}`,
      }}
    >
      <button
        type="button"
        onClick={() => goTo("/")}
        aria-label="Naomi Music home"
        style={{
          padding: 0,
          border: 0,
          background: "none",
          color: theme.text,
          cursor: "pointer",
          fontFamily: theme.fontDisplay,
          fontSize: 23,
          fontWeight: 700,
        }}
      >
        Naomi <span style={{ color: theme.accent }}>Music</span>
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          type="button"
          onClick={() => goTo("/profile")}
          aria-label="Open profile"
          title="Profile"
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
            border: 0,
          }}
        >
          {initial}
        </button>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          style={{
            background: "none",
            border: 0,
            color: theme.text,
            cursor: "pointer",
            padding: 8,
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            {menuOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <nav
          aria-label="Main menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 16,
            width: 230,
            padding: 8,
            background: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: 16,
            boxShadow: theme.shadowLg,
            display: "grid",
            gap: 4,
          }}
        >
          {[
            { label: "Home", path: "/" },
            { label: "Trending", path: "/trending" },
            { label: "Artists", path: "/artists" },
            { label: "Playlists", path: "/playlists" },
            { label: "Radio", path: "/radio" },
            { label: "Messages", path: "/messages" },
            { label: "My Profile", path: "/profile" },
            { label: "🎨 Themes & Appearance", path: "/settings/theme" },
          ].map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => goTo(item.path)}
              style={{
                padding: "12px 14px",
                width: "100%",
                textAlign: "left",
                border: 0,
                borderRadius: 10,
                background: "transparent",
                color: theme.text,
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--accent-soft)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              {item.label}
            </button>
          ))}

          {onLogout && (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onLogout();
              }}
              style={{
                padding: "12px 14px",
                width: "100%",
                textAlign: "left",
                border: 0,
                borderRadius: 10,
                background: "transparent",
                color: "var(--danger)",
                cursor: "pointer",
              }}
            >
              Log out
            </button>
          )}
        </nav>
      )}
    </header>
  );
}
