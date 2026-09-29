import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Heart, ChevronDown, X, ListPlus, Plus, Info, Share2, MessageSquare, MoreVertical } from "lucide-react";
import { tablesDB, DATABASE_ID, LIKES_TABLE_ID, PLAYLISTS_TABLE_ID, PLAYLIST_SONGS_TABLE_ID, Query, ID, fileUrl } from "../lib/appwrite";
import { theme, inputStyle } from "./ui";
import { openConversation } from "../lib/api";

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PlayerDock({ queue, index, setIndex, expanded, setExpanded, currentUser, onClose, onOpenChat }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeat, setRepeat] = useState("off");
  const [liked, setLiked] = useState(false);
  const [likeRowId, setLikeRowId] = useState(null);
  const [likeCount, setLikeCount] = useState(0);
  const [likeBusy, setLikeBusy] = useState(false);

  const [showMenu, setShowMenu] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [myPlaylists, setMyPlaylists] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addedMsg, setAddedMsg] = useState("");
  const [showLyrics, setShowLyrics] = useState(false);
  const [msgBusy, setMsgBusy] = useState(false);
  const [msgNote, setMsgNote] = useState("");

  const song = index != null ? queue[index] : null;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrent(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd = () => {
      if (repeat === "one") { audio.currentTime = 0; audio.play(); return; }
      if (index < queue.length - 1) setIndex(index + 1);
      else if (repeat === "all") setIndex(0);
      else setPlaying(false);
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
    setShowMenu(false);
    setShowLyrics(false);
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
    if (audio && audio.currentTime > 3) audio.currentTime = 0;
    else if (index > 0) setIndex(index - 1);
    else if (audio) audio.currentTime = 0;
  };

  const nextTrack = () => {
    if (index < queue.length - 1) setIndex(index + 1);
    else if (repeat === "all") setIndex(0);
  };

  const cycleRepeat = () => setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"));

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
    setShowMenu(false);
    setAddedMsg("");
    if (next) {
      try {
        const res = await tablesDB.listRows(DATABASE_ID, PLAYLISTS_TABLE_ID, [Query.equal("userEmail", currentUser.email)]);
        setMyPlaylists(res.rows);
      } catch (e) { setAddedMsg(e.message); }
    }
  };

  const addToPlaylist = async (playlistId) => {
    setAddBusy(true);
    try {
      await tablesDB.createRow(DATABASE_ID, PLAYLIST_SONGS_TABLE_ID, ID.unique(), {
        playlistId, songId: song.$id, order: Date.now(),
      });
      setAddedMsg("Added.");
    } catch (e) { setAddedMsg(e.message); }
    finally { setAddBusy(false); }
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
    } catch (e) { setAddedMsg(e.message); setAddBusy(false); }
  };

  const messageArtist = async () => {
    if (msgBusy) return;
    const artistUserId = song.uploadedByUserId;
    if (!artistUserId) { setMsgNote("Artist not reachable."); return; }
    if (artistUserId === currentUser.$id) { setMsgNote("This is your song."); return; }
    setMsgBusy(true); setMsgNote("");
    try {
      const out = await openConversation(artistUserId);
      if (out?.conversation && onOpenChat) {
        onOpenChat(out.conversation);
        setExpanded(false);
        if (onClose) onClose();
      } else setMsgNote(out?.error || "Could not open chat.");
    } catch (e) { setMsgNote(e.message); }
    finally { setMsgBusy(false); setTimeout(() => setMsgNote(""), 3000); }
  };

  const shareSong = async () => {
    setShowMenu(false);
    const url = `${window.location.origin}/song/${song.$id}`;
    if (navigator.share) {
      try { await navigator.share({ title: song.title, text: `${song.title} by ${song.artistName}`, url }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(url); setMsgNote("Link copied"); setTimeout(() => setMsgNote(""), 2400); } catch {}
    }
  };

  const progress = duration ? (current / duration) * 100 : 0;
  const RepeatIcon = repeat === "one" ? Repeat1 : Repeat;

  return (
    <>
      <audio ref={audioRef} src={fileUrl(song.audioField)} preload="metadata" />

      {/* Mini bar */}
      {!expanded && (
        <div
          onClick={() => setExpanded(true)}
          style={{
            position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 150,
            background: theme.bgRaised, borderTop: `1px solid ${theme.border}`,
            display: "flex", alignItems: "center", gap: 12, padding: "8px 14px", cursor: "pointer",
          }}
        >
          <img src={fileUrl(song.coverArtField)} alt={song.title} style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
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

      {/* Full player */}
      {expanded && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "linear-gradient(180deg, #17171d 0%, #0b0b0d 70%)",
            display: "flex", flexDirection: "column",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px" }}>
            <button onClick={() => setExpanded(false)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.text, display: "flex", padding: 4 }}>
              <ChevronDown size={26} />
            </button>
            <div style={{ fontSize: 11, opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Now Playing
            </div>
            <button onClick={() => setShowMenu((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.text, display: "flex", padding: 4 }}>
              <MoreVertical size={22} />
            </button>
          </div>

          {/* Menu dropdown */}
          {showMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute", top: 56, right: 16, zIndex: 250,
                background: theme.bgRaised, border: `1px solid ${theme.border}`,
                borderRadius: 10, padding: 6, minWidth: 190,
                boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
              }}
            >
              <MenuItem icon={Info} label="About song" onClick={() => { setShowMenu(false); /* use modal */ }} />
              <MenuItem icon={MessageSquare} label="Message artist" onClick={messageArtist} />
              <MenuItem icon={Share2} label="Share" onClick={shareSong} />
              <MenuItem icon={ListPlus} label="Add to playlist" onClick={openAddMenu} />
            </div>
          )}

          {/* Album art */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 24px", minHeight: 0 }}>
            <img
              src={fileUrl(song.coverArtField)}
              alt={song.title}
              style={{
                width: "100%",
                maxWidth: 360,
                maxHeight: "100%",
                aspectRatio: "1",
                objectFit: "cover",
                borderRadius: 14,
                boxShadow: "0 24px 60px rgba(0,0,0,0.65)",
              }}
            />
          </div>

          {/* Info + progress + controls */}
          <div style={{ padding: "16px 24px 26px" }}>
            {/* Title + artist + like */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {song.title}
                </div>
                <div style={{ fontSize: 14, opacity: 0.6, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {song.artistName}
                </div>
              </div>
              <button
                onClick={toggleLike}
                disabled={likeBusy}
                style={{ background: "none", border: "none", cursor: "pointer", color: liked ? "#ff4d6d" : theme.text, display: "flex", padding: 6 }}
              >
                <Heart size={24} fill={liked ? "#ff4d6d" : "none"} />
              </button>
            </div>

            {/* Progress */}
            <div onClick={seek} style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.12)", cursor: "pointer", position: "relative" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${progress}%`, borderRadius: 2, background: theme.accent }} />
              <div style={{ position: "absolute", top: "50%", left: `${progress}%`, transform: "translate(-50%, -50%)", width: 12, height: 12, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.5)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, opacity: 0.55, marginTop: 8 }}>
              <span>{formatTime(current)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 36, marginTop: 22 }}>
              <button onClick={prevTrack} disabled={index === 0} style={{ background: "none", border: "none", cursor: "pointer", color: theme.text, opacity: index === 0 ? 0.35 : 1, display: "flex" }}>
                <SkipBack size={34} fill={theme.text} />
              </button>
              <button
                onClick={toggle}
                style={{
                  width: 72, height: 72, borderRadius: "50%",
                  background: theme.accent, border: "none",
                  color: "#fff", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 8px 24px rgba(124,92,255,0.45)",
                }}
              >
                {playing ? <Pause size={30} fill="#fff" /> : <Play size={30} fill="#fff" style={{ marginLeft: 4 }} />}
              </button>
              <button onClick={nextTrack} disabled={index === queue.length - 1 && repeat !== "all"} style={{ background: "none", border: "none", cursor: "pointer", color: theme.text, opacity: (index === queue.length - 1 && repeat !== "all") ? 0.35 : 1, display: "flex" }}>
                <SkipForward size={34} fill={theme.text} />
              </button>
            </div>

            {/* Bottom row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 30 }}>
              <button onClick={openAddMenu} style={{ background: "none", border: "none", cursor: "pointer", color: theme.text, opacity: 0.8, display: "flex", padding: 8 }}>
                <ListPlus size={22} />
              </button>
              <button
                onClick={() => setShowLyrics(true)}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: `1px solid ${theme.border}`,
                  borderRadius: 24, padding: "10px 22px",
                  cursor: "pointer", color: theme.text, fontFamily: "inherit", fontSize: 13.5, fontWeight: 500,
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                <MessageSquare size={16} /> Lyrics
              </button>
              <button onClick={cycleRepeat} style={{ background: "none", border: "none", cursor: "pointer", color: repeat !== "off" ? theme.accent : theme.text, opacity: repeat !== "off" ? 1 : 0.8, display: "flex", padding: 8 }}>
                <RepeatIcon size={22} />
              </button>
            </div>
          </div>

          {/* Add to playlist panel */}
          {showAddMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute", left: 16, right: 16, bottom: 16, zIndex: 250,
                background: theme.bgRaised, border: `1px solid ${theme.border}`,
                borderRadius: 12, padding: 16,
                boxShadow: "0 12px 30px rgba(0,0,0,0.6)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Add to playlist</div>
                <button onClick={() => setShowAddMenu(false)} style={{ background: "none", border: "none", color: theme.text, cursor: "pointer", display: "flex", padding: 0 }}>
                  <X size={18} />
                </button>
              </div>
              {myPlaylists.length === 0 ? (
                <div style={{ fontSize: 12.5, opacity: 0.65, marginBottom: 10, lineHeight: 1.5 }}>
                  You don't have any playlists yet.<br />Create one below to save this song.
                </div>
              ) : myPlaylists.map((p) => (
                <button
                  key={p.$id}
                  onClick={() => addToPlaylist(p.$id)}
                  disabled={addBusy}
                  style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", color: theme.text, cursor: "pointer", fontSize: 13, padding: "8px 4px", fontFamily: "inherit" }}
                >
                  {p.name}
                </button>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <input
                  style={{ ...inputStyle(), fontSize: 12.5, padding: "8px 10px" }}
                  placeholder="New playlist name"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createAndAdd()}
                />
                <button
                  onClick={createAndAdd}
                  disabled={addBusy || !newPlaylistName.trim()}
                  style={{ background: theme.accent, border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", padding: "0 14px", display: "flex", alignItems: "center" }}
                >
                  <Plus size={15} />
                </button>
              </div>
              {addedMsg && <div style={{ fontSize: 11.5, color: theme.accent, marginTop: 8 }}>{addedMsg}</div>}
            </div>
          )}

          {/* Lyrics overlay */}
          {showLyrics && (
            <div
              onClick={() => setShowLyrics(false)}
              style={{
                position: "fixed", inset: 0, zIndex: 260,
                background: "rgba(0,0,0,0.85)",
                display: "flex", flexDirection: "column",
                padding: "40px 24px 60px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Lyrics</div>
                <button onClick={() => setShowLyrics(false)} style={{ background: "none", border: "none", color: theme.text, cursor: "pointer", display: "flex", padding: 4 }}>
                  <X size={22} />
                </button>
              </div>
              <div
                onClick={(e) => e.stopPropagation()}
                style={{ flex: 1, overflowY: "auto", fontSize: 16, lineHeight: 1.9, whiteSpace: "pre-wrap", opacity: 0.9, textAlign: "center", paddingBottom: 40 }}
              >
                {song.lyrics || "No lyrics for this track."}
              </div>
            </div>
          )}

          {msgNote && (
            <div style={{ position: "absolute", bottom: 100, left: 0, right: 0, textAlign: "center", fontSize: 12.5, color: theme.accent, opacity: 0.9 }}>
              {msgNote}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function MenuItem({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        width: "100%", padding: "10px 12px",
        background: "none", border: "none",
        cursor: "pointer", color: theme.text,
        fontSize: 13.5, fontFamily: "inherit", textAlign: "left",
        borderRadius: 6,
      }}
    >
      <Icon size={16} /> {label}
    </button>
  );
}
