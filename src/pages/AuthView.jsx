import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Field, ErrorNote, inputStyle, theme } from "../components/ui";

export function AuthView({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [studio, setStudio] = useState("");
  const [studioManager, setStudioManager] = useState("");
  const [role, setRole] = useState("listener");
  const [avatarFile, setAvatarFile] = useState(null);
  const [acceptTc, setAcceptTc] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    if (mode === "signup") {
      if (!name || !email || !password || !phone || !location) {
        setError("Fill in name, email, password, phone, and location.");
        return;
      }
      if (!avatarFile) { setError("Please choose a profile picture."); return; }
      if (!acceptTc) { setError("You must accept the Terms and Artist Rules."); return; }
      if (role === "artist" && !studio) {
        setError("Artists must provide their studio name (you can change it later).");
        return;
      }
    } else {
      if (!email || !password) { setError("Enter your email and password."); return; }
    }
    setBusy(true);
    try {
      await onAuth({ mode, name, email, password, phone, location, studio, studioManager, role, avatarFile });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: "40px 20px 60px" }}>
      <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
        {mode === "login" ? "Log in" : "Create an account"}
      </div>
      <div style={{ opacity: 0.6, fontSize: 13, marginBottom: 24 }}>
        {mode === "login" ? "Welcome back." : "Join as a listener or an artist."}
      </div>

      {mode === "signup" && (
        <>
          <Field label="Name *">
            <input style={inputStyle()} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Profile picture *">
            <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
          </Field>
          <Field label="Cellphone *">
            <input
              type="tel"
              inputMode="tel"
              placeholder="e.g. 0821234567"
              style={inputStyle()}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
          <Field label="Location *">
            <input
              placeholder="e.g. Johannesburg, GP"
              style={inputStyle()}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </Field>
          <Field label="I am a... *">
            <div style={{ display: "flex", gap: 8 }}>
              {["listener", "artist", "poet"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    borderRadius: 4,
                    border: `1px solid ${role === r ? theme.accent : theme.border}`,
                    background: role === r ? theme.accent : "transparent",
                    color: role === r ? "#fff" : theme.text,
                    cursor: "pointer",
                    fontSize: 13,
                    textTransform: "capitalize",
                    fontFamily: "inherit",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </Field>
          {role === "artist" && (
            <>
              <Field label="Studio name *">
                <input
                  placeholder="e.g. Moonlight Studios"
                  style={inputStyle()}
                  value={studio}
                  onChange={(e) => setStudio(e.target.value)}
                />
              </Field>
              <Field label="Studio manager (optional)">
                <input
                  placeholder="Name of manager or producer-in-charge"
                  style={inputStyle()}
                  value={studioManager}
                  onChange={(e) => setStudioManager(e.target.value)}
                />
              </Field>
            </>
          )}
        </>
      )}

      <Field label="Email *">
        <input type="email" style={inputStyle()} value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Password *">
        <input type="password" style={inputStyle()} value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>

      {mode === "login" && (
        <div style={{ marginTop: -6, marginBottom: 12, textAlign: "right" }}>
          <button
            onClick={async () => {
              if (!email) { setError("Enter your email first."); return; }
              try {
                const { account } = await import("../lib/appwrite");
                await account.createRecovery(email, `${window.location.origin}/`);
                setError("");
                alert("Recovery email sent — check your inbox.");
              } catch (e) { setError(e.message); }
            }}
            style={{ background: "none", border: "none", color: theme.accent, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5 }}
          >
            Forgot password?
          </button>
        </div>
      )}

      {mode === "signup" && (
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14, cursor: "pointer", fontSize: 12.5, lineHeight: 1.5 }}>
          <input
            type="checkbox"
            checked={acceptTc}
            onChange={(e) => setAcceptTc(e.target.checked)}
            style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0, accentColor: theme.accent }}
          />
          <span style={{ opacity: 0.85 }}>
            I agree to the{" "}
            <Link to="/terms" target="_blank" style={{ color: theme.accent }}>Terms of Use</Link>,{" "}
            <Link to="/privacy" target="_blank" style={{ color: theme.accent }}>Privacy Policy</Link>
            {role === "artist" && (
              <>, and the <Link to="/tscs" target="_blank" style={{ color: theme.accent }}>Artist Rules</Link></>
            )}
            .
          </span>
        </label>
      )}

      <ErrorNote message={error} />

      <Button onClick={submit} disabled={busy} style={{ width: "100%" }}>
        {busy ? "Please wait..." : mode === "login" ? "Log in" : "Sign up"}
      </Button>

      <div style={{ marginTop: 16, fontSize: 12.5, opacity: 0.7, textAlign: "center" }}>
        {mode === "login" ? (
          <>
            New here?{" "}
            <button onClick={() => { setMode("signup"); setError(""); }} style={{ background: "none", border: "none", color: theme.accent, cursor: "pointer", fontFamily: "inherit" }}>
              Create an account
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button onClick={() => { setMode("login"); setError(""); }} style={{ background: "none", border: "none", color: theme.accent, cursor: "pointer", fontFamily: "inherit" }}>
              Log in
            </button>
          </>
        )}
      </div>
    </div>
  );
}
