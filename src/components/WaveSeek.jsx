import React, { useEffect, useRef } from "react";

const RATE = 25;
const cache = new Map();

function loadEnvelope(url) {
  if (cache.has(url)) return cache.get(url);
  const p = (async () => {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error("fetch failed");
    const buf = await res.arrayBuffer();
    const AC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const ctx = new AC(1, 44100, 44100);
    const audio = await new Promise((ok, no) => ctx.decodeAudioData(buf, ok, no));
    const ch = audio.getChannelData(0);
    const step = Math.max(1, Math.floor(audio.sampleRate / RATE));
    const n = Math.ceil(ch.length / step);
    const env = new Float32Array(n);
    let peak = 0.0001;
    for (let i = 0; i < n; i++) {
      let sum = 0, cnt = 0;
      const end = Math.min(ch.length, (i + 1) * step);
      for (let j = i * step; j < end; j += 8) { sum += ch[j] * ch[j]; cnt++; }
      env[i] = Math.sqrt(sum / (cnt || 1));
      if (env[i] > peak) peak = env[i];
    }
    for (let i = 0; i < n; i++) env[i] = Math.pow(env[i] / peak, 0.8);
    return env;
  })();
  cache.set(url, p);
  p.catch(() => cache.delete(url));
  return p;
}

export default function WaveSeek({ audioRef, duration, currentTime, playing, audioUrl, active, onSeek }) {
  const cv = useRef(null);
  const drag = useRef(false);
  const live = useRef({});
  live.current = { duration, playing, onSeek };
  const envRef = useRef(null);
  const shape = useRef(null);

  useEffect(() => {
    envRef.current = null;
    shape.current = null;
    if (!active || !audioUrl) return undefined;
    let off = false;
    loadEnvelope(audioUrl).then((env) => {
      if (off) return;
      const N = 72;
      const sh = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const a = Math.floor((i / N) * env.length);
        const b = Math.max(a + 1, Math.floor(((i + 1) / N) * env.length));
        let m = 0;
        for (let k = a; k < b; k++) m += env[k];
        sh[i] = m / (b - a);
      }
      shape.current = sh;
      envRef.current = env;
    }).catch(() => {});
    return () => { off = true; };
  }, [audioUrl, active]);

  useEffect(() => {
    if (!active) return undefined;
    const c = cv.current;
    if (!c) return undefined;
    const g2 = c.getContext("2d");
    const N = 72;
    const t0 = performance.now();
    const accent = getComputedStyle(c).getPropertyValue("--pl").trim() || "#c8e84a";
    const lv = new Float32Array(N);
    let raf = 0, prog = 0, energy = 0.1, phase = 0;

    const draw = (now) => {
      raf = requestAnimationFrame(draw);
      const { duration: d, playing: pl } = live.current;
      const audio = audioRef.current;
      const ct = audio ? audio.currentTime || 0 : 0;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = c.clientWidth, h = c.clientHeight;
      if (!w || !h) return;
      if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
      g2.setTransform(dpr, 0, 0, dpr, 0, 0);
      g2.clearRect(0, 0, w, h);
      const t = (now - t0) / 1000;
      const env = envRef.current, sh = shape.current;

      let target = 0.08;
      if (pl) {
        if (env) target = env[Math.min(env.length - 1, Math.floor(ct * RATE))] || 0;
        else target = 0.3 + 0.35 * Math.abs(Math.sin(t * 3));
      }
      energy += (target - energy) * (target > energy ? 0.5 : 0.15);
      if (pl) phase += 0.1 + energy * 0.2;

      const pts = [];
      for (let i = 0; i < N; i++) {
        const base = sh ? 0.2 + 0.8 * sh[i] : 0.5 + 0.5 * Math.sin(i * 0.4);
        const amp = Math.min(1, base * (0.25 + 1.1 * energy));
        lv[i] += (amp - lv[i]) * 0.35;
        pts.push([(i / (N - 1)) * w, h / 2 + Math.sin(i * 0.55 + phase) * lv[i] * (h / 2 - 8)]);
      }

      const trace = () => {
        g2.beginPath();
        g2.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < N - 1; i++) {
          g2.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
        }
        g2.lineTo(pts[N - 1][0], pts[N - 1][1]);
      };

      const px = d > 0 ? Math.min(w, (ct / d) * w) : 0;
      prog += (px - prog) * 0.4;

      g2.lineWidth = 3; g2.lineCap = "round"; g2.lineJoin = "round";
      g2.strokeStyle = "rgba(255,255,255,.28)";
      trace(); g2.stroke();

      g2.save();
      g2.beginPath(); g2.rect(0, 0, prog, h); g2.clip();
      g2.strokeStyle = accent; g2.shadowColor = accent; g2.shadowBlur = 14;
      trace(); g2.stroke();
      g2.restore();

      const k = Math.max(0, Math.min(N - 1, Math.round((prog / w) * (N - 1))));
      g2.beginPath();
      g2.arc(prog, pts[k][1], 6, 0, Math.PI * 2);
      g2.fillStyle = accent; g2.shadowColor = accent; g2.shadowBlur = 12; g2.fill();
      g2.shadowBlur = 0; g2.lineWidth = 2; g2.strokeStyle = "#fff"; g2.stroke();
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [active, audioRef]);

  const fromEvent = (e) => {
    const r = cv.current.getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    live.current.onSeek(f * (live.current.duration || 0));
  };

  return (
    <canvas
      ref={cv}
      className="fs-wave"
      role="slider"
      tabIndex={0}
      aria-label="Song progress"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration || 0)}
      aria-valuenow={Math.round(currentTime || 0)}
      onPointerDown={(e) => { drag.current = true; e.currentTarget.setPointerCapture(e.pointerId); fromEvent(e); }}
      onPointerMove={(e) => { if (drag.current) fromEvent(e); }}
      onPointerUp={() => { drag.current = false; }}
      onPointerCancel={() => { drag.current = false; }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") onSeek((currentTime || 0) + 5);
        if (e.key === "ArrowLeft") onSeek((currentTime || 0) - 5);
      }}
    />
  );
}
