import React, { useState } from "react";
import { storage, ID, BUCKET_ID, Permission, Role } from "../lib/appwrite";
import { teaserApi, useMe } from "../lib/teasers";
import { inputStyle } from "./ui";

const getDuration = (file, kind) =>
  new Promise((ok, no) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement(kind);
    el.preload = "metadata";
    el.onloadedmetadata = () => { URL.revokeObjectURL(url); ok(el.duration); };
    el.onerror = () => { URL.revokeObjectURL(url); no(new Error("Could not read this file.")); };
    el.src = url;
  });

export default function TeaserUpload() {
  const me = useMe();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [cover, setCover] = useState(null);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);

  if (me.role !== "artist" && me.role !== "admin") return null;

  const submit = async () => {
    setMsg("");
    if (!title.trim() || !file) return setMsg("Add a title and a video or audio clip.");
    const kind = file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "";
    if (!kind) return setMsg("Choose a video or audio file.");
    if (file.size > 20 * 1024 * 1024) return setMsg("File is too big. Keep it under 20 MB.");
    if (!agree) return setMsg("Please confirm this is your original work.");
    setBusy(true);
    let ids = [];
    try {
      const dur = await getDuration(file, kind);
      if (!(dur > 0) || dur > 30.5) throw new Error("Teasers can be 30 seconds at most. Yours is " + Math.round(dur) + "s.");
      const perms = [Permission.read(Role.users()), Permission.update(Role.user(me.id)), Permission.delete(Role.user(me.id))];
      const m = await storage.createFile(BUCKET_ID, ID.unique(), file, perms);
      ids.push(m.$id);
      let coverId = "";
      if (cover && kind === "audio") {
        const c = await storage.createFile(BUCKET_ID, ID.unique(), cover, perms);
        ids.push(c.$id);
        coverId = c.$id;
      }
      const out = await teaserApi({ action: "create-teaser", title: title.trim(), mediaField: m.$id, mediaType: kind, coverField: coverId, durationSec: dur });
      if (!out.ok) throw new Error(out.error || "Could not post teaser");
      ids = [];
      setTitle(""); setFile(null); setCover(null); setAgree(false);
      setDone(true); setOpen(false);
      setTimeout(() => setDone(false), 6000);
    } catch (e) {
      setMsg(e.message || "Upload failed");
      ids.forEach((id) => storage.deleteFile(BUCKET_ID, id).catch(() => {}));
    } finally {
      setBusy(false);
    }
  };

  const box = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 18, padding: 16, marginBottom: 22 };
  const lab = { display: "block", fontSize: 12, fontWeight: 700, margin: "12px 0 6px", color: "var(--text-muted)" };

  return (
    <div style={box}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div>
          <b>Upcoming teaser</b>
          <div style={{ fontSize: 12, opacity: 0.6 }}>A clip of up to 30 seconds. Live for 7 days.</div>
        </div>
        <button type="button" onClick={() => setOpen((o) => !o)} style={{ padding: "9px 16px", borderRadius: 999, border: 0, background: "var(--accent-grad)", color: "var(--accent-fg)", fontWeight: 700, cursor: "pointer" }}>
          {open ? "Close" : "Post"}
        </button>
      </div>
      {done && <div style={{ color: "#4be88a", fontSize: 13, marginTop: 10 }}>Your teaser is live for 7 days.</div>}
      {open && (
        <div>
          <label style={lab}>Title *</label>
          <input style={inputStyle()} value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. New single this Friday" />
          <label style={lab}>Video or audio (30 s max, under 20 MB) *</label>
          <input type="file" accept="video/*,audio/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          {file && file.type.startsWith("audio/") && (
            <>
              <label style={lab}>Cover image (optional)</label>
              <input type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] || null)} />
            </>
          )}
          <label style={{ display: "flex", gap: 10, marginTop: 14, fontSize: 12.5, cursor: "pointer" }}>
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 3, accentColor: "var(--accent)" }} />
            <span>This is my original work, with no AI music and nothing from other artists.</span>
          </label>
          {msg && <div style={{ color: "var(--danger)", fontSize: 13, marginTop: 10 }}>{msg}</div>}
          <button type="button" disabled={busy} onClick={submit} style={{ width: "100%", marginTop: 14, padding: 12, borderRadius: 12, border: 0, background: "var(--accent-grad)", color: "var(--accent-fg)", fontWeight: 700, cursor: "pointer" }}>
            {busy ? "Uploading..." : "Post teaser"}
          </button>
        </div>
      )}
    </div>
  );
}
