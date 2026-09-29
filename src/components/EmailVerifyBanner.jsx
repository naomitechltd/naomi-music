import React, { useState } from "react";
import { MailWarning, X } from "lucide-react";
import { account } from "../lib/appwrite";
import { theme } from "./ui";

export function EmailVerifyBanner({ currentUser }) {
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  if (!currentUser || currentUser.emailVerification || dismissed) return null;

  const resend = async () => {
    setBusy(true);
    setError("");
    try {
      await account.createVerification(`${window.location.origin}/`);
      setSent(true);
      setTimeout(() => setSent(false), 6000);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        background: "linear-gradient(90deg, rgba(255,152,0,0.18) 0%, rgba(255,152,0,0.06) 100%)",
        borderBottom: `1px solid rgba(255,152,0,0.35)`,
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontSize: 13,
      }}
    >
      <MailWarning size={18} style={{ color: "#ff9a00", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, marginBottom: 2 }}>
          {sent ? "Verification email sent" : "Verify your email"}
        </div>
        <div style={{ opacity: 0.75, fontSize: 12, lineHeight: 1.4 }}>
          {sent
            ? `Check ${currentUser.email} for the link.`
            : "Check your inbox to verify — you'll need it to message and upload."}
        </div>
        {error && <div style={{ color: theme.danger, fontSize: 12, marginTop: 4 }}>{error}</div>}
      </div>
      {!sent && (
        <button
          onClick={resend}
          disabled={busy}
          style={{
            background: "#ff9a00",
            color: "#000",
            border: "none",
            borderRadius: 6,
            padding: "7px 14px",
            fontSize: 12.5,
            fontWeight: 700,
            cursor: busy ? "wait" : "pointer",
            fontFamily: "inherit",
            flexShrink: 0,
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? "..." : "Resend"}
        </button>
      )}
      <button
        onClick={() => setDismissed(true)}
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
