import React, { useEffect, useState } from "react";
import { X, Plus, ChevronLeft } from "lucide-react";
import { tablesDB, DATABASE_ID, PLAYLISTS_TABLE_ID, PLAYLIST_SONGS_TABLE_ID, SONGS_TABLE_ID, Query, ID, fileUrl } from "../lib/appwrite";
import { Button, Field, ErrorNote, inputStyle, theme } from "../components/ui";

export function PlaylistsView({ currentUser, onPlaySong }) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [openPlaylist, setOpenPlaylist] = useState(null);

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

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input
          style={inputStyle()}
          placeholder="New playlist name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createPlaylist()}
        />
        <Button onClick={createPlaylist} disabled={creating}>
          <Plus size={16} />
        </Button>
      </div>

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
    </div>
  );
}

function PlaylistDetail({ playlist, onBack, onPlaySong }) {
  const [songs, setSongs] = useState([]);
  const [rowIds, setRowIds] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const linkRes = await tablesDB.listRows(DATABASE_ID, PLAYLIST_SONGS_TABLE_ID, [
          Query.equal("playlistId", playlist.$id),
          Query.orderAsc("order"),
        ]);
        const ids = linkRes.rows.map((r) => r.songId);
        const rowIdMap = {};
        linkRes.rows.forEach((r) => { rowIdMap[r.songId] = r.$id; });

        if (ids.length === 0) {
          if (!cancelled) { setSongs([]); setRowIds({}); setLoading(false); }
          return;
        }

        const songsRes = await tablesDB.listRows(DATABASE_ID, SONGS_TABLE_ID, [Query.equal("$id", ids)]);
        const ordered = ids.map((id) => songsRes.rows.find((s) => s.$id === id)).filter(Boolean);
        if (!cancelled) { setSongs(ordered); setRowIds(rowIdMap); setLoading(false); }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [playlist.$id]);

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
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>{playlist.name}</div>

      {loading && <div style={{ opacity: 0.6, fontSize: 13 }}>Loading...</div>}
      {!loading && songs.length === 0 && <div style={{ opacity: 0.6, fontSize: 13 }}>No songs in this playlist yet.</div>}

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
    </div>
  );
}
