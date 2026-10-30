import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { functions, tablesDB, DATABASE_ID, PLAYLISTS_TABLE_ID, Query } from "../lib/appwrite";
import "./profile-extras.css";
import TeaserUpload from "./TeaserUpload";

async function api(body) {
  try {
    const res = await functions.createExecution("api", JSON.stringify(body), false);
    return JSON.parse(res?.responseBody ?? res?.response ?? "{}");
  } catch {
    return {};
  }
}

const COLORS = [["#7b2cbf", "#e0287d"], ["#0077b6", "#00b4d8"], ["#0b7a5a", "#2fd08f"], ["#a3380f", "#f26a1b"]];

export default function ProfileExtras({ currentUser }) {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState([]);
  const [plCount, setPlCount] = useState(0);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [artists, setArtists] = useState([]);

  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const res = await tablesDB.listRows(DATABASE_ID, PLAYLISTS_TABLE_ID, [
          Query.equal("userEmail", currentUser.email),
          Query.limit(3),
        ]);
        if (!off) { setPlaylists(res?.rows || res?.documents || []); setPlCount(res?.total ?? 0); }
      } catch {}
      const st = await api({ action: "follow-stats", targetUserId: currentUser.$id });
      if (!off && st.ok) { setFollowers(st.followersCount || 0); setFollowing(st.followingCount || 0); }
      const fl = await api({ action: "list-following", targetUserId: currentUser.$id });
      const list = fl.following || fl.users || fl.people || fl.rows || fl.items || [];
      if (!off && Array.isArray(list)) setArtists(list.slice(0, 3));
    })();
    return () => { off = true; };
  }, [currentUser.$id, currentUser.email]);

  const editProfile = () => {
    const el = document.querySelector('input[placeholder="0821234567"]');
    if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.focus({ preventScroll: true }); }
  };

  return (
    <section>
      <button type="button" className="pe-edit" onClick={editProfile}>Edit profile</button>

      <div className="pe-stats">
        <div><b>{plCount}</b><span>Playlists</span></div>
        <div><b>{followers}</b><span>Followers</span></div>
        <div><b>{following}</b><span>Following</span></div>
      </div>

      <TeaserUpload />

      <h2 className="pe-h">Public playlists</h2>
      <div className="pe-card">
        {playlists.length === 0 && <p style={{ padding: "14px 2px", margin: 0, opacity: 0.6, fontSize: 14 }}>No playlists yet.</p>}
        {playlists.map((p, i) => (
          <button type="button" className="pe-row" key={p.$id} onClick={() => navigate("/playlists")} style={{ "--c1": COLORS[i % 4][0], "--c2": COLORS[i % 4][1] }}>
            <span className="pe-art">♪</span>
            <span className="pe-txt"><b>{p.name || p.title || "Playlist"}</b><small>Playlist</small></span>
            <ChevronRight size={20} />
          </button>
        ))}
        <button type="button" className="pe-row" onClick={() => navigate("/playlists")}>
          <span className="pe-txt pe-more">See all playlists</span><ChevronRight size={20} />
        </button>
      </div>

      {artists.length > 0 && (
        <>
          <h2 className="pe-h">Your artists</h2>
          <div className="pe-card">
            {artists.map((a, i) => {
              const id = a.userId || a.followedUserId || a.$id || a.id;
              const name = a.name || a.artistName || a.userName || "Artist";
              return (
                <button type="button" className="pe-row" key={id || i} onClick={() => id && navigate("/artist/" + id)} style={{ "--c1": COLORS[(i + 1) % 4][0], "--c2": COLORS[(i + 1) % 4][1] }}>
                  <span className="pe-art round">{name[0]?.toUpperCase()}</span>
                  <span className="pe-txt"><b>{name}</b><small>Following</small></span>
                  <ChevronRight size={20} />
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
