import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Trash2, Volume2, VolumeX } from "lucide-react";
import { fileUrl } from "../lib/appwrite";
import { teaserApi, daysLeft } from "../lib/teasers";
import "./teasers.css";

export default function TeaserViewer({ teaser, me, onClose, onDeleted }) {
  const navigate = useNavigate();
  const ref = useRef(null);
  const isVideo = teaser.mediaType === "video";
  const [muted, setMuted] = useState(isVideo);
  const [pct, setPct] = useState(0);
  const [busy, setBusy] = useState(false);
  const canDelete = me.role === "admin" || (me.id && me.id === teaser.userId);
  const src = fileUrl(teaser.mediaField);
  const cover = teaser.coverField ? fileUrl(teaser.coverField) : "";

  useEffect(() => {
    document.querySelectorAll("audio,video").forEach((m) => { if (m !== ref.current) m.pause(); });
    const m = ref.current;
    if (m) { m.muted = isVideo; m.play().catch(() => {}); }
  }, [teaser.id, isVideo]);

  useEffect(() => { if (ref.current) ref.current.muted = muted; }, [muted]);

  const del = async () => {
    if (!window.confirm("Delete this teaser?")) return;
    setBusy(true);
    const out = await teaserApi({ action: "delete-teaser", teaserId: teaser.id });
    setBusy(false);
    if (out.ok) { onDeleted(teaser.id); onClose(); } else window.alert(out.error || "Could not delete");
  };

  const media = isVideo ? (
    <video ref={ref} src={src} className="tz-media" playsInline loop onClick={() => setMuted((v) => !v)}
      onTimeUpdate={(e) => setPct((e.currentTarget.currentTime / (e.currentTarget.duration || 1)) * 100)} />
  ) : (
    <>
      {cover ? <img className="tz-art" src={cover} alt="" /> : <div className="tz-art">♪</div>}
      <audio ref={ref} src={src} loop onTimeUpdate={(e) => setPct((e.currentTarget.currentTime / (e.currentTarget.duration || 1)) * 100)} />
    </>
  );

  return (
    <div className="tz-viewer" role="dialog" aria-label="Upcoming teaser">
      {!isVideo && cover && <div className="tz-bg" style={{ backgroundImage: `url(${cover})` }} />}
      {media}
      <div className="tz-bar"><i style={{ width: pct + "%" }} /></div>
      <div className="tz-top">
        <button type="button" className="who" onClick={() => { onClose(); navigate("/artist/" + teaser.userId); }}>
          <b>{teaser.artistName}</b><small>{daysLeft(teaser)} days left</small>
        </button>
        <button type="button" className="tz-btn" onClick={() => setMuted((v) => !v)} aria-label={muted ? "Sound on" : "Sound off"}>
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        {canDelete && (
          <button type="button" className="tz-btn danger" disabled={busy} onClick={del} aria-label="Delete teaser"><Trash2 size={19} /></button>
        )}
        <button type="button" className="tz-btn" onClick={onClose} aria-label="Close"><X size={22} /></button>
      </div>
      <div className="tz-cap">{teaser.title}{isVideo && muted && <small>Tap the video for sound</small>}</div>
    </div>
  );
}
