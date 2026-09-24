import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Heart, ChevronDown, X, ListPlus, Plus, Info, Share2, MessageSquare } from "lucide-react";
import { tablesDB, DATABASE_ID, LIKES_TABLE_ID, PLAYLISTS_TABLE_ID, PLAYLIST_SONGS_TABLE_ID, Query, ID, fileUrl } from "../lib/appwrite";
import { theme, inputStyle } from "./ui";
import { requestMessage } from "../lib/api";


function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
      <div style={{ fontSize: 11.5, opacity: 0.55, textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>{label}</div>
      <div style={{ fontSize: 13.5, textAlign: "right", opacity: 0.95, wordBreak: "break-word" }}>{value}</div>
    </div>
  );
}

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

  // Swipe state
  const cardRef = useRef(null);
  const dragStartX = useRef(null);
  const dragStartY = useRef(null);
  const [cardWidth, setCardWidth] = useState(280);
  const [view, setView] = useState("cover"); // "cover" | "lyrics"
  const [dragging, setDragging] = useState(false);
  const [dragDelta, setDragDelta] = useState(0);
  const [hintDismissed, setHintDismissed] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [msgBusy, setMsgBusy] = useState(false);
  const [msgNote, setMsgNote] = useState("");

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

  // Reset card to cover when the song changes
  useEffect(() => {
    setView("cover");
    setDragDelta(0);
    setDragging(false);
    setShowAbout(false);
    dragStartX.current = null;
    dragStartY.current = null;
  }, [song?.$id]);

  // Measure the card so we can translate in pixels
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const measure = () => setCardWidth(el.clientWidth || 280);
    measure();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [expanded]);

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
    if (next) {
      try {
        const res = await tablesDB.listRows(DATABASE_ID, PLAYLISTS_TABLE_ID, [Query.equal("userEmail", currentUser.email)]);
        setMyPlaylists(res.rows);
      } catch (e) {
        setAddedMsg(e.message);
      }
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

  const messageArtist = async () => {
    if (msgBusy) return;
    const artistUserId = song.uploadedByUserId;
    if (!artistUserId) { setMsgNote("Artist not reachable."); return; }
    if (artistUserId === currentUser.$id) { setMsgNote("This is your song."); return; }
    setMsgBusy(true);
    setMsgNote("");
    try {
      const out = await requestMessage({
        toUserId: artistUserId,
        toName: song.artistName,
        toEmail: song.uploadedByEmail || "",
        intro: "",
      });
      if (out.note === "conversation exists" || out.note === "already approved") {
        setMsgNote("Open Messages to continue.");
      } else {
        setMsgNote("Request sent.");
      }
    } catch (e) {
      if (e.code === "email-not-verified") setMsgNote("Verify your email first.");
      else if (e.code === "cooldown") setMsgNote("Try again in a few days.");
      else setMsgNote(e.message);
    } finally {
      setMsgBusy(false);
      setTimeout(() => setMsgNote(""), 3000);
    }
  };

  const shareSong = async () => {
    const url = window.location.origin + "/?song=" + song.$id;
    const shareData = {
      title: song.title,
      text: `${song.title} by ${song.artistName} on Naomi Music`,
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        setAddedMsg("Link copied to clipboard.");
        setTimeout(() => setAddedMsg(""), 2400);
      }
    } catch (e) {
      // user cancelled — ignore
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

  // Swipe handlers
  const onPointerDown = (e) => {
    const pt = e.touches ? e.touches[0] : e;
    dragStartX.current = pt.clientX;
    dragStartY.current = pt.clientY;
    setDragging(true);
    setDragDelta(0);
  };

  const onPointerMove = (e) => {
    if (dragStartX.current == null) return;
    const pt = e.touches ? e.touches[0] : e;
    const dx = pt.clientX - dragStartX.current;
    const dy = pt.clientY - dragStartY.current;

    // If the user is scrolling vertically, cancel the drag
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dx) < 12) {
      dragStartX.current = null;
      dragStartY.current = null;
      setDragging(false);
      setDragDelta(0);
      return;
    }

    if (e.cancelable) e.preventDefault();
    setDragDelta(dx);
  };

  const onPointerUp = () => {
    if (dragStartX.current == null) {
      setDragging(false);
      return;
    }
    const threshold = Math.min(60, cardWidth * 0.18);
    if (view === "cover" && dragDelta < -threshold) {
      setView("lyrics");
      setHintDismissed(true);
    } else if (view === "lyrics" && dragDelta > threshold) {
      setView("cover");
    }
    setDragging(false);
    setDragDelta(0);
    dragStartX.current = null;
    dragStartY.current = null;
  };

  // Offset: cover starts at 0; lyrics is at -cardWidth
  let translateX;
  if (view === "cover") {
    translateX = Math.min(0, dragDelta);
  } else {
    translateX = -cardWidth + Math.max(0, dragDelta);
  }

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

      {expanded && showAbout && song && (
        <div
          onClick={() => setShowAbout(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 300,
            background: "rgba(0,0,0,0.75)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "24px 16px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "linear-gradient(180deg, #1a1a2e 0%, #0b0b0d 60%)",
              width: "100%", maxWidth: 380, maxHeight: "80vh",
              borderRadius: 12, border: `1px solid ${theme.border}`,
              display: "flex", flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 20px", borderBottom: `1px solid ${theme.border}`,
            }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>About song</div>
              <button
                onClick={() => setShowAbout(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: theme.text, opacity: 0.7, display: "flex" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "18px 20px 22px", overflowY: "auto" }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{song.title}</div>
              <div style={{ fontSize: 13, opacity: 0.7, marginTop: 3 }}>{song.artistName}</div>

              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <Row label="Genre" value={song.genre} />
                <Row label="Release type" value={song.releaseType} />
                {song.albumName && <Row label="Album" value={song.albumName} />}
                <Row label="Producer" value={song.producer} />
                <Row label="Songwriter" value={song.songWriter} />
                {song.studio && <Row label="Studio" value={song.studio} />}
              </div>

              {song.description && (
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontSize: 11, opacity: 0.55, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Description</div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.9, whiteSpace: "pre-wrap" }}>{song.description}</div>
                </div>
              )}
            </div>
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

            {/* Swipeable cover/lyrics card */}
            <div
              ref={cardRef}
              onTouchStart={onPointerDown}
              onTouchMove={onPointerMove}
              onTouchEnd={onPointerUp}
              onTouchCancel={onPointerUp}
              onMouseDown={onPointerDown}
              onMouseMove={dragging ? onPointerMove : undefined}
              onMouseUp={onPointerUp}
              onMouseLeave={dragging ? onPointerUp : undefined}
              style={{
                width: "100%", maxWidth: 280, aspectRatio: "1",
                marginTop: 8, position: "relative", overflow: "hidden",
                borderRadius: 10, background: theme.bgRaised,
                boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
                touchAction: "pan-y",
                cursor: "grab",
                userSelect: "none",
                WebkitUserSelect: "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: "200%",
                  height: "100%",
                  transform: `translateX(${translateX}px)`,
                  transition: dragging ? "none" : "transform 0.28s cubic-bezier(0.22, 0.61, 0.36, 1)",
                  willChange: "transform",
                }}
              >
                {/* Panel 1: cover */}
                <div style={{ width: "50%", height: "100%", flexShrink: 0, position: "relative" }}>
                  <img
                    src={fileUrl(song.coverArtField)}
                    alt={song.title}
                    draggable={false}
                    style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }}
                  />
                </div>

                {/* Panel 2: lyrics */}
                <div
                  style={{
                    width: "50%", height: "100%", flexShrink: 0,
                    background: "linear-gradient(180deg, #15151a 0%, #0f0f13 100%)",
                    padding: "18px 20px", boxSizing: "border-box",
                    overflowY: "auto", overscrollBehavior: "contain",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.5, marginBottom: 12, textAlign: "center" }}>
                    Lyrics
                  </div>
                  <div style={{ fontSize: 14, whiteSpace: "pre-wrap", lineHeight: 1.7, opacity: 0.9, textAlign: "center", paddingBottom: 12 }}>
                    {song.lyrics || "No lyrics for this track."}
                  </div>
                </div>
              </div>
            </div>

            {/* Page dots + hint */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, height: 16 }}>
              <div
                style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: view === "cover" ? theme.accent : theme.border,
                  transition: "background 0.2s",
                }}
              />
              <div
                style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: view === "lyrics" ? theme.accent : theme.border,
                  transition: "background 0.2s",
                }}
              />
              {!hintDismissed && view === "cover" && (
                <span style={{ fontSize: 11, opacity: 0.45, marginLeft: 8 }}>
                  Swipe for lyrics
                </span>
              )}
            </div>

            <div style={{ marginTop: 14, textAlign: "center", width: "100%" }}>
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
              </div>

              {likeCount > 0 && <div style={{ textAlign: "center", fontSize: 11, opacity: 0.5, marginTop: 6 }}>{likeCount} like{likeCount === 1 ? "" : "s"}</div>}

              {showAddMenu && (
                <div style={{ marginTop: 14, border: `1px solid ${theme.border}`, borderRadius: 6, padding: 12, background: "rgba(255,255,255,0.03)" }}>
                  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>Add to playlist</div>
                  {myPlaylists.length === 0 ? (
                    <div style={{ fontSize: 12.5, opacity: 0.65, marginBottom: 8, lineHeight: 1.5 }}>
                      You don't have any playlists yet.<br />Create one below to save this song.
                    </div>
                  ) : myPlaylists.map((p) => (
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

            <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                onClick={openAddMenu}
                title="Add to playlist"
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "transparent", border: `1px solid ${showAddMenu ? theme.accent : theme.border}`,
                  color: showAddMenu ? theme.accent : theme.text, opacity: showAddMenu ? 1 : 0.85,
                  padding: "8px 16px", borderRadius: 20,
                  cursor: "pointer", fontFamily: "inherit", fontSize: 12.5,
                }}
              >
                <ListPlus size={14} />
                Playlist
              </button>

              <button
                type="button"
                onClick={messageArtist}
                disabled={msgBusy}
                title="Message artist"
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "transparent", border: `1px solid ${theme.border}`,
                  color: theme.text, opacity: msgBusy ? 0.5 : 0.85,
                  padding: "8px 16px", borderRadius: 20,
                  cursor: msgBusy ? "wait" : "pointer", fontFamily: "inherit", fontSize: 12.5,
                }}
              >
                <MessageSquare size={14} />
                Message
              </button>

              <button
                type="button"
                onClick={() => setShowAbout(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "transparent", border: `1px solid ${theme.border}`,
                  color: theme.text, opacity: 0.85,
                  padding: "8px 16px", borderRadius: 20,
                  cursor: "pointer", fontFamily: "inherit", fontSize: 12.5,
                }}
              >
                <Info size={14} />
                About song
              </button>

              <button
                type="button"
                onClick={shareSong}
                title="Share"
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "transparent", border: `1px solid ${theme.border}`,
                  color: theme.text, opacity: 0.85,
                  padding: "8px 16px", borderRadius: 20,
                  cursor: "pointer", fontFamily: "inherit", fontSize: 12.5,
                }}
              >
                <Share2 size={14} />
                Share
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
