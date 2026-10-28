// src/components/AudioPlayer.jsx
import React, { useRef, useState, useEffect, useCallback } from "react";
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
  const trackRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);

  const large = size === "large";
  const active = hovered || dragging;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrent(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
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
    if (playing) audio.pause();
    else audio.play().catch(() => {});
  };

  const seekAt = useCallback((clientX) => {
    const audio = audioRef.current;
    const track = trackRef.current;
    if (!audio || !track || !duration) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setCurrent(audio.currentTime);
  }, [duration]);

  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    setDragging(true);
    seekAt(e.clientX);
    const move = (ev) => seekAt(ev.clientX);
    const up = () => {
      setDragging(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const onKeyDown = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 5;
      audio.currentTime = Math.min(
        duration,
        Math.max(0, audio.currentTime + (e.key === "ArrowRight" ? step : -step))
      );
      setCurrent(audio.currentTime);
    }
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggle();
    }
  };

  const progress = duration ? (current / duration) * 100 : 0;
  const trackH = 5;
  const trackHoverH = large ? 8 : 7;
  const thumbSize = large ? 14 : 12;

  return (
    <div style={{ marginTop: large ? 22 : 16, width: "100%" }}>
      <audio ref={audioRef} src={src} preload="metadata" />

      <div
        ref={trackRef}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration) || 0}
        aria-valuenow={Math.round(current)}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        onKeyDown={onKeyDown}
        style={{
          position: "relative",
          width: "100%",
          height: active ? trackHoverH : trackH,
          borderRadius: 999,
          background: theme.bgRaised,
          cursor: "pointer",
          transition: "height 0.15s ease",
          touchAction: "none",
          outline: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${progress}%`,
            borderRadius: 999,
            background: theme.accentGrad,
            boxShadow: active ? theme.shadowGlow : "none",
            transition: "box-shadow 0.2s ease",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: `${progress}%`,
            transform: `translate(-50%, -50%) scale(${active ? 1 : 0.001})`,
            width: thumbSize,
            height: thumbSize,
            borderRadius: "50%",
            background: "#ffffff",
            boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
            transition: "transform 0.15s ease",
            pointerEvents: "none",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: theme.textMuted,
          marginTop: 8,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "0.02em",
        }}
      >
        <span>{formatTime(current)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: large ? "center" : "flex-start",
          marginTop: large ? 18 : -34,
          position: "relative",
          zIndex: 2,
        }}
      >
        <button
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
          style={{
            width: large ? 60 : 44,
            height: large ? 60 : 44,
            borderRadius: "50%",
            border: "none",
            flexShrink: 0,
            background: theme.accentGrad,
            color: theme.accentFg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: theme.shadowGlow,
            transition: "transform 0.18s ease, box-shadow 0.25s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.06)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          {playing ? (
            <Pause size={large ? 24 : 18} fill="currentColor" />
          ) : (
            <Play size={large ? 24 : 18} fill="currentColor" style={{ marginLeft: 2 }} />
          )}
        </button>
      </div>
    </div>
  );
}