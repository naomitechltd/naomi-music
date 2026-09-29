import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, LayoutGrid, List, Menu as ListIcon } from "lucide-react";
import { tablesDB, DATABASE_ID, SONGS_TABLE_ID, Query, fileUrl } from "../lib/appwrite";
import { theme, inputStyle } from "../components/ui";

const VIEW_KEY = "naomi_browse_view";

export function BrowseView({ currentUser, onPlaySong }) {
  const navigate = useNavigate();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [view, setView] = useState(() => localStorage.getItem(VIEW_KEY) || "grid");

  useEffect(() => {
    tablesDB
      .listRows(DATABASE_ID, SONGS_TABLE_ID, [
        Query.equal("status", "approved"),
        Query.limit(500),
      ])
      .then((res) => setSongs(res.rows))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { localStorage.setItem(VIEW_KEY, view); }, [view]);

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
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 20px 120px" }}>
      {/* Header */}
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>The collection</div>

      {/* Search + view toggle */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 420 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.5 }} />
          <input
            style={{ ...inputStyle(), paddingLeft: 36 }}
            placeholder="Search by song, artist, genre, album, or lyrics..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: 2, background: theme.bgRaised, border: `1px solid ${theme.border}`, borderRadius: 8, padding: 2 }}>
          <ViewBtn icon={LayoutGrid} active={view === "grid"} onClick={() => setView("grid")} title="Grid" />
          <ViewBtn icon={List} active={view === "list"} onClick={() => setView("list")} title="List" />
          <ViewBtn icon={ListIcon} active={view === "compact"} onClick={() => setView("compact")} title="Compact" />
        </div>
      </div>

      {loading && <div style={{ opacity: 0.6, fontSize: 13 }}>Loading...</div>}
      {!loading && filtered.length === 0 && (
        <div style={{ opacity: 0.6, fontSize: 13 }}>
          {songs.length === 0 ? "No songs yet." : "No matches found."}
        </div>
      )}

      {/* Grid view */}
      {view === "grid" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 18 }}>
          {filtered.map((s, i) => (
            <Link
              key={s.$id}
              to={`/song/${s.$id}`}
              onClick={(e) => { e.preventDefault(); onPlaySong(filtered, i); }}
              style={{ textDecoration: "none", color: "inherit", display: "block" }}
            >
              <img
                src={fileUrl(s.coverArtField)}
                alt={s.title}
                style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 6, background: theme.bgRaised, border: `1px solid ${theme.border}` }}
              />
              <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
              <div style={{ fontSize: 12, opacity: 0.6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.artistName}</div>
            </Link>
          ))}
        </div>
      )}

      {/* List view — big row with cover */}
      {view === "list" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {filtered.map((s, i) => (
            <Link
              key={s.$id}
              to={`/song/${s.$id}`}
              onClick={(e) => { e.preventDefault(); onPlaySong(filtered, i); }}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "8px 10px", borderRadius: 8,
                textDecoration: "none", color: "inherit",
                background: "transparent",
              }}
            >
              <img
                src={fileUrl(s.coverArtField)}
                alt={s.title}
                style={{ width: 56, height: 56, borderRadius: 6, objectFit: "cover", flexShrink: 0, background: theme.bgRaised, border: `1px solid ${theme.border}` }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
                <div style={{ fontSize: 12.5, opacity: 0.6, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {s.artistName}{s.genre ? ` · ${s.genre}` : ""}
                </div>
              </div>
              {s.releaseType && (
                <div style={{ fontSize: 11, opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0 }}>
                  {s.releaseType}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Compact view — small rows, text only */}
      {view === "compact" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {filtered.map((s, i) => (
            <Link
              key={s.$id}
              to={`/song/${s.$id}`}
              onClick={(e) => { e.preventDefault(); onPlaySong(filtered, i); }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "11px 8px",
                borderBottom: `1px solid ${theme.border}`,
                textDecoration: "none", color: "inherit",
              }}
            >
              <div style={{ width: 24, fontSize: 12, opacity: 0.4, textAlign: "right", flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
              </div>
              <div style={{ fontSize: 12.5, opacity: 0.55, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "35%" }}>
                {s.artistName}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ViewBtn({ icon: Icon, active, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: active ? theme.accent : "transparent",
        border: "none",
        color: active ? "#fff" : theme.text,
        opacity: active ? 1 : 0.7,
        width: 32, height: 32,
        borderRadius: 6,
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <Icon size={16} />
    </button>
  );
}
