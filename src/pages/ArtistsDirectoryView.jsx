import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, Building2, Mic2, Feather } from "lucide-react";
import { listArtistsDirectory } from "../lib/api";
import { fileUrl } from "../lib/appwrite";
import { theme, inputStyle } from "../components/ui";

export function ArtistsDirectoryView() {
  const navigate = useNavigate();
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(() => {
    document.title = "Artists — Naomi Music";
    listArtistsDirectory()
      .then((res) => {
        if (res.ok) setArtists(res.artists || []);
        else setError(res.error || "Could not load artists");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = artists;
    if (roleFilter === "artist") list = list.filter((a) => a.role === "artist");
    else if (roleFilter === "poet") list = list.filter((a) => a.role === "poet");

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((a) =>
        (a.name || "").toLowerCase().includes(q) ||
        (a.location || "").toLowerCase().includes(q) ||
        (a.studio || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [artists, query, roleFilter]);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 20px 120px" }}>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Artists on Naomi Music</div>
      <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 22 }}>
        {artists.length} {artists.length === 1 ? "person" : "people"} creating on the platform
      </div>

      {/* Search + filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.5 }} />
          <input
            style={{ ...inputStyle(), paddingLeft: 36 }}
            placeholder="Search by name, location, or studio..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { key: "all", label: "All" },
            { key: "artist", label: "Artists" },
            { key: "poet", label: "Poets" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setRoleFilter(t.key)}
              style={{
                padding: "8px 16px",
                borderRadius: 20,
                background: roleFilter === t.key ? theme.accent : "transparent",
                color: roleFilter === t.key ? "#fff" : theme.text,
                border: `1px solid ${roleFilter === t.key ? theme.accent : theme.border}`,
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div style={{ color: theme.danger, fontSize: 13, marginBottom: 12 }}>{error}</div>}
      {loading && <div style={{ opacity: 0.6, fontSize: 13 }}>Loading artists...</div>}
      {!loading && filtered.length === 0 && (
        <div style={{ opacity: 0.55, fontSize: 14 }}>No matches.</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16 }}>
        {filtered.map((a) => (
          <button
            key={a.userId}
            onClick={() => navigate(`/artist/${a.userId}`)}
            style={{
              background: theme.bgRaised,
              border: `1px solid ${theme.border}`,
              borderRadius: 12,
              padding: 18,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              fontFamily: "inherit",
              color: theme.text,
              textAlign: "center",
              transition: "transform 0.15s ease",
            }}
          >
            {a.avatarFileId ? (
              <img
                src={fileUrl(a.avatarFileId)}
                alt={a.name}
                style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: `2px solid ${theme.border}` }}
              />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: theme.bg, border: `2px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, color: theme.accent }}>
                {(a.name || "?")[0].toUpperCase()}
              </div>
            )}
            <div style={{ fontSize: 14.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
              {a.name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {a.role === "poet" ? <Feather size={11} /> : <Mic2 size={11} />}
              {a.role}
            </div>
            {(a.location || a.studio) && (
              <div style={{ fontSize: 11, opacity: 0.55, lineHeight: 1.5, minHeight: 30 }}>
                {a.location && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
                    <MapPin size={10} /> {a.location}
                  </div>
                )}
                {a.studio && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center", marginTop: 2 }}>
                    <Building2 size={10} /> {a.studio}
                  </div>
                )}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
