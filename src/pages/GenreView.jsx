import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Play } from "lucide-react";
import { tablesDB, DATABASE_ID, SONGS_TABLE_ID, Query, fileUrl } from "../lib/appwrite";
import { theme } from "../components/ui";

const STYLES = {
  "hip hop": { icon: "🎤", gradient: "linear-gradient(135deg,#7b2cbf,#e0287d)" },
  amapiano: { icon: "🎹", gradient: "linear-gradient(135deg,#0077b6,#00b4d8)" },
  gospel: { icon: "🙏", gradient: "linear-gradient(135deg,#0b7a5a,#2fd08f)" },
  poetry: { icon: "📝", gradient: "linear-gradient(135deg,#a3380f,#f26a1b)" },
};

export function GenreView({ onPlaySong }) {
  const { name = "" } = useParams();
  const navigate = useNavigate();
  const key = name.toLowerCase();
  const style = STYLES[key] || { icon: "🎵", gradient: theme.accentGrad };
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let off = false;
    setLoading(true);
    (async () => {
      try {
        const res = await tablesDB.listRows(DATABASE_ID, SONGS_TABLE_ID, [
          Query.equal("status", "approved"),
          Query.limit(200),
        ]);
        const rows = res?.rows || res?.documents || [];
        const list = rows.filter((s) =>
          key === "poetry"
            ? s.contentType === "poem"
            : s.contentType !== "poem" && String(s.genre || "").toLowerCase() === key
        );
        if (!off) setSongs(list);
      } catch {
        if (!off) setSongs([]);
      } finally {
        if (!off) setLoading(false);
      }
    })();
    return () => { off = true; };
  }, [key]);

  const play = (i) => onPlaySong && onPlaySong(songs, i);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 0 120px" }}>
      <div style={{ background: style.gradient, color: "#fff", padding: "20px 20px 28px", borderRadius: "0 0 28px 28px", position: "relative", overflow: "hidden", boxShadow: theme.shadowLg }}>
        <button type="button" onClick={() => navigate(-1)} aria-label="Back" style={{ width: 40, height: 40, borderRadius: "50%", border: 0, background: "rgba(0,0,0,.28)", color: "#fff", cursor: "pointer", display: "grid", placeItems: "center" }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ position: "absolute", right: 18, top: 22, fontSize: 64, opacity: 0.9 }}>{style.icon}</div>
        <div style={{ fontFamily: theme.fontDisplay, fontSize: 40, fontWeight: 700, marginTop: 56 }}>{name}</div>
        <div style={{ opacity: 0.85, fontSize: 14, marginTop: 4 }}>{loading ? "Loading..." : songs.length + (songs.length === 1 ? " track" : " tracks")}</div>
        {songs.length > 0 && (
          <button type="button" onClick={() => play(0)} style={{ marginTop: 18, display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 999, border: 0, background: "#fff", color: "#111", fontWeight: 700, cursor: "pointer" }}>
            <Play size={18} fill="#111" /> Play all
          </button>
        )}
      </div>

      <div style={{ padding: "20px 16px 0" }}>
        {!loading && songs.length === 0 && (
          <div style={{ textAlign: "center", opacity: 0.6, padding: 40, fontSize: 14 }}>
            No songs in {name} yet. Check back soon.
          </div>
        )}
        {songs.map((s, i) => (
          <div key={s.$id} role="button" tabIndex={0} onClick={() => play(i)} onKeyDown={(e) => { if (e.key === "Enter") play(i); }}
            style={{ display: "flex", alignItems: "center", gap: 14, padding: 10, marginBottom: 10, borderRadius: 16, background: "var(--card)", border: `1px solid ${theme.border}`, cursor: "pointer", animation: `nmIn .45s ${Math.min(i, 8) * 60}ms both` }}>
            <img src={fileUrl(s.coverArtField)} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover", flex: "none", background: "var(--surface)" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
              <button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/artist/${s.uploadedByUserId}`); }}
                style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: theme.accent, fontSize: 13, fontFamily: "inherit" }}>
                {s.artistName}{s.featuring ? " ft. " + s.featuring : ""}
              </button>
            </div>
            <span style={{ width: 40, height: 40, borderRadius: "50%", background: theme.accentGrad, color: theme.accentFg, display: "grid", placeItems: "center", flex: "none" }}>
              <Play size={18} fill="currentColor" style={{ marginLeft: 2 }} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
