import React, { useState, useEffect } from "react";
import { X, Heart } from "lucide-react";
import { tablesDB, DATABASE_ID, LIKES_TABLE_ID, Query, ID, fileUrl } from "../lib/appwrite";
import { theme } from "../components/ui";
import { AudioPlayer } from "../components/AudioPlayer";

export function SongPlayer({ song, currentUser, onClose }) {
  const [liked, setLiked] = useState(false);
  const [likeRowId, setLikeRowId] = useState(null);
  const [likeCount, setLikeCount] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    tablesDB
      .listRows(DATABASE_ID, LIKES_TABLE_ID, [Query.equal("songId", song.$id)])
      .then((res) => {
        if (cancelled) return;
        setLikeCount(res.total);
        const mine = res.rows.find((r) => r.userEmail === currentUser.email);
        setLiked(!!mine);
        setLikeRowId(mine ? mine.$id : null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [song.$id, currentUser.email]);

  const toggleLike = async () => {
    setBusy(true);
    try {
      if (liked && likeRowId) {
        await tablesDB.deleteRow(DATABASE_ID, LIKES_TABLE_ID, likeRowId);
        setLiked(false);
        setLikeRowId(null);
        setLikeCount((c) => c - 1);
      } else {
        const row = await tablesDB.createRow(DATABASE_ID, LIKES_TABLE_ID, ID.unique(), {
          userEmail: currentUser.email,
          songId: song.$id,
        });
        setLiked(true);
        setLikeRowId(row.$id);
        setLikeCount((c) => c + 1);
      }
    } catch (e) {
      // likely the unique-index rejecting a duplicate like from a double-tap; safe to ignore
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 16px" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "linear-gradient(180deg, #1a1a2e 0%, #0b0b0d 60%)", maxWidth: 420, width: "100%", borderRadius: 12, border: `1px solid ${theme.border}`, padding: "24px 24px 32px", display: "flex", flexDirection: "column", alignItems: "center" }}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: theme.text, opacity: 0.7 }}><X size={20} /></button>
        </div>

        <img
          src={fileUrl(song.coverArtField)}
          alt={song.title}
          style={{ width: "100%", maxWidth: 300, aspectRatio: "1", objectFit: "cover", background: theme.bgRaised, borderRadius: 10, boxShadow: "0 12px 30px rgba(0,0,0,0.5)" }}
        />

        <div style={{ marginTop: 24, textAlign: "center", width: "100%" }}>
          <div style={{ fontSize: 21, fontWeight: 700 }}>{song.title}</div>
          <div style={{ fontSize: 14, opacity: 0.7, marginTop: 4 }}>{song.artistName}</div>
        </div>

        <div style={{ width: "100%", maxWidth: 300 }}>
          <AudioPlayer src={fileUrl(song.audioField)} autoPlay size="large" />
        </div>

        <button
          onClick={toggleLike}
          disabled={busy}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: liked ? "#ff6b6b" : theme.text, marginTop: 20 }}
        >
          <Heart size={20} fill={liked ? "#ff6b6b" : "none"} />
          <span style={{ fontSize: 13 }}>{likeCount}</span>
        </button>

        <div style={{ width: "100%", maxWidth: 300, marginTop: 24, borderTop: `1px solid ${theme.border}`, paddingTop: 16 }}>
          <div style={{ fontSize: 12, opacity: 0.6, lineHeight: 1.7, textAlign: "center" }}>
            {song.genre} · {song.releaseType}{song.albumName ? ` · ${song.albumName}` : ""}
            <br />
            Producer: {song.producer} · Songwriter: {song.songWriter}
            {song.studio && <> · Studio: {song.studio}</>}
          </div>
          {song.description && <div style={{ fontSize: 12.5, opacity: 0.75, marginTop: 10, textAlign: "center" }}>{song.description}</div>}

          <details style={{ marginTop: 16 }}>
            <summary style={{ fontSize: 12.5, opacity: 0.75, cursor: "pointer", textAlign: "center", listStyle: "none" }}>Lyrics</summary>
            <div style={{ fontSize: 12.5, whiteSpace: "pre-wrap", opacity: 0.85, marginTop: 10 }}>{song.lyrics}</div>
          </details>
        </div>
      </div>
    </div>
  );
}
