import React, { useEffect, useState } from "react";
import { tablesDB, DATABASE_ID, SONGS_TABLE_ID, Query, fileUrl } from "../lib/appwrite";
import { SongPlayer } from "./SongPlayer";
import { theme } from "../components/ui";

export function BrowseView({ currentUser }) {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);

  useEffect(() => {
    tablesDB
      .listRows(DATABASE_ID, SONGS_TABLE_ID, [Query.equal("status", "approved")])
      .then((res) => setSongs(res.rows))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 20px 80px" }}>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>The collection</div>

      {loading && <div style={{ opacity: 0.6, fontSize: 13 }}>Loading...</div>}
      {!loading && songs.length === 0 && <div style={{ opacity: 0.6, fontSize: 13 }}>No songs yet.</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px,1fr))", gap: 18 }}>
        {songs.map((s) => (
          <div key={s.$id} onClick={() => setActive(s)} style={{ cursor: "pointer" }}>
            <img
              src={fileUrl(s.coverArtField)}
              alt={s.title}
              style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 4, background: theme.bgRaised, border: `1px solid ${theme.border}` }}
            />
            <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 8 }}>{s.title}</div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>{s.artistName}</div>
          </div>
        ))}
      </div>

      {active && <SongPlayer song={active} currentUser={currentUser} onClose={() => setActive(null)} />}
    </div>
  );
}
