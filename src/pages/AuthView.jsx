import React, { useState } from "react";
import { Button, Field, ErrorNote, inputStyle } from "../components/ui";

export function AuthView({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("listener");
  const [avatarFile, setAvatarFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    if (!email || !password) { setError("Enter your email and password."); return; }
    if (mode === "signup" && !name) { setError("Enter your name."); return; }
    if (mode === "signup" && !avatarFile) { setError("Please choose a profile picture."); return; }
    setBusy(true);
    try {
      await onAuth({ mode, name, email, password, role, avatarFile });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 380, margin: "0 auto", padding: "60px 20px" }}>
      <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
        {mode === "login" ? "Log in" : "Create an account"}
      </div>
      <div style={{ opacity: 0.6, fontSize: 13, marginBottom: 24 }}>
        {mode === "login" ? "Welcome back." : "Join as a listener or an artist."}
      </div>

      {mode === "signup" && (
        <>
          <Field label="Name">
            <input style={inputStyle()} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Profile picture">
            <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
          </Field>
          <Field label="I am a...">
            <div style={{ display: "flex", gap: 8 }}>
              {["listener", "artist"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    borderRadius: 4,
                    border: `1px solid ${role === r ? "#7c5cff" : "#26262a"}`,
                    background: role === r ? "#7c5cff" : "transparent",
                    color: role === r ? "#fff" : "#f2f2f2",
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
        </>
      )}

      <Field label="Email">
        <input type="email" style={inputStyle()} value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Password">
        <input type="password" style={inputStyle()} value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>

      <ErrorNote message={error} />

      <Button onClick={submit} disabled={busy} style={{ width: "100%" }}>
        {busy ? "Please wait..." : mode === "login" ? "Log in" : "Sign up"}
      </Button>

      <div style={{ marginTop: 16, fontSize: 12.5, opacity: 0.7 }}>
        {mode === "login" ? (
          <>New here?{" "}
            <button onClick={() => setMode("signup")} style={{ background: "none", border: "none", color: "#7c5cff", cursor: "pointer", fontFamily: "inherit" }}>
              Create an account
            </button>
          </>
        ) : (
          <>Already have an account?{" "}
            <button onClick={() => setMode("login")} style={{ background: "none", border: "none", color: "#7c5cff", cursor: "pointer", fontFamily: "inherit" }}>
              Log in
            </button>
          </>
        )}
      </div>
    </div>
  );
}
