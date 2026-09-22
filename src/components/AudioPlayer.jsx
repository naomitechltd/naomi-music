import React, { useRef, useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { theme } from "./ui";

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayer({ src, autoPlay }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

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
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * duration;
  };

  const progress = duration ? (current / duration) * 100 : 0;

  return (
    <div style={{ marginTop: 16 }}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={toggle}
          style={{
            width: 40, height: 40, borderRadius: "50%", border: "none", flexShrink: 0,
            background: theme.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}
        >
          {playing ? <Pause size={18} fill="#fff" /> : <Play size={18} fill="#fff" style={{ marginLeft: 2 }} />}
        </button>

        <div style={{ flex: 1 }}>
          <div
            onClick={seek}
            style={{ height: 5, borderRadius: 3, background: theme.bgRaised, cursor: "pointer", position: "relative" }}
          >
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${progress}%`, borderRadius: 3, background: theme.accent }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, opacity: 0.6, marginTop: 4 }}>
            <span>{formatTime(current)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
