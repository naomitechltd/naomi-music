import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, LayoutGrid, List, Menu as ListIcon, ChevronLeft, X } from "lucide-react";
import { tablesDB, DATABASE_ID, SONGS_TABLE_ID, Query, fileUrl } from "../lib/appwrite";
import { theme, inputStyle } from "../components/ui";

const VIEW_KEY = "naomi_browse_view";

// Genre → gradient. Add or change colours freely.
const GENRE_STYLES = {
  "Afrobeats":  { bg: "linear-gradient(135deg, #ff6b35 0%, #c41e3a 100%)", emoji: "🌍" },
  "Amapiano":   { bg: "linear-gradient(135deg, #f9c74f 0%, #e07a1f 100%)", emoji: "🎹" },
  "Hip Hop":    { bg: "linear-gradient(135deg, #3a1c71 0%, #d76d77 100%)", emoji: "🎤" },
  "R&B":        { bg: "linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)", emoji: "💜" },
  "Pop":        { bg: "linear-gradient(135deg, #ff5f6d 0%, #ffc371 100%)", emoji: "✨" },
  "Gospel":     { bg: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)", emoji: "🙏" },
  "House":      { bg: "linear-gradient(135deg, #00b4db 0%, #0083b0 100%)", emoji: "🏠" },
  "Kwaito":     { bg: "linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%)", emoji: "💃" },
  "Jazz":       { bg: "linear-gradient(135deg, #42275a 0%, #734b6d 100%)", emoji: "🎷" },
  "Other":      { bg: "linear-gradient(135deg, #4b6cb7 0%, #182848 100%)", emoji: "🎵" },
};

const MOOD_CARDS = [
  { label: "Fresh drops",    key: "fresh",     bg: "linear-gradient(135deg, #7c5cff 0%, #3a1c71 100%)", emoji: "🌟" },
  { label: "Most liked",     key: "liked",     bg: "linear-gradient(135deg, #ff4d6d 0%, #8a1030 100%)", emoji: "❤️" },
  { label: "Radio mix",      key: "radio",     bg: "linear-gradient(135deg, #ff8008 0%, #ffc837 100%)", emoji: "📻" },
];

