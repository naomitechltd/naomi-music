import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Play, Heart, MessageSquare, Share2 } from "lucide-react";
import { tablesDB, DATABASE_ID, SONGS_TABLE_ID, fileUrl } from "../lib/appwrite";
import { theme, Button } from "../components/ui";

export function SongPage({ currentUser, onPlaySong, onPlay }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Loading… — Naomi Music";
    setLoading(true);
    tablesDB
      .getRow(DATABASE_ID, SONGS_TABLE_ID, id)
      .then((row) => {
        setSong(row);
        const title = `${row.title} — ${row.artistName} | Naomi Music`;
        const desc = row.description || `${row.title} by ${row.artistName} on Naomi Music. ${row.genre || ""} · ${row.releaseType || "single"}`;
        document.title = title;

        const setMeta = (selector, attr, value) => {
          let el = document.head.querySelector(selector);
          if (!el) {
            el = document.createElement("meta");
            const [k, v] = attr.split("=");
            el.setAttribute(k, v);
            document.head.appendChild(el);
          }
          el.setAttribute("content", value);
        };

        setMeta('meta[name="description"]', "name=description", desc);
        setMeta('meta[property="og:title"]', "property=og:title", title);
        setMeta('meta[property="og:description"]', "property=og:description", desc);
        setMeta('meta[property="og:type"]', "property=og:type", "music.song");

        const ldId = "song-jsonld";
        let ld = document.getElementById(ldId);
        if (!ld) {
          ld = document.createElement("script");
          ld.type = "application/ld+json";
          ld.id = ldId;
          document.head.appendChild(ld);
        }
        ld.textContent = JSON.stringify({
          "@context": "https://schema.org",
          "@type": "MusicRecording",
          name: row.title,
          byArtist: { "@type": "MusicGroup", name: row.artistName },
          genre: row.genre || undefined,
          datePublished: row.$createdAt || undefined,
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: 40, textAlign: "center", opacity: 0.6 }}>Loading…</div>;
  if (error) return <div style={{ padding: 40, textAlign: "center", color: theme.danger }}>{error}</div>;
  if (!song) return null;
  if (song.status !== "approved") {
    return <div style={{ padding: 40, textAlign: "center", opacity: 0.6 }}>This song isn't available.</div>;
  }

  const isPoem = song.contentType === "poem";

  const play = () => {
    if (isPoem) return;
    onPlaySong([song], 0);
  };

  const messageArtist = () => {
    navigate("/messages");
  };

  const share = async () => {
    const url = `${window.location.origin}/song/${song.$id}`;
    if (navigator.share) {
      try { await navigator.share({ title: song.title, text: `${song.title} by ${song.artistName}`, url }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(url); alert("Link copied"); } catch {}
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px 120px" }}>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        <img
          src={fileUrl(song.coverArtField)}
          alt={song.title}
          style={{ width: 240, height: 240, borderRadius: 10, objectFit: "cover", background: theme.bgRaised, boxShadow: "0 12px 30px rgba(0,0,0,0.5)" }}
        />
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>{song.title}</h1>
          <button
            onClick={() => navigate(`/artist/${song.uploadedByUserId}`)}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: theme.accent, fontSize: 15, fontFamily: "inherit", textAlign: "left" }}
          >
            {song.artistName}
          </button>
          <div style={{ fontSize: 13, opacity: 0.7, marginTop: 10 }}>
            {song.genre} · {song.releaseType}{song.albumName ? ` · ${song.albumName}` : ""}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
            {!isPoem && <Button onClick={play}><Play size={15} /> Play</Button>}
            <Button variant="outline" onClick={messageArtist}><MessageSquare size={15} /> Message</Button>
            <Button variant="outline" onClick={share}><Share2 size={15} /> Share</Button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 34, paddingTop: 22, borderTop: `1px solid ${theme.border}`, fontSize: 14, lineHeight: 1.7, opacity: 0.9 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>{isPoem ? "Poem details" : "Credits"}</div>
        {!isPoem && <div>Producer: {song.producer}</div>}
        {!isPoem && <div>Songwriter: {song.songWriter}</div>}
        {isPoem && <div>Author: {song.songWriter || song.artistName}</div>}
        {song.studio && <div>Studio: {song.studio}</div>}
      </div>

      {song.description && (
        <div style={{ marginTop: 24, fontSize: 14, lineHeight: 1.7, opacity: 0.85 }}>
          {song.description}
        </div>
      )}

      {song.lyrics && (
        <div style={{ marginTop: 30, paddingTop: 22, borderTop: `1px solid ${theme.border}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{isPoem ? "Poem" : "Lyrics"}</div>
          <div style={{ fontSize: 14, lineHeight: 1.9, opacity: 0.85, whiteSpace: "pre-wrap" }}>
            {song.lyrics}
          </div>
        </div>
      )}
    </div>
  );
}
