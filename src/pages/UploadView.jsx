import React, { useState } from "react";
import {
  tablesDB, storage, ID, DATABASE_ID, BUCKET_ID, SONGS_TABLE_ID,
} from "../lib/appwrite";
import { Button, Field, ErrorNote, inputStyle } from "../components/ui";

const GENRES = ["Afrobeats", "Amapiano", "Hip Hop", "R&B", "Pop", "Gospel", "House", "Kwaito", "Jazz", "Other"];

export function UploadView({ currentUser, onUploaded }) {
  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState(currentUser?.name || "");
  const [description, setDescription] = useState("");
  const [studio, setStudio] = useState("");
  const [producer, setProducer] = useState("");
  const [songWriter, setSongWriter] = useState("");
  const [releaseType, setReleaseType] = useState("single");
  const [albumName, setAlbumName] = useState("");
  const [genre, setGenre] = useState(GENRES[0]);
  const [lyrics, setLyrics] = useState("");
  const [coverFile, setCoverFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError("");
    if (!title || !artistName || !producer || !songWriter || !genre || !lyrics || !coverFile || !audioFile) {
      setError("Please fill in all required fields and choose both files.");
      return;
    }
    if (releaseType === "album" && !albumName) {
      setError("Album name is required when release type is Album.");
      return;
    }

    setBusy(true);
    try {
      const coverUpload = await storage.createFile(BUCKET_ID, ID.unique(), coverFile);
      const audioUpload = await storage.createFile(BUCKET_ID, ID.unique(), audioFile);

      await tablesDB.createRow(DATABASE_ID, SONGS_TABLE_ID, ID.unique(), {
        title,
        artistName,
        description,
        studio,
        producer,
        songWriter,
        releaseType,
        albumName: releaseType === "album" ? albumName : "",
        genre,
        lyrics,
        coverArtField: coverUpload.$id,
        audioField: audioUpload.$id,
        status: "pending",
        uploadedByEmail: currentUser.email,
      });

      setDone(true);
      setTitle(""); setDescription(""); setStudio(""); setProducer(""); setSongWriter("");
      setAlbumName(""); setLyrics(""); setCoverFile(null); setAudioFile(null);
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
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Upload a song</div>
      <div style={{ opacity: 0.6, fontSize: 13, marginBottom: 24 }}>Goes into review before it's visible to listeners.</div>

      <Field label="Song title *">
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
                border: `1px solid ${releaseType === r ? "#7c5cff" : "#26262a"}`,
                background: releaseType === r ? "#7c5cff" : "transparent",
                color: "#f2f2f2", cursor: "pointer", fontSize: 13, textTransform: "capitalize", fontFamily: "inherit",
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

      <Field label="Genre *">
        <select style={inputStyle()} value={genre} onChange={(e) => setGenre(e.target.value)}>
          {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </Field>

      <Field label="Lyrics *">
        <textarea rows={8} style={{ ...inputStyle(), resize: "vertical" }} value={lyrics} onChange={(e) => setLyrics(e.target.value)} />
      </Field>

      <Field label="Cover art *">
        <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
      </Field>

      <Field label="Audio file *">
        <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />
      </Field>

      <ErrorNote message={error} />

      <Button onClick={submit} disabled={busy} style={{ width: "100%" }}>
        {busy ? "Uploading..." : "Submit for review"}
      </Button>
      {done && <div style={{ color: "#7c5cff", fontSize: 12.5, marginTop: 10 }}>Submitted — awaiting review.</div>}
    </div>
  );
}
