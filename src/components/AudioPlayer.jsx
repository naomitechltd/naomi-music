import React, { useRef, useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { theme } from "./ui";

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayer({ src, autoPlay, size = "small" }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  const large = size === "large";

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrent(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, []);

  useEffect(() => {
    if (autoPlay && audioRef.current) {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  }, [autoPlay, src]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  };

  const seek = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
  };

  const progress = duration ? (current / duration) * 100 : 0;

  return (
    <div style={{ marginTop: large ? 20 : 16, width: "100%" }}>
      <audio ref={audioRef} src={src} preload="metadata" />

      <div
        onClick={seek}
        style={{ height: large ? 4 : 5, borderRadius: 3, background: theme.bgRaised, cursor: "pointer", position: "relative", width: "100%" }}
      >
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${progress}%`, borderRadius: 3, background: theme.accent }} />
        {large && (
          <div
            style={{
              position: "absolute", top: "50%", left: `${progress}%`, transform: "translate(-50%, -50%)",
              width: 12, height: 12, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
            }}
          />
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, opacity: 0.6, marginTop: 6 }}>
        <span>{formatTime(current)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: large ? 16 : 0 }}>
        <button
          onClick={toggle}
          style={{
            width: large ? 56 : 40, height: large ? 56 : 40, borderRadius: "50%", border: "none", flexShrink: 0,
            background: theme.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            boxShadow: large ? "0 4px 14px rgba(124,92,255,0.4)" : "none",
            position: large ? "static" : "relative", marginTop: large ? 0 : -32,
          }}
        >
          {playing ? <Pause size={large ? 22 : 18} fill="#fff" /> : <Play size={large ? 22 : 18} fill="#fff" style={{ marginLeft: 2 }} />}
        </button>
      </div>
    </div>
  );
}
