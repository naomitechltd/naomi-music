import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Pause, Radio as RadioIcon, Volume2, Users } from "lucide-react";
import { fileUrl } from "../lib/appwrite";
import { functions } from "../lib/appwrite";
import { theme } from "../components/ui";

// Call radio-now action; optionally report the song duration
async function callRadioNow(opts = {}) {
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
  try { return JSON.parse(raw); } catch { return { ok: false }; }
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
  const [song, setSong] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [listeners, setListeners] = useState(1);

  // Poll every 5s for updates + drift correction
  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      const out = await callRadioNow();
      if (cancelled) return;

      if (!out.ok) {
        setError(out.error || "Radio unavailable");
        setLoading(false);
        return;
      }
      setError("");

      const audio = audioRef.current;
      if (!audio) return;

      // Switch songs
      if (audio.dataset.songId !== out.song.$id) {
        audio.dataset.songId = out.song.$id;
        audio.src = fileUrl(out.song.audioField);
        audio.currentTime = Math.max(0, out.elapsedMs / 1000);
        audio.play().then(() => setPlaying(true)).catch(() => {});
        setSong(out.song);
        setLoading(false);
        return;
      }

      // If server says we're in a new rotation but the same audio is playing,
      // detect via sequence change and force-reload
      if (out.sequence != null && audio.dataset.seq !== String(out.sequence)) {
        audio.dataset.seq = String(out.sequence);
        audio.src = fileUrl(out.song.audioField);
        audio.currentTime = Math.max(0, out.elapsedMs / 1000);
        audio.play().then(() => setPlaying(true)).catch(() => {});
        setSong(out.song);
      }

      // Drift correction
      if (!audio.paused) {
        const currentMs = audio.currentTime * 1000;
        if (Math.abs(currentMs - out.elapsedMs) > 2000) {
          audio.currentTime = out.elapsedMs / 1000;
        }
      }
    };

    tick();
    const id = setInterval(tick, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Report duration once known
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onMeta = async () => {
      const d = audio.duration;
      if (d && isFinite(d) && audio.dataset.songId) {
        await callRadioNow({ songId: audio.dataset.songId, durationMs: Math.round(d * 1000) });
      }
      setDuration(d || 0);
    };
    const onTime = () => setCurrent(audio.currentTime);
    const onEnd = () => { /* server will advance on next poll */ };
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  const progress = duration ? (current / duration) * 100 : 0;

  return (
    <div
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "24px 20px 120px",
        minHeight: "calc(100vh - 57px)",
      }}
    >
      <audio ref={audioRef} preload="auto" />

      {/* Header */}
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

      {/* Now playing */}
      {song && (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <img
              src={fileUrl(song.coverArtField)}
              alt={song.title}
              style={{
                width: "100%",
                maxWidth: 320,
                aspectRatio: "1",
                objectFit: "cover",
                borderRadius: 14,
                boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
              }}
            />
          </div>

          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{song.title}</div>
            <button
              onClick={() => navigate(`/artist/${song.uploadedByUserId}`)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                color: theme.accent,
                fontSize: 15,
                fontFamily: "inherit",
              }}
            >
              {song.artistName}
            </button>
          </div>

          {/* Progress */}
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              margin: "0 auto",
              padding: "0 20px",
            }}
          >
            <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.12)", position: "relative" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${progress}%`, borderRadius: 2, background: theme.accent }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, opacity: 0.55, marginTop: 8 }}>
              <span>{formatTime(current)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
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
            Auto-synced every 5 seconds.
            <br />
            Tap play if your audio is paused.
          </div>
        </>
      )}
    </div>
  );
}
