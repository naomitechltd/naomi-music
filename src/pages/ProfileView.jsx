
import React, { useEffect, useRef, useState } from "react";
import {
  Mail,
  Heart,
  ListMusic,
  Music,
  Camera,
  LogOut,
  Check,
  X,
  Palette,
  Bell,
  LockKeyhole,
  MapPin,
  Phone,
  Globe,
  Instagram,
  Save,
  UserRound,
} from "lucide-react";

import {
  account,
  storage,
  tablesDB,
  DATABASE_ID,
  SONGS_TABLE_ID,
  LIKES_TABLE_ID,
  PLAYLISTS_TABLE_ID,
  Query,
  ID,
  BUCKET_ID,
  Permission,
  Role,
  fileUrl,
} from "../lib/appwrite";
import ProfileExtras from "../components/ProfileExtras";

import {
  theme,
  inputStyle,
  Button,
  Field,
  ErrorNote,
  getThemeMode,
  setThemeMode,
} from "../components/ui";

import {
  enablePush,
  disablePush,
  isPushEnabled,
  isPushSupported,
} from "../lib/push";

// ============================================================
// NAOMI MUSIC - PROFILE VIEW
// ============================================================

export function ProfileView({
  currentUser,
  setCurrentUser,
  onLogout,
}) {
  const [stats, setStats] = useState({
    likes: 0,
    playlists: 0,
    uploads: 0,
    pending: 0,
    approved: 0,
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [contactBusy, setContactBusy] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(
    currentUser.name || ""
  );

  const [editingPass, setEditingPass] = useState(false);
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");

  const [phone, setPhone] = useState(currentUser.phone || "");
  const [location, setLocation] = useState(
    currentUser.location || ""
  );
  const [studio, setStudio] = useState(
    currentUser.studio || ""
  );
  const [studioManager, setStudioManager] = useState(
    currentUser.studioManager || ""
  );
  const [bio, setBio] = useState(currentUser.bio || "");
  const [instagram, setInstagram] = useState(
    currentUser.instagram || ""
  );
  const [tiktok, setTiktok] = useState(
    currentUser.tiktok || ""
  );
  const [youtube, setYoutube] = useState(
    currentUser.youtube || ""
  );
  const [twitter, setTwitter] = useState(
    currentUser.twitter || ""
  );
  const [website, setWebsite] = useState(
    currentUser.website || ""
  );

  const fileRef = useRef(null);
  const successTimer = useRef(null);

  const isAdmin = currentUser.role === "admin";
  const isArtist =
    currentUser.role === "artist" || isAdmin;

  // ----------------------------------------------------------
  // Synchronize profile fields if the active user changes.
  // ----------------------------------------------------------

  useEffect(() => {
    setNameDraft(currentUser.name || "");
    setPhone(currentUser.phone || "");
    setLocation(currentUser.location || "");
    setStudio(currentUser.studio || "");
    setStudioManager(currentUser.studioManager || "");
    setBio(currentUser.bio || "");
    setInstagram(currentUser.instagram || "");
    setTiktok(currentUser.tiktok || "");
    setYoutube(currentUser.youtube || "");
    setTwitter(currentUser.twitter || "");
    setWebsite(currentUser.website || "");
  }, [currentUser.$id]);

  useEffect(() => {
    return () => {
      if (successTimer.current) {
        clearTimeout(successTimer.current);
      }
    };
  }, []);

  // ----------------------------------------------------------
  // Success messages.
  // ----------------------------------------------------------

  const flash = (message) => {
    setSuccess(message);

    if (successTimer.current) {
      clearTimeout(successTimer.current);
    }

    successTimer.current = setTimeout(() => {
      setSuccess("");
    }, 3000);
  };

  // ----------------------------------------------------------
  // Statistics.
  // ----------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      try {
        const [likesRes, playlistsRes] = await Promise.all([
          tablesDB.listRows(
            DATABASE_ID,
            LIKES_TABLE_ID,
            [
              Query.equal(
                "userEmail",
                currentUser.email
              ),
            ]
          ),

          tablesDB.listRows(
            DATABASE_ID,
            PLAYLISTS_TABLE_ID,
            [
              Query.equal(
                "userEmail",
                currentUser.email
              ),
            ]
          ),
        ]);

        let uploads = 0;
        let pending = 0;
        let approved = 0;

        if (isArtist) {
          const songsRes = await tablesDB.listRows(
            DATABASE_ID,
            SONGS_TABLE_ID,
            [
              Query.equal(
                "uploadedByEmail",
                currentUser.email
              ),
            ]
          );

          uploads = songsRes.total;

          for (const song of songsRes.rows) {
            if (song.status === "pending") {
              pending++;
            }

            if (song.status === "approved") {
              approved++;
            }
          }
        }

        if (!cancelled) {
          setStats({
            likes: likesRes.total,
            playlists: playlistsRes.total,
            uploads,
            pending,
            approved,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.message || "Unable to load profile statistics."
          );
        }
      }
    }

    if (currentUser.email) {
      loadStats();
    }

    return () => {
      cancelled = true;
    };
  }, [currentUser.email, isArtist]);

  // ----------------------------------------------------------
  // Save account preferences without intentionally discarding
  // other existing Appwrite preferences.
  // ----------------------------------------------------------

  const savePreferences = async (updates) => {
    const existing = await account.getPrefs();

    const merged = {
      ...existing,
      ...updates,
    };

    await account.updatePrefs(merged);

    setCurrentUser((user) => ({
      ...user,
      ...updates,
    }));
  };

  // ----------------------------------------------------------
  // Save contact and studio information.
  // ----------------------------------------------------------

  const saveContact = async () => {
    setContactBusy(true);
    setError("");
    setSuccess("");

    try {
      const updates = {
        phone: phone.trim(),
        location: location.trim(),
        bio: bio.trim(),
        instagram: instagram.trim(),
        tiktok: tiktok.trim(),
        youtube: youtube.trim(),
        twitter: twitter.trim(),
        website: website.trim(),
      };

      if (isArtist) {
        updates.studio = studio.trim();
        updates.studioManager = studioManager.trim();
      }

      await savePreferences(updates);

      flash("Profile updated successfully.");
    } catch (err) {
      setError(
        err?.message || "Could not save your profile."
      );
    } finally {
      setContactBusy(false);
    }
  };

  // ----------------------------------------------------------
  // Change display name.
  // ----------------------------------------------------------

  const saveName = async () => {
    const trimmed = nameDraft.trim();

    if (!trimmed) {
      setError("Your name cannot be empty.");
      return;
    }

    if (trimmed === currentUser.name) {
      setEditingName(false);
      return;
    }

    setBusy(true);
    setError("");

    try {
      await account.updateName(trimmed);

      setCurrentUser((user) => ({
        ...user,
        name: trimmed,
      }));

      setEditingName(false);
      flash("Name updated successfully.");
    } catch (err) {
      setError(
        err?.message || "Could not update your name."
      );
    } finally {
      setBusy(false);
    }
  };

  // ----------------------------------------------------------
  // Change password.
  // ----------------------------------------------------------

  const savePassword = async () => {
    setError("");
    setSuccess("");

    if (!oldPass || !newPass) {
      setError("Enter your current and new password.");
      return;
    }

    if (newPass.length < 8) {
      setError(
        "Your new password must contain at least 8 characters."
      );
      return;
    }

    if (oldPass === newPass) {
      setError(
        "Your new password must be different from the current password."
      );
      return;
    }

    setBusy(true);

    try {
      await account.updatePassword(newPass, oldPass);

      setEditingPass(false);
      setOldPass("");
      setNewPass("");

      flash("Password updated successfully.");
    } catch (err) {
      setError(
        err?.message || "Could not update your password."
      );
    } finally {
      setBusy(false);
    }
  };

  // ----------------------------------------------------------
  // Upload profile avatar.
  // ----------------------------------------------------------

  const changeAvatar = async (file) => {
    if (!file) return;

    setError("");
    setSuccess("");

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    // Limit avatar uploads to 5 MB.
    if (file.size > 5 * 1024 * 1024) {
      setError("Your profile image must be 5 MB or smaller.");
      return;
    }

    setBusy(true);

    let uploadedFileId = null;

    try {
      const permissions = [
        Permission.read(Role.users()),
        Permission.update(Role.user(currentUser.$id)),
        Permission.delete(Role.user(currentUser.$id)),
      ];

      const uploaded = await storage.createFile(
        BUCKET_ID,
        ID.unique(),
        file,
        permissions
      );

      uploadedFileId = uploaded.$id;

      await savePreferences({
        avatarFileId: uploaded.$id,
      });

      flash("Profile picture updated.");
    } catch (err) {
      // If saving the preference fails, try to remove the
      // newly uploaded file to avoid leaving an orphan behind.
      if (uploadedFileId) {
        try {
          await storage.deleteFile(
            BUCKET_ID,
            uploadedFileId
          );
        } catch {
          // Preserve the original error.
        }
      }

      setError(
        err?.message || "Could not update your profile picture."
      );
    } finally {
      setBusy(false);

      if (fileRef.current) {
        fileRef.current.value = "";
      }
    }
  };

  // ----------------------------------------------------------
  // Role labels and account creation date.
  // ----------------------------------------------------------

  const roleColor = isAdmin
    ? "#7c5cff"
    : currentUser.role === "artist"
      ? "#4be88a"
      : "#8888ff";

  const roleLabel = isAdmin
    ? "Admin"
    : currentUser.role === "artist"
      ? "Artist"
      : "Listener";

  const joined = currentUser.$createdAt
    ? new Date(
        currentUser.$createdAt
      ).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
      })
    : "";

  // ----------------------------------------------------------
  // Render profile.
  // ----------------------------------------------------------

  return (
    <div className="naomi-profile">
      <style>{`
        .naomi-profile {
          width: 100%;
          max-width: 720px;
          margin: 0 auto;
          padding: 32px 18px 100px;
          color: var(--text);
        }

        .naomi-profile *,
        .naomi-profile *::before,
        .naomi-profile *::after {
          box-sizing: border-box;
        }

        .naomi-profile .profile-panel {
          background: var(--bg-raised);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 20px;
          margin-top: 22px;
        }

        .naomi-profile .profile-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 22px;
          margin-top: 0;
        }

        .naomi-profile .avatar-button {
          position: relative;
          flex: 0 0 76px;
          width: 76px;
          height: 76px;
          padding: 0;
          border: 0;
          border-radius: 50%;
          background: transparent;
          color: var(--text);
        }

        .naomi-profile .avatar-image {
          width: 76px;
          height: 76px;
          display: block;
          object-fit: cover;
          border-radius: 50%;
          border: 2px solid var(--border-strong);
        }

        .naomi-profile .avatar-placeholder {
          width: 76px;
          height: 76px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          border: 2px solid var(--border);
          background: var(--bg-alt);
          color: var(--accent);
          font-size: 27px;
          font-weight: 800;
        }

        .naomi-profile .avatar-camera {
          position: absolute;
          right: -2px;
          bottom: -2px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 27px;
          height: 27px;
          border-radius: 50%;
          background: var(--accent-grad);
          color: var(--accent-fg);
          border: 2px solid var(--bg-raised);
        }

        .naomi-profile .profile-heading {
          min-width: 0;
          flex: 1;
        }

        .naomi-profile .profile-name-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }

        .naomi-profile .profile-name {
          font-size: 21px;
          font-weight: 750;
          overflow-wrap: anywhere;
        }

        .naomi-profile .profile-email {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 7px;
          color: var(--text-muted);
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        .naomi-profile .edit-link {
          border: 0;
          background: transparent;
          color: var(--accent);
          font-size: 12px;
          text-decoration: underline;
          padding: 4px;
        }

        .naomi-profile .role-badge {
          display: inline-flex;
          padding: 4px 9px;
          border-radius: 20px;
          color: #fff;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .07em;
          text-transform: uppercase;
        }

        .naomi-profile .profile-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }

        .naomi-profile .joined-text {
          font-size: 11px;
          color: var(--text-dim);
        }

        .naomi-profile .name-editor {
          display: flex;
          gap: 6px;
          align-items: center;
          width: 100%;
        }

        .naomi-profile .name-editor input {
          min-width: 0;
          width: 100%;
        }

        .naomi-profile .icon-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          min-width: 35px;
          min-height: 35px;
          padding: 8px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--bg);
          color: var(--text);
        }

        .naomi-profile .icon-button.confirm {
          background: var(--accent-grad);
          color: var(--accent-fg);
          border-color: transparent;
        }

        .naomi-profile .profile-stats {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 18px;
        }

        .naomi-profile .stat-card {
          min-width: 0;
          padding: 15px;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 12px;
        }

        .naomi-profile .stat-label {
          display: flex;
          align-items: center;
          gap: 7px;
          color: var(--text-muted);
          font-size: 10px;
          font-weight: 750;
          letter-spacing: .05em;
          text-transform: uppercase;
        }

        .naomi-profile .stat-value {
          margin-top: 8px;
          font-size: 25px;
          font-weight: 800;
          overflow-wrap: anywhere;
        }

        .naomi-profile .panel-title {
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 15px;
          font-weight: 750;
        }

        .naomi-profile .panel-description {
          margin-top: 5px;
          margin-bottom: 18px;
          color: var(--text-muted);
          font-size: 12px;
          line-height: 1.6;
        }

        .naomi-profile .profile-field {
          margin-bottom: 14px;
        }

        .naomi-profile .profile-field label {
          display: block;
          margin-bottom: 7px;
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 650;
        }

        .naomi-profile .profile-field input,
        .naomi-profile .profile-field textarea {
          width: 100%;
          min-width: 0;
          background: var(--bg);
          color: var(--text);
          border: 1px solid var(--border);
          border-radius: 9px;
          padding: 12px;
          font: inherit;
          font-size: 13px;
        }

        .naomi-profile .profile-field textarea {
          resize: vertical;
          min-height: 90px;
        }

        .naomi-profile .profile-field input:focus,
        .naomi-profile .profile-field textarea:focus {
          outline: 2px solid var(--accent);
          outline-offset: 1px;
        }

        .naomi-profile .profile-field input::placeholder,
        .naomi-profile .profile-field textarea::placeholder {
          color: var(--text-dim);
        }

        .naomi-profile .profile-save {
          width: 100%;
          min-height: 44px;
          margin-top: 4px;
        }

        .naomi-profile .message-success {
          margin-top: 12px;
          padding: 10px 12px;
          border-radius: 9px;
          border: 1px solid rgba(57,217,138,.2);
          background: rgba(57,217,138,.08);
          color: var(--success);
          font-size: 12px;
        }

        .naomi-profile .message-error {
          margin-top: 12px;
        }

        .naomi-profile .mode-options {
          display: flex;
          gap: 6px;
          padding: 4px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--bg);
        }

        .naomi-profile .mode-button {
          flex: 1;
          min-width: 0;
          padding: 11px 6px;
          border: 0;
          border-radius: 7px;
          background: transparent;
          color: var(--text);
          font-size: 12px;
          font-weight: 600;
        }

        .naomi-profile .mode-button.active {
          background: var(--accent-grad);
          color: var(--accent-fg);
          font-weight: 800;
        }

        .naomi-profile .palette-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 9px;
        }

        .naomi-profile .palette-button {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
          padding: 11px 9px;
          border: 1px solid var(--border);
          border-radius: 9px;
          background: var(--bg);
          color: var(--text);
          font-size: 12px;
          text-align: left;
        }

        .naomi-profile .palette-button.active {
          border-color: var(--accent);
          background: var(--accent-soft);
        }

        .naomi-profile .palette-dot {
          width: 19px;
          height: 19px;
          flex-shrink: 0;
          border-radius: 50%;
        }

        .naomi-profile .palette-check {
          margin-left: auto;
          color: var(--accent);
          flex-shrink: 0;
        }

        .naomi-profile .push-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .naomi-profile .push-message {
          color: var(--text-muted);
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        .naomi-profile .password-actions {
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
        }

        .naomi-profile .password-actions > * {
          flex: 1;
        }

        .naomi-profile .logout-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          width: 100%;
          min-height: 46px;
          margin-top: 24px;
          padding: 12px;
          border: 1px solid var(--danger);
          border-radius: 10px;
          background: transparent;
          color: var(--danger);
          font-size: 13px;
          font-weight: 750;
        }

        .naomi-profile .logout-button:hover {
          background: rgba(255,100,124,.08);
        }

        .naomi-profile button:disabled {
          cursor: not-allowed;
          opacity: .55;
        }

        @media (min-width: 480px) {
          .naomi-profile .profile-stats {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .naomi-profile .palette-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 380px) {
          .naomi-profile {
            padding: 20px 12px 80px;
          }

          .naomi-profile .profile-header {
            padding: 15px;
            gap: 12px;
          }

          .naomi-profile .avatar-button,
          .naomi-profile .avatar-image,
          .naomi-profile .avatar-placeholder {
            width: 60px;
            height: 60px;
          }

          .naomi-profile .avatar-button {
            flex-basis: 60px;
          }

          .naomi-profile .profile-name {
            font-size: 17px;
          }

          .naomi-profile .profile-panel {
            padding: 15px;
          }
        }
      `}</style>

      {/* PROFILE HEADER */}

      <section className="profile-panel profile-header">
        <button
          type="button"
          className="avatar-button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          title="Change profile picture"
          aria-label="Change profile picture"
        >
          {currentUser.avatarFileId ? (
            <img
              className="avatar-image"
              src={fileUrl(currentUser.avatarFileId)}
              alt={`${currentUser.name || "User"} profile`}
            />
          ) : (
            <div className="avatar-placeholder">
              {currentUser.name?.[0]?.toUpperCase() || "?"}
            </div>
          )}

          <span className="avatar-camera">
            <Camera size={13} />
          </span>
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) =>
            changeAvatar(event.target.files?.[0])
          }
        />

        <div className="profile-heading">
          {editingName ? (
            <div className="name-editor">
              <input
                autoFocus
                aria-label="Display name"
                style={{
                  ...inputStyle(),
                  fontSize: 14,
                  fontWeight: 700,
                }}
                value={nameDraft}
                onChange={(event) =>
                  setNameDraft(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    saveName();
                  }

                  if (event.key === "Escape") {
                    setNameDraft(currentUser.name || "");
                    setEditingName(false);
                  }
                }}
              />

              <button
                type="button"
                className="icon-button confirm"
                onClick={saveName}
                disabled={busy}
                aria-label="Save name"
              >
                <Check size={15} />
              </button>

              <button
                type="button"
                className="icon-button"
                onClick={() => {
                  setNameDraft(currentUser.name || "");
                  setEditingName(false);
                }}
                aria-label="Cancel editing name"
              >
                <X size={15} />
              </button>
            </div>
          ) : (
            <div className="profile-name-row">
              <div className="profile-name">
                {currentUser.name || "Naomi Music User"}
              </div>

              <button
                type="button"
                className="edit-link"
                onClick={() => setEditingName(true)}
              >
                Edit
              </button>
            </div>
          )}

          <div className="profile-email">
            <Mail size={13} />
            <span>{currentUser.email}</span>
          </div>

          <div className="profile-meta">
            <span
              className="role-badge"
              style={{ background: roleColor }}
            >
              {roleLabel}
            </span>

            {joined && (
              <span className="joined-text">
                Joined {joined}
              </span>
            )}
          </div>
        </div>
      </section>

      <ProfileExtras currentUser={currentUser} />

      {/* STATUS MESSAGES */}

      {error && (
        <div className="message-error">
          <ErrorNote message={error} />
        </div>
      )}

      {success && (
        <div className="message-success" role="status">
          {success}
        </div>
      )}

      {/* STATISTICS */}

      <section className="profile-stats">
        {isArtist && (
          <>
            <StatCard
              icon={Music}
              label="Uploads"
              value={stats.uploads}
            />

            <StatCard
              icon={Check}
              label="Approved"
              value={stats.approved}
              accent="var(--success)"
            />

            <StatCard
              icon={X}
              label="Pending"
              value={stats.pending}
              accent="var(--warning)"
            />
          </>
        )}

        <StatCard
          icon={Heart}
          label="Liked"
          value={stats.likes}
          accent="#ff6b6b"
        />

        <StatCard
          icon={ListMusic}
          label="Playlists"
          value={stats.playlists}
        />
      </section>

      {/* CONTACT AND STUDIO */}

      <section className="profile-panel">
        <div className="panel-title">
          <UserRound size={18} />
          Contact & Studio
        </div>

        <p className="panel-description">
          Manage your public profile information and social links.
        </p>

        <Field label="Cellphone">
          <input
            type="tel"
            autoComplete="tel"
            style={inputStyle()}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="0821234567"
          />
        </Field>

        <Field label="Location">
          <input
            type="text"
            autoComplete="address-level2"
            style={inputStyle()}
            value={location}
            onChange={(event) =>
              setLocation(event.target.value)
            }
            placeholder="Johannesburg, GP"
          />
        </Field>

        {isArtist && (
          <>
            <Field label="Studio name">
              <input
                type="text"
                style={inputStyle()}
                value={studio}
                onChange={(event) =>
                  setStudio(event.target.value)
                }
                placeholder="Moonlight Studios"
              />
            </Field>

            <Field label="Studio manager">
              <input
                type="text"
                style={inputStyle()}
                value={studioManager}
                onChange={(event) =>
                  setStudioManager(event.target.value)
                }
                placeholder="Studio manager name (optional)"
              />
            </Field>
          </>
        )}

        <Field label={`Bio (${bio.length}/300)`}>
          <textarea
            rows={4}
            maxLength={300}
            style={{
              ...inputStyle(),
              resize: "vertical",
            }}
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            placeholder="Tell listeners about yourself..."
          />
        </Field>

        <Field label="Instagram">
          <input
            type="text"
            style={inputStyle()}
            value={instagram}
            onChange={(event) =>
              setInstagram(event.target.value)
            }
            placeholder="@yourusername or profile URL"
          />
        </Field>

        <Field label="TikTok">
          <input
            type="text"
            style={inputStyle()}
            value={tiktok}
            onChange={(event) =>
              setTiktok(event.target.value)
            }
            placeholder="@yourusername or profile URL"
          />
        </Field>

        <Field label="YouTube">
          <input
            type="text"
            style={inputStyle()}
            value={youtube}
            onChange={(event) =>
              setYoutube(event.target.value)
            }
            placeholder="YouTube channel URL"
          />
        </Field>

        <Field label="Twitter / X">
          <input
            type="text"
            style={inputStyle()}
            value={twitter}
            onChange={(event) =>
              setTwitter(event.target.value)
            }
            placeholder="@yourusername or profile URL"
          />
        </Field>

        <Field label="Website">
          <input
            type="url"
            style={inputStyle()}
            value={website}
            onChange={(event) =>
              setWebsite(event.target.value)
            }
            placeholder="https://example.com"
          />
        </Field>

        <div style={{ marginTop: 8 }}>
          <Button
            onClick={saveContact}
            disabled={contactBusy}
            className="profile-save"
          >
            {contactBusy ? (
              "Saving..."
            ) : (
              <>
                <Save
                  size={15}
                  style={{
                    marginRight: 7,
                    verticalAlign: "middle",
                  }}
                />
                Save profile
              </>
            )}
          </Button>
        </div>
      </section>

      {/* NOTIFICATIONS */}

      <section className="profile-panel">
        <div className="panel-title">
          <Bell size={18} />
          Notifications
        </div>

        <p className="panel-description">
          Enable browser push notifications to receive alerts
          when someone messages you.
        </p>

        <PushToggle />
      </section>

      {/* APPEARANCE */}

      <section className="profile-panel">
        <div className="panel-title">
          <Palette size={18} />
          Appearance
        </div>

        <p className="panel-description">
          Personalize Naomi Music with your preferred display
          mode and accent colors.
        </p>

        <ThemeToggle />
      </section>

      {/* PASSWORD */}

      <section className="profile-panel">
        <div className="panel-title">
          <LockKeyhole size={18} />
          Password
        </div>

        <p className="panel-description">
          Change your account password to help protect your
          account.
        </p>

        {!editingPass ? (
          <Button
            variant="outline"
            onClick={() => {
              setEditingPass(true);
              setError("");
              setSuccess("");
            }}
          >
            Change password
          </Button>
        ) : (
          <>
            <Field label="Current password">
              <input
                type="password"
                autoComplete="current-password"
                style={inputStyle()}
                value={oldPass}
                onChange={(event) =>
                  setOldPass(event.target.value)
                }
              />
            </Field>

            <Field label="New password (minimum 8 characters)">
              <input
                type="password"
                autoComplete="new-password"
                style={inputStyle()}
                value={newPass}
                onChange={(event) =>
                  setNewPass(event.target.value)
                }
              />
            </Field>

            <div className="password-actions">
              <Button
                onClick={savePassword}
                disabled={busy}
              >
                {busy ? "Saving..." : "Save password"}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setEditingPass(false);
                  setOldPass("");
                  setNewPass("");
                  setError("");
                  setSuccess("");
                }}
                disabled={busy}
              >
                Cancel
              </Button>
            </div>
          </>
        )}
      </section>

      {/* LOGOUT */}

      <button
        type="button"
        className="logout-button"
        onClick={onLogout}
      >
        <LogOut size={17} />
        Log out
      </button>
    </div>
  );
}

