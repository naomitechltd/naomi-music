import React, { useState, useEffect } from "react";
import { account, ID } from "./lib/appwrite";
import { AuthView } from "./pages/AuthView";
import { UploadView } from "./pages/UploadView";
import { MySongsView } from "./pages/MySongsView";
import { AdminQueueView } from "./pages/AdminQueueView";
import { BrowseView } from "./pages/BrowseView";
import { Button, theme } from "./components/ui";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("browse");
  const [refreshKey, setRefreshKey] = useState(0);

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
    setTab("browse");
  };

  if (!ready) {
    return <div style={{ minHeight: "100vh", background: theme.bg }} />;
  }

  const isArtist = currentUser?.role === "artist";
  const isAdmin = currentUser?.role === "admin";
  const tabStyle = (t) => ({
    background: "none",
    border: "none",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 13,
    color: tab === t ? theme.accent : theme.text,
    borderBottom: tab === t ? `2px solid ${theme.accent}` : "2px solid transparent",
    padding: "6px 2px",
  });

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ borderBottom: `1px solid ${theme.border}`, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>Naomi Music</div>

        {currentUser && (
          <div style={{ display: "flex", gap: 18 }}>
            <button style={tabStyle("browse")} onClick={() => setTab("browse")}>Browse</button>
            {isArtist && <button style={tabStyle("upload")} onClick={() => setTab("upload")}>Upload</button>}
            {isArtist && <button style={tabStyle("mysongs")} onClick={() => setTab("mysongs")}>My Songs</button>}
            {isAdmin && <button style={tabStyle("admin")} onClick={() => setTab("admin")}>Admin</button>}
          </div>
        )}

        {currentUser && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
            <span style={{ opacity: 0.7 }}>{currentUser.name} · {currentUser.role}</span>
            <Button variant="outline" onClick={handleLogout}>Log out</Button>
          </div>
        )}
      </div>

      {!currentUser ? (
        <AuthView onAuth={handleAuth} />
      ) : tab === "upload" && isArtist ? (
        <UploadView currentUser={currentUser} onUploaded={() => { setRefreshKey((k) => k + 1); setTab("mysongs"); }} />
      ) : tab === "mysongs" && isArtist ? (
        <MySongsView currentUser={currentUser} refreshKey={refreshKey} />
      ) : tab === "admin" && isAdmin ? (
        <AdminQueueView />
      ) : (
        <BrowseView currentUser={currentUser} />
      )}
    </div>
  );
}
