import React from "react";
import { theme } from "../components/ui";
import { Search, LayoutGrid, List } from "lucide-react";

export function BrowseView({ currentUser, onPlaySong }) {
  // You will need to map these to your actual state/data
  const recentSongs = [
    { id: 1, title: "Ama Hit", artist: "Yena yedwa", cover: "https://via.placeholder.com/150" }
  ];

  const moods = [
    { label: "Fresh drops", icon: "✨", gradient: theme.accentGrad },
    { label: "Most liked", icon: "❤️", gradient: "linear-gradient(135deg, #f43f5e, #be123c)" },
    { label: "Trending", icon: "🔥", gradient: "linear-gradient(135deg, #f59e0b, #ea580c)" }
  ];

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "24px 20px 120px" }}>
      {/* Page Title */}
      <h2
        style={{
          fontFamily: theme.fontDisplay,
          fontSize: 36,
          margin: "0 0 24px 0",
          letterSpacing: "-0.04em",
        }}
      >
        The collection
      </h2>

      {/* Search Bar & View Toggles */}
      <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: theme.bgRaised,
            borderRadius: theme.radiusMd,
            padding: "0 16px",
            border: `1px solid ${theme.border}`,
          }}
        >
          <Search size={18} color={theme.textMuted} />
          <input
            placeholder="Search songs, artists, lyrics..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: theme.text,
              padding: "14px 0",
              outline: "none",
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
          }}
        >
          <button style={{ background: theme.accent, border: "none", padding: 12, color: theme.accentFg }}>
            <LayoutGrid size={20} />
          </button>
          <button style={{ background: "transparent", border: "none", padding: 12, color: theme.textMuted }}>
            <List size={20} />
          </button>
        </div>
      </div>

      {/* Recently Played */}
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: theme.textMuted, marginBottom: 16 }}>
        RECENTLY PLAYED
      </p>
      <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 16, marginBottom: 24 }}>
        {recentSongs.map((song) => (
          <div key={song.id} style={{ width: 140, cursor: "pointer" }}>
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
              <img src={song.cover} alt={song.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <p style={{ margin: "0 0 4px 0", fontWeight: 600, fontSize: 14 }}>{song.title}</p>
            <p style={{ margin: 0, fontSize: 12, color: theme.textMuted }}>{song.artist}</p>
          </div>
        ))}
      </div>

      {/* Filter Pills */}
      <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
        {["All", "Songs", "Poems"].map((f, i) => (
          <button
            key={f}
            style={{
              padding: "10px 24px",
              borderRadius: theme.radiusPill,
              border: `1px solid ${i === 0 ? "transparent" : theme.border}`,
              background: i === 0 ? theme.accentGrad : "transparent",
              color: i === 0 ? theme.accentFg : theme.text,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: i === 0 ? theme.shadowSm : "none",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Moods */}
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: theme.textMuted, marginBottom: 16 }}>
        BROWSE BY MOOD
      </p>
      <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 16, marginBottom: 24 }}>
        {moods.map((mood) => (
          <div
            key={mood.label}
            style={{
              minWidth: 160,
              height: 100,
              borderRadius: theme.radiusLg,
              background: mood.gradient,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              color: "#fff",
              boxShadow: theme.shadowMd,
              cursor: "pointer",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <span style={{ fontSize: 24, position: "absolute", top: 12, left: 16 }}>{mood.icon}</span>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{mood.label}</span>
          </div>
        ))}
      </div>

      {/* Genres */}
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: theme.textMuted, marginBottom: 16 }}>
        GENRES
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div
          style={{
            height: 160,
            borderRadius: theme.radiusLg,
            background: "linear-gradient(135deg, #6b21a8, #db2777)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            color: "#fff",
            cursor: "pointer",
            boxShadow: theme.shadowMd,
            position: "relative",
          }}
        >
          <span style={{ fontSize: 32, position: "absolute", top: 16, right: 16 }}>🎤</span>
          <span style={{ fontFamily: theme.fontDisplay, fontSize: 24 }}>Hip Hop</span>
          <span style={{ fontSize: 12, opacity: 0.8 }}>1 song</span>
        </div>
      </div>
    </main>
  );
}