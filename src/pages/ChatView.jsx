import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, Send, Paperclip, X, FileText } from "lucide-react";
import { storage, ID, BUCKET_ID, Permission, Role, fileUrl } from "../lib/appwrite";
import { listMessages, sendMessage, markRead } from "../lib/api";
import { theme, inputStyle } from "../components/ui";

const MAX_ATTACH_BYTES = 1048576;

export function ChatView({ conversation, currentUser, onBack }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
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
    const t = setInterval(() => load({ quiet: true }), 6000);
    return () => clearInterval(t);
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
          background: theme.bgRaised,
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
      </div>

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
                  background: mine ? theme.accent : theme.bgRaised,
                  color: mine ? "#fff" : theme.text,
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

      {/* Input bar — locked */}
      <div
        style={{
          flexShrink: 0,
          padding: "8px 12px calc(8px + env(safe-area-inset-bottom))",
          display: "flex",
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
