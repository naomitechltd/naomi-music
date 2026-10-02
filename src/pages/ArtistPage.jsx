import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MessageSquare, Share2, MapPin, Building2, Calendar, BadgeCheck, Edit3,
  LayoutGrid, List, Menu as ListIcon, UserPlus, UserMinus, Star, Play,
  Instagram, Youtube, Twitter, Globe, Music2
} from "lucide-react";
import { tablesDB, DATABASE_ID, LIKES_TABLE_ID, Query, fileUrl } from "../lib/appwrite";
import { getArtistProfile, openConversation, followUser, unfollowUser, getFollowStats } from "../lib/api";
import { theme } from "../components/ui";

const VIEW_KEY = "naomi_artist_view";

export function ArtistPage({ currentUser, onPlaySong, onOpenChat }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [songs, setSongs] = useState([]);
  const [likeCounts, setLikeCounts] = useState({});
  const [followStats, setFollowStats] = useState({ followersCount: 0, followingCount: 0, iFollow: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState(() => localStorage.getItem(VIEW_KEY) || "grid");
  const [msgBusy, setMsgBusy] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => { localStorage.setItem(VIEW_KEY, view); }, [view]);

  useEffect(() => {
    document.title = "Artist — Naomi Music";
    setLoading(true);
    setError("");
    Promise.all([
      getArtistProfile(id),
      currentUser ? getFollowStats(id).catch(() => null) : null,
    ])
      .then(([res, stats]) => {
        if (!res.ok) throw new Error(res.error || "Could not load artist");
        setProfile(res.profile);
        setSongs(res.songs || []);
        if (stats?.ok) {
          setFollowStats({
            followersCount: stats.followersCount || 0,
            followingCount: stats.followingCount || 0,
            iFollow: !!stats.iFollow,
          });
        } else if (res.profile) {
          setFollowStats((f) => ({
            ...f,
            followersCount: res.profile.followersCount || 0,
            followingCount: res.profile.followingCount || 0,
          }));
        }
        if (res.profile?.name) document.title = `${res.profile.name} — Naomi Music`;
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, currentUser?.$id]);

  useEffect(() => {
    if (songs.length === 0) return;
    const ids = songs.map((s) => s.$id);
    tablesDB
      .listRows(DATABASE_ID, LIKES_TABLE_ID, [
        Query.equal("songId", ids),
        Query.limit(1000),
      ])
      .then((res) => {
        const map = {};
        for (const r of res.rows) map[r.songId] = (map[r.songId] || 0) + 1;
        setLikeCounts(map);
      })
      .catch(() => {});
  }, [songs]);

  const totalLikes = useMemo(() => Object.values(likeCounts).reduce((a, b) => a + b, 0), [likeCounts]);
  const totalPlays = useMemo(() => songs.reduce((a, s) => a + (s.playCount || 0), 0), [songs]);
  const isOwnProfile = currentUser?.$id === id;

  const message = async () => {
    if (msgBusy) return;
    setMsgBusy(true);
    try {
      const out = await openConversation(id);
      if (out?.conversation && onOpenChat) onOpenChat(out.conversation);
      else if (out?.error === "email-not-verified") setError("Verify your email first to message artists.");
      else setError(out?.error || "Could not open chat");
    } catch (e) { setError(e.message); }
    finally { setMsgBusy(false); }
  };

  const toggleFollow = async () => {
    if (followBusy) return;
    setFollowBusy(true);
    try {
      if (followStats.iFollow) {
        await unfollowUser(id);
        setFollowStats((s) => ({ ...s, iFollow: false, followersCount: Math.max(0, s.followersCount - 1) }));
      } else {
        await followUser(id);
        setFollowStats((s) => ({ ...s, iFollow: true, followersCount: s.followersCount + 1 }));
      }
    } catch (e) {
      if (e.code === "email-not-verified") setError("Verify your email first to follow artists.");
      else setError(e.message);
    } finally { setFollowBusy(false); }
  };

  const share = async () => {
    const url = `${window.location.origin}/artist/${id}`;
    if (navigator.share) { try { await navigator.share({ title: profile?.name, url }); } catch {} }
    else { try { await navigator.clipboard.writeText(url); alert("Link copied"); } catch {} }
  };

  if (loading) return <div style={{ padding: 60, textAlign: "center", opacity: 0.6 }}>Loading artist…</div>;
  if (error && !profile) return <div style={{ padding: 60, textAlign: "center", color: theme.danger }}>{error}</div>;
  if (!profile) return null;

  const initial = (profile.name || "?")[0].toUpperCase();
  const joined = profile.joinedAt ? new Date(profile.joinedAt).toLocaleDateString(undefined, { year: "numeric", month: "long" }) : "";
  const social = profile.social || {};

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 20px 120px" }}>
      {/* Header card */}
      <div style={{ background: theme.bgRaised, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 24 }}>
        <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          {profile.avatarFileId ? (
            <img src={fileUrl(profile.avatarFileId)} alt={profile.name} style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", border: `2px solid ${theme.border}`, flexShrink: 0 }} />
          ) : (
            <div style={{ width: 96, height: 96, borderRadius: "50%", background: theme.bg, border: `2px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 700, color: theme.accent, flexShrink: 0 }}>
              {initial}
            </div>
          )}

          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>{profile.name}</h1>
              {profile.verified && <BadgeCheck size={20} style={{ color: theme.accent }} />}
            </div>
            <div style={{ display: "flex", gap: 14, fontSize: 13, opacity: 0.7, marginTop: 8, flexWrap: "wrap" }}>
              {profile.location && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={14} /> {profile.location}</span>}
              {profile.studio && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Building2 size={14} /> {profile.studio}</span>}
              {joined && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={14} /> Joined {joined}</span>}
            </div>

            {/* Social links */}
            {(social.instagram || social.tiktok || social.youtube || social.twitter || social.website) && (
              <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                {social.instagram && <SocialLink href={social.instagram} icon={Instagram} label="Instagram" />}
                {social.tiktok && <SocialLink href={social.tiktok} icon={Music2} label="TikTok" />}
                {social.youtube && <SocialLink href={social.youtube} icon={Youtube} label="YouTube" />}
                {social.twitter && <SocialLink href={social.twitter} icon={Twitter} label="Twitter" />}
                {social.website && <SocialLink href={social.website} icon={Globe} label="Website" />}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {isOwnProfile ? (
              <button onClick={() => navigate("/profile")} style={btnPrimary()}>
                <Edit3 size={16} /> Edit profile
              </button>
            ) : (
              <>
                <button onClick={toggleFollow} disabled={followBusy} style={btnPrimary(followStats.iFollow)}>
                  {followStats.iFollow ? <UserMinus size={16} /> : <UserPlus size={16} />}
                  {followStats.iFollow ? "Following" : "Follow"}
                </button>
                <button onClick={message} disabled={msgBusy} style={btnPrimary()}>
                  <MessageSquare size={16} /> Message
                </button>
              </>
            )}
            <button onClick={share} style={btnOutline()}>
              <Share2 size={16} /> Share
            </button>
          </div>
        </div>

        {profile.bio && (
          <div style={{ marginTop: 20, paddingTop: 18, borderTop: `1px solid ${theme.border}`, fontSize: 14, lineHeight: 1.7, opacity: 0.9, whiteSpace: "pre-wrap" }}>
            {profile.bio}
          </div>
        )}

        <div style={{ display: "flex", gap: 26, marginTop: 20, paddingTop: 18, borderTop: `1px solid ${theme.border}`, flexWrap: "wrap" }}>
          <Stat label="Songs" value={songs.length} />
          <Stat label="Followers" value={followStats.followersCount} />
          <Stat label="Following" value={followStats.followingCount} />
          <Stat label="Plays" value={totalPlays} />
          <Stat label="Likes" value={totalLikes} />
          {profile.ratingCount > 0 && (
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                <Star size={20} fill="#ffb800" color="#ffb800" />
                {profile.avgRating?.toFixed(1)}
              </div>
              <div style={{ fontSize: 11.5, opacity: 0.55, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>
                {profile.ratingCount} rating{profile.ratingCount === 1 ? "" : "s"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Discography */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 32, marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Discography</div>
        <div style={{ display: "flex", gap: 2, background: theme.bgRaised, border: `1px solid ${theme.border}`, borderRadius: 8, padding: 2 }}>
          <ViewBtn icon={LayoutGrid} active={view === "grid"} onClick={() => setView("grid")} title="Grid" />
          <ViewBtn icon={List} active={view === "list"} onClick={() => setView("list")} title="List" />
          <ViewBtn icon={ListIcon} active={view === "compact"} onClick={() => setView("compact")} title="Compact" />
        </div>
      </div>

      {songs.length === 0 && <div style={{ opacity: 0.5, fontSize: 14 }}>No approved songs yet.</div>}

      {view === "grid" && songs.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 18 }}>
          {songs.map((s, i) => <SongCard key={s.$id} song={s} index={i} allSongs={songs} onPlaySong={onPlaySong} likeCount={likeCounts[s.$id] || 0} navigate={navigate} />)}
        </div>
      )}

      {view === "list" && songs.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {songs.map((s, i) => (
            <div key={s.$id} onClick={() => s.contentType === "poem" ? navigate(`/song/${s.$id}`) : onPlaySong(songs.filter((x) => (x.contentType || "song") === "song"), i)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 10px", borderRadius: 8, cursor: "pointer" }}>
              <img src={fileUrl(s.coverArtField)} alt={s.title} style={{ width: 56, height: 56, borderRadius: 6, objectFit: "cover", flexShrink: 0, background: theme.bgRaised, border: `1px solid ${theme.border}` }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
                <div style={{ fontSize: 12.5, opacity: 0.6, marginTop: 2 }}>
                  {s.genre} · {s.playCount || 0} plays · {likeCounts[s.$id] || 0} likes
                </div>
              </div>
              {s.contentType === "poem" && <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.5, letterSpacing: "0.05em" }}>POEM</div>}
            </div>
          ))}
        </div>
      )}

      {view === "compact" && songs.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {songs.map((s, i) => (
            <div key={s.$id} onClick={() => s.contentType === "poem" ? navigate(`/song/${s.$id}`) : onPlaySong(songs.filter((x) => (x.contentType || "song") === "song"), i)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 8px", borderBottom: `1px solid ${theme.border}`, cursor: "pointer" }}>
              <div style={{ width: 24, fontSize: 12, opacity: 0.4, textAlign: "right", flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
              <div style={{ fontSize: 11.5, opacity: 0.5, flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
                <Play size={11} /> {s.playCount || 0}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SongCard({ song: s, index: i, allSongs, onPlaySong, likeCount, navigate }) {
  const isPoem = s.contentType === "poem";
  return (
    <div
      onClick={() => isPoem ? navigate(`/song/${s.$id}`) : onPlaySong(allSongs.filter((x) => (x.contentType || "song") === "song"), i)}
      style={{ cursor: "pointer", position: "relative" }}
    >
      <img src={fileUrl(s.coverArtField)} alt={s.title} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8, background: theme.bgRaised, border: `1px solid ${theme.border}` }} />
      {isPoem && <div style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10, letterSpacing: "0.04em" }}>POEM</div>}
      <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
      <div style={{ fontSize: 12, opacity: 0.6 }}>{s.playCount || 0} plays · {likeCount} likes</div>
    </div>
  );
}

function SocialLink({ href, icon: Icon, label }) {
  const url = href.startsWith("http") ? href : `https://${href}`;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title={label} style={{ display: "flex", alignItems: "center", gap: 5, color: theme.accent, fontSize: 12.5, textDecoration: "none" }}>
      <Icon size={15} /> {label}
    </a>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 11.5, opacity: 0.55, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function ViewBtn({ icon: Icon, active, onClick, title }) {
  return (
    <button onClick={onClick} title={title} style={{ background: active ? theme.accent : "transparent", border: "none", color: active ? "#fff" : theme.text, opacity: active ? 1 : 0.7, width: 32, height: 32, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon size={16} />
    </button>
  );
}

function btnPrimary(active) {
  return {
    display: "flex", alignItems: "center", gap: 8,
    padding: "10px 18px",
    background: active ? "transparent" : theme.accent,
    color: active ? theme.accent : "#fff",
    border: `1px solid ${theme.accent}`,
    borderRadius: 10,
    cursor: "pointer", fontFamily: "inherit",
    fontSize: 13.5, fontWeight: 600,
  };
}

function btnOutline() {
  return {
    display: "flex", alignItems: "center", gap: 8,
    padding: "10px 18px",
    background: "transparent", color: theme.text,
    border: `1px solid ${theme.border}`, borderRadius: 10,
    cursor: "pointer", fontFamily: "inherit",
    fontSize: 13.5, fontWeight: 600,
  };
}
