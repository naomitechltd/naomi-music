import "./player.css";
import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown, Heart, MoreVertical, Play, Pause,
  SkipBack, SkipForward, SlidersHorizontal, ListMusic,
  MessageSquare, Share2, Shuffle, Repeat
} from "lucide-react";
import { fileUrl } from "../lib/appwrite";
import { RatingsAndComments } from "./RatingsAndComments";

export function PlayerDock({
  queue = [],
  index = 0,
  setIndex,
  expanded,
  setExpanded,
  currentUser,
  onClose,
  onOpenChat
}) {
  const song = queue[index] || {};
  const audioRef = useRef(null);
  const pagerRef = useRef(null);
  const seekingRef = useRef(false);
  const modeRef = useRef({ shuffle: false, repeat: false });

  const [activeSlide, setActiveSlide] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [liked, setLiked] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [notice, setNotice] = useState("");

  const audioId = song.audioField || song.audioFileId || "";
  const audioUrl = audioId ? fileUrl(audioId) : "";
  const coverId = song.coverFileId || song.coverArtField || "";
  const coverUrl = coverId ? fileUrl(coverId) : "/icon-512.svg";

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    return `${Math.floor(seconds / 60)}:${String(
      Math.floor(seconds % 60)
    ).padStart(2, "0")}`;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setAudioError("");

    if (!audioUrl) {
      setAudioError("No audio file is attached to this song.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    audio.load();
    audio.play().catch(() => {});

    const handleLoaded = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      setIsLoading(false);
      setAudioError("");
    };

    const handleTime = () => {
      if (!seekingRef.current) setCurrentTime(audio.currentTime || 0);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };

    const handlePause = () => setIsPlaying(false);

    const handleError = () => {
      setIsLoading(false);
      setIsPlaying(false);
      setAudioError("Audio could not load. Check the file permissions and connection.");
    };

    const handleEnded = () => {
      if (modeRef.current.repeat) { audio.currentTime = 0; audio.play().catch(() => {}); return; }
      setIsPlaying(false);
      if (modeRef.current.shuffle && queue.length > 1) { setIndex(Math.floor(Math.random() * queue.length)); return; }
      if (index < queue.length - 1) setIndex(index + 1);
    };

    audio.addEventListener("loadedmetadata", handleLoaded);
    audio.addEventListener("durationchange", handleLoaded);
    audio.addEventListener("timeupdate", handleTime);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("error", handleError);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoaded);
      audio.removeEventListener("durationchange", handleLoaded);
      audio.removeEventListener("timeupdate", handleTime);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioUrl, index, queue.length, setIndex]);

  useEffect(() => {
    // Always land on the Player slide, whether expanding or minimizing
    if (pagerRef.current) {
      const width = pagerRef.current.offsetWidth;
      pagerRef.current.scrollTo({ left: width, behavior: "auto" });
      setActiveSlide(1);
    }
  }, [expanded]);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) {
      setAudioError("This song has no playable audio file.");
      return;
    }

    if (!audio.paused) {
      audio.pause();
      return;
    }

    try {
      setAudioError("");
      setIsLoading(true);
      await audio.play();
    } catch (error) {
      setIsLoading(false);
      setAudioError(
        error?.name === "NotAllowedError"
          ? "Tap Play again to start audio."
          : "Playback failed. Check your connection and the audio file."
      );
    }
  };

  const toggleMode = (key) => {
    modeRef.current[key] = !modeRef.current[key];
    if (key === "shuffle") setShuffle(modeRef.current.shuffle);
    else setRepeat(modeRef.current.repeat);
  };

  const flash = (text) => {
    setNotice(text);
    setTimeout(() => setNotice(""), 1800);
  };

  const shareSong = async () => {
    const text = `${song.title || "A song"} by ${song.artistName || "an artist"} on Naomi Music`;
    try {
      if (navigator.share) {
        await navigator.share({ title: song.title || "Naomi Music", text, url: window.location.origin });
        return;
      }
    } catch (e) {
      if (e?.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(`${text} ${window.location.origin}`);
      flash("Link copied");
    } catch {
      flash("Could not share");
    }
  };

  const changeTrack = (nextIndex) => {
    if (!queue.length || nextIndex < 0 || nextIndex >= queue.length) return;
    setIndex(nextIndex);
  };

  const handleScroll = () => {
    if (!pagerRef.current) return;
    const width = pagerRef.current.offsetWidth;
    if (!width) return;
    setActiveSlide(Math.max(0, Math.min(2,
      Math.round(pagerRef.current.scrollLeft / width)
    )));
  };

  const goToSlide = (slide) => {
    if (!pagerRef.current) return;
    pagerRef.current.scrollTo({
      left: slide * pagerRef.current.offsetWidth,
      behavior: "smooth"
    });
  };

  const seek = (event) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const value = Number(event.target.value);
    audio.currentTime = value;
    setCurrentTime(value);
  };

  const handleDockClick = (event) => {
    if (expanded) return;
    if (event.target.closest("button, input, a")) return;
    setExpanded(true);
  };

  if (typeof document === "undefined") return null;

  // Rendered in a portal on <body>: if any ancestor has transform / filter /
  // backdrop-filter, position:fixed becomes relative to that ancestor instead
  // of the screen, which stretches the player taller than the viewport.
  return createPortal(
    <div
      id="fs-player"
      className={expanded ? "open" : ""}
      onClick={handleDockClick}
      style={{ "--cover": `url("${coverUrl}")`, "--progress": `${progress}%` }}
    >
      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        preload="metadata"
        playsInline
      />

      <div className="fs-header">
        <button
          className="fs-icon-btn"
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? "Minimize player" : "Expand player"}
        >
          <ChevronDown size={28} />
        </button>

        <div style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: "var(--mf)"
        }}>
          {isPlaying ? "Now Playing" : "Naomi Music"}
        </div>

        <button
          className="fs-icon-btn"
          onClick={() => onOpenChat?.(song)}
          aria-label="Open chat"
          title="Chat"
        >
          <MoreVertical size={24} />
        </button>
      </div>

      <div className="fs-pager" ref={pagerRef} onScroll={handleScroll}>
        <div className="fs-slide">
          <div className="fs-slide-content">
            <h2 className="fs-section-title">About the Artist</h2>
            <h3 style={{ margin: "0 0 16px", fontSize: 24, color: "var(--fg)" }}>
              {song.artistName || "Unknown Artist"}
            </h3>
            <p className="fs-artist-bio">
              {song.artistBio ||
                `${song.artistName || "This artist"} is an independent creator on Naomi Music.`}
            </p>

            {(song.$id || song.id) && (
              <RatingsAndComments
                key={song.$id || song.id}
                songId={song.$id || song.id}
                currentUser={currentUser}
              />
            )}
          </div>
        </div>

        <div className="fs-slide fs-main">
          <div className="fs-cover-container">
            <img
              src={coverUrl}
              alt={`${song.title || "Song"} cover`}
              className="fs-cover"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = "/icon-512.svg";
              }}
            />
          </div>

          <div className="fs-info-row">
            <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
              <h1 className="fs-title">{song.title || "Unknown Track"}</h1>
              <p className="fs-artist">{song.artistName || "Unknown Artist"}</p>
            </div>
            <div className="fs-actions">
              <button className={`fs-icon-btn ${liked ? "liked" : ""}`} onClick={() => setLiked(!liked)} aria-label={liked ? "Unlike song" : "Like song"}>
                <Heart size={24} fill={liked ? "currentColor" : "none"} />
              </button>
              <button className="fs-icon-btn" onClick={() => onOpenChat?.(song)} aria-label="Chat with fans">
                <MessageSquare size={22} />
              </button>
              <button className="fs-icon-btn" onClick={shareSong} aria-label="Share song">
                <Share2 size={22} />
              </button>
            </div>
          </div>

          <div className="fs-progress">
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={Math.min(currentTime, duration || 0)}
              disabled={!audioUrl || !duration}
              onChange={seek}
              aria-label="Song progress"
            />
            <div className="fs-time">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {audioError && (
            <p role="status" style={{
              color: "#ff8c8c",
              fontSize: 12,
              textAlign: "center",
              margin: "8px 0"
            }}>
              {audioError}
            </p>
          )}

          <div className="fs-controls">
            <button className={`fs-mode-btn ${shuffle ? "on" : ""}`} onClick={() => toggleMode("shuffle")} aria-label="Shuffle"><Shuffle size={22} /></button>
            <button
              className="fs-skip-btn"
              onClick={() => changeTrack(index - 1)}
              disabled={index <= 0}
              aria-label="Previous song"
            >
              <SkipBack />
            </button>

            <button
              className="fs-play-btn"
              onClick={togglePlayback}
              disabled={!audioUrl || isLoading}
              aria-label={isPlaying ? "Pause song" : "Play song"}
            >
              {isPlaying ? <Pause /> : <Play style={{ marginLeft: 6 }} />}
            </button>

            <button
              className="fs-skip-btn"
              onClick={() => changeTrack(index + 1)}
              disabled={index >= queue.length - 1}
              aria-label="Next song"
            >
              <SkipForward />
            </button>

            <button className={`fs-mode-btn ${repeat ? "on" : ""}`} onClick={() => toggleMode("repeat")} aria-label="Repeat"><Repeat size={22} /></button>
          </div>

          {isLoading && (
            <p style={{ textAlign: "center", fontSize: 12, opacity: 0.7 }}>
              Loading audio…
            </p>
          )}

          {notice && <p role="status" className="fs-notice">{notice}</p>}

          {queue.length > 1 && (
            <div className="fs-queue">
              <h4>Up next</h4>
              {queue.map((q, n) => n === index ? null : (
                <button key={q.$id || q.id || n} className="fs-q-row" onClick={() => setIndex(n)}>
                  <span><b>{q.title || "Untitled"}</b><small>{q.artistName || "Unknown Artist"}</small></span>
                  <MoreVertical size={18} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="fs-slide">
          <div className="fs-slide-content">
            <h2 className="fs-section-title">Lyrics</h2>
            <div className="fs-lyrics-text">
              {song.lyrics
                ? song.lyrics.split("\n").map((line, i) => (
                    <div key={i} style={{ marginBottom: 12 }}>{line}</div>
                  ))
                : "No lyrics available for this track."}
            </div>
          </div>
        </div>
      </div>

      <div className="fs-tabs" role="tablist" aria-label="Player sections">
        <button
          role="tab"
          aria-selected={activeSlide === 0}
          className={`fs-tab-btn ${activeSlide === 0 ? "active" : ""}`}
          onClick={() => goToSlide(0)}
        >
          <SlidersHorizontal size={20} />
          <span>Info</span>
        </button>

        <button
          role="tab"
          aria-selected={activeSlide === 1}
          className={`fs-tab-btn pill ${activeSlide === 1 ? "active" : ""}`}
          onClick={() => goToSlide(1)}
        >
          <MessageSquare size={18} />
          <span>Player</span>
        </button>

        <button
          role="tab"
          aria-selected={activeSlide === 2}
          className={`fs-tab-btn ${activeSlide === 2 ? "active" : ""}`}
          onClick={() => goToSlide(2)}
        >
          <ListMusic size={20} />
          <span>Lyrics</span>
        </button>
      </div>
    </div>,
    document.body
  );
}
