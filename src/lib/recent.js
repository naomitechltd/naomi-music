const KEY = "naomi_recent_songs";
const MAX = 15;

export function getRecentlyPlayed() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function addRecentlyPlayed(song) {
  if (!song || !song.$id) return;
  try {
    const list = getRecentlyPlayed().filter((s) => s.$id !== song.$id);
    list.unshift({
      $id: song.$id,
      title: song.title,
      artistName: song.artistName,
      coverArtField: song.coverArtField,
      audioField: song.audioField,
      contentType: song.contentType || "song",
      uploadedByUserId: song.uploadedByUserId,
      playedAt: Date.now(),
    });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {}
}

export function clearRecentlyPlayed() {
  try { localStorage.removeItem(KEY); } catch {}
}
