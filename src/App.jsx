
import React, { useState, useEffect } from "react";
import {
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";

import {
  account,
  storage,
  ID,
  BUCKET_ID,
  Permission,
  Role,
  tablesDB,
  DATABASE_ID,
  SONGS_TABLE_ID,
  Query,
} from "./lib/appwrite";

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
import { AdminNoticeView } from "./pages/AdminNoticeView";
import { TrendingView } from "./pages/TrendingView";
import { ArtistsDirectoryView } from "./pages/ArtistsDirectoryView";
import { AdminAnalyticsView } from "./pages/AdminAnalyticsView";
import { ArtistPage } from "./pages/ArtistPage";

import {
  AboutPage,
  TermsPage,
  PrivacyPage,
  TsCsPage,
  DeveloperPage,
} from "./pages/StaticPages";

import { PlayerDock } from "./components/PlayerDock";
import { NavBar } from "./components/NavBar";
import { EmailVerifyBanner } from "./components/EmailVerifyBanner";
import { CompleteProfileBanner } from "./components/CompleteProfileBanner";
import { NoticeBanner } from "./components/NoticeBanner";
import { SplashScreen } from "./components/SplashScreen";

import { theme, initTheme } from "./components/ui";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentUser, setCurrentUser] = useState(null);
  const [ready, setReady] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);
  const [browseSongs, setBrowseSongs] = useState([]);

  const [queue, setQueue] = useState([]);
  const [playerIndex, setPlayerIndex] = useState(null);
  const [playerExpanded, setPlayerExpanded] = useState(false);

  const [splashPhase, setSplashPhase] = useState("logo");
  const [splashDone, setSplashDone] = useState(false);

  const [openConversation, setOpenConversation] = useState(null);
  const [themeTick, setThemeTick] = useState(0);

  // Initialize saved theme and colour palette.
  useEffect(() => {
    initTheme();
  }, []);

  // Rerender when the theme changes.
  useEffect(() => {
    const handleThemeChange = () => {
      setThemeTick((value) => value + 1);
    };

    window.addEventListener(
      "naomi-theme-change",
      handleThemeChange
    );

    window.addEventListener(
      "naomi-palette-change",
      handleThemeChange
    );

    return () => {
      window.removeEventListener(
        "naomi-theme-change",
        handleThemeChange
      );

      window.removeEventListener(
        "naomi-palette-change",
        handleThemeChange
      );
    };
  }, []);

  // Splash screen animation.
  useEffect(() => {
    const firstTimer = setTimeout(
      () => setSplashPhase("slogan"),
      1200
    );

    const secondTimer = setTimeout(
      () => setSplashDone(true),
      2200
    );

    return () => {
      clearTimeout(firstTimer);
      clearTimeout(secondTimer);
    };
  }, []);

  // Process email verification and password recovery links.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const userId = params.get("userId");
    const secret = params.get("secret");

    if (!userId || !secret) return;

    let cancelled = false;

    async function processAccountLink() {
      try {
        await account.updateVerification(userId, secret);

        if (cancelled) return;

        window.history.replaceState(
          {},
          "",
          window.location.pathname
        );

        alert("Email verified — you can now upload songs.");
      } catch (verificationError) {
        if (cancelled) return;

        const newPassword = window.prompt(
          "Enter your new password (minimum 8 characters):"
        );

        if (!newPassword) {
          window.history.replaceState(
            {},
            "",
            window.location.pathname
          );
          return;
        }

        if (newPassword.length < 8) {
          alert("Password must be at least 8 characters.");

          window.history.replaceState(
            {},
            "",
            window.location.pathname
          );

          return;
        }

        try {
          await account.updateRecovery(
            userId,
            secret,
            newPassword
          );

          if (cancelled) return;

          window.history.replaceState(
            {},
            "",
            window.location.pathname
          );

          alert(
            "Password updated — log in with your new password."
          );
        } catch (recoveryError) {
          if (cancelled) return;

          window.history.replaceState(
            {},
            "",
            window.location.pathname
          );

          alert(
            "Link could not be processed: " +
              recoveryError.message
          );
        }
      }
    }

    processAccountLink();

    return () => {
      cancelled = true;
    };
  }, []);

  // Restore the current session and profile.
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const user = await account.get();
        const role = await fetchMyRole();
        const prefs = await account.getPrefs();

        if (cancelled) return;

        setCurrentUser({
          ...user,
          role,
          avatarFileId: prefs.avatarFileId || null,
          phone: prefs.phone || "",
          location: prefs.location || "",
          studio: prefs.studio || "",
          studioManager: prefs.studioManager || "",
          bio: prefs.bio || "",
          instagram: prefs.instagram || "",
          tiktok: prefs.tiktok || "",
          youtube: prefs.youtube || "",
          twitter: prefs.twitter || "",
          website: prefs.website || "",
        });
      } catch {
        if (!cancelled) {
          setCurrentUser(null);
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load approved music for BrowseView.
  useEffect(() => {
    let cancelled = false;

    async function loadBrowseSongs() {
      try {
        const response = await tablesDB.listRows(
          DATABASE_ID,
          SONGS_TABLE_ID,
          [
            Query.equal("status", "approved"),
            Query.limit(100),
          ]
        );

        if (!cancelled) {
          setBrowseSongs(response.rows || []);
        }
      } catch (error) {
        console.error(
          "Failed to load songs for BrowseView:",
          error
        );

        if (!cancelled) {
          setBrowseSongs([]);
        }
      }
    }

    loadBrowseSongs();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // Start playing a queue of songs.
  const playSong = (songs, index) => {
    if (!Array.isArray(songs) || songs.length === 0) return;

    const safeIndex = Math.max(
      0,
      Math.min(index, songs.length - 1)
    );

    setQueue(songs);
    setPlayerIndex(safeIndex);
    setPlayerExpanded(true);
  };

  // Start a random radio queue.
  const startRadio = async () => {
    try {
      const response = await tablesDB.listRows(
        DATABASE_ID,
        SONGS_TABLE_ID,
        [
          Query.equal("status", "approved"),
          Query.limit(200),
        ]
      );

      const songs = (response.rows || []).slice();

      if (songs.length === 0) return;

      for (let index = songs.length - 1; index > 0; index--) {
        const randomIndex = Math.floor(
          Math.random() * (index + 1)
        );

        [songs[index], songs[randomIndex]] = [
          songs[randomIndex],
          songs[index],
        ];
      }

      playSong(songs, 0);
    } catch (error) {
      console.warn("Radio failed:", error.message);
    }
  };

  // Signup and login.
  const handleAuth = async ({
    mode,
    name,
    email,
    password,
    phone,
    location: profileLocation,
    studio,
    studioManager,
    role,
    avatarFile,
  }) => {
    if (mode === "signup") {
      await account.create(
        ID.unique(),
        email,
        password,
        name
      );

      await account.createEmailPasswordSession(
        email,
        password
      );

      try {
        await account.createVerification(
          `${window.location.origin}/`
        );
      } catch (error) {
        console.warn(
          "Email verification request failed:",
          error.message
        );
      }

      if (role === "artist") {
        await setRole("artist");
      }

      let avatarFileId = null;

      if (avatarFile) {
        const user = await account.get();

        const uploaded = await storage.createFile(
          BUCKET_ID,
          ID.unique(),
          avatarFile,
          [
            Permission.read(Role.users()),
            Permission.update(Role.user(user.$id)),
            Permission.delete(Role.user(user.$id)),
          ]
        );

        avatarFileId = uploaded.$id;
      }

      const preferences = {};

      if (avatarFileId) {
        preferences.avatarFileId = avatarFileId;
      }

      if (phone) preferences.phone = phone;

      if (profileLocation) {
        preferences.location = profileLocation;
      }

      if (studio) preferences.studio = studio;

      if (studioManager) {
        preferences.studioManager = studioManager;
      }

      if (Object.keys(preferences).length > 0) {
        await account.updatePrefs(preferences);
      }
    } else {
      // Clear any stale session before creating a new one.
      try {
        await account.deleteSession("current");
      } catch {
        // No existing session is fine.
      }

      await account.createEmailPasswordSession(
        email,
        password
      );
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
      bio: prefs.bio || "",
      instagram: prefs.instagram || "",
      tiktok: prefs.tiktok || "",
      youtube: prefs.youtube || "",
      twitter: prefs.twitter || "",
      website: prefs.website || "",
    });

    setRefreshKey((value) => value + 1);
  };

  // Open a conversation from another page.
  const openChatFromAnywhere = (conversation) => {
    setOpenConversation(conversation);
    navigate("/messages");
  };

  // Logout.
  const handleLogout = async () => {
    try {
      await account.deleteSession("current");
    } catch (error) {
      console.warn("Logout session cleanup failed:", error);
    }

    setOpenConversation(null);
    setCurrentUser(null);
    setQueue([]);
    setPlayerIndex(null);
    setPlayerExpanded(false);

    navigate("/");
  };

  // Display splash screen while restoring the app.
  if (!ready || !splashDone) {
    return <SplashScreen phase={splashPhase} />;
  }

  const isArtist =
    currentUser?.role === "artist" ||
    currentUser?.role === "poet" ||
    currentUser?.role === "admin";

  const isAdmin = currentUser?.role === "admin";

  const requireAuth = (element) =>
    currentUser ? element : <AuthView onAuth={handleAuth} />;

  // Play a selected BrowseView song using the full loaded queue.
  const handleBrowsePlay = (song) => {
    const songId = song?.$id ?? song?.id;

    const index = browseSongs.findIndex(
      (item) => (item?.$id ?? item?.id) === songId
    );

    if (index !== -1) {
      playSong(browseSongs, index);
    }
  };

  return (
    <div
      key={themeTick}
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
        fontFamily: theme.fontBody,
        transition: "background 180ms ease, color 180ms ease",
      }}
    >
      {currentUser && (
        <NavBar
          isArtist={isArtist}
          isAdmin={isAdmin}
          currentUser={currentUser}
          onLogout={handleLogout}
          onStartRadio={startRadio}
        />
      )}

      {currentUser && (
        <EmailVerifyBanner currentUser={currentUser} />
      )}

      {currentUser && (
        <CompleteProfileBanner currentUser={currentUser} />
      )}

      {currentUser && (
        <NoticeBanner currentUser={currentUser} />
      )}

      <Routes>
        <Route
          path="/"
          element={requireAuth(
            <BrowseView
              currentUser={currentUser}
              songs={browseSongs}
              onPlaySong={handleBrowsePlay}
            />
          )}
        />

        <Route
          path="/playlists"
          element={requireAuth(
            <PlaylistsView
              currentUser={currentUser}
              onPlaySong={playSong}
            />
          )}
        />

        <Route
          path="/upload"
          element={requireAuth(
            isArtist ? (
              <UploadView
                currentUser={currentUser}
                onUploaded={() => {
                  setRefreshKey((value) => value + 1);
                  navigate("/mysongs");
                }}
              />
            ) : (
              <Navigate to="/" />
            )
          )}
        />

        <Route
          path="/mysongs"
          element={requireAuth(
            isArtist ? (
              <MySongsView
                currentUser={currentUser}
                refreshKey={refreshKey}
              />
            ) : (
              <Navigate to="/" />
            )
          )}
        />

        <Route
          path="/admin"
          element={requireAuth(
            isAdmin ? <AdminQueueView /> : <Navigate to="/" />
          )}
        />

        <Route
          path="/admin/reports"
          element={requireAuth(
            isAdmin ? (
              <AdminReportsView />
            ) : (
              <Navigate to="/" />
            )
          )}
        />

        <Route
          path="/admin/notices"
          element={requireAuth(
            isAdmin ? (
              <AdminNoticeView />
            ) : (
              <Navigate to="/" />
            )
          )}
        />

        <Route
          path="/admin/analytics"
          element={requireAuth(
            isAdmin ? (
              <AdminAnalyticsView />
            ) : (
              <Navigate to="/" />
            )
          )}
        />

        <Route
          path="/messages"
          element={requireAuth(
            openConversation ? (
              <ChatView
                conversation={openConversation}
                currentUser={currentUser}
                onBack={() => setOpenConversation(null)}
              />
            ) : (
              <MessagesView
                currentUser={currentUser}
                onOpenChat={openChatFromAnywhere}
              />
            )
          )}
        />

        <Route
          path="/profile"
          element={requireAuth(
            <ProfileView
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              onLogout={handleLogout}
            />
          )}
        />

        <Route
          path="/radio"
          element={requireAuth(<RadioView />)}
        />

        <Route
          path="/trending"
          element={requireAuth(
            <TrendingView onPlaySong={playSong} />
          )}
        />

        <Route
          path="/artists"
          element={requireAuth(<ArtistsDirectoryView />)}
        />

        <Route
          path="/song/:id"
          element={
            <SongPage
              currentUser={currentUser}
              onPlaySong={playSong}
              onPlay={playSong}
            />
          }
        />

        <Route
          path="/artist/:id"
          element={
            <ArtistPage
              currentUser={currentUser}
              onPlaySong={playSong}
              onOpenChat={openChatFromAnywhere}
            />
          }
        />

        <Route path="/about" element={<AboutPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/tscs" element={<TsCsPage />} />
        <Route path="/developer" element={<DeveloperPage />} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      {currentUser && playerIndex !== null && (
        <PlayerDock
          queue={queue}
          index={playerIndex}
          setIndex={setPlayerIndex}
          expanded={playerExpanded}
          setExpanded={setPlayerExpanded}
          currentUser={currentUser}
          onClose={() => {
            setPlayerIndex(null);
            setPlayerExpanded(false);
          }}
          onOpenChat={openChatFromAnywhere}
        />
      )}
    </div>
  );
}
