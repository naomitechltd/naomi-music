import React, { useState } from "react";
import { UserCog, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { theme } from "./ui";

export function CompleteProfileBanner({ currentUser }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (!currentUser || dismissed) return null;

  const isArtist = currentUser.role === "artist" || currentUser.role === "admin";
  const missing = [];
  if (!currentUser.phone) missing.push("cellphone");
  if (!currentUser.location) missing.push("location");
  if (isArtist && !currentUser.studio) missing.push("studio");

  if (missing.length === 0) return null;

  return (
    <div
      style={{
        background: "linear-gradient(90deg, rgba(124,92,255,0.15) 0%, rgba(124,92,255,0.05) 100%)",
        borderBottom: `1px solid rgba(124,92,255,0.35)`,
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontSize: 13,
      }}
    >
      <UserCog size={18} style={{ color: theme.accent, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, marginBottom: 2 }}>Complete your profile</div>
        <div style={{ opacity: 0.75, fontSize: 12, lineHeight: 1.4 }}>
          Missing: {missing.join(", ")}. Tap to add.
        </div>
      </div>
      <button
        onClick={() => navigate("/profile")}
        style={{
          background: theme.accent, color: "#fff",
          border: "none", borderRadius: 6,
          padding: "7px 14px", fontSize: 12.5, fontWeight: 700,
          cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
        }}
      >
        Complete
      </button>
      <button
        onClick={() => setDismissed(true)}
        title="Dismiss"
        style={{ background: "none", border: "none", color: theme.text, opacity: 0.5, cursor: "pointer", padding: 4, display: "flex", flexShrink: 0 }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
