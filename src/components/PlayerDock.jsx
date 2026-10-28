
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export function PlayerDock({
  track = null,
  isPlaying: controlledIsPlaying,
  onTogglePlay,
  onNext,
  onPrevious,
  onSeek,
  onVolumeChange,
  queue = [],
  onSelectTrack,
  className = "",
  lyrics = null,
  lyricsLoading = false,
  onRequestLyrics,
}) {
  const audioRef = useRef(null);
  const lyricsScrollRef = useRef(null);

  const [internalPlaying, setInternalPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [lastAudibleVolume, setLastAudibleVolume] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);

  const isControlled = typeof controlledIsPlaying === "boolean";
  const isPlaying = isControlled
    ? controlledIsPlaying
    : internalPlaying;

  const audioUrl = track?.audioUrl || track?.url || "";
  const title = track?.title || "Nothing playing";
  const artist = track?.artist || "Unknown artist";
  const artwork = track?.coverUrl || track?.artworkUrl || "";

  const canTogglePlay = Boolean(
    onTogglePlay || (!isControlled && audioUrl)
  );

  const normalizedLyrics = useMemo(() => {
    if (typeof lyrics === "string") {
      return lyrics
        .split(/\r?\n/)
        .map((text) => ({ time: null, text }))
        .filter((line) => line.text.trim());
    }

    if (!Array.isArray(lyrics)) return [];

    return lyrics
      .map((line) => {
        if (typeof line === "string") {
          return { time: null, text: line };
        }

        if (line && typeof line.text === "string") {
          return {
            time: Number.isFinite(Number(line.time))
              ? Number(line.time)
              : null,
            text: line.text,
          };
        }

        return null;
      })
      .filter((line) => line && line.text.trim());
  }, [lyrics]);

  const activeLyricIndex = useMemo(() => {
    let active = -1;

    normalizedLyrics.forEach((line, index) => {
      if (line.time !== null && line.time <= currentTime) {
        active = index;
      }
    });

    return active;
  }, [normalizedLyrics, currentTime]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      const result = audio.play();

      if (result && typeof result.catch === "function") {
        result.catch(() => {
          if (!isControlled) setInternalPlaying(false);
        });
      }
    } else {
      audio.pause();
    }
  }, [isPlaying, audioUrl, isControlled]);

  useEffect(() => {
    if (
      !lyricsOpen ||
      activeLyricIndex < 0 ||
      !lyricsScrollRef.current
    ) return;

    const activeLine = lyricsScrollRef.current.querySelector(
      "[data-active='true']"
    );

    activeLine?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [lyricsOpen, activeLyricIndex]);

  useEffect(() => {
    if (!lyricsOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setLyricsOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lyricsOpen]);

  const togglePlay = useCallback(() => {
    if (!canTogglePlay) return;

    if (onTogglePlay) {
      onTogglePlay();
      return;
    }

    if (!isControlled) {
      setInternalPlaying((playing) => !playing);
    }
  }, [canTogglePlay, onTogglePlay, isControlled]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setCurrentTime(audio.currentTime || 0);

    if (Number.isFinite(audio.duration)) {
      setDuration(audio.duration);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setDuration(
      Number.isFinite(audio.duration) ? audio.duration : 0
    );

    setCurrentTime(audio.currentTime || 0);
  }, []);

  const handleSeek = useCallback((event) => {
    const nextTime = Number(event.target.value);

    setCurrentTime(nextTime);

    if (audioRef.current) {
      audioRef.current.currentTime = nextTime;
    }

    onSeek?.(nextTime);
  }, [onSeek]);

  const handleVolume = useCallback((event) => {
    const nextVolume = Number(event.target.value);

    setVolume(nextVolume);
    setMuted(nextVolume === 0);

    if (nextVolume > 0) {
      setLastAudibleVolume(nextVolume);
    }

    if (audioRef.current) {
      audioRef.current.volume = nextVolume;
    }

    onVolumeChange?.(nextVolume);
  }, [onVolumeChange]);

  const toggleMute = useCallback(() => {
    const nextMuted = !muted;
    const nextVolume = nextMuted
      ? 0
      : (lastAudibleVolume || 1);

    setMuted(nextMuted);
    setVolume(nextVolume);

    if (audioRef.current) {
      audioRef.current.volume = nextVolume;
    }

    onVolumeChange?.(nextVolume);
  }, [muted, lastAudibleVolume, onVolumeChange]);

  const toggleLyrics = useCallback(() => {
    setLyricsOpen((open) => {
      const nextOpen = !open;

      if (
        nextOpen &&
        normalizedLyrics.length === 0 &&
        !lyricsLoading
      ) {
        onRequestLyrics?.(track);
      }

      return nextOpen;
    });
  }, [
    normalizedLyrics.length,
    lyricsLoading,
    onRequestLyrics,
    track,
  ]);

  const formatTime = (value) => {
    if (!Number.isFinite(value) || value < 0) return "0:00";

    const mins = Math.floor(value / 60);
    const secs = Math.floor(value % 60)
      .toString()
      .padStart(2, "0");

    return `${mins}:${secs}`;
  };

  const handleEnded = useCallback(() => {
    if (!isControlled) setInternalPlaying(false);
    onNext?.();
  }, [isControlled, onNext]);

  return (
    <div className={`player-dock ${expanded ? "is-expanded" : ""} ${className}`.trim()}>
      <style>{`
        .player-dock{position:fixed;z-index:1000;left:12px;right:12px;bottom:12px;color:#f7f5ff;background:rgba(22,19,39,.94);border:1px solid rgba(184,160,255,.25);border-radius:20px;box-shadow:0 12px 38px rgba(0,0,0,.35);backdrop-filter:blur(18px);font-family:inherit;overflow:visible}
        .player-dock *{box-sizing:border-box}
        .pd-main{display:flex;align-items:center;gap:12px;padding:12px}
        .pd-art{width:48px;height:48px;flex:0 0 48px;object-fit:cover;border-radius:12px;background:#39334e}
        .pd-track{min-width:0;flex:1}
        .pd-title,.pd-artist{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .pd-title{font-size:14px;font-weight:700}
        .pd-artist{font-size:12px;color:#bdb6d5;margin-top:4px}
        .pd-actions{display:flex;align-items:center;gap:6px}
        .pd-btn{border:0;color:inherit;background:transparent;border-radius:10px;min-width:36px;height:36px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;font-size:17px}
        .pd-btn:hover{background:rgba(255,255,255,.1)}
        .pd-btn:disabled{opacity:.35;cursor:not-allowed}
        .pd-play{background:#b99aff;color:#211832;font-weight:800}
        .pd-play:hover{background:#cbb5ff}
        .pd-progress{display:flex;align-items:center;gap:8px;padding:0 14px 10px;font-size:11px;color:#c6bfd9}
        .pd-range{width:100%;accent-color:#b99aff;cursor:pointer;min-width:0}
        .pd-progress .pd-range{flex:1}
        .pd-volume{width:76px;accent-color:#b99aff}
        .pd-expanded{border-top:1px solid rgba(255,255,255,.1);padding:12px 14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
        .pd-queue{border-top:1px solid rgba(255,255,255,.1);padding:8px 12px 12px;max-height:220px;overflow:auto}
        .pd-queue-title{font-size:12px;color:#c6bfd9;margin:2px 4px 8px}
        .pd-queue-item{display:flex;align-items:center;gap:10px;width:100%;padding:9px;border:0;border-radius:10px;background:transparent;color:inherit;text-align:left;cursor:pointer}
        .pd-queue-item:hover:not(:disabled){background:rgba(255,255,255,.08)}
        .pd-queue-item:disabled{cursor:default;opacity:.75}
        .pd-queue-number{font-size:11px;color:#a89bbf;width:18px}
        .pd-queue-name{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}
        .pd-queue-artist{display:block;color:#aaa1c2;font-size:11px;margin-top:3px}
        .pd-lyrics{position:absolute;left:0;right:0;bottom:100%;margin-bottom:10px;max-height:min(55vh,420px);overflow:hidden;border:1px solid rgba(184,160,255,.25);border-radius:18px;background:rgba(22,19,39,.98);box-shadow:0 12px 38px rgba(0,0,0,.4)}
        .pd-lyrics-head{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.1);font-weight:700}
        .pd-lyrics-body{padding:16px;overflow:auto;max-height:calc(min(55vh,420px) - 48px);text-align:center}
        .pd-lyric-line{padding:7px 0;color:#a9a1bd;transition:color .2s,transform .2s;font-size:15px;line-height:1.5}
        .pd-lyric-line.active{color:#d5bdff;font-weight:800;transform:scale(1.02)}
        @media(max-width:560px){.player-dock{left:7px;right:7px;bottom:7px}.pd-main{gap:8px;padding:9px}.pd-art{width:42px;height:42px;flex-basis:42px}.pd-btn{min-width:32px;height:34px}.pd-volume-wrap{display:none}.pd-title{font-size:12px}.pd-artist{font-size:11px}.pd-actions{gap:2px}}
      `}

/* NAOMi Music — responsive mobile player */

@media (max-width: 600px) {
  .player-dock {
    left: 8px;
    right: 8px;
    bottom: calc(8px + env(safe-area-inset-bottom, 0px));
    border-radius: 17px;
    max-width: 100%;
  }

  .pd-main {
    gap: 9px;
    padding: 9px 10px;
  }

  .pd-art {
    width: 44px;
    height: 44px;
    flex: 0 0 44px;
    border-radius: 10px;
  }

  .pd-track {
    flex: 1;
    min-width: 0;
  }

  .pd-title {
    font-size: 12px;
  }

  .pd-artist {
    font-size: 11px;
    margin-top: 3px;
  }

  .pd-actions {
    gap: 2px;
  }

  .pd-btn {
    min-width: 31px;
    height: 34px;
    font-size: 15px;
    border-radius: 9px;
  }

  .pd-play {
    min-width: 36px;
    height: 36px;
    border-radius: 50%;
  }

  .pd-progress {
    gap: 7px;
    padding: 0 11px 9px;
    font-size: 10px;
  }

  .pd-progress .pd-range {
    min-width: 30px;
  }

  .pd-volume-wrap {
    max-width: 100%;
  }

  .pd-volume {
    width: 90px;
  }

  .pd-expanded {
    padding: 10px;
    gap: 8px;
  }

  .pd-queue {
    max-height: 32vh;
    padding: 8px;
  }

  .pd-queue-item {
    padding: 10px 7px;
  }

  .pd-lyrics {
    max-height: 55dvh;
    margin-bottom: 8px;
  }

  .pd-lyrics-body {
    max-height: calc(55dvh - 48px);
    padding: 12px;
  }

  .pd-lyric-line {
    font-size: 14px;
    line-height: 1.6;
  }
}

@media (max-width: 380px) {
  .pd-main {
    gap: 6px;
    padding: 8px;
  }

  .pd-art {
    width: 38px;
    height: 38px;
    flex-basis: 38px;
  }

  .pd-title {
    font-size: 11px;
  }

  .pd-artist {
    font-size: 10px;
  }

  .pd-actions {
    gap: 0;
  }

  .pd-actions .pd-btn {
    min-width: 27px;
    font-size: 13px;
  }

  .pd-actions .pd-play {
    min-width: 33px;
  }
}


</style>

      {lyricsOpen && (
        <section className="pd-lyrics" aria-label="Lyrics">
          <div className="pd-lyrics-head">
            <span>Lyrics · {title}</span>
            <button
              className="pd-btn"
              type="button"
              onClick={() => setLyricsOpen(false)}
              aria-label="Close lyrics"
            >
              ×
            </button>
          </div>
          <div className="pd-lyrics-body" ref={lyricsScrollRef}>
            {lyricsLoading ? (
              <p>Loading lyrics…</p>
            ) : normalizedLyrics.length ? (
              normalizedLyrics.map((line, index) => (
                <div
                  className={`pd-lyric-line ${index === activeLyricIndex ? "active" : ""}`}
                  data-active={index === activeLyricIndex ? "true" : "false"}
                  key={`${line.time ?? "plain"}-${index}`}
                >
                  {line.text}
                </div>
              ))
            ) : (
              <p>No lyrics available.</p>
            )}
          </div>
        </section>
      )}

      <div className="pd-main">
        {artwork ? (
          <img className="pd-art" src={artwork} alt="" />
        ) : (
          <div className="pd-art" aria-hidden="true" />
        )}

        <div className="pd-track">
          <div className="pd-title">{title}</div>
          <div className="pd-artist">{artist}</div>
        </div>

        <div className="pd-actions">
          <button
            className="pd-btn"
            type="button"
            onClick={onPrevious}
            disabled={!onPrevious}
            aria-label="Previous track"
          >
            ⏮
          </button>

          <button
            className="pd-btn pd-play"
            type="button"
            onClick={togglePlay}
            disabled={!canTogglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? "Ⅱ" : "▶"}
          </button>

          <button
            className="pd-btn"
            type="button"
            onClick={onNext}
            disabled={!onNext}
            aria-label="Next track"
          >
            ⏭
          </button>

          <button
            className="pd-btn"
            type="button"
            onClick={toggleLyrics}
            aria-label="Toggle lyrics"
            title="Lyrics"
          >
            ♫
          </button>

          <button
            className="pd-btn"
            type="button"
            onClick={() => setQueueOpen((open) => !open)}
            aria-label="Toggle queue"
            title="Queue"
          >
            ☷
          </button>

          <button
            className="pd-btn"
            type="button"
            onClick={() => setExpanded((open) => !open)}
            aria-label={expanded ? "Collapse player details" : "Expand player details"}
            title="Player details"
          >
            {expanded ? "⌄" : "⌃"}
          </button>
        </div>
      </div>

      <div className="pd-progress">
        <span>{formatTime(currentTime)}</span>
        <input
          className="pd-range"
          type="range"
          min="0"
          max={Math.max(duration, 0)}
          step="0.1"
          value={Math.min(currentTime, duration || 0)}
          onChange={handleSeek}
          aria-label="Seek track"
          disabled={!audioUrl || duration <= 0}
        />
        <span>{formatTime(duration)}</span>
      </div>

      {expanded && (
        <div className="pd-expanded">
          <label
            className="pd-volume-wrap"
            style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}
          >
            <button
              className="pd-btn"
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted || volume === 0 ? "🔇" : "🔊"}
            </button>
            <input
              className="pd-volume"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolume}
              aria-label="Volume"
            />
          </label>
          <span style={{ fontSize: 12, color: "#bdb6d5" }}>
            {track ? `${title} — ${artist}` : "Choose a track to start listening"}
          </span>
        </div>
      )}

      {queueOpen && (
        <div className="pd-queue">
          <div className="pd-queue-title">Up next ({queue.length})</div>
          {queue.length ? (
            queue.map((item, index) => (
              <button
                className="pd-queue-item"
                key={item?.id ?? item?.audioUrl ?? item?.url ?? `${item?.title ?? "track"}-${index}`}
                type="button"
                disabled={!onSelectTrack}
                onClick={() => onSelectTrack?.(item, index)}
                title={onSelectTrack ? "Play this queued track" : "Queue selection is not connected"}
              >
                <span className="pd-queue-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="pd-queue-name">
                  {item?.title || "Untitled track"}
                  <span className="pd-queue-artist">
                    {item?.artist || "Unknown artist"}
                  </span>
                </span>
              </button>
            ))
          ) : (
            <p style={{ margin: 8, color: "#bdb6d5", fontSize: 12 }}>
              Your queue is empty.
            </p>
          )}
        </div>
      )}

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          volume={volume}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onPlay={() => {
            if (!isControlled) setInternalPlaying(true);
          }}
          onPause={() => {
            if (!isControlled) setInternalPlaying(false);
          }}
        />
      )}
    </div>
  );
}
