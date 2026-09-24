import React, { useState, useEffect } from "react";
import { Home, UploadCloud, ListMusic, Library, ShieldCheck, User, LogOut, Menu, X } from "lucide-react";
import { theme } from "./ui";
import { fileUrl } from "../lib/appwrite";

const PLACEHOLDER_PAGES = ["Settings", "About", "T's and C's", "Terms of Use", "Privacy Policy", "Developer"];

export function NavBar({ tab, setTab, isArtist, isAdmin, currentUser, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoText, setLogoText] = useState("Naomi Music");
  const [logoFading, setLogoFading] = useState(false);

  // Rotate: 30s "Naomi Music" -> swap to "Home", hold 10s -> swap back. Loops.
  useEffect(() => {
    let cancelled = false;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    const swap = async (next) => {
      if (cancelled) return;
      setLogoFading(true);
      await sleep(220);
      if (cancelled) return;
      setLogoText(next);
      setLogoFading(false);
    };

    (async () => {
      while (!cancelled) {
        await sleep(30000);
        if (cancelled) return;
        await swap("Home");
        await sleep(10000);
        if (cancelled) return;
        await swap("Naomi Music");
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const items = [
    { key: "browse", label: "Home", icon: Home },
    { key: "playlists", label: "Playlists", icon: Library },
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
        <button
          onClick={() => go("browse")}
          style={{ background: "none", border: "none", cursor: "pointer", color: theme.text, fontWeight: 700, fontSize: 16, padding: 0, fontFamily: "inherit", textAlign: "left" }}
        >
          <span style={{ display: "inline-grid" }}>
            <span
              style={{
                gridArea: "1 / 1",
                opacity: logoFading ? 0 : 1,
                transform: logoFading ? "translateY(-4px)" : "translateY(0)",
                transition: "opacity 0.22s ease, transform 0.22s ease",
                whiteSpace: "nowrap",
              }}
            >
              {logoText}
            </span>
            <span
              aria-hidden="true"
              style={{ gridArea: "1 / 1", visibility: "hidden", pointerEvents: "none", whiteSpace: "nowrap" }}
            >
              Naomi Music
            </span>
          </span>
        </button>

        <div className="nm-desktop-nav" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {items.map((it) => (
            <button key={it.key} title={it.label} onClick={() => go(it.key)} style={iconBtnStyle(tab === it.key)}>
              <it.icon size={19} />
            </button>
          ))}

          <div style={{ position: "relative", marginLeft: 6 }}>
            <button title={currentUser.name} onClick={() => setProfileOpen((v) => !v)} style={{ ...iconBtnStyle(profileOpen), padding: 2 }}>
              {currentUser.avatarFileId ? (
                <img src={fileUrl(currentUser.avatarFileId)} alt={currentUser.name} style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover", display: "block" }} />
              ) : (
                <User size={19} />
              )}
            </button>
            {profileOpen && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", background: theme.bgRaised, border: `1px solid ${theme.border}`, borderRadius: 6, padding: 12, width: 190, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{currentUser.name}</div>
                <div style={{ fontSize: 11.5, opacity: 0.6, marginBottom: 10, textTransform: "capitalize" }}>{currentUser.role}</div>
                <button
                  onClick={() => go("profile")}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: theme.text, cursor: "pointer", fontSize: 13, fontFamily: "inherit", padding: 0, marginBottom: 10 }}
                >
                  <User size={15} /> View profile
                </button>
                <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: theme.danger, cursor: "pointer", fontSize: 13, fontFamily: "inherit", padding: 0 }}>
                  <LogOut size={15} /> Log out
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="nm-mobile-toggle" style={{ display: "none", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => go("profile")}
            title="Profile"
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}
          >
            {currentUser.avatarFileId ? (
              <img src={fileUrl(currentUser.avatarFileId)} alt={currentUser.name} style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", border: `1px solid ${theme.border}` }} />
            ) : (
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: theme.bgRaised, border: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: theme.accent, fontWeight: 700, fontSize: 13 }}>
                {currentUser.name?.[0]?.toUpperCase() || "?"}
              </div>
            )}
          </button>
          <button onClick={() => setMobileOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.text, display: "flex" }}>
            <Menu size={22} />
          </button>
        </div>
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
          <button
            onClick={() => go("profile")}
            style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", color: tab === "profile" ? theme.accent : theme.text, fontSize: 14, padding: "10px 4px", fontFamily: "inherit", textAlign: "left" }}
          >
            <User size={18} /> Profile
          </button>
          <div style={{ borderTop: `1px solid ${theme.border}`, margin: "6px 0" }} />
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
