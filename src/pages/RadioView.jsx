import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Pause, Radio as RadioIcon } from "lucide-react";
import { functions, fileUrl } from "../lib/appwrite";
import { theme } from "../components/ui";

async function callRadioNow(opts = {}) {
  try {
    const res = await functions.createExecution(
      "api",
      JSON.stringify({ action: "radio-now", ...opts }),
      false
    );
    const raw =
      res?.responseBody ??
      res?.response ??
      res?.data?.responseBody ??
      res?.data?.response ??
      "{}";
    return JSON.parse(raw);
  } catch {
    return { ok: false };
  }
}

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function RadioView() {
  const navigate = useNavigate();
  const audioRef = useRef(null);
  // Single source of truth for what we're currently playing
  const cur = useRef({ songId: null, seq: null, seekMs: 0, needsLoad: false });

  const [song, setSong] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Audio element listeners (bound once)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onMeta = () => {
      // Only act if we're expecting a fresh load
      if (!cur.current.needsLoad) return;
      cur.current.needsLoad = false;

      const d = audio.duration || 0;
      setDuration(d);

      const target = Math.max(0, Math.min(cur.current.seekMs / 1000, Math.max(0, d - 1)));
      try { audio.currentTime = target; } catch {}

      audio.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));

      // Report duration for the server scheduler (once per song)
      if (cur.current.songId) {
        callRadioNow({ songId: cur.current.songId, durationMs: Math.round(d * 1000) });
      }
    };

    const onTime = () => setCurrent(audio.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  // Poll the server
  useEffect(() => {
    let stopped = false;
    let inFlight = false;

    const tick = async () => {
      if (stopped || inFlight) return;
      inFlight = true;
      try {
        const out = await callRadioNow();
        if (stopped) return;
        if (!out || !out.ok || !out.song) {
          if (out && out.error) setError(out.error);
          return;
        }
        setLoading(false);
        setError("");

        const audio = audioRef.current;
        if (!audio) return;

        const sId = out.song.$id;
        const seq = out.sequence ?? 0;

        // Different song OR sequence changed → load it
        if (cur.current.songId !== sId || cur.current.seq !== seq) {
          cur.current = {
            songId: sId,
            seq,
            seekMs: out.elapsedMs || 0,
            needsLoad: true,
          };
          setSong(out.song);
          setDuration(0);
          setCurrent(0);
          // Force a fresh load even if the same src was cached
          audio.src = fileUrl(out.song.audioField);
          try { audio.load(); } catch {}
          return;
        }

        // Same song — gentle drift correction
        if (!audio.paused && audio.readyState >= 2 && out.durationMs > 0) {
          const drift = audio.currentTime * 1000 - out.elapsedMs;
          if (Math.abs(drift) > 4000) {
            audio.currentTime = Math.max(0, out.elapsedMs / 1000);
          }
        }
      } finally {
        inFlight = false;
      }
    };

    tick();
    const id = setInterval(tick, 4000);
    return () => { stopped = true; clearInterval(id); };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  const progress = duration ? (current / duration) * 100 : 0;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px 120px", minHeight: "calc(100vh - 57px)" }}>
      <audio ref={audioRef} preload="auto" />

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 26 }}>
        <div
          style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "linear-gradient(135deg, #ff4d6d 0%, #7c5cff 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 0 6px rgba(255,77,109,0.15)",
          }}
        >
          <RadioIcon size={18} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Naomi Music Radio</div>
          <div style={{ fontSize: 12, opacity: 0.6, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4be88a", display: "inline-block" }} />
            Live · everyone is listening to the same song
          </div>
        </div>
      </div>

      {loading && <div style={{ opacity: 0.6, fontSize: 13, textAlign: "center", padding: 40 }}>Tuning in…</div>}
      {error && <div style={{ color: theme.danger, fontSize: 13, textAlign: "center", padding: 40 }}>{error}</div>}

      {song && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <img
              src={fileUrl(song.coverArtField)}
              alt={song.title}
              style={{
                width: "100%", maxWidth: 320, aspectRatio: "1",
                objectFit: "cover", borderRadius: 14,
                boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
              }}
            />
          </div>

          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{song.title}</div>
            <button
              onClick={() => navigate(`/artist/${song.uploadedByUserId}`)}
              style={{
                background: "none", border: "none", padding: 0,
                cursor: "pointer", color: theme.accent,
                fontSize: 15, fontFamily: "inherit",
              }}
            >
              {song.artistName}
            </button>
          </div>

          <div style={{ width: "100%", maxWidth: 420, margin: "0 auto", padding: "0 20px" }}>
            <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.12)", position: "relative" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${progress}%`, borderRadius: 2, background: theme.accent }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, opacity: 0.55, marginTop: 8 }}>
              <span>{formatTime(current)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginTop: 26 }}>
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
          </div>

          <div style={{ textAlign: "center", fontSize: 11.5, opacity: 0.5, marginTop: 22, lineHeight: 1.6 }}>
            Auto-synced every 4 seconds.
          </div>
        </>
      )}
    </div>
  );
}
