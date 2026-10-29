
import React, { useMemo, useState } from "react";
import { theme } from "../components/ui";
import {
  Search,
  LayoutGrid,
  List,
  Music,
  Play,
  Heart,
  Flame,
  Sparkles,
} from "lucide-react";
import { fileUrl as nmFileUrl } from "../lib/appwrite";

export function BrowseView({
  currentUser,
  onPlaySong,
  songs = [],
}) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState("grid");
  const [category, setCategory] = useState("All");
  const [selectedMood, setSelectedMood] = useState("All");
  const [selectedGenre, setSelectedGenre] = useState("All");

  const recentSongs = useMemo(() => {
    return [...songs]
      .filter((song) => song && (song.id || song.$id))
      .slice(0, 8);
  }, [songs]);

  const moods = [
    {
      label: "Fresh drops",
      icon: "✨",
      gradient: theme.accentGrad,
    },
    {
      label: "Most liked",
      icon: "❤️",
      gradient: "linear-gradient(135deg,#f43f5e,#be123c)",
    },
    {
      label: "Trending",
      icon: "🔥",
      gradient: "linear-gradient(135deg,#f59e0b,#ea580c)",
    },
  ];

  const genres = [
    {
      label: "Hip Hop",
      icon: "🎤",
      gradient: "linear-gradient(135deg,#6b21a8,#db2777)",
    },
    {
      label: "Amapiano",
      icon: "🎹",
      gradient: "linear-gradient(135deg,#0369a1,#06b6d4)",
    },
    {
      label: "Gospel",
      icon: "🙏",
      gradient: "linear-gradient(135deg,#047857,#34d399)",
    },
    {
      label: "Poetry",
      icon: "📝",
      gradient: "linear-gradient(135deg,#9a3412,#f97316)",
    },
  ];

  const getId = (song) => song?.$id ?? song?.id;

  const getTitle = (song) =>
    song?.title || song?.name || "Untitled";

  const getArtist = (song) =>
    song?.artist ||
    song?.artistName ||
    song?.uploadedBy ||
    "Unknown artist";

  const getCover = (song) =>
    song?.coverUrl ||
    song?.cover ||
    song?.imageUrl ||
    song?.artworkUrl ||
    (song?.coverFileId || song?.coverArtField
      ? nmFileUrl(song.coverFileId || song.coverArtField)
      : "");

  const getType = (song) =>
    String(song?.type || song?.category || "Song").toLowerCase();

  const filteredSongs = useMemo(() => {
    const term = search.trim().toLowerCase();

    let result = [...songs];

    if (category === "Songs") {
      result = result.filter(
        (song) => !getType(song).includes("poem")
      );
    } else if (category === "Poems") {
      result = result.filter(
        (song) => getType(song).includes("poem")
      );
    }

    if (selectedGenre !== "All") {
      result = result.filter(
        (song) =>
          String(song?.genre || "").toLowerCase() ===
          selectedGenre.toLowerCase()
      );
    }

    if (selectedMood === "Most liked") {
      result.sort(
        (a, b) => Number(b?.likes || 0) - Number(a?.likes || 0)
      );
    } else if (selectedMood === "Trending") {
      result.sort(
        (a, b) =>
          Number(b?.plays || b?.playCount || 0) -
          Number(a?.plays || a?.playCount || 0)
      );
    }

    if (term) {
      result = result.filter((song) => {
        const searchable = [
          getTitle(song),
          getArtist(song),
          song?.genre || "",
          song?.album || "",
          song?.lyrics || "",
        ]
          .join(" ")
          .toLowerCase();

        return searchable.includes(term);
      });
    }

    return result;
  }, [songs, search, category, selectedMood, selectedGenre]);

  const cardStyle = {
    background: theme.bgRaised,
    border: `1px solid ${theme.border}`,
    borderRadius: theme.radiusMd,
    overflow: "hidden",
    boxShadow: theme.shadowSm,
    minWidth: 0,
  };

  const sectionLabel = {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: theme.textMuted,
    margin: "0 0 16px",
  };

  const filterButton = (active) => ({
    padding: "10px 20px",
    borderRadius: theme.radiusPill,
    border: `1px solid ${active ? "transparent" : theme.border}`,
    background: active ? theme.accentGrad : "transparent",
    color: active ? theme.accentFg : theme.text,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  });

  const playSong = (song) => {
    if (typeof onPlaySong === "function") {
      onPlaySong(song);
    }
  };

  const renderSong = (song) => {
    const id = getId(song);
    const cover = getCover(song);

    return (
      <article
        key={id}
        style={{
          ...cardStyle,
          cursor: "pointer",
          display: view === "list" ? "flex" : "block",
          alignItems: "center",
          gap: view === "list" ? 14 : 0,
          padding: view === "list" ? 10 : 0,
        }}
        onClick={() => playSong(song)}
      >
        <div
          style={{
            width: view === "list" ? 64 : "100%",
            height: view === "list" ? 64 : "auto",
            aspectRatio: view === "list" ? undefined : "1 / 1",
            flexShrink: 0,
            position: "relative",
            overflow: "hidden",
            borderRadius: view === "list" ? theme.radiusMd : 0,
            background: theme.card,
          }}
        >
          {cover ? (
            <img
              src={cover}
              alt={getTitle(song)}
              loading="lazy"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                position: view === "list" ? "static" : "absolute",
                inset: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                minHeight: view === "list" ? 64 : 130,
                display: "grid",
                placeItems: "center",
                color: theme.textMuted,
              }}
            >
              <Music size={30} />
            </div>
          )}
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            padding: view === "list" ? 0 : 12,
          }}
        >
          <p
            style={{
              margin: "0 0 5px",
              fontWeight: 700,
              fontSize: 14,
              color: theme.text,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {getTitle(song)}
          </p>

          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: theme.textMuted,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {getArtist(song)}
          </p>
        </div>

        {view === "list" && (
          <button
            type="button"
            aria-label={`Play ${getTitle(song)}`}
            onClick={(event) => {
              event.stopPropagation();
              playSong(song);
            }}
            style={{
              border: 0,
              borderRadius: theme.radiusPill,
              background: theme.accent,
              color: theme.accentFg,
              width: 42,
              height: 42,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <Play size={18} fill="currentColor" />
          </button>
        )}
      </article>
    );
  };

  return (
    <main
      style={{
        maxWidth: 1000,
        width: "100%",
        margin: "0 auto",
        padding: "24px 20px 120px",
        boxSizing: "border-box",
        color: theme.text,
      }}
    >
      <h2
        style={{
          fontFamily: theme.fontDisplay,
          fontSize: 36,
          margin: "0 0 24px",
          letterSpacing: "-0.04em",
        }}
      >
        The collection
      </h2>

      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 28,
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: theme.bgRaised,
            borderRadius: theme.radiusMd,
            padding: "0 14px",
            border: `1px solid ${theme.border}`,
          }}
        >
          <Search size={18} color={theme.textMuted} />

          <input
            type="search"
            aria-label="Search music"
            placeholder="Search songs, artists, lyrics..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{
              flex: 1,
              minWidth: 0,
              background: "transparent",
              border: "none",
              color: theme.text,
              padding: "14px 0",
              outline: "none",
              fontSize: 14,
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            background: theme.bgRaised,
            borderRadius: theme.radiusMd,
            border: `1px solid ${theme.border}`,
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            aria-label="Grid view"
            aria-pressed={view === "grid"}
            onClick={() => setView("grid")}
            style={{
              background: view === "grid" ? theme.accent : "transparent",
              border: 0,
              padding: 12,
              color:
                view === "grid" ? theme.accentFg : theme.textMuted,
              cursor: "pointer",
            }}
          >
            <LayoutGrid size={20} />
          </button>

          <button
            type="button"
            aria-label="List view"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
            style={{
              background: view === "list" ? theme.accent : "transparent",
              border: 0,
              padding: 12,
              color:
                view === "list" ? theme.accentFg : theme.textMuted,
              cursor: "pointer",
            }}
          >
            <List size={20} />
          </button>
        </div>
      </div>

      {recentSongs.length > 0 && (
        <section style={{ marginBottom: 30 }}>
          <p style={sectionLabel}>RECENTLY PLAYED</p>

          <div
            style={{
              display: "flex",
              gap: 16,
              overflowX: "auto",
              paddingBottom: 12,
            }}
          >
            {recentSongs.map((song) => (
              <button
                key={getId(song)}
                type="button"
                onClick={() => playSong(song)}
                style={{
                  width: 140,
                  minWidth: 140,
                  textAlign: "left",
                  padding: 0,
                  border: 0,
                  background: "transparent",
                  color: theme.text,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 140,
                    height: 140,
                    borderRadius: theme.radiusMd,
                    background: theme.card,
                    marginBottom: 12,
                    overflow: "hidden",
                    boxShadow: theme.shadowMd,
                    border: `1px solid ${theme.border}`,
                  }}
                >
                  {getCover(song) ? (
                    <img
                      src={getCover(song)}
                      alt={getTitle(song)}
                      loading="lazy"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        height: "100%",
                        display: "grid",
                        placeItems: "center",
                        color: theme.textMuted,
                      }}
                    >
                      <Music size={32} />
                    </div>
                  )}
                </div>

                <p
                  style={{
                    margin: "0 0 4px",
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  {getTitle(song)}
                </p>

                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: theme.textMuted,
                  }}
                >
                  {getArtist(song)}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      <div
        style={{
          display: "flex",
          gap: 10,
          overflowX: "auto",
          paddingBottom: 8,
          marginBottom: 30,
        }}
      >
        {["All", "Songs", "Poems"].map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
            style={filterButton(category === item)}
          >
            {item}
          </button>
        ))}
      </div>

      <section style={{ marginBottom: 32 }}>
        <p style={sectionLabel}>BROWSE BY MOOD</p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 14,
          }}
        >
          {moods.map((mood) => {
            const active = selectedMood === mood.label;

            return (
              <button
                key={mood.label}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  setSelectedMood(active ? "All" : mood.label)
                }
                style={{
                  minHeight: 110,
                  borderRadius: theme.radiusLg,
                  background: mood.gradient,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  alignItems: "flex-start",
                  textAlign: "left",
                  color: "#fff",
                  boxShadow: theme.shadowMd,
                  cursor: "pointer",
                  border: active
                    ? "2px solid white"
                    : "2px solid transparent",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    fontSize: 24,
                    position: "absolute",
                    top: 12,
                    left: 16,
                  }}
                >
                  {mood.icon}
                </span>

                <span style={{ fontWeight: 700, fontSize: 15 }}>
                  {mood.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <p style={sectionLabel}>GENRES</p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
            gap: 14,
          }}
        >
          {genres.map((genre) => {
            const active = selectedGenre === genre.label;

            return (
              <button
                key={genre.label}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  setSelectedGenre(
                    active ? "All" : genre.label
                  )
                }
                style={{
                  minHeight: 135,
                  borderRadius: theme.radiusLg,
                  background: genre.gradient,
                  padding: 18,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  alignItems: "flex-start",
                  color: "#fff",
                  cursor: "pointer",
                  boxShadow: theme.shadowMd,
                  border: active
                    ? "2px solid white"
                    : "2px solid transparent",
                  position: "relative",
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    fontSize: 28,
                    position: "absolute",
                    top: 14,
                    right: 14,
                  }}
                >
                  {genre.icon}
                </span>

                <span
                  style={{
                    fontFamily: theme.fontDisplay,
                    fontSize: 21,
                    fontWeight: 700,
                  }}
                >
                  {genre.label}
                </span>

                <span style={{ fontSize: 12, opacity: 0.85 }}>
                  Browse genre
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <p style={{ ...sectionLabel, margin: 0 }}>
            {search ? "SEARCH RESULTS" : "EXPLORE MUSIC"}
          </p>

          <span style={{ fontSize: 12, color: theme.textMuted }}>
            {filteredSongs.length}{" "}
            {filteredSongs.length === 1 ? "track" : "tracks"}
          </span>
        </div>

        {filteredSongs.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                view === "grid"
                  ? "repeat(auto-fill, minmax(145px, 1fr))"
                  : "1fr",
              gap: 14,
            }}
          >
            {filteredSongs.map(renderSong)}
          </div>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "42px 20px",
              border: `1px dashed ${theme.border}`,
              borderRadius: theme.radiusLg,
              color: theme.textMuted,
            }}
          >
            <Music
              size={34}
              style={{ marginBottom: 12, opacity: 0.7 }}
            />

            <p
              style={{
                margin: "0 0 8px",
                color: theme.text,
                fontWeight: 700,
              }}
            >
              No music found
            </p>

            <p style={{ margin: 0, fontSize: 13 }}>
              {songs.length === 0
                ? "Your music catalogue will appear here when tracks are loaded."
                : "Try another search or change your filters."}
            </p>

            {(search ||
              category !== "All" ||
              selectedMood !== "All" ||
              selectedGenre !== "All") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategory("All");
                  setSelectedMood("All");
                  setSelectedGenre("All");
                }}
                style={{
                  marginTop: 18,
                  padding: "10px 18px",
                  border: 0,
                  borderRadius: theme.radiusPill,
                  background: theme.accentGrad,
                  color: theme.accentFg,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
