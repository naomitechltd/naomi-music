import React, { useState } from "react";
import { Home, UploadCloud, ListMusic, ShieldCheck, User, LogOut, Menu, X } from "lucide-react";
import { theme } from "./ui";

const PLACEHOLDER_PAGES = ["Settings", "About", "T's and C's", "Terms of Use", "Privacy Policy", "Developer"];

export function NavBar({ tab, setTab, isArtist, isAdmin, currentUser, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const items = [
    { key: "browse", label: "Home", icon: Home },
    ...(isArtist ? [{ key: "upload", label: "Upload", icon: UploadCloud }] : []),
    ...(isArtist ? [{ key: "mysongs", label: "My Songs", icon: ListMusic }] : []),
    ...(isAdmin ? [{ key: "admin", label: "Admin", icon: ShieldCheck }] : []),
  ];
  const mobileNavItems = items.filter((it) => it.key !== "browse");

  const iconBtnStyle = (active) => ({
    background: "none",
    border: "none",
    cursor: "pointer",
    color: active ? theme.accent : theme.text,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    borderRadius: 6,
  });

  const go = (key) => {
    setTab(key);
    setMobileOpen(false);
    setProfileOpen(false);
  };

  return (
    <div style={{ position: "sticky", top: 0, zIndex: 100, background: theme.bg, borderBottom: `1px solid ${theme.border}` }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <button onClick={() => go("browse")} style={{ background: "none", border: "none", cursor: "pointer", color: theme.text, fontWeight: 700, fontSize: 16, padding: 0, fontFamily: "inherit" }}>
          Naomi Music
        </button>

        <div className="nm-desktop-nav" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {items.map((it) => (
            <button key={it.key} title={it.label} onClick={() => go(it.key)} style={iconBtnStyle(tab === it.key)}>
              <it.icon size={19} />
            </button>
          ))}

          <div style={{ position: "relative", marginLeft: 6 }}>
            <button title={currentUser.name} onClick={() => setProfileOpen((v) => !v)} style={iconBtnStyle(profileOpen)}>
              <User size={19} />
            </button>
            {profileOpen && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", background: theme.bgRaised, border: `1px solid ${theme.border}`, borderRadius: 6, padding: 12, width: 190, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{currentUser.name}</div>
                <div style={{ fontSize: 11.5, opacity: 0.6, marginBottom: 10, textTransform: "capitalize" }}>{currentUser.role}</div>
                <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: theme.danger, cursor: "pointer", fontSize: 13, fontFamily: "inherit", padding: 0 }}>
                  <LogOut size={15} /> Log out
                </button>
              </div>
            )}
          </div>
        </div>

        <button className="nm-mobile-toggle" onClick={() => setMobileOpen(true)} style={{ display: "none", background: "none", border: "none", cursor: "pointer", color: theme.text }}>
          <Menu size={22} />
        </button>
      </div>

      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 190 }}
        />
      )}

      <div
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: 270, maxWidth: "80vw", zIndex: 195,
          background: theme.bgRaised, borderLeft: `1px solid ${theme.border}`, boxShadow: "-8px 0 24px rgba(0,0,0,0.4)",
          transform: mobileOpen ? "translateX(0)" : "translateX(100%)", transition: "transform 0.28s ease",
          display: "flex", flexDirection: "column", overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "14px 14px 0" }}>
          <button onClick={() => setMobileOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.text }}>
            <X size={22} />
          </button>
        </div>

        <div style={{ padding: "10px 20px", display: "flex", flexDirection: "column", gap: 2 }}>
          {mobileNavItems.map((it) => (
            <button
              key={it.key}
              onClick={() => go(it.key)}
              style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", color: tab === it.key ? theme.accent : theme.text, fontSize: 14, padding: "10px 4px", fontFamily: "inherit", textAlign: "left" }}
            >
              <it.icon size={18} /> {it.label}
            </button>
          ))}

          {mobileNavItems.length > 0 && <div style={{ borderTop: `1px solid ${theme.border}`, margin: "8px 0" }} />}

          {PLACEHOLDER_PAGES.map((label) => (
            <button
              key={label}
              onClick={() => setMobileOpen(false)}
              style={{ background: "none", border: "none", cursor: "pointer", color: theme.text, opacity: 0.75, fontSize: 13.5, padding: "9px 4px", fontFamily: "inherit", textAlign: "left" }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: "auto", padding: "16px 20px", borderTop: `1px solid ${theme.border}` }}>
          <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: theme.danger, cursor: "pointer", fontSize: 14, fontFamily: "inherit", padding: 0 }}>
            <LogOut size={16} /> Log out
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .nm-desktop-nav { display: none !important; }
          .nm-mobile-toggle { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
