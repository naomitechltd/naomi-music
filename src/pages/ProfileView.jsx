import React, { useEffect, useRef, useState } from "react";
import { Mail, Heart, ListMusic, Music, Camera, LogOut, Check, X } from "lucide-react";
import {
  account, storage, tablesDB,
  DATABASE_ID, SONGS_TABLE_ID, LIKES_TABLE_ID, PLAYLISTS_TABLE_ID,
  Query, ID, BUCKET_ID, Permission, Role, fileUrl,
} from "../lib/appwrite";
import { theme, inputStyle, Button, Field, ErrorNote, getThemeMode, setThemeMode } from "../components/ui";
import { enablePush, disablePush, isPushEnabled, isPushSupported } from "../lib/push";

export function ProfileView({ currentUser, setCurrentUser, onLogout }) {
  const [stats, setStats] = useState({ likes: 0, playlists: 0, uploads: 0, pending: 0, approved: 0 });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(currentUser.name || "");

  const [editingPass, setEditingPass] = useState(false);
  const [phone, setPhone] = useState(currentUser.phone || "");
  const [location, setLocation] = useState(currentUser.location || "");
  const [studio, setStudio] = useState(currentUser.studio || "");
  const [studioManager, setStudioManager] = useState(currentUser.studioManager || "");
  const [bio, setBio] = useState(currentUser.bio || "");
  const [instagram, setInstagram] = useState(currentUser.instagram || "");
  const [tiktok, setTiktok] = useState(currentUser.tiktok || "");
  const [youtube, setYoutube] = useState(currentUser.youtube || "");
  const [twitter, setTwitter] = useState(currentUser.twitter || "");
  const [website, setWebsite] = useState(currentUser.website || "");
  const [contactBusy, setContactBusy] = useState(false);
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");

  const fileRef = useRef(null);

  const isArtist = currentUser.role === "artist" || currentUser.role === "admin";
  const isAdmin = currentUser.role === "admin";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [likesRes, plRes] = await Promise.all([
          tablesDB.listRows(DATABASE_ID, LIKES_TABLE_ID, [Query.equal("userEmail", currentUser.email)]),
          tablesDB.listRows(DATABASE_ID, PLAYLISTS_TABLE_ID, [Query.equal("userEmail", currentUser.email)]),
        ]);
        let uploads = 0, pending = 0, approved = 0;
        if (isArtist) {
          const songsRes = await tablesDB.listRows(DATABASE_ID, SONGS_TABLE_ID, [Query.equal("uploadedByEmail", currentUser.email)]);
          uploads = songsRes.total;
          for (const s of songsRes.rows) {
            if (s.status === "pending") pending++;
            else if (s.status === "approved") approved++;
          }
        }
        if (!cancelled) {
          setStats({ likes: likesRes.total, playlists: plRes.total, uploads, pending, approved });
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser.email, isArtist]);

  const flash = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 2400);
  };

  const saveContact = async () => {
    setContactBusy(true);
    setError("");
    try {
      await account.updatePrefs({ phone, location, studio, studioManager, bio, instagram, tiktok, youtube, twitter, website });
      setCurrentUser((u) => ({ ...u, phone, location, studio, studioManager, bio, instagram, tiktok, youtube, twitter, website }));
      flash("Profile updated");
    } catch (e) {
      setError(e.message);
    } finally {
      setContactBusy(false);
    }
  };

  const saveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === currentUser.name) { setEditingName(false); return; }
    setBusy(true); setError("");
    try {
      await account.updateName(trimmed);
      setCurrentUser((u) => ({ ...u, name: trimmed }));
      flash("Name updated");
      setEditingName(false);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const savePassword = async () => {
    if (!oldPass || !newPass) { setError("Enter your current and new password."); return; }
    if (newPass.length < 8) { setError("New password must be at least 8 characters."); return; }
    setBusy(true); setError("");
    try {
      await account.updatePassword(newPass, oldPass);
      flash("Password updated");
      setEditingPass(false);
      setOldPass(""); setNewPass("");
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const changeAvatar = async (file) => {
    if (!file) return;
    setBusy(true); setError("");
    try {
      const perm = [
        Permission.read(Role.users()),
        Permission.update(Role.user(currentUser.$id)),
        Permission.delete(Role.user(currentUser.$id)),
      ];
      const uploaded = await storage.createFile(BUCKET_ID, ID.unique(), file, perm);
      await account.updatePrefs({ avatarFileId: uploaded.$id });
      setCurrentUser((u) => ({ ...u, avatarFileId: uploaded.$id }));
      flash("Avatar updated");
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const roleColor = isAdmin ? "#7c5cff" : currentUser.role === "artist" ? "#4be88a" : "#8888ff";
  const roleLabel = isAdmin ? "Admin" : currentUser.role === "artist" ? "Artist" : "Listener";
  const joined = currentUser.$createdAt
    ? new Date(currentUser.$createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long" })
    : "";

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px 100px" }}>
      {/* Header */}
      <div style={{ background: theme.bgRaised, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 24, display: "flex", alignItems: "center", gap: 18 }}>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          title="Change avatar"
          style={{ position: "relative", background: "none", border: "none", padding: 0, cursor: "pointer" }}
        >
          {currentUser.avatarFileId ? (
            <img src={fileUrl(currentUser.avatarFileId)} alt={currentUser.name} style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: `2px solid ${theme.border}` }} />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: theme.bg, border: `2px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: theme.accent }}>
              {currentUser.name?.[0]?.toUpperCase() || "?"}
            </div>
          )}
          <div style={{ position: "absolute", right: -2, bottom: -2, width: 24, height: 24, borderRadius: "50%", background: theme.accent, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${theme.bgRaised}` }}>
            <Camera size={12} color="#fff" />
          </div>
        </button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => changeAvatar(e.target.files?.[0])} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {editingName ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                autoFocus
                style={{ ...inputStyle(), fontSize: 15, fontWeight: 600 }}
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
              />
              <button onClick={saveName} disabled={busy} style={{ background: theme.accent, border: "none", borderRadius: 4, padding: 8, cursor: "pointer", display: "flex" }}><Check size={14} color="#fff" /></button>
              <button onClick={() => { setEditingName(false); setNameDraft(currentUser.name); }} style={{ background: "none", border: `1px solid ${theme.border}`, borderRadius: 4, padding: 8, cursor: "pointer", display: "flex", color: theme.text }}><X size={14} /></button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{currentUser.name}</div>
              <button onClick={() => setEditingName(true)} style={{ background: "none", border: "none", color: theme.textDim, cursor: "pointer", fontSize: 11, textDecoration: "underline", fontFamily: "inherit" }}>edit</button>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, opacity: 0.7, marginTop: 4 }}>
            <Mail size={13} /> {currentUser.email}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ background: roleColor, color: "#fff", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", padding: "3px 8px", borderRadius: 10 }}>{roleLabel}</span>
            {joined && <span style={{ fontSize: 11.5, opacity: 0.55 }}>Joined {joined}</span>}
          </div>
        </div>
      </div>

      {error && <div style={{ marginTop: 12 }}><ErrorNote message={error} /></div>}
      {success && <div style={{ color: "#4be88a", fontSize: 12.5, marginTop: 12 }}>{success}</div>}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginTop: 20 }}>
        {isArtist && (
          <>
            <StatCard icon={Music} label="Uploads" value={stats.uploads} />
            <StatCard icon={Check} label="Approved" value={stats.approved} accent="#4be88a" />
            <StatCard icon={X} label="Pending" value={stats.pending} accent="#e8b84b" />
          </>
        )}
        <StatCard icon={Heart} label="Liked" value={stats.likes} accent="#ff6b6b" />
        <StatCard icon={ListMusic} label="Playlists" value={stats.playlists} />
      </div>

      {/* Contact info */}
      <div style={{ marginTop: 28, background: theme.bgRaised, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Contact & Studio</div>

        <Field label="Cellphone">
          <input
            type="tel"
            style={inputStyle()}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0821234567"
          />
        </Field>

        <Field label="Location">
          <input
            style={inputStyle()}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Johannesburg, GP"
          />
        </Field>

        {isArtist && (
          <>
            <Field label="Studio">
              <input
                style={inputStyle()}
                value={studio}
                onChange={(e) => setStudio(e.target.value)}
                placeholder="Moonlight Studios"
              />
            </Field>
            <Field label="Studio manager">
              <input
                style={inputStyle()}
                value={studioManager}
                onChange={(e) => setStudioManager(e.target.value)}
                placeholder="Optional"
              />
            </Field>
          </>
        )}

        <Field label="Bio (max 300 chars)">
          <textarea
            rows={3}
            maxLength={300}
            style={{ ...inputStyle(), resize: "vertical" }}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell listeners about yourself…"
          />
        </Field>

        <Field label="Instagram (handle or URL)">
          <input style={inputStyle()} value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@you" />
        </Field>
        <Field label="TikTok (handle or URL)">
          <input style={inputStyle()} value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="@you" />
        </Field>
        <Field label="YouTube (channel or URL)">
          <input style={inputStyle()} value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="https://youtube.com/@you" />
        </Field>
        <Field label="Twitter / X (handle or URL)">
          <input style={inputStyle()} value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="@you" />
        </Field>
        <Field label="Website">
          <input style={inputStyle()} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" />
        </Field>

        <Button onClick={saveContact} disabled={contactBusy}>
          {contactBusy ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Notifications */}
      <div style={{ marginTop: 28, background: theme.bgRaised, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Notifications</div>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2, marginBottom: 14 }}>
          Get notified when someone messages you.
        </div>
        <PushToggle />
      </div>

      {/* Theme */}
      <div style={{ marginTop: 28, background: theme.bgRaised, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Appearance</div>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2, marginBottom: 14 }}>
          Choose how Naomi Music looks.
        </div>
        <ThemeToggle />
      </div>

      {/* Password */}
      <div style={{ marginTop: 28, background: theme.bgRaised, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: editingPass ? 16 : 0 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Password</div>
            <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>Change your account password.</div>
          </div>
          {!editingPass && (
            <Button variant="outline" onClick={() => { setEditingPass(true); setError(""); }} style={{ padding: "7px 14px", fontSize: 12.5 }}>Change</Button>
          )}
        </div>
        {editingPass && (
          <>
            <Field label="Current password">
              <input type="password" style={inputStyle()} value={oldPass} onChange={(e) => setOldPass(e.target.value)} />
            </Field>
            <Field label="New password (min 8 chars)">
              <input type="password" style={inputStyle()} value={newPass} onChange={(e) => setNewPass(e.target.value)} />
            </Field>
            <div style={{ display: "flex", gap: 8 }}>
              <Button onClick={savePassword} disabled={busy}>{busy ? "..." : "Save password"}</Button>
              <Button variant="outline" onClick={() => { setEditingPass(false); setOldPass(""); setNewPass(""); setError(""); }}>Cancel</Button>
            </div>
          </>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={onLogout}
        style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 8, background: "none", border: `1px solid ${theme.danger}`, color: theme.danger, padding: "10px 18px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 600, width: "100%", justifyContent: "center" }}
      >
        <LogOut size={16} /> Log out
      </button>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div style={{ background: theme.bgRaised, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        <Icon size={13} color={accent || theme.text} /> {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, color: accent || theme.text }}>{value}</div>
    </div>
  );
}


function ThemeToggle() {
  const [mode, setMode] = React.useState(getThemeMode());
  const [palette, setPalette] = React.useState(() => {
    try {
      return localStorage.getItem("naomi-music-palette") || "purple";
    } catch {
      return "purple";
    }
  });

  const palettes = [
    { key: "purple", label: "Purple", color: "#8057ff", accent2: "#a78bfa" },
    { key: "blue", label: "Ocean", color: "#00bfae", accent2: "#398dff" },
    { key: "sunset", label: "Sunset", color: "#f08a36", accent2: "#ff5277" },
    { key: "green", label: "Forest", color: "#64c878", accent2: "#b0d957" },
    { key: "rose", label: "Rose", color: "#f06ca8", accent2: "#a875ff" },
    { key: "gold", label: "Gold", color: "#e5ad42", accent2: "#f07845" },
  ];

  const pickMode = (nextMode) => {
    setThemeMode(nextMode);
    setMode(nextMode);
    window.dispatchEvent(new Event("naomi-theme-change"));
  };

  const pickPalette = (nextPalette) => {
    setPalette(nextPalette);

    try {
      localStorage.setItem("naomi-music-palette", nextPalette);
    } catch {}

    document.documentElement.dataset.palette = nextPalette;
    window.dispatchEvent(new Event("naomi-palette-change"));
  };

  React.useEffect(() => {
    document.documentElement.dataset.palette = palette;
  }, [palette]);

  const opts = [
    { key: "auto", label: "Auto" },
    { key: "light", label: "Light" },
    { key: "dark", label: "Dark" },
  ];

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div>
        <div style={{
          fontSize: 12,
          opacity: 0.7,
          marginBottom: 8
        }}>
          Display mode
        </div>

        <div style={{
          display: "flex",
          gap: 6,
          background: theme.bg,
          border: `1px solid ${theme.border}`,
          borderRadius: 10,
          padding: 3
        }}>
          {opts.map((o) => {
            const active = mode === o.key;

            return (
              <button
                key={o.key}
                onClick={() => pickMode(o.key)}
                aria-pressed={active}
                style={{
                  flex: 1,
                  padding: "10px 8px",
                  background: active ? theme.accent : "transparent",
                  color: active ? "#fff" : theme.text,
                  border: "none",
                  borderRadius: 7,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 13,
                  fontWeight: active ? 700 : 500
                }}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div style={{
          fontSize: 12,
          opacity: 0.7,
          marginBottom: 10
        }}>
          Accent color
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 9
        }}>
          {palettes.map((p) => {
            const active = palette === p.key;

            return (
              <button
                key={p.key}
                onClick={() => pickPalette(p.key)}
                aria-pressed={active}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 8px",
                  background: active
                    ? `${p.color}20`
                    : theme.bg,
                  border: `1px solid ${
                    active ? p.color : theme.border
                  }`,
                  borderRadius: 9,
                  color: theme.text,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 12,
                  minWidth: 0
                }}
              >
                <span style={{
                  width: 17,
                  height: 17,
                  flexShrink: 0,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${p.color}, ${p.accent2})`,
                  boxShadow: active
                    ? `0 0 0 2px ${theme.bg}, 0 0 0 3px ${p.color}`
                    : "none"
                }} />
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{
        fontSize: 11.5,
        color: theme.textDim,
        lineHeight: 1.5
      }}>
        Your appearance choices are saved on this device.
      </div>
    </div>
  );
}


function PushToggle() {
  const [enabled, setEnabled] = React.useState(false);
  const [supported, setSupported] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  React.useEffect(() => {
    (async () => {
      const s = await isPushSupported();
      setSupported(s);
      if (s) setEnabled(await isPushEnabled());
    })();
  }, []);

  const toggle = async () => {
    setBusy(true);
    setMsg("");
    try {
      if (enabled) {
        await disablePush();
        setEnabled(false);
        setMsg("Notifications off");
      } else {
        await enablePush();
        setEnabled(true);
        setMsg("Notifications on");
      }
      setTimeout(() => setMsg(""), 2500);
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!supported) {
    return <div style={{ fontSize: 12.5, opacity: 0.55 }}>Your browser doesn't support push notifications.</div>;
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button
        onClick={toggle}
        disabled={busy}
        style={{
          background: enabled ? theme.accent : theme.bg,
          color: enabled ? "#fff" : theme.text,
          border: `1px solid ${enabled ? theme.accent : theme.border}`,
          borderRadius: 8,
          padding: "10px 18px",
          cursor: busy ? "wait" : "pointer",
          fontFamily: "inherit",
          fontSize: 13,
          fontWeight: 600,
          opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? "..." : enabled ? "Turn off" : "Enable notifications"}
      </button>
      {msg && <span style={{ fontSize: 12, opacity: 0.7 }}>{msg}</span>}
    </div>
  );
}
