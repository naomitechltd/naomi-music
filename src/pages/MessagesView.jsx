import React, { useEffect, useState, useMemo } from "react";
import { Check, X, MessageSquare, ChevronRight, Plus, Search } from "lucide-react";
import { listRequests, listConversations, respondRequest, requestMessage } from "../lib/api";
import { functions } from "../lib/appwrite";
import { theme, Button, inputStyle } from "../components/ui";

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
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [reqRes, convRes] = await Promise.all([listRequests(), listConversations()]);
      setRequests({ incoming: reqRes.incoming || [], outgoing: reqRes.outgoing || [] });
      setConversations(convRes.conversations || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const decide = async (requestId, decision) => {
    setBusyId(requestId);
    try {
      await respondRequest(requestId, decision);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const pendingIncoming = useMemo(() => requests.incoming.filter((r) => r.status === "pending"), [requests.incoming]);
  const pendingOutgoing = useMemo(() => requests.outgoing.filter((r) => r.status === "pending"), [requests.outgoing]);

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

      {!loading && pendingIncoming.length > 0 && (
        <Section title="Requests">
          {pendingIncoming.map((r) => (
            <div key={r.$id} style={{ border: `1px solid ${theme.border}`, borderRadius: 6, padding: 14, marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{r.fromName || r.fromEmail}</div>
              <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>{r.fromEmail}</div>
              {r.intro && (
                <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 8, lineHeight: 1.5, padding: "8px 10px", background: theme.bgRaised, borderRadius: 4, whiteSpace: "pre-wrap" }}>
                  {r.intro}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <Button onClick={() => decide(r.$id, "approve")} disabled={busyId === r.$id}>
                  <Check size={14} /> Approve
                </Button>
                <Button variant="outline" onClick={() => decide(r.$id, "decline")} disabled={busyId === r.$id}>
                  <X size={14} /> Decline
                </Button>
              </div>
            </div>
          ))}
        </Section>
      )}

      {!loading && pendingOutgoing.length > 0 && (
        <Section title="Sent requests">
          <div style={{ fontSize: 11.5, opacity: 0.55, marginBottom: 8 }}>
            Waiting for the other person to accept.
          </div>
          {pendingOutgoing.map((r) => (
            <div key={r.$id} style={{ border: `1px solid ${theme.border}`, borderRadius: 6, padding: 12, marginBottom: 8, opacity: 0.75 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.toName || r.toEmail}</div>
              <div style={{ fontSize: 11.5, opacity: 0.6, marginTop: 2 }}>Awaiting approval</div>
            </div>
          ))}
        </Section>
      )}

      <Section title="Conversations">
        {!loading && conversations.length === 0 && (
          <div style={{ opacity: 0.6, fontSize: 13 }}>No conversations yet. Tap + to start one.</div>
        )}
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
                fontFamily: "inherit", textAlign: "left", marginBottom: 8,
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
                  {c.lastMessage || "No messages yet"}
                </div>
              </div>
              <ChevronRight size={16} style={{ opacity: 0.4, flexShrink: 0 }} />
            </button>
          );
        })}
      </Section>

      {showAdd && (
        <AddArtistModal
          currentUser={currentUser}
          onClose={() => setShowAdd(false)}
          onSent={() => { setShowAdd(false); load(); }}
        />
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ fontSize: 11, opacity: 0.55, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700, marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function AddArtistModal({ currentUser, onClose, onSent }) {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [successId, setSuccessId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    listArtists()
      .then((res) => {
        if (cancelled) return;
        if (res.ok) setArtists(res.artists || []);
        else setError(res.error || "Could not load artists");
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return artists;
    return artists.filter((a) =>
      (a.name || "").toLowerCase().includes(q) ||
      (a.email || "").toLowerCase().includes(q)
    );
  }, [artists, query]);

  const send = async (artist) => {
    setBusyId(artist.userId);
    setError("");
    try {
      const out = await requestMessage({
        toUserId: artist.userId,
        toName: artist.name,
        toEmail: artist.email,
        intro: "",
      });
      if (out.note === "conversation exists" || out.note === "already approved") {
        setSuccessId(artist.userId);
        setTimeout(onSent, 900);
      } else {
        setSuccessId(artist.userId);
        setTimeout(onSent, 900);
      }
    } catch (e) {
      if (e.code === "email-not-verified") setError("Verify your email before messaging.");
      else if (e.code === "cooldown") setError("You can try again in a few days.");
      else setError(e.message);
    } finally {
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
              placeholder="Search artists..."
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
          {loading && <div style={{ padding: 12, opacity: 0.6, fontSize: 13 }}>Loading artists...</div>}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: 12, opacity: 0.6, fontSize: 13 }}>No artists match.</div>
          )}
          {filtered.map((a) => {
            const busy = busyId === a.userId;
            const sent = successId === a.userId;
            return (
              <button
                key={a.userId}
                onClick={() => send(a)}
                disabled={busy || sent}
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
                  {a.name?.[0]?.toUpperCase() || "?"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {a.name}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {a.role === "admin" ? "Admin" : "Artist"}
                  </div>
                </div>
                <div style={{ flexShrink: 0, fontSize: 11.5, color: sent ? "#4be88a" : theme.accent, fontWeight: 600 }}>
                  {sent ? "Sent ✓" : busy ? "..." : "Message"}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