export function BrowseView({ currentUser, onPlaySong }) {
  const navigate = useNavigate();
  const [songs, setSongs] = useState([]);
  const [likes, setLikes] = useState({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [view, setView] = useState(() => localStorage.getItem(VIEW_KEY) || "grid");
  const [activeGenre, setActiveGenre] = useState(null);
  const [activeMood, setActiveMood] = useState(null);

  useEffect(() => { localStorage.setItem(VIEW_KEY, view); }, [view]);

  // Load songs
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

  // Load like counts for mood sorting
  useEffect(() => {
    tablesDB
      .listRows(DATABASE_ID, "6ab1ffd3000a581a3158", [Query.limit(1000)])
      .then((res) => {
        const map = {};
        for (const row of res.rows) {
          map[row.songId] = (map[row.songId] || 0) + 1;
        }
        setLikes(map);
      })
      .catch(() => {});
  }, []);

  // Genre counts
  const genreCounts = useMemo(() => {
    const c = {};
    for (const s of songs) {
      const g = s.genre || "Other";
      c[g] = (c[g] || 0) + 1;
    }
    return c;
  }, [songs]);

  // Which genres actually have songs
  const availableGenres = useMemo(
    () => Object.keys(genreCounts).sort((a, b) => genreCounts[b] - genreCounts[a]),
    [genreCounts]
  );

  const filtered = useMemo(() => {
    let list = songs;

    // Genre filter
    if (activeGenre) list = list.filter((s) => (s.genre || "Other") === activeGenre);

    // Mood filter
    if (activeMood === "fresh") {
      list = [...list].sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt));
    } else if (activeMood === "liked") {
      list = [...list].sort((a, b) => (likes[b.$id] || 0) - (likes[a.$id] || 0));
    } else if (activeMood === "radio") {
      // shuffle
      list = [...list];
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
    }

    // Search
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((s) =>
        [s.title, s.artistName, s.genre, s.albumName, s.lyrics]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(q))
      );
    }

    return list;
  }, [songs, activeGenre, activeMood, query, likes]);

  const clearFilters = () => { setActiveGenre(null); setActiveMood(null); };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "30px 20px 120px" }}>
      {/* Header */}
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 18 }}>The collection</div>

      {/* Search + view toggle */}
      <div style={{ display: "flex", gap: 10, marginBottom: 22, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 420 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.5 }} />
          <input
            style={{ ...inputStyle(), paddingLeft: 36 }}
            placeholder="Search songs, artists, lyrics..."
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

      {/* Mood cards */}
      <Section title="Browse by mood">
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6, scrollbarWidth: "none" }}>
          {MOOD_CARDS.map((m) => (
            <MoodCard
              key={m.key}
              label={m.label}
              emoji={m.emoji}
              bg={m.bg}
              active={activeMood === m.key}
              onClick={() => setActiveMood(activeMood === m.key ? null : m.key)}
            />
          ))}
        </div>
      </Section>

      {/* Genre cards */}
      {availableGenres.length > 0 && (
        <Section title="Genres">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
            {availableGenres.map((g) => {
              const style = GENRE_STYLES[g] || GENRE_STYLES.Other;
              return (
                <GenreCard
                  key={g}
                  label={g}
                  count={genreCounts[g]}
                  bg={style.bg}
                  emoji={style.emoji}
                  active={activeGenre === g}
                  onClick={() => setActiveGenre(activeGenre === g ? null : g)}
                />
              );
            })}
          </div>
        </Section>
      )}

      {/* Filter status */}
      {(activeGenre || activeMood || query) && (
        <div
          style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
            padding: "8px 12px",
            background: theme.bgRaised,
            border: `1px solid ${theme.border}`,
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          <span style={{ opacity: 0.75 }}>
            {filtered.length} {filtered.length === 1 ? "song" : "songs"}
            {activeGenre ? ` · ${activeGenre}` : ""}
            {activeMood ? ` · ${MOOD_CARDS.find(m => m.key === activeMood)?.label}` : ""}
            {query ? ` · "${query}"` : ""}
          </span>
          <button
            onClick={() => { clearFilters(); setQuery(""); }}
            style={{
              marginLeft: "auto",
              background: "none", border: "none",
              color: theme.accent, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 12.5, fontFamily: "inherit",
            }}
          >
            <X size={13} /> Clear
          </button>
        </div>
      )}

      {loading && <div style={{ opacity: 0.6, fontSize: 13 }}>Loading...</div>}
      {!loading && filtered.length === 0 && (
        <div style={{ opacity: 0.6, fontSize: 13 }}>
          {songs.length === 0 ? "No songs yet." : "Nothing matches — try another filter."}
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

      {/* List view */}
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

      {/* Compact view */}
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

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ fontSize: 12, opacity: 0.55, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700, marginBottom: 12 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function MoodCard({ label, emoji, bg, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0,
        position: "relative",
        width: 160, height: 90,
        padding: 0,
        background: bg,
        border: active ? "2px solid #fff" : "2px solid transparent",
        borderRadius: 12,
        cursor: "pointer",
        overflow: "hidden",
        boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
        textAlign: "left",
      }}
    >
      <div style={{ position: "absolute", top: 12, left: 14, fontSize: 24 }}>{emoji}</div>
      <div style={{ position: "absolute", bottom: 12, left: 14, right: 14, fontSize: 14, fontWeight: 700, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}>
        {label}
      </div>
    </button>
  );
}

function GenreCard({ label, count, bg, emoji, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: "relative",
        aspectRatio: "1.15",
        padding: 0,
        background: bg,
        border: active ? "2px solid #fff" : "2px solid transparent",
        borderRadius: 10,
        cursor: "pointer",
        overflow: "hidden",
        boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
        textAlign: "left",
        minHeight: 110,
      }}
    >
      <div style={{ position: "absolute", top: 10, right: 12, fontSize: 26, opacity: 0.85 }}>{emoji}</div>
      <div style={{ position: "absolute", bottom: 10, left: 12, right: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {label}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>
          {count} {count === 1 ? "song" : "songs"}
        </div>
      </div>
    </button>
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
