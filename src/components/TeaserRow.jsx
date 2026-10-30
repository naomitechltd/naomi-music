import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fileUrl } from "../lib/appwrite";
import { teaserApi, daysLeft, useMe } from "../lib/teasers";
import TeaserViewer from "./TeaserViewer";
import "./teasers.css";

export function TeaserCard({ t, onOpen, index = 0 }) {
  const cover = t.coverField ? fileUrl(t.coverField) : "";
  return (
    <button type="button" className="tz-card" onClick={() => onOpen(t)} style={{ animationDelay: Math.min(index, 8) * 60 + "ms" }}>
      <div className="tz-thumb">
        {t.mediaType === "video" ? (
          <video src={fileUrl(t.mediaField) + "#t=0.1"} muted playsInline preload="metadata" />
        ) : cover ? (
          <img src={cover} alt="" loading="lazy" />
        ) : (
          <span>♪</span>
        )}
        <i className="tz-badge">{daysLeft(t)}d left</i>
        <i className="tz-play">▶</i>
      </div>
      <b>{t.title}</b>
      <small>{t.artistName}</small>
    </button>
  );
}

export default function TeaserRow() {
  const navigate = useNavigate();
  const me = useMe();
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    let off = false;
    teaserApi({ action: "list-teasers" }).then((o) => { if (!off && Array.isArray(o.teasers)) setList(o.teasers); });
    return () => { off = true; };
  }, []);

  if (!list.length) return null;

  return (
    <section style={{ marginBottom: 30 }}>
      <div className="tz-head">
        <p className="tz-label">UPCOMING</p>
        <button type="button" onClick={() => navigate("/upcoming")}>See all</button>
      </div>
      <div className="tz-scroll">
        {list.map((t, i) => <TeaserCard key={t.id} t={t} index={i} onOpen={setOpen} />)}
      </div>
      {open && <TeaserViewer teaser={open} me={me} onClose={() => setOpen(null)} onDeleted={(id) => setList((l) => l.filter((x) => x.id !== id))} />}
    </section>
  );
}
