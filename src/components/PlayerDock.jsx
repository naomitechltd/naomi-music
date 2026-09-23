import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Heart, ChevronDown, X, ListPlus, Plus } from "lucide-react";
import { tablesDB, DATABASE_ID, LIKES_TABLE_ID, PLAYLISTS_TABLE_ID, PLAYLIST_SONGS_TABLE_ID, Query, ID, fileUrl } from "../lib/appwrite";
import { theme, inputStyle } from "./ui";

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PlayerDock({ queue, index, setIndex, expanded, setExpanded, currentUser, onClose }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeat, setRepeat] = useState("off");
  const [liked, setLiked] = useState(false);
  const [likeRowId, setLikeRowId] = useState(null);
  const [likeCount, setLikeCount] = useState(0);
  const [likeBusy, setLikeBusy] = useState(false);

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [myPlaylists, setMyPlaylists] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addedMsg, setAddedMsg] = useState("");

  const song = index != null ? queue[index] : null;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrent(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd = () => {
      if (repeat === "one") {
        audio.currentTime = 0;
        audio.play();
        return;
      }
      if (index < queue.length - 1) {
        setIndex(index + 1);
      } else if (repeat === "all") {
        setIndex(0);
      } else {
        setPlaying(false);
      }
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, [repeat, index, queue.length, setIndex]);

  useEffect(() => {
    if (!song || !audioRef.current) return;
    audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    setShowAddMenu(false);
    setAddedMsg("");
  }, [song?.$id]);

  useEffect(() => {
    if (!song) return;
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
  }, [song?.$id, currentUser.email]);

  if (!song) return null;

  const toggle = () => {
    const audio = audioRef.current;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  };

  const seek = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
  };

  const prevTrack = () => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
    } else if (index > 0) {
      setIndex(index - 1);
    } else if (audio) {
      audio.currentTime = 0;
    }
  };

  const nextTrack = () => {
    if (index < queue.length - 1) setIndex(index + 1);
    else if (repeat === "all") setIndex(0);
  };

  const cycleRepeat = () => {
    setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"));
  };

  const toggleLike = async () => {
    setLikeBusy(true);
    try {
      if (liked && likeRowId) {
        await tablesDB.deleteRow(DATABASE_ID, LIKES_TABLE_ID, likeRowId);
        setLiked(false); setLikeRowId(null); setLikeCount((c) => c - 1);
      } else {
        const row = await tablesDB.createRow(DATABASE_ID, LIKES_TABLE_ID, ID.unique(), { userEmail: currentUser.email, songId: song.$id });
        setLiked(true); setLikeRowId(row.$id); setLikeCount((c) => c + 1);
      }
    } catch {}
    setLikeBusy(false);
  };

  const openAddMenu = async () => {
    const next = !showAddMenu;
    setShowAddMenu(next);
    setAddedMsg("");
    if (next && myPlaylists.length === 0) {
      try {
        const res = await tablesDB.listRows(DATABASE_ID, PLAYLISTS_TABLE_ID, [Query.equal("userEmail", currentUser.email)]);
        setMyPlaylists(res.rows);
      } catch {}
    }
  };

  const addToPlaylist = async (playlistId) => {
    setAddBusy(true);
    try {
      await tablesDB.createRow(DATABASE_ID, PLAYLIST_SONGS_TABLE_ID, ID.unique(), {
        playlistId,
        songId: song.$id,
        order: Date.now(),
      });
      setAddedMsg("Added.");
    } catch (e) {
      setAddedMsg(e.message);
    } finally {
      setAddBusy(false);
    }
  };

  const createAndAdd = async () => {
    if (!newPlaylistName.trim()) return;
    setAddBusy(true);
    try {
      const pl = await tablesDB.createRow(DATABASE_ID, PLAYLISTS_TABLE_ID, ID.unique(), {
        name: newPlaylistName.trim(),
        userEmail: currentUser.email,
      });
      setMyPlaylists((p) => [...p, pl]);
      setNewPlaylistName("");
      await addToPlaylist(pl.$id);
    } catch (e) {
      setAddedMsg(e.message);
      setAddBusy(false);
    }
  };

  const progress = duration ? (current / duration) * 100 : 0;
  const RepeatIcon = repeat === "one" ? Repeat1 : Repeat;

  return (
    <>
      <audio ref={audioRef} src={fileUrl(song.audioField)} preload="metadata" />

      {!expanded && (
        <div
          onClick={() => setExpanded(true)}
          style={{
            position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 150,
            background: theme.bgRaised, borderTop: `1px solid ${theme.border}`,
            display: "flex", alignItems: "center", gap: 12, padding: "8px 14px", cursor: "pointer",
          }}
        >
          <img src={fileUrl(song.coverArtField)} alt={song.title} style={{ width: 40, height: 40, borderRadius: 4, objectFit: "cover", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{song.title}</div>
            <div style={{ fontSize: 11.5, opacity: 0.6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{song.artistName}</div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); toggle(); }} style={{ background: "none", border: "none", color: theme.text, cursor: "pointer", display: "flex" }}>
            {playing ? <Pause size={20} fill={theme.text} /> : <Play size={20} fill={theme.text} />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); nextTrack(); }} style={{ background: "none", border: "none", color: theme.text, cursor: "pointer", display: "flex" }}>
            <SkipForward size={18} fill={theme.text} />
          </button>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 2, background: theme.border }}>
            <div style={{ height: "100%", width: `${progress}%`, background: theme.accent }} />
          </div>
        </div>
      )}

      {expanded && (
        <div
          onClick={() => setExpanded(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 16px" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "linear-gradient(180deg, #1a1a2e 0%, #0b0b0d 60%)", maxWidth: 420, width: "100%", borderRadius: 12, border: `1px solid ${theme.border}`, padding: "20px 24px 28px", display: "flex", flexDirection: "column", alignItems: "center" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
              <button onClick={() => setExpanded(false)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.text, opacity: 0.7 }}><ChevronDown size={22} /></button>
              <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: theme.text, opacity: 0.7 }}><X size={20} /></button>
            </div>

            <img
              src={fileUrl(song.coverArtField)}
              alt={song.title}
              style={{ width: "100%", maxWidth: 280, aspectRatio: "1", objectFit: "cover", background: theme.bgRaised, borderRadius: 10, boxShadow: "0 12px 30px rgba(0,0,0,0.5)", marginTop: 8 }}
            />

            <div style={{ marginTop: 20, textAlign: "center", width: "100%" }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{song.title}</div>
              <div style={{ fontSize: 13.5, opacity: 0.7, marginTop: 4 }}>{song.artistName}</div>
            </div>

            <div style={{ width: "100%", maxWidth: 280, marginTop: 16 }}>
              <div onClick={seek} style={{ height: 4, borderRadius: 3, background: theme.bgRaised, cursor: "pointer", position: "relative", width: "100%" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${progress}%`, borderRadius: 3, background: theme.accent }} />
                <div style={{ position: "absolute", top: "50%", left: `${progress}%`, transform: "translate(-50%, -50%)", width: 12, height: 12, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, opacity: 0.6, marginTop: 6 }}>
                <span>{formatTime(current)}</span>
                <span>{formatTime(duration)}</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginTop: 14 }}>
                <button onClick={cycleRepeat} style={{ background: "none", border: "none", cursor: "pointer", color: repeat !== "off" ? theme.accent : theme.text, opacity: repeat !== "off" ? 1 : 0.6, display: "flex" }}>
                  <RepeatIcon size={17} />
                </button>
                <button onClick={prevTrack} disabled={index === 0} style={{ background: "none", border: "none", cursor: "pointer", color: theme.text, opacity: index === 0 ? 0.35 : 1, display: "flex" }}>
                  <SkipBack size={21} fill={theme.text} />
                </button>
                <button
                  onClick={toggle}
                  style={{ width: 54, height: 54, borderRadius: "50%", border: "none", background: theme.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 14px rgba(124,92,255,0.4)" }}
                >
                  {playing ? <Pause size={21} fill="#fff" /> : <Play size={21} fill="#fff" style={{ marginLeft: 2 }} />}
                </button>
                <button onClick={nextTrack} disabled={index === queue.length - 1 && repeat !== "all"} style={{ background: "none", border: "none", cursor: "pointer", color: theme.text, opacity: (index === queue.length - 1 && repeat !== "all") ? 0.35 : 1, display: "flex" }}>
                  <SkipForward size={21} fill={theme.text} />
                </button>
                <button onClick={toggleLike} disabled={likeBusy} style={{ background: "none", border: "none", cursor: "pointer", color: liked ? "#ff6b6b" : theme.text, display: "flex" }}>
                  <Heart size={17} fill={liked ? "#ff6b6b" : "none"} />
                </button>
                <button onClick={openAddMenu} style={{ background: "none", border: "none", cursor: "pointer", color: showAddMenu ? theme.accent : theme.text, display: "flex" }}>
                  <ListPlus size={18} />
                </button>
              </div>

              {likeCount > 0 && <div style={{ textAlign: "center", fontSize: 11, opacity: 0.5, marginTop: 6 }}>{likeCount} like{likeCount === 1 ? "" : "s"}</div>}

              {showAddMenu && (
                <div style={{ marginTop: 14, border: `1px solid ${theme.border}`, borderRadius: 6, padding: 12, background: "rgba(255,255,255,0.03)" }}>
                  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>Add to playlist</div>
                  {myPlaylists.map((p) => (
                    <button
                      key={p.$id}
                      onClick={() => addToPlaylist(p.$id)}
                      disabled={addBusy}
                      style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", color: theme.text, cursor: "pointer", fontSize: 13, padding: "6px 2px", fontFamily: "inherit" }}
                    >
                      {p.name}
                    </button>
                  ))}
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <input
                      style={{ ...inputStyle(), fontSize: 12.5, padding: "6px 8px" }}
                      placeholder="New playlist"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                    />
                    <button onClick={createAndAdd} disabled={addBusy} style={{ background: theme.accent, border: "none", borderRadius: 4, color: "#fff", cursor: "pointer", padding: "0 10px", display: "flex", alignItems: "center" }}>
                      <Plus size={15} />
                    </button>
                  </div>
                  {addedMsg && <div style={{ fontSize: 11.5, color: theme.accent, marginTop: 6 }}>{addedMsg}</div>}
                </div>
              )}
            </div>

            <div style={{ width: "100%", maxWidth: 280, marginTop: 22, borderTop: `1px solid ${theme.border}`, paddingTop: 14 }}>
              <div style={{ fontSize: 11.5, opacity: 0.6, lineHeight: 1.7, textAlign: "center" }}>
                {song.genre} · {song.releaseType}{song.albumName ? ` · ${song.albumName}` : ""}
                <br />
                Producer: {song.producer} · Songwriter: {song.songWriter}
                {song.studio && <> · Studio: {song.studio}</>}
              </div>
              {song.description && <div style={{ fontSize: 12, opacity: 0.75, marginTop: 10, textAlign: "center" }}>{song.description}</div>}

              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 14, textAlign: "center", fontWeight: 600 }}>Lyrics</div>
              <div style={{ fontSize: 12.5, whiteSpace: "pre-wrap", opacity: 0.85, marginTop: 8, maxHeight: 180, overflowY: "auto", padding: "2px 4px" }}>
                {song.lyrics}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
