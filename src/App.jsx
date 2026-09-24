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
import { ProfileView } from "./pages/ProfileView";
import { MessagesView } from "./pages/MessagesView";
import { ChatView } from "./pages/ChatView";
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
  const [openConversation, setOpenConversation] = useState(null);

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

  // Handle Appwrite email callbacks: verification AND password recovery
  // Both come as ?userId=...&secret=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const uid = params.get("userId");
    const secret = params.get("secret");
    if (!uid || !secret) return;

    // Heuristic: verification links usually carry an extra marker; if not,
    // try verification first; on failure, fall through to recovery.
    let handled = false;
    (async () => {
      try {
        await account.updateVerification(uid, secret);
        handled = true;
        window.history.replaceState({}, "", window.location.pathname);
        alert("Email verified — you can now upload songs.");
      } catch (errVerify) {
        // Not a verification secret — try recovery
        const p1 = window.prompt("Enter your new password (min 8 characters):");
        if (!p1) {
          window.history.replaceState({}, "", window.location.pathname);
          return;
        }
        if (p1.length < 8) {
          alert("Password must be at least 8 characters.");
          window.history.replaceState({}, "", window.location.pathname);
          return;
        }
        try {
          await account.updateRecovery(uid, secret, p1);
          handled = true;
          window.history.replaceState({}, "", window.location.pathname);
          alert("Password updated — log in with your new password.");
        } catch (errRecover) {
          window.history.replaceState({}, "", window.location.pathname);
          alert("Link could not be processed: " + errRecover.message);
        }
      }
      return handled;
    })();
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

      // Fire verification email — but don't block signup if it fails
      try {
        await account.createVerification(`${window.location.origin}/`);
      } catch (err) {
        console.warn("createVerification failed:", err.message);
      }

      // Role assigned server-side
      if (role === "artist") {
        await setRole("artist");
      }

      // Avatar with per-file permissions
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
    setOpenConversation(null);
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
      ) : tab === "messages" && openConversation ? (
        <ChatView
          conversation={openConversation}
          currentUser={currentUser}
          onBack={() => setOpenConversation(null)}
        />
      ) : tab === "messages" ? (
        <MessagesView currentUser={currentUser} onOpenChat={setOpenConversation} />
      ) : tab === "profile" ? (
        <ProfileView currentUser={currentUser} setCurrentUser={setCurrentUser} onLogout={handleLogout} />
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
