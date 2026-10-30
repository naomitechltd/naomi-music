import React, { useEffect, useMemo, useRef } from "react";

const TS = /^\s*\[(\d+):(\d+(?:\.\d+)?)\]\s*/;

export default function LyricsScroll({ lyrics, currentTime, duration, onSeek }) {
  const box = useRef(null);
  const els = useRef([]);
  const pauseUntil = useRef(0);

  const { lines, timed } = useMemo(() => {
    const raw = String(lyrics || "").split("\n");
    const hasTime = raw.some((l) => TS.test(l));
    const out = [];
    for (const l of raw) {
      const m = l.match(TS);
      const text = l.replace(TS, "").trim();
      if (hasTime) {
        if (m && text) out.push({ text, time: Number(m[1]) * 60 + Number(m[2]) });
      } else {
        out.push({ text, time: null });
      }
    }
    return { lines: out, timed: hasTime };
  }, [lyrics]);

  let idx = -1;
  if (timed) {
    for (let i = 0; i < lines.length; i++) if (currentTime >= lines[i].time) idx = i;
  } else if (duration > 0) {
    const real = [];
    lines.forEach((l, i) => { if (l.text) real.push(i); });
    if (real.length) {
      idx = real[Math.min(real.length - 1, Math.floor((currentTime / duration) * real.length))];
    }
  }

  useEffect(() => {
    if (idx < 0 || Date.now() < pauseUntil.current) return;
    const el = els.current[idx];
    const b = box.current;
    if (el && b) {
      b.scrollTo({ top: el.offsetTop - b.clientHeight / 2 + el.clientHeight / 2, behavior: "smooth" });
    }
  }, [idx]);

  if (!lines.length) return <div className="fs-lyrics-text">No lyrics available for this track.</div>;

  const hold = () => { pauseUntil.current = Date.now() + 4000; };

  return (
    <div ref={box} className="fs-lyr" onTouchStart={hold} onWheel={hold}>
      <div style={{ height: "38%" }} />
      {lines.map((l, i) =>
        l.text === "" ? (
          <div key={i} style={{ height: 18 }} />
        ) : (
          <div
            key={i}
            ref={(el) => { els.current[i] = el; }}
            className={"fs-lyr-line" + (i === idx ? " on" : i < idx ? " past" : "")}
            onClick={timed && onSeek ? () => onSeek(l.time) : undefined}
          >
            {l.text}
          </div>
        )
      )}
      <div style={{ height: "38%" }} />
    </div>
  );
}
