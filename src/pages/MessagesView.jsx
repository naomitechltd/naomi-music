import React, { useEffect, useState, useMemo } from "react";
import { ChevronRight, Plus, Search, X } from "lucide-react";
import { listConversations, openConversation } from "../lib/api";
import { functions } from "../lib/appwrite";
import { theme, inputStyle } from "../components/ui";

async function listArtists() {
  const res = await functions.createExecution(
    "api",
    JSON.stringify({ action: "list-artists" }),
    false
  );
  const raw =
    res?.responseBody ??
    res?.response ??
    res?.data?.responseBody ??
    res?.data?.response ??
    "{}";
  try { return JSON.parse(raw); } catch { return { ok: false }; }
}

export function MessagesView({ currentUser, onOpenChat }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listConversations();
      setConversations(res.conversations || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px 100px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>Messages</div>
        <button
          onClick={() => setShowAdd(true)}
          title="New message"
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

      {error && <div style={{ color: theme.danger, fontSize: 13, marginBottom: 12 }}>{error}</div>}
      {loading && <div style={{ opacity: 0.6, fontSize: 13 }}>Loading...</div>}

      {!loading && conversations.length === 0 && (
        <div style={{ opacity: 0.6, fontSize: 13 }}>No conversations yet. Tap + to start one.</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {conversations.map((c) => {
          const otherIdx = c.participants[0] === currentUser.$id ? 1 : 0;
          const otherName = c.userNames?.[otherIdx] || "Unknown";
          const unread = (c.participants[0] === currentUser.$id ? c.unreadA : c.unreadB) || 0;
          return (
            <button
              key={c.$id}
              onClick={() => onOpenChat(c)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                border: `1px solid ${theme.border}`, borderRadius: 6, padding: 12,
                background: "none", cursor: "pointer", color: theme.text,
                fontFamily: "inherit", textAlign: "left",
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: theme.bgRaised, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 700, color: theme.accent }}>
                {otherName[0]?.toUpperCase() || "?"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{otherName}</div>
                  {unread > 0 && (
                    <span style={{ background: theme.accent, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 10 }}>
                      {unread}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {c.lastMessage || "No messages yet — say hi"}
                </div>
              </div>
              <ChevronRight size={16} style={{ opacity: 0.4, flexShrink: 0 }} />
            </button>
          );
        })}
      </div>

      {showAdd && (
        <AddPersonModal
          onClose={() => setShowAdd(false)}
          onPicked={async (person) => {
            try {
              const out = await openConversation(person.userId);
              if (out?.conversation) {
                setShowAdd(false);
                onOpenChat(out.conversation);
              } else {
                setError(out?.error || "Could not open chat");
              }
            } catch (e) {
              setError(e.message);
            }
          }}
        />
      )}
    </div>
  );
}

function AddPersonModal({ onClose, onPicked }) {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    listArtists()
      .then((res) => {
        if (cancelled) return;
        if (res.ok) setPeople(res.artists || []);
        else setError(res.error || "Could not load people");
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) =>
      (p.name || "").toLowerCase().includes(q) ||
      (p.email || "").toLowerCase().includes(q)
    );
  }, [people, query]);

  const pick = async (person) => {
    setBusyId(person.userId);
    setError("");
    try {
      await onPicked(person);
    } catch (e) {
      setError(e.message);
      setBusyId(null);
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
          background: theme.bgRaised, width: "100%", maxWidth: 420, maxHeight: "82vh",
          borderRadius: 12, border: `1px solid ${theme.border}`,
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>New message</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: theme.text, opacity: 0.7, display: "flex" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "12px 18px", borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", opacity: 0.5 }} />
            <input
              autoFocus
              style={{ ...inputStyle(), paddingLeft: 32, fontSize: 13 }}
              placeholder="Search people..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div style={{ padding: "10px 18px", color: theme.danger, fontSize: 12.5, borderBottom: `1px solid ${theme.border}` }}>
            {error}
          </div>
        )}

        <div style={{ overflowY: "auto", padding: 8 }}>
          {loading && <div style={{ padding: 12, opacity: 0.6, fontSize: 13 }}>Loading...</div>}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: 12, opacity: 0.6, fontSize: 13 }}>No matches.</div>
          )}
          {filtered.map((p) => {
            const busy = busyId === p.userId;
            return (
              <button
                key={p.userId}
                onClick={() => pick(p)}
                disabled={busy}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: 10, borderRadius: 6,
                  background: "none", border: "none",
                  cursor: busy ? "wait" : "pointer",
                  textAlign: "left", fontFamily: "inherit",
                  color: theme.text, opacity: busy ? 0.5 : 1,
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: theme.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 700, color: theme.accent }}>
                  {p.name?.[0]?.toUpperCase() || "?"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.role === "admin" ? "Admin" : "Artist"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
