import React, { useState } from "react";
import { X } from "lucide-react";
import { reportContent } from "../lib/api";
import { theme, inputStyle, Button } from "./ui";

const REASONS = [
  { key: "abuse", label: "Abuse or harassment" },
  { key: "disses", label: "Disses / attacks on someone" },
  { key: "explicit", label: "Excessive explicit language" },
  { key: "copyright", label: "Someone else's work / licensed" },
  { key: "spam", label: "Spam or scam" },
  { key: "other", label: "Other" },
];

export function ReportModal({ targetType, targetId, targetLabel, onClose }) {
  const [reason, setReason] = useState(REASONS[0].key);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await reportContent({ targetType, targetId, targetLabel, reason, notes });
      setDone(true);
      setTimeout(onClose, 1800);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 350,
        background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme.bgRaised, width: "100%", maxWidth: 400,
          borderRadius: 12, border: `1px solid ${theme.border}`,
          padding: 22,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Report</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: theme.text, opacity: 0.7, display: "flex" }}>
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div style={{ fontSize: 13.5, color: "#4be88a", padding: "16px 0" }}>
            Report submitted. Thanks — an admin will review it.
          </div>
        ) : (
          <>
            {targetLabel && (
              <div style={{ fontSize: 12.5, opacity: 0.7, marginBottom: 14 }}>
                Reporting: <strong>{targetLabel}</strong>
              </div>
            )}

            <div style={{ fontSize: 12, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              Reason
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
              {REASONS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setReason(r.key)}
                  style={{
                    textAlign: "left",
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: reason === r.key ? theme.accent : theme.bg,
                    color: reason === r.key ? "#fff" : theme.text,
                    border: `1px solid ${reason === r.key ? theme.accent : theme.border}`,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: 13.5,
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 12, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              Extra details (optional)
            </div>
            <textarea
              rows={3}
              style={{ ...inputStyle(), resize: "vertical" }}
              placeholder="Anything else the admin should know?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
            />

            {error && <div style={{ color: theme.danger, fontSize: 12.5, marginTop: 8 }}>{error}</div>}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={submit} disabled={busy}>{busy ? "..." : "Submit report"}</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
