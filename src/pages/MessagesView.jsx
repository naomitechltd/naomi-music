import React, { useEffect, useState, useMemo } from "react";
import { Check, X, MessageSquare, ChevronRight } from "lucide-react";
import { listRequests, listConversations, respondRequest } from "../lib/api";
import { theme, Button } from "../components/ui";

export function MessagesView({ currentUser, onOpenChat }) {
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

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
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Messages</div>

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
          {pendingOutgoing.map((r) => (
            <div key={r.$id} style={{ border: `1px solid ${theme.border}`, borderRadius: 6, padding: 12, marginBottom: 8, opacity: 0.75 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.toName || r.toEmail}</div>
              <div style={{ fontSize: 11.5, opacity: 0.6, marginTop: 2 }}>Waiting for approval…</div>
            </div>
          ))}
        </Section>
      )}

      <Section title="Conversations">
        {!loading && conversations.length === 0 && (
          <div style={{ opacity: 0.6, fontSize: 13 }}>No conversations yet.</div>
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
