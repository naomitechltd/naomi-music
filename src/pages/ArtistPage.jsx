import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { tablesDB, DATABASE_ID, SONGS_TABLE_ID, Query, fileUrl } from "../lib/appwrite";
import { theme } from "../components/ui";

export function ArtistPage({ currentUser, onPlaySong }) {
  const { id } = useParams();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Artist — Naomi Music";
    setLoading(true);
    tablesDB
      .listRows(DATABASE_ID, SONGS_TABLE_ID, [
        Query.equal("uploadedByUserId", [id]),
        Query.equal("status", "approved"),
        Query.limit(100),
      ])
      .then((res) => {
        setSongs(res.rows);
        if (res.rows[0]) {
          document.title = `${res.rows[0].artistName} — Naomi Music`;
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: 40, textAlign: "center", opacity: 0.6 }}>Loading…</div>;
  if (error) return <div style={{ padding: 40, textAlign: "center", color: theme.danger }}>{error}</div>;

  const artistName = songs[0]?.artistName || "Artist";

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 20px 120px" }}>
      <h1 style={{ fontSize: 30, fontWeight: 700, marginBottom: 6 }}>{artistName}</h1>
      <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 26 }}>
        {songs.length} {songs.length === 1 ? "song" : "songs"}
      </div>

      {songs.length === 0 && <div style={{ opacity: 0.6, fontSize: 14 }}>No approved songs yet.</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 18 }}>
        {songs.map((s, i) => (
          <div
            key={s.$id}
            onClick={() => onPlaySong(songs, i)}
            style={{ cursor: "pointer" }}
          >
            <img
              src={fileUrl(s.coverArtField)}
              alt={s.title}
              style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 6, background: theme.bgRaised, border: `1px solid ${theme.border}` }}
            />
            <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 8 }}>{s.title}</div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>{s.genre}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
