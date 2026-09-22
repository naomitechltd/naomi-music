import React, { useEffect, useState } from "react";
import { tablesDB, DATABASE_ID, SONGS_TABLE_ID, Query, fileUrl } from "../lib/appwrite";
import { Button, theme } from "../components/ui";
import { AudioPlayer } from "../components/AudioPlayer";

export function AdminQueueView() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    tablesDB
      .listRows(DATABASE_ID, SONGS_TABLE_ID, [Query.equal("status", "pending")])
      .then((res) => setSongs(res.rows))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const decide = async (id, status) => {
    setBusyId(id);
    setError("");
    try {
      await tablesDB.updateRow(DATABASE_ID, SONGS_TABLE_ID, id, { status });
      setSongs((s) => s.filter((song) => song.$id !== id));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 20px 80px" }}>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Review queue</div>
      <div style={{ opacity: 0.6, fontSize: 13, marginBottom: 24 }}>Listen before approving.</div>

      {loading && <div style={{ opacity: 0.6, fontSize: 13 }}>Loading...</div>}
      {!loading && songs.length === 0 && <div style={{ opacity: 0.6, fontSize: 13 }}>Nothing pending.</div>}
      {error && <div style={{ color: theme.danger, fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {songs.map((s) => (
          <div key={s.$id} style={{ border: `1px solid ${theme.border}`, borderRadius: 6, padding: 18, display: "flex", gap: 16 }}>
            <img
              src={fileUrl(s.coverArtField)}
              alt={s.title}
              style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 4, flexShrink: 0, background: theme.bgRaised }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{s.title}</div>
              <div style={{ fontSize: 13, opacity: 0.75, marginTop: 2 }}>{s.artistName} · {s.genre} · {s.releaseType}{s.albumName ? ` · ${s.albumName}` : ""}</div>
              <div style={{ fontSize: 12, opacity: 0.6, marginTop: 6, lineHeight: 1.6 }}>
                Producer: {s.producer} · Songwriter: {s.songWriter}
                {s.studio && <> · Studio: {s.studio}</>}
              </div>
              {s.description && <div style={{ fontSize: 12.5, opacity: 0.7, marginTop: 6 }}>{s.description}</div>}

              <AudioPlayer src={fileUrl(s.audioField)} />

              <details style={{ marginTop: 10 }}>
                <summary style={{ fontSize: 12, opacity: 0.7, cursor: "pointer" }}>Lyrics</summary>
                <div style={{ fontSize: 12.5, whiteSpace: "pre-wrap", opacity: 0.8, marginTop: 8, maxHeight: 200, overflowY: "auto" }}>{s.lyrics}</div>
              </details>

              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <Button onClick={() => decide(s.$id, "approved")} disabled={busyId === s.$id}>
                  {busyId === s.$id ? "..." : "Approve"}
                </Button>
                <Button variant="outline" onClick={() => decide(s.$id, "rejected")} disabled={busyId === s.$id}>
                  Reject
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
