
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { theme } from "./ui";
import { fetchMyRole } from "../lib/role";

// Logo rotation: [what to show, how long in ms]
const LOGO_SEQ = [
  ["brand", 30000],
  ["home", 15000],
  ["brand", 15000],
  ["greet", 15000],
  ["brand", 15000],
];

export function NavBar({ currentUser, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [logoStep, setLogoStep] = useState(0);
  useEffect(() => {
    const t = setTimeout(
      () => setLogoStep((n) => (n + 1) % LOGO_SEQ.length),
      LOGO_SEQ[logoStep][1]
    );
    return () => clearTimeout(t);
  }, [logoStep]);
  const logoKind = LOGO_SEQ[logoStep][0];
  const firstName = (currentUser?.name || "").split(" ")[0];
  const hour = new Date().getHours();
  const greeting =
    (hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening") +
    (firstName ? ", " + firstName : "");
  const [role, setRole] = useState("listener");

  useEffect(() => {
    let on = true;
    fetchMyRole().then((r) => { if (on) setRole(r); });
    return () => { on = false; };
  }, [currentUser?.$id]);

  const items = [
    { label: "Home", path: "/" },
    { label: "Trending", path: "/trending" },
    { label: "Artists", path: "/artists" },
    { label: "Playlists", path: "/playlists" },
    { label: "Radio", path: "/radio" },
    { label: "Messages", path: "/messages" },
    { label: "⬆ Upload", path: "/upload" },
    { label: "🎵 My Songs", path: "/mysongs" },
    { label: "My Profile", path: "/profile" },
    ...(role === "admin"
      ? [
          { label: "🛡 Approval queue", path: "/admin" },
          { label: "🛡 Reports", path: "/admin/reports" },
          { label: "🛡 Notices", path: "/admin/notices" },
          { label: "🛡 Analytics", path: "/admin/analytics" },
        ]
      : []),
    { label: "🎨 Themes & Appearance", path: "/settings/theme" },
  ];

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
        <span
          key={logoStep}
          style={{ display: "inline-block", animation: "nmLogo .5s cubic-bezier(.2,.8,.2,1) both" }}
        >
          {logoKind === "home" ? (
            "Home"
          ) : logoKind === "greet" ? (
            <span style={{ fontSize: 18, display: "inline-block", maxWidth: "52vw", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "bottom" }}>
              {greeting}
            </span>
          ) : (
            <>Naomi <span style={{ color: theme.accent }}>Music</span></>
          )}
        </span>
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
            maxHeight: "75vh",
            overflowY: "auto",
            padding: 8,
            background: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: 16,
            boxShadow: theme.shadowLg,
            display: "grid",
            gap: 4,
          }}
        >
          {items.map((item) => (
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
