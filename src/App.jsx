import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { account, storage, ID, BUCKET_ID, Permission, Role, tablesDB, DATABASE_ID, SONGS_TABLE_ID, Query } from "./lib/appwrite";
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
import { SongPage } from "./pages/SongPage";
import { RadioView } from "./pages/RadioView";
import { AdminReportsView } from "./pages/AdminReportsView";
import { ArtistPage } from "./pages/ArtistPage";
import { AboutPage, TermsPage, PrivacyPage, TsCsPage, DeveloperPage } from "./pages/StaticPages";
import { PlayerDock } from "./components/PlayerDock";
import { NavBar } from "./components/NavBar";
import { EmailVerifyBanner } from "./components/EmailVerifyBanner";
import { CompleteProfileBanner } from "./components/CompleteProfileBanner";
import { SplashScreen } from "./components/SplashScreen";
import { theme } from "./components/ui";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentUser, setCurrentUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [queue, setQueue] = useState([]);
  const [playerIndex, setPlayerIndex] = useState(null);
  const [playerExpanded, setPlayerExpanded] = useState(false);
  const [splashPhase, setSplashPhase] = useState("logo");
  const [splashDone, setSplashDone] = useState(false);
  const [openConversation, setOpenConversation] = useState(null);
  const [themeTick, setThemeTick] = useState(0);

  const playSong = (songs, idx) => {
    setQueue(songs);
    setPlayerIndex(idx);
    setPlayerExpanded(true);
  };

  const startRadio = async () => {
    try {
      const res = await tablesDB.listRows(DATABASE_ID, SONGS_TABLE_ID, [
        Query.equal("status", "approved"),
        Query.limit(200),
      ]);
      const all = (res.rows || []).slice();
      if (all.length === 0) return;
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
      }
      setQueue(all);
      setPlayerIndex(0);
      setPlayerExpanded(true);
    } catch (e) {
      console.warn("radio failed:", e.message);
    }
  };

  useEffect(() => {
    const h = () => setThemeTick((n) => n + 1);
    window.addEventListener("naomi-theme-change", h);
    return () => window.removeEventListener("naomi-theme-change", h);
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setSplashPhase("slogan"), 1200);
    const t2 = setTimeout(() => setSplashDone(true), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const uid = params.get("userId");
    const secret = params.get("secret");
    if (!uid || !secret) return;

    (async () => {
      try {
        await account.updateVerification(uid, secret);
        window.history.replaceState({}, "", window.location.pathname);
        alert("Email verified — you can now upload songs.");
      } catch (errVerify) {
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
          window.history.replaceState({}, "", window.location.pathname);
          alert("Password updated — log in with your new password.");
        } catch (errRecover) {
          window.history.replaceState({}, "", window.location.pathname);
          alert("Link could not be processed: " + errRecover.message);
        }
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const user = await account.get();
        const role = await fetchMyRole();
        const prefs = await account.getPrefs();
        setCurrentUser({
          ...user,
          role,
          avatarFileId: prefs.avatarFileId || null,
          phone: prefs.phone || "",
          location: prefs.location || "",
          studio: prefs.studio || "",
          studioManager: prefs.studioManager || "",
        });
      } catch {
        setCurrentUser(null);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const handleAuth = async ({ mode, name, email, password, phone, location, studio, studioManager, role, avatarFile }) => {
    if (mode === "signup") {
      await account.create(ID.unique(), email, password, name);
      await account.createEmailPasswordSession(email, password);
      try {
        await account.createVerification(`${window.location.origin}/`);
      } catch (err) {
        console.warn("createVerification failed:", err.message);
      }
      if (role === "artist") {
        await setRole("artist");
      }
      let avatarFileId = null;
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
        avatarFileId = uploaded.$id;
      }
      // Save profile fields to prefs
      const prefsUpdate = {};
      if (avatarFileId) prefsUpdate.avatarFileId = avatarFileId;
      if (phone) prefsUpdate.phone = phone;
      if (location) prefsUpdate.location = location;
      if (studio) prefsUpdate.studio = studio;
      if (studioManager) prefsUpdate.studioManager = studioManager;
      if (Object.keys(prefsUpdate).length > 0) {
        await account.updatePrefs(prefsUpdate);
      }
    } else {
      // Clear any stale session before login (Appwrite blocks a new session
      // when one is already active in the same browser)
      try { await account.deleteSession("current"); } catch {}
      await account.createEmailPasswordSession(email, password);
    }
    const user = await account.get();
    const resolvedRole = await fetchMyRole();
    const prefs = await account.getPrefs();
    setCurrentUser({
      ...user,
      role: resolvedRole,
      avatarFileId: prefs.avatarFileId || null,
      phone: prefs.phone || "",
      location: prefs.location || "",
      studio: prefs.studio || "",
      studioManager: prefs.studioManager || "",
    });
  };

  const openChatFromAnywhere = (conversation) => {
    setOpenConversation(conversation);
    navigate("/messages");
  };

  const handleLogout = async () => {
    await account.deleteSession("current");
    setOpenConversation(null);
    setCurrentUser(null);
    navigate("/");
  };

  if (!ready || !splashDone) {
    return <SplashScreen phase={splashPhase} />;
  }

  const isArtist = currentUser?.role === "artist" || currentUser?.role === "poet" || currentUser?.role === "admin";
  const isAdmin = currentUser?.role === "admin";

  const requireAuth = (element) => currentUser ? element : <AuthView onAuth={handleAuth} />;

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text, fontFamily: "system-ui, sans-serif" }}>
      {currentUser && (
        <NavBar isArtist={isArtist} isAdmin={isAdmin} currentUser={currentUser} onLogout={handleLogout} onStartRadio={startRadio} />
      )}
      {currentUser && <EmailVerifyBanner currentUser={currentUser} />}
      {currentUser && <CompleteProfileBanner currentUser={currentUser} />}

      <Routes>
        <Route path="/" element={requireAuth(<BrowseView currentUser={currentUser} onPlaySong={playSong} />)} />
        <Route path="/playlists" element={requireAuth(<PlaylistsView currentUser={currentUser} onPlaySong={playSong} />)} />
        <Route path="/upload" element={requireAuth(isArtist ? <UploadView currentUser={currentUser} onUploaded={() => { setRefreshKey((k) => k + 1); navigate("/mysongs"); }} /> : <Navigate to="/" />)} />
        <Route path="/mysongs" element={requireAuth(isArtist ? <MySongsView currentUser={currentUser} refreshKey={refreshKey} /> : <Navigate to="/" />)} />
        <Route path="/admin" element={requireAuth(isAdmin ? <AdminQueueView /> : <Navigate to="/" />)} />
        <Route path="/admin/reports" element={requireAuth(isAdmin ? <AdminReportsView /> : <Navigate to="/" />)} />
        <Route path="/messages" element={requireAuth(
          openConversation
            ? <ChatView conversation={openConversation} currentUser={currentUser} onBack={() => setOpenConversation(null)} />
            : <MessagesView currentUser={currentUser} onOpenChat={openChatFromAnywhere} />
        )} />
        <Route path="/profile" element={requireAuth(<ProfileView currentUser={currentUser} setCurrentUser={setCurrentUser} onLogout={handleLogout} />)} />
        <Route path="/radio" element={requireAuth(<RadioView />)} />
        <Route path="/song/:id" element={<SongPage currentUser={currentUser} onPlaySong={playSong} onPlay={playSong} />} />
        <Route path="/artist/:id" element={<ArtistPage currentUser={currentUser} onPlaySong={playSong} />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/tscs" element={<TsCsPage />} />
        <Route path="/developer" element={<DeveloperPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      {currentUser && playerIndex != null && (
        <PlayerDock
          queue={queue}
          index={playerIndex}
          setIndex={setPlayerIndex}
          expanded={playerExpanded}
          setExpanded={setPlayerExpanded}
          currentUser={currentUser}
          onClose={() => setPlayerIndex(null)}
          onOpenChat={openChatFromAnywhere}
        />
      )}
    </div>
  );
}
