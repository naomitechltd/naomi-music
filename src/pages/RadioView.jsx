import React, { useRef, useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
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

const BARS = 72;
const DOTS = ["#39d98a", "#60a5fa", "var(--accent)"];

export function RadioView() {
  const navigate = useNavigate();
  const audioRef = useRef(null);
  const cur = useRef({ songId: null, seq: null, seekMs: 0, needsLoad: false });

  const [song, setSong] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [upNext, setUpNext] = useState([]);
  const [listeners, setListeners] = useState(null);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) { audio.volume = volume; audio.muted = muted; }
  }, [volume, muted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onMeta = () => {
      if (!cur.current.needsLoad) return;
      cur.current.needsLoad = false;

      const d = audio.duration || 0;
      setDuration(d);

      const target = Math.max(0, Math.min(cur.current.seekMs / 1000, Math.max(0, d - 1)));
      try { audio.currentTime = target; } catch {}

      audio.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));

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

        const up = out.upNext || out.queue || out.next;
        setUpNext(Array.isArray(up) ? up.slice(0, 3) : up ? [up] : []);
        setListeners(out.listeners ?? out.listenerCount ?? null);

        const audio = audioRef.current;
        if (!audio) return;

        const sId = out.song.$id;
        const seq = out.sequence ?? 0;

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
          audio.src = fileUrl(out.song.audioField);
          try { audio.load(); } catch {}
          return;
        }

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

  const bars = useMemo(() => {
    let h = 7;
    for (const c of String(song?.$id || "naomi")) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return Array.from({ length: BARS }, (_, i) => {
      h = (h * 1664525 + 1013904223) >>> 0;
      const r = (h >>> 8) / 16777215;
      return 14 + Math.round(((Math.abs(Math.sin(i * 0.33)) + r) / 2) * 62);
    });
  }, [song?.$id]);

  const label = { fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--text-dim)", fontWeight: 700 };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 120px", minHeight: "calc(100vh - 57px)" }}>
      <style>{`
        @keyframes nmBar{from{transform:scaleY(.55)}to{transform:scaleY(1)}}
        @keyframes nmLive{50%{opacity:.35}}
      `}</style>
      <audio ref={audioRef} preload="auto" />

      {loading && <div style={{ opacity: 0.6, fontSize: 13, textAlign: "center", padding: 40 }}>Tuning in…</div>}
      {error && <div style={{ color: theme.danger, fontSize: 13, textAlign: "center", padding: 40 }}>{error}</div>}

      <div style={{ background: "var(--card)", border: `1px solid ${theme.border}`, borderRadius: 22, padding: 22, boxShadow: theme.shadowLg, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <span style={label}>Naomi Music Studio</span>
          <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: "#39d98a" }}>
            <i style={{ width: 8, height: 8, borderRadius: "50%", background: "#39d98a", display: "inline-block", animation: playing ? "nmLive 1.4s infinite" : "none" }} />
            ON AIR
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 3, height: 84, marginBottom: 18 }}>
          {bars.map((h, i) => (
            <span
              key={i}
              style={{
                flex: 1,
                maxWidth: 5,
                height: h,
                borderRadius: 2,
                background: (i / BARS) * 100 < progress ? "var(--accent)" : "var(--border-strong)",
                transformOrigin: "bottom",
                animation: playing ? `nmBar ${0.7 + (i % 7) * 0.12}s ease-in-out ${(i % 11) * 0.05}s infinite alternate` : "none",
                transition: "background .4s",
              }}
            />
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            type="button"
            onClick={toggle}
            disabled={!song}
            aria-label={playing ? "Pause radio" : "Play radio"}
            style={{ width: 54, height: 54, flex: "none", borderRadius: "50%", border: 0, background: "var(--accent-grad)", color: "var(--accent-fg)", cursor: "pointer", display: "grid", placeItems: "center", boxShadow: theme.shadowGlow }}
          >
            {playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" style={{ marginLeft: 3 }} />}
          </button>

          {song && (
            <img
              src={fileUrl(song.coverArtField)}
              alt=""
              style={{ width: 54, height: 54, flex: "none", borderRadius: 12, objectFit: "cover" }}
            />
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {song ? song.title : "Naomi Music Radio"}
            </div>
            {song ? (
              <button
                type="button"
                onClick={() => navigate(`/artist/${song.uploadedByUserId}`)}
                style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: theme.accent, fontSize: 13, fontFamily: "inherit" }}
              >
                {song.artistName} · Live now
              </button>
            ) : (
              <div style={{ fontSize: 13, color: "var(--text-dim)" }}>Live now</div>
            )}
          </div>

          <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, color: "var(--text-dim)", flex: "none" }}>
            {duration ? "-" + formatTime(duration - current) : "0:00"}
          </span>
        </div>

        <div style={{ height: 3, borderRadius: 2, background: "var(--border-strong)", marginTop: 18, overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: "var(--accent)", transition: "width .5s linear" }} />
        </div>

        <div style={{ ...label, marginTop: 26, marginBottom: 6 }}>Up next</div>
        {(upNext.length ? upNext : [null]).map((n, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${theme.border}` }}>
            <i style={{ width: 8, height: 8, borderRadius: "50%", flex: "none", background: DOTS[i % DOTS.length] }} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: n ? "var(--text)" : "var(--text-dim)" }}>
              {n ? n.title || "Untitled" : "Next song is chosen live"}
            </span>
            {n && <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{n.artistName}</span>}
          </div>
        ))}

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18, fontSize: 11, color: "var(--text-dim)", letterSpacing: 0.8 }}>
          <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? "Unmute" : "Mute"} style={{ background: "none", border: 0, color: "var(--text-muted)", cursor: "pointer", display: "grid" }}>
            {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range" min="0" max="1" step="0.05"
            value={muted ? 0 : volume}
            onChange={(e) => { setVolume(Number(e.target.value)); setMuted(false); }}
            aria-label="Volume"
            style={{ width: 110, accentColor: "var(--accent)" }}
          />
          <span style={{ marginLeft: "auto" }}>LIVE · STEREO{listeners != null ? ` · ${listeners} listening` : ""}</span>
        </div>
      </div>

      <div style={{ textAlign: "center", fontSize: 11.5, opacity: 0.5, marginTop: 18 }}>
        Everyone hears the same song at the same moment. Auto-synced every 4 seconds.
      </div>
    </div>
  );
}
