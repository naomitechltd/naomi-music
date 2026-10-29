import React, { useEffect, useRef } from "react";

const graphs = new WeakMap();

function getAnalyser(audio) {
  if (graphs.has(audio)) return graphs.get(audio);
  let g = null;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    const src = ctx.createMediaElementSource(audio);
    const an = ctx.createAnalyser();
    an.fftSize = 256;
    an.smoothingTimeConstant = 0.78;
    src.connect(an);
    an.connect(ctx.destination);
    g = { ctx, an, data: new Uint8Array(an.frequencyBinCount) };
  } catch (e) {
    g = null;
  }
  graphs.set(audio, g);
  return g;
}

export default function WaveSeek({ audioRef, duration, currentTime, playing, useAnalyser, active, onSeek }) {
  const cv = useRef(null);
  const drag = useRef(false);
  const live = useRef({});
  live.current = { duration, currentTime, playing, useAnalyser, onSeek };
  const lv = useRef(new Float32Array(72));

  useEffect(() => {
    if (!active) return undefined;
    const c = cv.current;
    if (!c) return undefined;
    const g2 = c.getContext("2d");
    const N = 72;
    const t0 = performance.now();
    const accent = getComputedStyle(c).getPropertyValue("--pl").trim() || "#c8e84a";
    let raf = 0;
    let prog = 0;

    const draw = (now) => {
      raf = requestAnimationFrame(draw);
      const { duration: d, currentTime: ct, playing: pl, useAnalyser: ua } = live.current;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = c.clientWidth;
      const h = c.clientHeight;
      if (!w || !h) return;
      if (c.width !== Math.round(w * dpr)) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      g2.setTransform(dpr, 0, 0, dpr, 0, 0);
      g2.clearRect(0, 0, w, h);
      const t = (now - t0) / 1000;

      let g = null;
      const audio = audioRef.current;
      if (pl && ua && audio) {
        g = getAnalyser(audio);
        if (g) {
          if (g.ctx.state === "suspended") g.ctx.resume().catch(() => {});
          g.an.getByteFrequencyData(g.data);
        }
      }

      const pts = [];
      for (let i = 0; i < N; i++) {
        let target = 0.06;
        if (pl) {
          if (g) {
            const b = 2 + Math.floor(Math.pow(i / N, 1.5) * 90);
            target = Math.min(1, Math.pow(g.data[b] / 255, 1.1) * 1.5);
          } else {
            target = 0.25 + 0.4 * Math.abs(Math.sin(t * 3.1 + i * 0.45)) * Math.abs(Math.sin(t * 1.7 + i * 0.17));
          }
        }
        lv.current[i] += (target - lv.current[i]) * 0.25;
        pts.push([(i / (N - 1)) * w, h / 2 + Math.sin(i * 0.6 + t * 4) * lv.current[i] * (h / 2 - 8)]);
      }

      const trace = () => {
        g2.beginPath();
        g2.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < N - 1; i++) {
          const mx = (pts[i][0] + pts[i + 1][0]) / 2;
          const my = (pts[i][1] + pts[i + 1][1]) / 2;
          g2.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
        }
        g2.lineTo(pts[N - 1][0], pts[N - 1][1]);
      };

      const px = d > 0 ? Math.min(w, (ct / d) * w) : 0;
      prog += (px - prog) * 0.4;

      g2.lineWidth = 3;
      g2.lineCap = "round";
      g2.lineJoin = "round";
      g2.strokeStyle = "rgba(255,255,255,.28)";
      trace();
      g2.stroke();

      g2.save();
      g2.beginPath();
      g2.rect(0, 0, prog, h);
      g2.clip();
      g2.strokeStyle = accent;
      g2.shadowColor = accent;
      g2.shadowBlur = 14;
      trace();
      g2.stroke();
      g2.restore();

      const k = Math.max(0, Math.min(N - 1, Math.round((prog / w) * (N - 1))));
      g2.beginPath();
      g2.arc(prog, pts[k][1], 6, 0, Math.PI * 2);
      g2.fillStyle = accent;
      g2.shadowColor = accent;
      g2.shadowBlur = 12;
      g2.fill();
      g2.shadowBlur = 0;
      g2.lineWidth = 2;
      g2.strokeStyle = "#fff";
      g2.stroke();
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
