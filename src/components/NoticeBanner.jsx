import React, { useEffect, useState } from "react";
import { Info, AlertTriangle, Megaphone, X } from "lucide-react";
import { getNotice } from "../lib/api";
import { client, DATABASE_ID } from "../lib/appwrite";
import { theme } from "./ui";

const STYLES = {
  info: {
    bg: "linear-gradient(90deg, rgba(124,92,255,0.18) 0%, rgba(124,92,255,0.05) 100%)",
    border: "rgba(124,92,255,0.4)",
    color: theme.accent,
    icon: Info,
  },
  warning: {
    bg: "linear-gradient(90deg, rgba(255,152,0,0.18) 0%, rgba(255,152,0,0.05) 100%)",
    border: "rgba(255,152,0,0.4)",
    color: "#ff9a00",
    icon: AlertTriangle,
  },
  urgent: {
    bg: "linear-gradient(90deg, rgba(255,77,109,0.22) 0%, rgba(255,77,109,0.06) 100%)",
    border: "rgba(255,77,109,0.45)",
    color: "#ff4d6d",
    icon: Megaphone,
  },
};

export function NoticeBanner({ currentUser }) {
  const [notice, setNotice] = useState(null);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem("naomi_notice_dismissed") || ""; } catch { return ""; }
  });

  const load = () => {
    getNotice()
      .then((res) => setNotice(res.notice || null))
      .catch(() => {});
  };

  useEffect(() => { load(); }, [currentUser?.$id]);

  // Realtime: refresh when notices change
  useEffect(() => {
    if (!DATABASE_ID) return;
    let unsub;
    try {
      unsub = client.subscribe(
        `databases.${DATABASE_ID}.collections.notices.documents`,
        () => load()
      );
    } catch {}
    return () => { if (unsub) unsub(); };
  }, []);

  const dismiss = () => {
    try { localStorage.setItem("naomi_notice_dismissed", notice.$id); } catch {}
    setDismissed(notice.$id);
  };

  if (!notice) return null;
  if (dismissed === notice.$id) return null;

  const style = STYLES[notice.type] || STYLES.info;
  const Icon = style.icon;

  return (
    <div
      style={{
        background: style.bg,
        borderBottom: `1px solid ${style.border}`,
        padding: "12px 16px",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        fontSize: 13.5,
      }}
    >
      <Icon size={18} style={{ color: style.color, flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ lineHeight: 1.55, whiteSpace: "pre-wrap", fontWeight: 500 }}>
          {notice.message}
        </div>
        <div style={{ fontSize: 11, opacity: 0.55, marginTop: 4 }}>
          — {notice.createdByName}
        </div>
      </div>
      <button
        onClick={dismiss}
        title="Dismiss"
        style={{
          background: "none",
          border: "none",
          color: theme.text,
          opacity: 0.5,
          cursor: "pointer",
          padding: 4,
          display: "flex",
          flexShrink: 0,
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