// ============================================================
// STATISTICS CARD
// ============================================================

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}) {
  return (
    <div className="stat-card">
      <div className="stat-label">
        <Icon
          size={14}
          style={{
            color: accent || "var(--text)",
            flexShrink: 0,
          }}
        />
        <span>{label}</span>
      </div>

      <div
        className="stat-value"
        style={{
          color: accent || "var(--text)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ============================================================
// THEME MODE AND ACCENT PALETTE SELECTOR
// ============================================================

function ThemeToggle() {
  const [mode, setMode] = useState(() => getThemeMode());

  const [palette, setPalette] = useState(() => {
    try {
      return (
        localStorage.getItem("naomi-music-palette") ||
        document.documentElement.dataset.palette ||
        "purple"
      );
    } catch {
      return "purple";
    }
  });

  const palettes = [
    {
      key: "purple",
      label: "Purple",
      color: "#8057ff",
      accent2: "#a78bfa",
    },
    {
      key: "blue",
      label: "Ocean",
      color: "#00bfae",
      accent2: "#398dff",
    },
    {
      key: "sunset",
      label: "Sunset",
      color: "#f08a36",
      accent2: "#ff5277",
    },
    {
      key: "green",
      label: "Forest",
      color: "#64c878",
      accent2: "#b0d957",
    },
    {
      key: "rose",
      label: "Rose",
      color: "#f06ca8",
      accent2: "#a875ff",
    },
    {
      key: "gold",
      label: "Gold",
      color: "#e5ad42",
      accent2: "#f07845",
    },
  ];

  const modes = [
    { key: "auto", label: "Auto" },
    { key: "light", label: "Light" },
    { key: "dark", label: "Dark" },
  ];

  const pickMode = (nextMode) => {
    setThemeMode(nextMode);
    setMode(nextMode);

    window.dispatchEvent(
      new Event("naomi-theme-change")
    );
  };

  const pickPalette = (nextPalette) => {
    setPalette(nextPalette);

    try {
      localStorage.setItem(
        "naomi-music-palette",
        nextPalette
      );
    } catch {
      // The theme still works if storage is unavailable.
    }

    document.documentElement.dataset.palette =
      nextPalette;

    window.dispatchEvent(
      new Event("naomi-palette-change")
    );
  };

  useEffect(() => {
    document.documentElement.dataset.palette = palette;
  }, [palette]);

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            marginBottom: 9,
          }}
        >
          Display mode
        </div>

        <div className="mode-options">
          {modes.map((option) => {
            const active = mode === option.key;

            return (
              <button
                type="button"
                key={option.key}
                className={
                  "mode-button" +
                  (active ? " active" : "")
                }
                onClick={() => pickMode(option.key)}
                aria-pressed={active}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            marginBottom: 10,
          }}
        >
          Accent color
        </div>

        <div className="palette-grid">
          {palettes.map((option) => {
            const active = palette === option.key;

            return (
              <button
                type="button"
                key={option.key}
                className={
                  "palette-button" +
                  (active ? " active" : "")
                }
                onClick={() =>
                  pickPalette(option.key)
                }
                aria-pressed={active}
              >
                <span
                  className="palette-dot"
                  style={{
                    background: `linear-gradient(135deg, ${option.color}, ${option.accent2})`,
                  }}
                />

                <span>{option.label}</span>

                {active && (
                  <Check
                    size={14}
                    className="palette-check"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          fontSize: 11,
          color: "var(--text-dim)",
          lineHeight: 1.6,
        }}
      >
        Your display mode and accent color are saved on
        this device.
      </div>
    </div>
  );
}

// ============================================================
// PUSH NOTIFICATION CONTROL
// ============================================================

function PushToggle() {
  const [enabled, setEnabled] = useState(false);
  const [supported, setSupported] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function checkNotifications() {
      try {
        const result = await isPushSupported();

        if (cancelled) return;

        setSupported(result);

        if (result) {
          const active = await isPushEnabled();

          if (!cancelled) {
            setEnabled(active);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setSupported(false);
          setMsg(
            err?.message ||
              "Could not check notification support."
          );
        }
      }
    }

    checkNotifications();

    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = async () => {
    setBusy(true);
    setMsg("");

    try {
      if (enabled) {
        await disablePush();

        setEnabled(false);
        setMsg("Notifications turned off.");
      } else {
        await enablePush();

        setEnabled(true);
        setMsg("Notifications enabled.");
      }
    } catch (err) {
      setMsg(
        err?.message ||
          "Could not update notification settings."
      );

      // Refresh the actual state after a failed operation.
      try {
        const active = await isPushEnabled();
        setEnabled(active);
      } catch {
        // Keep the last known state.
      }
    } finally {
      setBusy(false);
    }
  };

  if (!supported) {
    return (
      <div className="push-message">
        Push notifications are not supported or could not
        be initialized in this browser.
        {msg && <div>{msg}</div>}
      </div>
    );
  }

  return (
    <div className="push-row">
      <Button
        onClick={toggle}
        disabled={busy}
        variant={enabled ? "outline" : undefined}
      >
        {busy
          ? "Please wait..."
          : enabled
            ? "Turn off notifications"
            : "Enable notifications"}
      </Button>

      {msg && (
        <span className="push-message" role="status">
          {msg}
        </span>
      )}
    </div>
  );
}
