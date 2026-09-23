import React, { useState, useEffect } from "react";
import { account, storage, ID, BUCKET_ID, Permission, Role } from "./lib/appwrite";
import { fetchMyRole } from "./lib/role";
import { setRole } from "./lib/api";
import { AuthView } from "./pages/AuthView";
import { UploadView } from "./pages/UploadView";
import { MySongsView } from "./pages/MySongsView";
import { AdminQueueView } from "./pages/AdminQueueView";
import { BrowseView } from "./pages/BrowseView";
import { PlaylistsView } from "./pages/PlaylistsView";
import { PlayerDock } from "./components/PlayerDock";
import { NavBar } from "./components/NavBar";
import { SplashScreen } from "./components/SplashScreen";
import { theme } from "./components/ui";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("browse");
  const [refreshKey, setRefreshKey] = useState(0);
  const [queue, setQueue] = useState([]);
  const [playerIndex, setPlayerIndex] = useState(null);
  const [playerExpanded, setPlayerExpanded] = useState(false);
  const [splashPhase, setSplashPhase] = useState("logo");
  const [splashDone, setSplashDone] = useState(false);

  const playSong = (songs, idx) => {
    setQueue(songs);
    setPlayerIndex(idx);
    setPlayerExpanded(true);
  };

  useEffect(() => {
    const t1 = setTimeout(() => setSplashPhase("slogan"), 1200);
    const t2 = setTimeout(() => setSplashDone(true), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const user = await account.get();
        const role = await fetchMyRole();
        const prefs = await account.getPrefs();
        setCurrentUser({ ...user, role, avatarFileId: prefs.avatarFileId || null });
      } catch {
        setCurrentUser(null);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const handleAuth = async ({ mode, name, email, password, role, avatarFile }) => {
    if (mode === "signup") {
      await account.create(ID.unique(), email, password, name);
      await account.createEmailPasswordSession(email, password);

      // Role is assigned server-side via Appwrite Function.
      if (role === "artist") {
        await setRole("artist");
      }

      // Avatar gets file-level permissions so only this user can modify it.
      if (avatarFile) {
        const me = await account.get();
        const uploaded = await storage.createFile(
          BUCKET_ID,
          ID.unique(),
          avatarFile,
          [
            Permission.read(Role.users()),
            Permission.update(Role.user(me.$id)),
            Permission.delete(Role.user(me.$id)),
          ]
        );
        await account.updatePrefs({ avatarFileId: uploaded.$id });
      }
    } else {
      await account.createEmailPasswordSession(email, password);
    }

    const user = await account.get();
    const resolvedRole = await fetchMyRole();
    const prefs = await account.getPrefs();
    setCurrentUser({ ...user, role: resolvedRole, avatarFileId: prefs.avatarFileId || null });
  };

  const handleLogout = async () => {
    await account.deleteSession("current");
    setCurrentUser(null);
    setTab("browse");
  };

  if (!ready || !splashDone) {
    return <SplashScreen phase={splashPhase} />;
  }

  const isArtist = currentUser?.role === "artist" || currentUser?.role === "admin";
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
      ) : tab === "playlists" ? (
        <PlaylistsView currentUser={currentUser} onPlaySong={playSong} />
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
