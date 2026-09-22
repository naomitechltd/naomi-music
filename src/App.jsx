import React, { useState, useEffect } from "react";
import { account, ID } from "./lib/appwrite";
import { AuthView } from "./pages/AuthView";
import { Button, theme } from "./components/ui";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const user = await account.get();
        const prefs = await account.getPrefs();
        setCurrentUser({ ...user, role: prefs.role || "listener" });
      } catch {
        setCurrentUser(null);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const handleAuth = async ({ mode, name, email, password, role }) => {
    if (mode === "signup") {
      await account.create(ID.unique(), email, password, name);
      await account.createEmailPasswordSession(email, password);
      await account.updatePrefs({ role });
    } else {
      await account.createEmailPasswordSession(email, password);
    }
    const user = await account.get();
    const prefs = await account.getPrefs();
    setCurrentUser({ ...user, role: prefs.role || "listener" });
  };

  const handleLogout = async () => {
    await account.deleteSession("current");
    setCurrentUser(null);
  };

  if (!ready) {
    return <div style={{ minHeight: "100vh", background: theme.bg }} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ borderBottom: `1px solid ${theme.border}`, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>Naomi Music</div>
        {currentUser && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
            <span style={{ opacity: 0.7 }}>{currentUser.name} · {currentUser.role}</span>
            <Button variant="outline" onClick={handleLogout}>Log out</Button>
          </div>
        )}
      </div>

      {!currentUser ? (
        <AuthView onAuth={handleAuth} />
      ) : (
        <div style={{ padding: 40 }}>
          <p>Logged in as {currentUser.email} ({currentUser.role})</p>
          <p style={{ opacity: 0.6, fontSize: 13 }}>Browse, upload, and player pages come next.</p>
        </div>
      )}
    </div>
  );
}
