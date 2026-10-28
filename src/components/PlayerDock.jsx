import React, { useEffect, useRef, useState } from "react";

/**
 * Naomi Music — PlayerDock
 *
 * Standalone player-dock component.
 * It can be controlled by a parent using the props below, or used on its own
 * with the built-in audio element when `track.audioUrl` is provided.
 *
 * Props:
 *   track: { title, artist, coverUrl, audioUrl }
 *   isPlaying: boolean (optional controlled playback state)
 *   onTogglePlay, onNext, onPrevious, onSeek, onVolumeChange: callbacks
 *   queue: array of tracks (optional)
 */
export function PlayerDock({
  track = null,
  isPlaying: controlledIsPlaying,
  onTogglePlay,
  onNext,
  onPrevious,
  onSeek,
  onVolumeChange,
  queue = [],
  className = "",
}) {
  const audioRef = useRef(null);
  const [internalPlaying, setInternalPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [expanded, setExpanded] = useState(false);
  const [muted, setMuted] = useState(false);

  const isControlled = typeof controlledIsPlaying === "boolean";
  const isPlaying = isControlled ? controlledIsPlaying : internalPlaying;
  const title = track?.title || "Nothing playing";
  const artist = track?.artist || "Choose a song to start listening";
  const coverUrl = track?.coverUrl || track?.artworkUrl || "";
  const audioUrl = track?.audioUrl || track?.url || "";

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    if (isPlaying) {
      const result = audio.play();
      if (result && typeof result.catch === "function") result.catch(() => setInternalPlaying(false));
    } else {
      audio.pause();
    }
  }, [isPlaying, audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = muted ? 0 : volume;
  }, [volume, muted]);

  const togglePlay = () => {
    if (onTogglePlay) {
      onTogglePlay();
      return;
    }
    if (!audioUrl) return;
    const next = !internalPlaying;
    setInternalPlaying(next);
  };

  const seek = (event) => {
    const value = Number(event.target.value);
    setCurrentTime(value);
    if (audioRef.current && duration) audioRef.current.currentTime = value;
    if (onSeek) onSeek(value);
  };

  const changeVolume = (event) => {
    const value = Number(event.target.value);
    setVolume(value);
    setMuted(value === 0);
    if (onVolumeChange) onVolumeChange(value);
  };

  const formatTime = (value) => {
    if (!Number.isFinite(value) || value < 0) return "0:00";
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const handleEnded = () => {
    setInternalPlaying(false);
    if (onNext) onNext();
  };

  const styles = {
    root: {
      position: "fixed",
      zIndex: 1000,
      left: 0,
      right: 0,
      bottom: 0,
      color: "var(--text, #f8f7ff)",
      fontFamily: "inherit",
      padding: "10px 14px max(10px, env(safe-area-inset-bottom))",
      background: "linear-gradient(135deg, rgba(20,18,34,.97), rgba(36,28,57,.97))",
      borderTop: "1px solid rgba(255,255,255,.12)",
      boxShadow: "0 -12px 36px rgba(0,0,0,.28)",
      backdropFilter: "blur(22px)",
    },
    inner: {
      maxWidth: 1440,
      margin: "0 auto",
      display: "grid",
      gridTemplateColumns: "minmax(0,1fr) minmax(180px,1.2fr) minmax(0,1fr)",
      alignItems: "center",
      gap: 18,
    },
    left: { display: "flex", alignItems: "center", gap: 12, minWidth: 0 },
    cover: {
      width: 54,
      height: 54,
      flex: "0 0 54px",
      borderRadius: 12,
      objectFit: "cover",
      background: "linear-gradient(135deg,#6d4aff,#d14fa8)",
      boxShadow: "0 5px 18px rgba(0,0,0,.28)",
    },
    placeholder: {
      width: 54,
      height: 54,
      flex: "0 0 54px",
      borderRadius: 12,
      display: "grid",
      placeItems: "center",
      fontSize: 24,
      background: "linear-gradient(135deg,#6d4aff,#d14fa8)",
    },
    songInfo: { minWidth: 0, flex: 1 },
    title: {
      fontWeight: 750,
      fontSize: 14,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      letterSpacing: ".1px",
    },
    artist: {
      color: "var(--muted, #b9b3ca)",
      fontSize: 12,
      marginTop: 4,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    iconButton: {
      border: 0,
      color: "inherit",
      background: "transparent",
      cursor: "pointer",
      width: 36,
      height: 36,
      borderRadius: 999,
      display: "inline-grid",
      placeItems: "center",
      fontSize: 19,
    },
    controls: { display: "flex", alignItems: "center", justifyContent: "center", gap: 12 },
    playButton: {
      width: 42,
      height: 42,
      borderRadius: 999,
      border: 0,
      color: "#171322",
      background: "linear-gradient(135deg,#f8e7a1,#e8b85d)",
      boxShadow: "0 4px 18px rgba(232,184,93,.22)",
      cursor: audioUrl || onTogglePlay ? "pointer" : "not-allowed",
      fontSize: 18,
      fontWeight: 800,
    },
    timeline: { display: "flex", alignItems: "center", gap: 9, marginTop: 4 },
    time: { color: "var(--muted, #b9b3ca)", fontSize: 10, minWidth: 31, fontVariantNumeric: "tabular-nums" },
    range: { width: "100%", accentColor: "#e8c36b", cursor: "pointer", minWidth: 0 },
    progress: { minWidth: 0 },
    right: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 },
    volume: { width: 86, accentColor: "#e8c36b", cursor: "pointer" },
    queuePanel: {
      maxWidth: 1440,
      margin: "0 auto 10px",
      padding: 12,
      borderRadius: 14,
      background: "rgba(255,255,255,.055)",
      border: "1px solid rgba(255,255,255,.09)",
      fontSize: 12,
    },
  };

  return (
    <section className={`naomi-player-dock ${className}`} style={styles.root} aria-label="Music player">
      {audioUrl ? (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
          onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)}
          onEnded={handleEnded}
        />
      ) : null}

      {expanded && queue.length > 0 ? (
        <div style={styles.queuePanel}>
          <strong style={{ display: "block", marginBottom: 8 }}>Up next</strong>
          {queue.slice(0, 5).map((item, index) => (
            <div key={item.id || `${item.title || "track"}-${index}`} style={{ padding: "5px 0", opacity: 0.85 }}>
              {index + 1}. {item.title || "Untitled"}{item.artist ? ` — ${item.artist}` : ""}
            </div>
          ))}
        </div>
      ) : null}

      <div className="naomi-player-dock-inner" style={styles.inner}>
        <div style={styles.left}>
          {coverUrl ? (
            <img src={coverUrl} alt="" style={styles.cover} />
          ) : (
            <div style={styles.placeholder} aria-hidden="true">♫</div>
          )}
          <div style={styles.songInfo}>
            <div style={styles.title} title={title}>{title}</div>
            <div style={styles.artist} title={artist}>{artist}</div>
          </div>
          <button type="button" style={styles.iconButton} aria-label="Toggle player details" title="Toggle player details" onClick={() => setExpanded((value) => !value)}>
            {expanded ? "⌄" : "⌃"}
          </button>
        </div>

        <div style={styles.progress}>
          <div style={styles.controls}>
            <button type="button" style={styles.iconButton} aria-label="Previous track" title="Previous" onClick={onPrevious || undefined}>⏮</button>
            <button
              type="button"
              style={styles.playButton}
              aria-label={isPlaying ? "Pause" : "Play"}
              title={isPlaying ? "Pause" : "Play"}
              onClick={togglePlay}
              disabled={!audioUrl && !onTogglePlay}
            >
              {isPlaying ? "Ⅱ" : "▶"}
            </button>
            <button type="button" style={styles.iconButton} aria-label="Next track" title="Next" onClick={onNext || undefined}>⏭</button>
          </div>
          <div style={styles.timeline}>
            <span style={styles.time}>{formatTime(currentTime)}</span>
            <input
              aria-label="Seek"
              style={styles.range}
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={Math.min(currentTime, duration || 0)}
              onChange={seek}
              disabled={!duration}
            />
            <span style={styles.time}>{formatTime(duration)}</span>
          </div>
        </div>

        <div style={styles.right}>
          <button
            type="button"
            style={styles.iconButton}
            aria-label={muted || volume === 0 ? "Unmute" : "Mute"}
            title={muted || volume === 0 ? "Unmute" : "Mute"}
            onClick={() => setMuted((value) => !value)}
          >
            {muted || volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
          </button>
          <input
            aria-label="Volume"
            style={styles.volume}
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={muted ? 0 : volume}
            onChange={changeVolume}
          />
          <button type="button" style={styles.iconButton} aria-label="Show queue" title="Queue" onClick={() => setExpanded((value) => !value)}>
            ☷
          </button>
        </div>
      </div>

      <style>{`
        .naomi-player-dock button:focus-visible,
        .naomi-player-dock input:focus-visible {
          outline: 2px solid #e8c36b;
          outline-offset: 3px;
        }
        .naomi-player-dock button:not(:disabled):hover {
          filter: brightness(1.12);
          transform: translateY(-1px);
        }
        .naomi-player-dock button:disabled {
          opacity: .45;
        }
        @media (max-width: 720px) {
          .naomi-player-dock-inner {
            grid-template-columns: minmax(0,1fr) auto !important;
            gap: 9px !important;
          }
          .naomi-player-dock-inner > div:nth-child(2) {
            grid-column: 1 / -1;
            grid-row: 2;
          }
          .naomi-player-dock-inner > div:nth-child(3) {
            grid-column: 2;
            grid-row: 1;
          }
          .naomi-player-dock-inner > div:nth-child(3) input {
            display: none;
          }
          .naomi-player-dock-inner > div:first-child img,
          .naomi-player-dock-inner > div:first-child > div:first-child {
            width: 44px !important;
            height: 44px !important;
            flex-basis: 44px !important;
          }
        }
      `}</style>
    </section>
  );
}
