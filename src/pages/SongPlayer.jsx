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
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 16px" }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: theme.bg, maxWidth: 520, width: "100%", borderRadius: 6, border: `1px solid ${theme.border}`, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: theme.text }}><X size={20} /></button>
        </div>

        <img
          src={fileUrl(song.coverArtField)}
          alt={song.title}
          style={{ width: "100%", maxHeight: 320, objectFit: "contain", background: theme.bgRaised, borderRadius: 4 }}
        />

        <div style={{ marginTop: 16, fontSize: 20, fontWeight: 700 }}>{song.title}</div>
        <div style={{ fontSize: 13.5, opacity: 0.75, marginTop: 2 }}>{song.artistName} · {song.genre} · {song.releaseType}{song.albumName ? ` · ${song.albumName}` : ""}</div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
          <button
            onClick={toggleLike}
            disabled={busy}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: liked ? "#ff6b6b" : theme.text }}
          >
            <Heart size={18} fill={liked ? "#ff6b6b" : "none"} />
            <span style={{ fontSize: 13 }}>{likeCount}</span>
          </button>
        </div>

        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 10, lineHeight: 1.6 }}>
          Producer: {song.producer} · Songwriter: {song.songWriter}
          {song.studio && <> · Studio: {song.studio}</>}
        </div>
        {song.description && <div style={{ fontSize: 12.5, opacity: 0.75, marginTop: 8 }}>{song.description}</div>}

        <AudioPlayer src={fileUrl(song.audioField)} autoPlay />

        <details style={{ marginTop: 14 }}>
          <summary style={{ fontSize: 12.5, opacity: 0.75, cursor: "pointer" }}>Lyrics</summary>
          <div style={{ fontSize: 12.5, whiteSpace: "pre-wrap", opacity: 0.85, marginTop: 8 }}>{song.lyrics}</div>
        </details>
      </div>
    </div>
  );
}
