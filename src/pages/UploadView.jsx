import React, { useState } from "react";
import { Music, FileText, Mic2, Lock } from "lucide-react";
import {
  storage, functions, ID, BUCKET_ID, Permission, Role,
} from "../lib/appwrite";
import { Button, Field, ErrorNote, inputStyle, theme } from "../components/ui";

const GENRES = ["Afrobeats", "Amapiano", "Hip Hop", "R&B", "Pop", "Gospel", "House", "Kwaito", "Jazz", "Other"];
const POEM_TYPES = [
  "Love & Romance",
  "Life & Reflection",
  "Praise & Worship",
  "Struggle & Pain",
  "Heritage & Culture",
  "Nature",
  "Inspirational",
  "Storytelling",
  "Spoken Word",
  "Other",
];

const TYPES = [
  { key: "song", label: "Song", icon: Music },
  { key: "poem", label: "Poem", icon: FileText },
  { key: "instrumental", label: "Instrumental", icon: Mic2, disabled: true },
];

const emptyTrack = () => ({ title: "", featuring: "", lyrics: "", audio: null });

export function UploadView({ currentUser, onUploaded }) {
  const [contentType, setContentType] = useState("song");

  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState(currentUser?.name || "");
  const [description, setDescription] = useState("");
  const [studio, setStudio] = useState(currentUser?.studio || "");
  const [producer, setProducer] = useState("");
  const [songWriter, setSongWriter] = useState(currentUser?.name || "");
  const [releaseType, setReleaseType] = useState("single");
  const [albumName, setAlbumName] = useState("");
  const [genre, setGenre] = useState(GENRES[0]);
  const [lyrics, setLyrics] = useState("");
  const [coverFile, setCoverFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [acceptTc, setAcceptTc] = useState(false);
  const [featuring, setFeaturing] = useState("");
  const [tracks, setTracks] = useState([emptyTrack()]);
  const [progress, setProgress] = useState("");

  const isPoem = contentType === "poem";
  const isAlbum = contentType === "song" && releaseType === "album";

  const updateTrack = (i, patch) => setTracks((ts) => ts.map((t, n) => (n === i ? { ...t, ...patch } : t)));
  const addTrack = () => setTracks((ts) => [...ts, emptyTrack()]);
  const removeTrack = (i) => setTracks((ts) => ts.filter((_, n) => n !== i));

  const submit = async () => {
    setError("");
    if ((!isAlbum && !title) || !artistName || !genre || !coverFile) {
      setError("Please fill in title, artist name, genre, and cover art.");
      return;
    }
    if (isPoem) {
      if (!lyrics) { setError("Poem needs body text."); return; }
    } else if (isAlbum) {
      if (!producer || !songWriter) { setError("Please fill in producer and songwriter."); return; }
      if (!albumName) { setError("Album name is required when release type is Album."); return; }
      const bad = tracks.findIndex((t) => !t.title || !t.lyrics || !t.audio);
      if (bad >= 0) { setError("Track " + (bad + 1) + " needs a title, lyrics and an audio file."); return; }
    } else {
      if (!producer || !songWriter || !lyrics || !audioFile) {
        setError("Please fill in producer, songwriter, lyrics, and audio file.");
        return;
      }
    }
    if (!acceptTc) {
      setError("You must confirm your submission complies with the Artist Rules.");
      return;
    }

    setBusy(true);
    try {
      const filePerms = [
        Permission.read(Role.users()),
        Permission.update(Role.user(currentUser.$id)),
        Permission.delete(Role.user(currentUser.$id)),
      ];

      const coverUpload = await storage.createFile(BUCKET_ID, ID.unique(), coverFile, filePerms);
      const send = async (payload) => {
        const res = await functions.createExecution(
          "api",
          JSON.stringify({ action: "submit-song", ...payload }),
          false
        );
        let out = {};
        try { out = JSON.parse(res.responseBody || res.response || "{}"); } catch {}
        if (!out.ok) throw new Error(out.error || "Submission failed");
      };
      const base = {
        contentType, artistName, description, studio, producer, songWriter,
        releaseType, albumName, genre, coverArtField: coverUpload.$id,
      };
      if (isAlbum) {
        for (let n = 0; n < tracks.length; n++) {
          const t = tracks[n];
          setProgress("Uploading track " + (n + 1) + " of " + tracks.length + "...");
          try {
            const up = await storage.createFile(BUCKET_ID, ID.unique(), t.audio, filePerms);
            await send({ ...base, title: t.title, lyrics: t.lyrics, featuring: t.featuring, trackNumber: n + 1, audioField: up.$id });
          } catch (err) {
            throw new Error("Track " + (n + 1) + " failed: " + err.message);
          }
        }
      } else {
        let audioFileId = "";
        if (audioFile) {
          const audioUpload = await storage.createFile(BUCKET_ID, ID.unique(), audioFile, filePerms);
          audioFileId = audioUpload.$id;
        }
        await send({ ...base, title, lyrics, featuring, audioField: audioFileId });
      }

      setDone(true);
      setTitle(""); setDescription(""); setStudio(""); setProducer(""); setSongWriter("");
      setFeaturing(""); setTracks([emptyTrack()]); setAlbumName(""); setLyrics(""); setCoverFile(null); setAudioFile(null); setAcceptTc(false);
      setTimeout(() => setDone(false), 3000);
      if (onUploaded) onUploaded();
    } catch (e) {
      setError(e.message);
    } finally {
      setProgress("");
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "40px 20px 80px" }}>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Submit work</div>
      <div style={{ opacity: 0.6, fontSize: 13, marginBottom: 20 }}>
        Goes into review before it's visible to listeners.
      </div>

      {/* Type selector */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24, background: theme.bgRaised, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 4 }}>
        {TYPES.map((t) => {
          const active = contentType === t.key;
          const disabled = t.disabled;
          return (
            <button
              key={t.key}
              type="button"
              disabled={disabled}
              onClick={() => { if (!disabled) { setContentType(t.key); setGenre(t.key === "poem" ? POEM_TYPES[0] : GENRES[0]); } }}
              style={{
                flex: 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "10px 6px",
                background: active && !disabled ? theme.accent : "transparent",
                color: active && !disabled ? "#fff" : theme.text,
                border: "none",
                borderRadius: 7,
                cursor: disabled ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                opacity: disabled ? 0.45 : 1,
              }}
            >
              <t.icon size={15} />
              {t.label}
              {disabled && <Lock size={11} style={{ opacity: 0.7 }} />}
            </button>
          );
        })}
      </div>

      {contentType === "instrumental" ? (
        <div style={{ padding: "40px 20px", textAlign: "center", opacity: 0.7 }}>
          <div style={{ fontSize: 34, marginBottom: 12 }}>🎹</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Instrumentals — coming soon</div>
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>
            We're setting up proper music-licensing safeguards so instrumentals can be shared
            safely. Check back soon.
          </div>
        </div>
      ) : (
        <>
          {!isAlbum && (
          <Field label={isPoem ? "Poem title *" : "Song title *"}>
            <input style={inputStyle()} value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          )}
          <Field label="Artist name *">
            <input style={inputStyle()} value={artistName} onChange={(e) => setArtistName(e.target.value)} />
          </Field>
          {!isAlbum && (
            <Field label="Featuring (optional)">
              <input style={inputStyle()} value={featuring} onChange={(e) => setFeaturing(e.target.value)} placeholder="e.g. Nomsa, DJ Kay" />
            </Field>
          )}
          <Field label="Description (optional)">
            <textarea rows={3} style={{ ...inputStyle(), resize: "vertical" }} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Field label="Studio (optional)">
            <input style={inputStyle()} value={studio} onChange={(e) => setStudio(e.target.value)} />
          </Field>

          {!isPoem && (
            <>
              <Field label="Producer *">
                <input style={inputStyle()} value={producer} onChange={(e) => setProducer(e.target.value)} />
              </Field>
              <Field label="Songwriter *">
                <input style={inputStyle()} value={songWriter} onChange={(e) => setSongWriter(e.target.value)} />
              </Field>
              <Field label="Release type *">
                <div style={{ display: "flex", gap: 8 }}>
                  {["single", "album"].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReleaseType(r)}
                      style={{
                        flex: 1, padding: "10px 0", borderRadius: 4,
                        border: `1px solid ${releaseType === r ? theme.accent : theme.border}`,
                        background: releaseType === r ? theme.accent : "transparent",
                        color: releaseType === r ? "#fff" : theme.text,
                        cursor: "pointer", fontSize: 13, textTransform: "capitalize", fontFamily: "inherit",
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </Field>
              {releaseType === "album" && (
                <Field label="Album name *">
                  <input style={inputStyle()} value={albumName} onChange={(e) => setAlbumName(e.target.value)} />
                </Field>
              )}
            </>
          )}

          <Field label={isPoem ? "Poem type *" : "Genre *"}>
            <select style={inputStyle()} value={genre} onChange={(e) => setGenre(e.target.value)}>
              {(isPoem ? POEM_TYPES : GENRES).map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>

          {!isAlbum && (
          <Field label={isPoem ? "Poem text *" : "Lyrics *"}>
            <textarea
              rows={isPoem ? 14 : 8}
              style={{ ...inputStyle(), resize: "vertical" }}
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder={isPoem ? "Write your poem here..." : ""}
            />
          </Field>
          )}

          <Field label="Cover art *">
            <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
          </Field>

          {!isAlbum && (
          <Field label={isPoem ? "Audio recording (optional)" : "Audio file *"}>
            <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />
          </Field>
          )}

          {isAlbum && (
            <div style={{ marginTop: 6, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Tracks ({tracks.length})</div>
              {tracks.map((t, i) => (
                <div key={i} style={{ border: `1px solid ${theme.border}`, background: theme.bgRaised, borderRadius: 12, padding: 14, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <b style={{ fontSize: 13 }}>Track {i + 1}</b>
                    {tracks.length > 1 && (
                      <button type="button" onClick={() => removeTrack(i)} style={{ background: "none", border: 0, color: "var(--danger)", cursor: "pointer", fontSize: 12 }}>Remove</button>
                    )}
                  </div>
                  <Field label="Song title *">
                    <input style={inputStyle()} value={t.title} onChange={(e) => updateTrack(i, { title: e.target.value })} />
                  </Field>
                  <Field label="Featuring (optional)">
                    <input style={inputStyle()} value={t.featuring} onChange={(e) => updateTrack(i, { featuring: e.target.value })} />
                  </Field>
                  <Field label="Lyrics *">
                    <textarea rows={6} style={{ ...inputStyle(), resize: "vertical" }} value={t.lyrics} onChange={(e) => updateTrack(i, { lyrics: e.target.value })} />
                  </Field>
                  <Field label="Audio file *">
                    <input type="file" accept="audio/*" onChange={(e) => updateTrack(i, { audio: e.target.files?.[0] || null })} />
                    {t.audio && <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{t.audio.name}</div>}
                  </Field>
                </div>
              ))}
              <button type="button" onClick={addTrack} style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: `1px dashed ${theme.accent}`, background: "transparent", color: theme.accent, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>
                + Add another song
              </button>
            </div>
          )}

          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 14, marginBottom: 10, cursor: "pointer", fontSize: 12.5, lineHeight: 1.5 }}>
            <input
              type="checkbox"
              checked={acceptTc}
              onChange={(e) => setAcceptTc(e.target.checked)}
              style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0, accentColor: theme.accent }}
            />
            <span style={{ opacity: 0.85 }}>
              I confirm this is my original work — no AI music, no AI cover art, no one else's content.
              I have producer / studio consent, and I accept the{" "}
              <a href="/tscs" target="_blank" rel="noopener noreferrer" style={{ color: theme.accent }}>Artist Rules</a>.
            </span>
          </label>

          <ErrorNote message={error} />

          <Button onClick={submit} disabled={busy} style={{ width: "100%" }}>
            {busy ? (progress || "Uploading...") : isPoem ? "Submit poem for review" : "Submit for review"}
          </Button>
          {done && (
            <div style={{ color: "#4be88a", fontSize: 12.5, marginTop: 10, textAlign: "center" }}>
              Submitted — awaiting review.
            </div>
          )}
        </>
      )}
    </div>
  );
}
