import React, { useEffect, useState, useMemo } from "react";
import { X, Plus, ChevronLeft, Search, Check } from "lucide-react";
import {
  tablesDB, DATABASE_ID, PLAYLISTS_TABLE_ID, PLAYLIST_SONGS_TABLE_ID,
  SONGS_TABLE_ID, Query, ID, fileUrl,
} from "../lib/appwrite";
import { Button, ErrorNote, inputStyle, theme } from "../components/ui";

export function PlaylistsView({ currentUser, onPlaySong }) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [openPlaylist, setOpenPlaylist] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const loadPlaylists = () => {
    setLoading(true);
    tablesDB
      .listRows(DATABASE_ID, PLAYLISTS_TABLE_ID, [Query.equal("userEmail", currentUser.email)])
      .then((res) => setPlaylists(res.rows))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(loadPlaylists, []);

  const createPlaylist = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError("");
    try {
      await tablesDB.createRow(DATABASE_ID, PLAYLISTS_TABLE_ID, ID.unique(), {
        name: newName.trim(),
        userEmail: currentUser.email,
      });
      setNewName("");
      loadPlaylists();
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const deletePlaylist = async (id) => {
    try {
      await tablesDB.deleteRow(DATABASE_ID, PLAYLISTS_TABLE_ID, id);
      setPlaylists((p) => p.filter((pl) => pl.$id !== id));
    } catch (e) {
      setError(e.message);
    }
  };

  if (openPlaylist) {
    return (
      <PlaylistDetail
        playlist={openPlaylist}
        onBack={() => setOpenPlaylist(null)}
        onPlaySong={onPlaySong}
      />
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px 80px" }}>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Your playlists</div>

      <ErrorNote message={error} />

      {loading && <div style={{ opacity: 0.6, fontSize: 13 }}>Loading...</div>}
      {!loading && playlists.length === 0 && <div style={{ opacity: 0.6, fontSize: 13 }}>No playlists yet — create one above.</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {playlists.map((p) => (
          <div key={p.$id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${theme.border}`, borderRadius: 4, padding: "12px 14px" }}>
            <button onClick={() => setOpenPlaylist(p)} style={{ background: "none", border: "none", color: theme.text, cursor: "pointer", fontSize: 14, fontFamily: "inherit", textAlign: "left", flex: 1 }}>
              {p.name}
            </button>
            <button onClick={() => deletePlaylist(p.$id)} style={{ background: "none", border: "none", color: theme.danger, cursor: "pointer", display: "flex" }}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Floating + button for new playlist */}
      <button
        onClick={() => { setNewName(""); setError(""); setShowNewModal(true); }}
        title="New playlist"
        style={{
          position: "fixed",
          right: 24,
          bottom: 100,
          width: 56, height: 56, borderRadius: "50%",
          background: theme.accent, border: "none",
          color: "#fff", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 6px 20px rgba(124,92,255,0.5)",
          zIndex: 90,
        }}
      >
        <Plus size={26} />
      </button>

      {showNewModal && (
        <div
          onClick={() => setShowNewModal(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 300,
            background: "rgba(0,0,0,0.75)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "24px 16px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: theme.bgRaised,
              width: "100%", maxWidth: 360,
              borderRadius: 12, border: `1px solid ${theme.border}`,
              padding: 22,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>New playlist</div>
              <button onClick={() => setShowNewModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.text, opacity: 0.7, display: "flex" }}>
                <X size={18} />
              </button>
            </div>

            <input
              autoFocus
              style={inputStyle()}
              placeholder="Playlist name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  createPlaylist().then(() => setShowNewModal(false));
                }
                if (e.key === "Escape") setShowNewModal(false);
              }}
            />

            <ErrorNote message={error} />

            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <Button variant="outline" onClick={() => setShowNewModal(false)}>Cancel</Button>
              <Button
                onClick={async () => {
                  await createPlaylist();
                  if (!error) setShowNewModal(false);
                }}
                disabled={creating || !newName.trim()}
              >
                {creating ? "..." : "Create"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlaylistDetail({ playlist, onBack, onPlaySong }) {
  const [songs, setSongs] = useState([]);
  const [rowIds, setRowIds] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const loadSongs = async () => {
    setLoading(true);
    try {
      const linkRes = await tablesDB.listRows(DATABASE_ID, PLAYLIST_SONGS_TABLE_ID, [
        Query.equal("playlistId", playlist.$id),
        Query.orderAsc("order"),
      ]);
      const ids = linkRes.rows.map((r) => r.songId);
      const rowIdMap = {};
      linkRes.rows.forEach((r) => { rowIdMap[r.songId] = r.$id; });

      if (ids.length === 0) {
        setSongs([]); setRowIds({}); setLoading(false);
        return;
      }
      const songsRes = await tablesDB.listRows(DATABASE_ID, SONGS_TABLE_ID, [Query.equal("$id", ids)]);
      const ordered = ids.map((id) => songsRes.rows.find((s) => s.$id === id)).filter(Boolean);
      setSongs(ordered);
      setRowIds(rowIdMap);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { loadSongs(); }, [playlist.$id]);

  const removeSong = async (songId) => {
    try {
      await tablesDB.deleteRow(DATABASE_ID, PLAYLIST_SONGS_TABLE_ID, rowIds[songId]);
      setSongs((s) => s.filter((song) => song.$id !== songId));
    } catch {}
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px 80px" }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: theme.text, cursor: "pointer", fontSize: 13, marginBottom: 16, fontFamily: "inherit", padding: 0 }}>
        <ChevronLeft size={16} /> Playlists
      </button>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>{playlist.name}</div>
        <button
          onClick={() => setShowAdd(true)}
          title="Add songs"
          style={{
            width: 40, height: 40, borderRadius: "50%",
            background: theme.accent, border: "none",
            color: "#fff", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(124,92,255,0.4)",
          }}
        >
          <Plus size={20} />
        </button>
      </div>

      {loading && <div style={{ opacity: 0.6, fontSize: 13 }}>Loading...</div>}
      {!loading && songs.length === 0 && <div style={{ opacity: 0.6, fontSize: 13 }}>No songs yet — tap + to add.</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {songs.map((s, i) => (
          <div key={s.$id} style={{ display: "flex", alignItems: "center", gap: 12, border: `1px solid ${theme.border}`, borderRadius: 4, padding: 10 }}>
            <img src={fileUrl(s.coverArtField)} alt={s.title} style={{ width: 44, height: 44, borderRadius: 4, objectFit: "cover", background: theme.bgRaised, flexShrink: 0 }} />
            <button onClick={() => onPlaySong(songs, i)} style={{ flex: 1, minWidth: 0, background: "none", border: "none", color: theme.text, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
              <div style={{ fontSize: 11.5, opacity: 0.6 }}>{s.artistName}</div>
            </button>
            <button onClick={() => removeSong(s.$id)} style={{ background: "none", border: "none", color: theme.danger, cursor: "pointer", display: "flex" }}>
              <X size={15} />
            </button>
          </div>
        ))}
      </div>

      {showAdd && (
        <AddSongsModal
          playlistId={playlist.$id}
          existingSongIds={new Set(songs.map((s) => s.$id))}
          onClose={() => setShowAdd(false)}
          onAdded={(song, rowId) => {
            setSongs((prev) => [...prev, song]);
            setRowIds((prev) => ({ ...prev, [song.$id]: rowId }));
          }}
        />
      )}
    </div>
  );
}

function AddSongsModal({ playlistId, existingSongIds, onClose, onAdded }) {
  const [allSongs, setAllSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [addingId, setAddingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    tablesDB
      .listRows(DATABASE_ID, SONGS_TABLE_ID, [Query.equal("status", "approved"), Query.limit(200)])
      .then((res) => { if (!cancelled) setAllSongs(res.rows); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allSongs;
    return allSongs.filter((s) =>
      [s.title, s.artistName, s.genre, s.albumName]
        .filter(Boolean)
        .some((f) => f.toLowerCase().includes(q))
    );
  }, [allSongs, query]);

  const add = async (song) => {
    if (existingSongIds.has(song.$id) || addingId) return;
    setAddingId(song.$id);
    setError("");
    try {
      const order = Date.now();
      const row = await tablesDB.createRow(DATABASE_ID, PLAYLIST_SONGS_TABLE_ID, ID.unique(), {
        playlistId,
        songId: song.$id,
        order,
      });
      onAdded(song, row.$id);
    } catch (e) {
      setError(e.message);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme.bgRaised,
          width: "100%", maxWidth: 420, maxHeight: "82vh",
          borderRadius: 12, border: `1px solid ${theme.border}`,
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Add songs</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: theme.text, opacity: 0.7, display: "flex" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "12px 18px", borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", opacity: 0.5 }} />
            <input
              style={{ ...inputStyle(), paddingLeft: 32, fontSize: 13 }}
              placeholder="Search songs..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div style={{ overflowY: "auto", padding: 8 }}>
          {loading && <div style={{ padding: 12, opacity: 0.6, fontSize: 13 }}>Loading...</div>}
          {error && <div style={{ padding: 12 }}><ErrorNote message={error} /></div>}
          {!loading && filtered.length === 0 && <div style={{ padding: 12, opacity: 0.6, fontSize: 13 }}>No songs found.</div>}

          {filtered.map((song) => {
            const added = existingSongIds.has(song.$id);
            const busy = addingId === song.$id;
            return (
              <button
                key={song.$id}
                onClick={() => add(song)}
                disabled={added || busy}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: 8, borderRadius: 6,
                  background: "none", border: "none",
                  cursor: added ? "default" : "pointer",
                  textAlign: "left", fontFamily: "inherit",
                  color: theme.text, opacity: added ? 0.5 : 1,
                }}
              >
                <img src={fileUrl(song.coverArtField)} alt={song.title} style={{ width: 40, height: 40, borderRadius: 4, objectFit: "cover", background: theme.bg, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{song.title}</div>
                  <div style={{ fontSize: 11, opacity: 0.6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{song.artistName}</div>
                </div>
                <div style={{ flexShrink: 0, display: "flex" }}>
                  {added ? <Check size={18} color="#4be88a" /> : <Plus size={18} color={theme.accent} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
