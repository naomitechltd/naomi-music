import React, { useEffect, useState, useMemo } from "react";
import { Search } from "lucide-react";
import { tablesDB, DATABASE_ID, SONGS_TABLE_ID, Query, fileUrl } from "../lib/appwrite";
import { theme, inputStyle } from "../components/ui";

export function BrowseView({ currentUser, onPlaySong }) {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    tablesDB
      .listRows(DATABASE_ID, SONGS_TABLE_ID, [Query.equal("status", "approved")])
      .then((res) => setSongs(res.rows))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return songs;
    return songs.filter((s) =>
      [s.title, s.artistName, s.genre, s.albumName, s.lyrics]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(q))
    );
  }, [songs, query]);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 20px 80px" }}>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>The collection</div>

      <div style={{ position: "relative", maxWidth: 380, marginBottom: 24 }}>
        <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.5 }} />
        <input
          style={{ ...inputStyle(), paddingLeft: 36 }}
          placeholder="Search by song, artist, genre, album, or lyrics..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading && <div style={{ opacity: 0.6, fontSize: 13 }}>Loading...</div>}
      {!loading && filtered.length === 0 && (
        <div style={{ opacity: 0.6, fontSize: 13 }}>
          {songs.length === 0 ? "No songs yet." : "No matches found."}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px,1fr))", gap: 18 }}>
        {filtered.map((s, i) => (
          <div key={s.$id} onClick={() => onPlaySong(filtered, i)} style={{ cursor: "pointer" }}>
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
    </div>
  );
}
