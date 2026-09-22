import React, { useState, useEffect } from "react";
import { account, ID } from "./lib/appwrite";
import { AuthView } from "./pages/AuthView";
import { UploadView } from "./pages/UploadView";
import { MySongsView } from "./pages/MySongsView";
import { AdminQueueView } from "./pages/AdminQueueView";
import { BrowseView } from "./pages/BrowseView";
import { PlayerDock } from "./components/PlayerDock";
import { NavBar } from "./components/NavBar";
import { theme } from "./components/ui";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("browse");
  const [refreshKey, setRefreshKey] = useState(0);
  const [queue, setQueue] = useState([]);
  const [playerIndex, setPlayerIndex] = useState(null);
  const [playerExpanded, setPlayerExpanded] = useState(false);

  const playSong = (songs, idx) => {
    setQueue(songs);
    setPlayerIndex(idx);
    setPlayerExpanded(true);
  };

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

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text, fontFamily: "system-ui, sans-serif" }}>
      {currentUser && (
        <NavBar tab={tab} setTab={setTab} isArtist={isArtist} isAdmin={isAdmin} currentUser={currentUser} onLogout={handleLogout} />
      )}

      {!currentUser ? (
        <AuthView onAuth={handleAuth} />
      ) : tab === "upload" && isArtist ? (
        <UploadView currentUser={currentUser} onUploaded={() => { setRefreshKey((k) => k + 1); setTab("mysongs"); }} />
      ) : tab === "mysongs" && isArtist ? (
        <MySongsView currentUser={currentUser} refreshKey={refreshKey} />
      ) : tab === "admin" && isAdmin ? (
        <AdminQueueView />
      ) : (
        <BrowseView currentUser={currentUser} onPlaySong={playSong} />
      )}

      {currentUser && playerIndex != null && (
        <PlayerDock
          queue={queue}
          index={playerIndex}
          setIndex={setPlayerIndex}
          expanded={playerExpanded}
          setExpanded={setPlayerExpanded}
          currentUser={currentUser}
          onClose={() => setPlayerIndex(null)}
        />
      )}
    </div>
  );
}
