import React from "react";
import { theme } from "./ui";

export function SplashScreen({ phase }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: theme.bg, color: theme.text, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", zIndex: 300 }}>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "0.02em" }}>Naomi Music</div>
      <div style={{ fontSize: 14, opacity: phase === "slogan" ? 0.75 : 0, marginTop: 10, transition: "opacity 0.4s ease" }}>
        Ned so!
      </div>
    </div>
  );
}
