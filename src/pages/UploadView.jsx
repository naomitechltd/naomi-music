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

  const isPoem = contentType === "poem";

  const submit = async () => {
    setError("");
    if (!title || !artistName || !genre || !coverFile) {
      setError("Please fill in title, artist name, genre, and cover art.");
      return;
    }
    if (isPoem) {
      if (!lyrics) { setError("Poem needs body text."); return; }
    } else {
      if (!producer || !songWriter || !lyrics || !audioFile) {
        setError("Please fill in producer, songwriter, lyrics, and audio file.");
        return;
      }
      if (releaseType === "album" && !albumName) {
        setError("Album name is required when release type is Album.");
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
      let audioFileId = "";
      if (audioFile) {
        const audioUpload = await storage.createFile(BUCKET_ID, ID.unique(), audioFile, filePerms);
        audioFileId = audioUpload.$id;
      }

      const res = await functions.createExecution(
        "api",
        JSON.stringify({
          action: "submit-song",
          contentType,
          title, artistName, description, studio, producer, songWriter,
          releaseType, albumName, genre, lyrics,
          coverArtField: coverUpload.$id,
          audioField: audioFileId,
        }),
        false
      );

      let out = {};
      try { out = JSON.parse(res.responseBody || res.response || "{}"); } catch {}
      if (!out.ok) throw new Error(out.error || "Submission failed");

      setDone(true);
      setTitle(""); setDescription(""); setStudio(""); setProducer(""); setSongWriter("");
      setAlbumName(""); setLyrics(""); setCoverFile(null); setAudioFile(null); setAcceptTc(false);
      setTimeout(() => setDone(false), 3000);
      if (onUploaded) onUploaded();
    } catch (e) {
      setError(e.message);
    } finally {
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
          <Field label={isPoem ? "Poem title *" : "Song title *"}>
            <input style={inputStyle()} value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Artist name *">
            <input style={inputStyle()} value={artistName} onChange={(e) => setArtistName(e.target.value)} />
          </Field>
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

          <Field label={isPoem ? "Poem text *" : "Lyrics *"}>
            <textarea
              rows={isPoem ? 14 : 8}
              style={{ ...inputStyle(), resize: "vertical" }}
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder={isPoem ? "Write your poem here..." : ""}
            />
          </Field>

          <Field label="Cover art *">
            <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
          </Field>

          <Field label={isPoem ? "Audio recording (optional)" : "Audio file *"}>
            <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />
          </Field>

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
            {busy ? "Uploading..." : isPoem ? "Submit poem for review" : "Submit for review"}
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
