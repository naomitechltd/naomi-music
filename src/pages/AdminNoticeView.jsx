import React, { useEffect, useState } from "react";
import { Megaphone, Info, AlertTriangle, Trash2 } from "lucide-react";
import { getNotice, publishNotice, clearNotice } from "../lib/api";
import { theme, inputStyle, Button } from "../components/ui";

const TYPES = [
  { key: "info", label: "Info", icon: Info, color: "#7c5cff" },
  { key: "warning", label: "Warning", icon: AlertTriangle, color: "#ff9a00" },
  { key: "urgent", label: "Urgent", icon: Megaphone, color: "#ff4d6d" },
];

export function AdminNoticeView() {
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [current, setCurrent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    try {
      const res = await getNotice();
      setCurrent(res.notice || null);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const publish = async () => {
    if (!message.trim()) { setError("Write a message first."); return; }
    setBusy(true);
    setError("");
    try {
      await publishNotice(message.trim(), type);
      setMessage("");
      setSuccess("Notice published.");
      setTimeout(() => setSuccess(""), 2500);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    try {
      await clearNotice();
      setCurrent(null);
      setSuccess("Notice cleared.");
      setTimeout(() => setSuccess(""), 2500);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px 100px" }}>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Notices</div>
      <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 24 }}>
        Publish a message that appears at the top of every user's screen.
      </div>

      {current && (
        <div style={{ marginBottom: 24, padding: 14, background: theme.bgRaised, border: `1px solid ${theme.border}`, borderRadius: 10 }}>
          <div style={{ fontSize: 11, opacity: 0.55, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Current notice ({current.type})
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, marginBottom: 10, whiteSpace: "pre-wrap" }}>
            {current.message}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 11, opacity: 0.5 }}>by {current.createdByName}</div>
            <Button variant="outline" onClick={clear} disabled={busy}>
              <Trash2 size={14} /> Clear
            </Button>
          </div>
        </div>
      )}

      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
        {current ? "Replace with new notice" : "Publish a notice"}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {TYPES.map((t) => {
          const active = type === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setType(t.key)}
              style={{
                flex: 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "10px 6px",
                background: active ? t.color : "transparent",
                color: active ? "#fff" : theme.text,
                border: `1px solid ${active ? t.color : theme.border}`,
                borderRadius: 8,
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: active ? 700 : 500,
              }}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      <textarea
        rows={4}
        maxLength={500}
        style={{ ...inputStyle(), resize: "vertical" }}
        placeholder="Write the notice… (max 500 chars)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <div style={{ fontSize: 11, opacity: 0.5, textAlign: "right", marginTop: 4 }}>
        {message.length}/500
      </div>

      {error && <div style={{ color: theme.danger, fontSize: 12.5, marginTop: 10 }}>{error}</div>}
      {success && <div style={{ color: "#4be88a", fontSize: 12.5, marginTop: 10 }}>{success}</div>}

      <Button onClick={publish} disabled={busy || !message.trim()} style={{ marginTop: 14, width: "100%" }}>
        {busy ? "..." : current ? "Replace & publish" : "Publish"}
      </Button>
    </div>
  );
}
