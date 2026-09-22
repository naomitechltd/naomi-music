import React, { useEffect, useState } from "react";
import { tablesDB, DATABASE_ID, SONGS_TABLE_ID, Query } from "../lib/appwrite";
import { theme } from "../components/ui";

const STATUS_COLORS = { pending: "#e8b84b", approved: "#4be88a", rejected: "#ff6b6b" };

export function MySongsView({ currentUser, refreshKey }) {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    tablesDB
      .listRows(DATABASE_ID, SONGS_TABLE_ID, [Query.equal("uploadedByEmail", currentUser.email)])
      .then((res) => { if (!cancelled) setSongs(res.rows); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [currentUser.email, refreshKey]);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px 80px" }}>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>My songs</div>
      {loading && <div style={{ opacity: 0.6, fontSize: 13 }}>Loading...</div>}
      {!loading && songs.length === 0 && <div style={{ opacity: 0.6, fontSize: 13 }}>No uploads yet.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {songs.map((s) => (
          <div key={s.$id} style={{ border: `1px solid ${theme.border}`, borderRadius: 4, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{s.title}</div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>{s.genre} · {s.releaseType}</div>
            </div>
            <div style={{
              fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em",
              color: STATUS_COLORS[s.status] || "#f2f2f2",
            }}>
              {s.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
