import React, { useState } from "react";
import { Home, UploadCloud, ListMusic, ShieldCheck, User, LogOut, Menu, X } from "lucide-react";
import { theme } from "./ui";

export function NavBar({ tab, setTab, isArtist, isAdmin, currentUser, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const items = [
    { key: "browse", label: "Home", icon: Home },
    ...(isArtist ? [{ key: "upload", label: "Upload", icon: UploadCloud }] : []),
    ...(isArtist ? [{ key: "mysongs", label: "My Songs", icon: ListMusic }] : []),
    ...(isAdmin ? [{ key: "admin", label: "Admin", icon: ShieldCheck }] : []),
  ];

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
        <div style={{ fontWeight: 700, fontSize: 16 }}>Naomi Music</div>

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

        <button className="nm-mobile-toggle" onClick={() => setMobileOpen((v) => !v)} style={{ display: "none", background: "none", border: "none", cursor: "pointer", color: theme.text }}>
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {mobileOpen && (
        <div style={{ borderTop: `1px solid ${theme.border}`, padding: "10px 16px 16px", display: "flex", flexDirection: "column", gap: 4, background: theme.bg }}>
          {items.map((it) => (
            <button
              key={it.key}
              onClick={() => go(it.key)}
              style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", color: tab === it.key ? theme.accent : theme.text, fontSize: 14, padding: "8px 4px", fontFamily: "inherit" }}
            >
              <it.icon size={18} /> {it.label}
            </button>
          ))}
          <div style={{ borderTop: `1px solid ${theme.border}`, marginTop: 6, paddingTop: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{currentUser.name}</div>
            <div style={{ fontSize: 11.5, opacity: 0.6, marginBottom: 10, textTransform: "capitalize" }}>{currentUser.role}</div>
            <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: theme.danger, cursor: "pointer", fontSize: 13, fontFamily: "inherit", padding: 0 }}>
              <LogOut size={15} /> Log out
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          .nm-desktop-nav { display: none !important; }
          .nm-mobile-toggle { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
