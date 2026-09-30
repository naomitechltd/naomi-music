import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, Send, Paperclip, X, FileText, MoreVertical } from "lucide-react";
import { client, storage, ID, BUCKET_ID, Permission, Role, fileUrl, DATABASE_ID, MESSAGES_TABLE_ID } from "../lib/appwrite";
import { listMessages, sendMessage, markRead, blockUser, unblockUser, listBlocks } from "../lib/api";
import { ReportModal } from "../components/ReportModal";
import { theme, inputStyle } from "../components/ui";

const MAX_ATTACH_BYTES = 1048576;

export function ChatView({ conversation, currentUser, onBack }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const scrollRef = useRef(null);
  const fileRef = useRef(null);

  const otherIdx = conversation.participants[0] === currentUser.$id ? 1 : 0;
  const otherName = conversation.userNames?.[otherIdx] || "Unknown";

  const load = async (opts = {}) => {
    if (!opts.quiet) setLoading(true);
    try {
      const res = await listMessages(conversation.$id);
      setMessages(res.messages || []);
      await markRead(conversation.$id).catch(() => {});
    } catch (e) {
      if (!opts.quiet) setError(e.message);
    } finally {
      if (!opts.quiet) setLoading(false);
    }
  };

  useEffect(() => { load(); }, [conversation.$id]);

  useEffect(() => {
    listBlocks()
      .then((res) => {
        const other = conversation.participants.find((p) => p !== currentUser.$id);
        setBlocked((res.blocked || []).some((b) => b.userId === other));
      })
      .catch(() => {});
  }, [conversation.$id]);

  // Realtime: subscribe to messages in this conversation
  useEffect(() => {
    let unsub;
    try {
      unsub = client.subscribe(
        `databases.${DATABASE_ID}.collections.${MESSAGES_TABLE_ID}.documents`,
        (response) => {
          const events = response?.events || [];
          const payload = response?.payload;
          if (!payload) return;
          if (payload.conversationId !== conversation.$id) return;

          if (events.some((e) => e.endsWith(".create"))) {
            setMessages((prev) => {
              if (prev.some((m) => m.$id === payload.$id)) return prev;
              const next = [...prev, payload];
              next.sort((a, b) => new Date(a.$createdAt) - new Date(b.$createdAt));
              return next;
            });
            // Mark read for the just-received message
            markRead(conversation.$id).catch(() => {});
          } else if (events.some((e) => e.endsWith(".delete"))) {
            setMessages((prev) => prev.filter((m) => m.$id !== payload.$id));
          } else if (events.some((e) => e.endsWith(".update"))) {
            setMessages((prev) => prev.map((m) => (m.$id === payload.$id ? payload : m)));
          }
        }
      );
    } catch (e) {
      console.warn("realtime subscribe failed:", e.message);
    }
    return () => { if (unsub) unsub(); };
  }, [conversation.$id]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const pickFile = (f) => {
    if (!f) return;
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "txt"].includes(ext)) {
      setError("Only PDF and TXT files allowed.");
      return;
    }
    if (f.size > MAX_ATTACH_BYTES) {
      setError("Attachment must be 1 MB or smaller.");
      return;
    }
    setError("");
    setAttachment({
      file: f,
      name: f.name,
      size: f.size,
      mime: f.type || (ext === "pdf" ? "application/pdf" : "text/plain"),
    });
  };

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed && !attachment) return;
    setSending(true);
    setError("");
    try {
      let attachmentFileId = "", attachmentName = "", attachmentMime = "";
      if (attachment) {
        const perm = [
          Permission.read(Role.users()),
          Permission.update(Role.user(currentUser.$id)),
          Permission.delete(Role.user(currentUser.$id)),
        ];
        const uploaded = await storage.createFile(BUCKET_ID, ID.unique(), attachment.file, perm);
        attachmentFileId = uploaded.$id;
        attachmentName = attachment.name;
        attachmentMime = attachment.mime;
      }
      await sendMessage({
        conversationId: conversation.$id,
        text: trimmed,
        attachmentFileId,
        attachmentName,
        attachmentMime,
      });
      setText("");
      setAttachment(null);
      await load({ quiet: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 56,
        left: 0,
        right: 0,
        bottom: 0,
        maxWidth: 640,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: theme.bg,
        zIndex: 50,
      }}
    >
      {/* Header — locked */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 16px",
          borderBottom: `1px solid ${theme.border}`,
          background: theme.navBg,
          height: 56,
          boxSizing: "border-box",
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: theme.text,
            display: "flex",
            padding: 4,
          }}
        >
          <ChevronLeft size={24} />
        </button>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: theme.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: theme.accent,
            fontWeight: 700,
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          {otherName[0]?.toUpperCase() || "?"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {otherName}
          </div>
        </div>
        <button
          onClick={() => setShowMenu((v) => !v)}
          style={{ background: "none", border: "none", cursor: "pointer", color: theme.text, display: "flex", padding: 6 }}
        >
          <MoreVertical size={18} />
        </button>
      </div>

      {showMenu && (
        <div
          onClick={() => setShowMenu(false)}
          style={{ position: "absolute", top: 56, right: 12, zIndex: 200, background: theme.bgRaised, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 6, minWidth: 180, boxShadow: "0 12px 30px rgba(0,0,0,0.5)" }}
        >
          <button
            onClick={async () => {
              setShowMenu(false);
              const other = conversation.participants.find((p) => p !== currentUser.$id);
              try {
                if (blocked) {
                  await unblockUser(other);
                  setBlocked(false);
                } else {
                  await blockUser(other);
                  setBlocked(true);
                }
              } catch (e) { setError(e.message); }
            }}
            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", background: "none", border: "none", color: theme.text, cursor: "pointer", fontSize: 13.5, fontFamily: "inherit", textAlign: "left", borderRadius: 6 }}
          >
            {blocked ? "Unblock user" : "Block user"}
          </button>
          <button
            onClick={() => { setShowMenu(false); setShowReport(true); }}
            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", background: "none", border: "none", color: theme.danger, cursor: "pointer", fontSize: 13.5, fontFamily: "inherit", textAlign: "left", borderRadius: 6 }}
          >
            Report user
          </button>
        </div>
      )}

      {showReport && (
        <ReportModal
          targetType="user"
          targetId={conversation.participants.find((p) => p !== currentUser.$id)}
          targetLabel={otherName}
          onClose={() => setShowReport(false)}
        />
      )}

      {/* Messages — the ONLY scrollable area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          padding: "14px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {loading && (
          <div style={{ opacity: 0.6, fontSize: 13, margin: "auto" }}>Loading…</div>
        )}

        {!loading && messages.length === 0 && (
          <div
            style={{
              margin: "auto",
              textAlign: "center",
              opacity: 0.55,
              fontSize: 13,
              padding: 24,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 10 }}>👋</div>
            Say hi to {otherName.split(" ")[0]}
          </div>
        )}

        {messages.map((m) => {
          const mine = m.senderUserId === currentUser.$id;
          return (
            <div
              key={m.$id}
              style={{
                display: "flex",
                justifyContent: mine ? "flex-end" : "flex-start",
                marginBottom: 2,
              }}
            >
              <div
                style={{
                  maxWidth: "78%",
                  background: mine ? theme.bubbleMine : theme.bubble,
                  color: mine ? theme.bubbleMineText : theme.text,
                  border: mine ? "none" : `1px solid ${theme.border}`,
                  borderRadius: 18,
                  padding: "8px 14px",
                  fontSize: 14,
                  lineHeight: 1.4,
                  wordBreak: "break-word",
                  borderBottomRightRadius: mine ? 4 : 18,
                  borderBottomLeftRadius: mine ? 18 : 4,
                }}
              >
                {m.body && <div style={{ whiteSpace: "pre-wrap" }}>{m.body}</div>}
                {m.attachmentField && (
                  <a
                    href={fileUrl(m.attachmentField)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      color: mine ? "#fff" : theme.accent,
                      fontSize: 12.5,
                      marginTop: m.body ? 6 : 0,
                      textDecoration: "underline",
                    }}
                  >
                    <FileText size={14} /> {m.attachmentName || "attachment"}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Attachment preview */}
      {attachment && (
        <div
          style={{
            flexShrink: 0,
            margin: "6px 12px 0",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            background: theme.bgRaised,
            border: `1px solid ${theme.border}`,
            borderRadius: 10,
            fontSize: 12.5,
          }}
        >
          <FileText size={14} />
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {attachment.name}
          </span>
          <span style={{ opacity: 0.5 }}>{(attachment.size / 1024).toFixed(0)} KB</span>
          <button
            onClick={() => setAttachment(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: theme.text,
              display: "flex",
              padding: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {error && (
        <div
          style={{
            flexShrink: 0,
            padding: "6px 16px",
            color: theme.danger,
            fontSize: 12.5,
          }}
        >
          {error}
        </div>
      )}

      {blocked && (
        <div style={{ flexShrink: 0, padding: "10px 16px", background: "rgba(255,107,107,0.12)", borderTop: `1px solid ${theme.border}`, fontSize: 12.5, color: theme.danger, textAlign: "center" }}>
          This user is blocked. Unblock from the ⋯ menu to message them.
        </div>
      )}

      {/* Input bar — locked */}
      <div
        style={{
          flexShrink: 0,
          padding: "8px 12px calc(8px + env(safe-area-inset-bottom))",
          display: blocked ? "none" : "flex",
          alignItems: "flex-end",
          gap: 8,
          background: theme.bg,
        }}
      >
        <button
          onClick={() => fileRef.current?.click()}
          disabled={sending}
          title="Attach PDF or TXT (max 1 MB)"
          style={{
            background: theme.bgRaised,
            border: `1px solid ${theme.border}`,
            borderRadius: "50%",
            color: theme.text,
            opacity: 0.8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <Paperclip size={18} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          style={{ display: "none" }}
          onChange={(e) => {
            pickFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <textarea
          rows={1}
          placeholder="Message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          disabled={sending}
          style={{
            flex: 1,
            background: theme.bgRaised,
            border: `1px solid ${theme.border}`,
            borderRadius: 20,
            color: theme.text,
            padding: "10px 16px",
            fontSize: 14,
            fontFamily: "inherit",
            outline: "none",
            resize: "none",
            minHeight: 40,
            maxHeight: 100,
            boxSizing: "border-box",
            lineHeight: 1.4,
          }}
        />
        <button
          onClick={send}
          disabled={sending || (!text.trim() && !attachment)}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: theme.accent,
            border: "none",
            color: "#fff",
            cursor: sending ? "wait" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            opacity: sending || (!text.trim() && !attachment) ? 0.5 : 1,
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
