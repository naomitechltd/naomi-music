import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, TrendingUp, Star } from "lucide-react";
import { getTrending } from "../lib/api";
import { fileUrl } from "../lib/appwrite";
import { theme } from "../components/ui";

export function TrendingView({ onPlaySong }) {
  const navigate = useNavigate();
  const [songs, setSongs] = useState([]);
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Trending — Naomi Music";
    getTrending()
      .then((res) => {
        if (!res.ok) throw new Error(res.error || "Could not load trending");
        setSongs(res.songs || []);
        setArtists(res.artists || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 60, textAlign: "center", opacity: 0.6 }}>Loading trending…</div>;
  if (error) return <div style={{ padding: 60, textAlign: "center", color: theme.danger }}>{error}</div>;

  const playableSongs = songs.filter((s) => (s.contentType || "song") === "song");

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 20px 120px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 26 }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "linear-gradient(135deg, #ff4d6d 0%, #ffb800 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 0 6px rgba(255,77,109,0.15)",
        }}>
          <TrendingUp size={18} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Trending</div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>Top songs and artists on Naomi Music</div>
        </div>
      </div>

      {/* Top artists */}
      {artists.length > 0 && (
        <div style={{ marginBottom: 34 }}>
          <div style={{ fontSize: 12, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 12 }}>
            Top artists
          </div>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6 }}>
            {artists.map((a, i) => (
              <button
                key={a.userId}
                onClick={() => navigate(`/artist/${a.userId}`)}
                style={{
                  flexShrink: 0,
                  width: 130,
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  textAlign: "center",
                  color: "inherit",
                  fontFamily: "inherit",
                }}
              >
                <div style={{ position: "relative", marginBottom: 8 }}>
                  {a.avatarFileId ? (
                    <img src={fileUrl(a.avatarFileId)} alt={a.name} style={{ width: 130, height: 130, borderRadius: "50%", objectFit: "cover", border: `2px solid ${theme.border}` }} />
                  ) : (
                    <div style={{ width: 130, height: 130, borderRadius: "50%", background: theme.bgRaised, border: `2px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42, fontWeight: 700, color: theme.accent }}>
                      {a.name?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                  <div style={{
                    position: "absolute", top: 4, left: 4,
                    background: "rgba(0,0,0,0.75)", color: "#fff",
                    fontSize: 11, fontWeight: 700,
                    padding: "3px 8px", borderRadius: 10,
                    minWidth: 24, textAlign: "center",
                  }}>
                    #{i + 1}
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {a.name}
                </div>
                <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>
                  {a.followers} follower{a.followers === 1 ? "" : "s"}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Top songs */}
      <div>
        <div style={{ fontSize: 12, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 12 }}>
          Top songs
        </div>

        {songs.length === 0 ? (
          <div style={{ opacity: 0.5, fontSize: 14 }}>No songs with plays yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {songs.map((s, i) => {
              const isPoem = s.contentType === "poem";
              const playIdx = playableSongs.findIndex((x) => x.$id === s.$id);
              return (
                <div
                  key={s.$id}
                  onClick={() => {
                    if (isPoem) navigate(`/song/${s.$id}`);
                    else onPlaySong(playableSongs, playIdx);
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "10px 12px",
                    borderRadius: 8,
                    cursor: "pointer",
                    background: i < 3 ? "rgba(124,92,255,0.06)" : "transparent",
                  }}
                >
                  <div style={{ width: 28, fontSize: 14, fontWeight: 700, opacity: i < 3 ? 1 : 0.4, textAlign: "right", flexShrink: 0, color: i === 0 ? "#ffb800" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : theme.text }}>
                    {i + 1}
                  </div>
                  <img src={fileUrl(s.coverArtField)} alt={s.title} style={{ width: 52, height: 52, borderRadius: 6, objectFit: "cover", flexShrink: 0, background: theme.bgRaised, border: `1px solid ${theme.border}` }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
                    <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {s.artistName}{s.genre ? ` · ${s.genre}` : ""}
                    </div>
                  </div>
                  {!isPoem && (
                    <div style={{ fontSize: 11.5, opacity: 0.5, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                      <Play size={11} /> {s.playCount || 0}
                    </div>
                  )}
                  {isPoem && <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.5, letterSpacing: "0.05em" }}>POEM</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
