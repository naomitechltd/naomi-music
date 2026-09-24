import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, Send, Paperclip, X, FileText } from "lucide-react";
import { storage, ID, BUCKET_ID, Permission, Role, fileUrl } from "../lib/appwrite";
import { listMessages, sendMessage, markRead } from "../lib/api";
import { theme, inputStyle } from "../components/ui";

const MAX_ATTACH_BYTES = 1048576; // 1 MB

export function ChatView({ conversation, currentUser, onBack }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState(null); // { file, name, size, mime }
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

  // Poll for new messages every 6s
  useEffect(() => {
    const t = setInterval(() => load({ quiet: true }), 6000);
    return () => clearInterval(t);
  }, [conversation.$id]);

  // Auto-scroll to bottom when messages change
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
    setAttachment({ file: f, name: f.name, size: f.size, mime: f.type || (ext === "pdf" ? "application/pdf" : "text/plain") });
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
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px 16px 0", display: "flex", flexDirection: "column", height: "calc(100vh - 60px)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 12, borderBottom: `1px solid ${theme.border}`, marginBottom: 12 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: theme.text, display: "flex", padding: 4 }}>
          <ChevronLeft size={20} />
        </button>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{otherName}</div>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", paddingBottom: 12 }}>
        {loading && <div style={{ opacity: 0.6, fontSize: 13 }}>Loading...</div>}
        {!loading && messages.length === 0 && <div style={{ opacity: 0.6, fontSize: 13 }}>Say hi!</div>}

        {messages.map((m) => {
          const mine = m.senderUserId === currentUser.$id;
          return (
            <div key={m.$id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: 8 }}>
              <div
                style={{
                  maxWidth: "78%",
                  background: mine ? theme.accent : theme.bgRaised,
                  color: mine ? "#fff" : theme.text,
                  border: mine ? "none" : `1px solid ${theme.border}`,
                  borderRadius: 14,
                  padding: "8px 12px",
                  fontSize: 13.5,
                  lineHeight: 1.45,
                  wordBreak: "break-word",
                }}
              >
                {m.body && <div style={{ whiteSpace: "pre-wrap" }}>{m.body}</div>}
                {m.attachmentFileId && (
                  <a
                    href={fileUrl(m.attachmentFileId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, color: mine ? "#fff" : theme.accent, fontSize: 12.5, marginTop: m.body ? 6 : 0, textDecoration: "underline" }}
                  >
                    <FileText size={14} /> {m.attachmentName || "attachment"}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && <div style={{ color: theme.danger, fontSize: 12.5, marginBottom: 6 }}>{error}</div>}

      {attachment && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: theme.bgRaised, border: `1px solid ${theme.border}`, borderRadius: 6, marginBottom: 8, fontSize: 12.5 }}>
          <FileText size={14} />
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{attachment.name}</span>
          <span style={{ opacity: 0.5 }}>{(attachment.size / 1024).toFixed(0)} KB</span>
          <button onClick={() => setAttachment(null)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.text, display: "flex", padding: 0 }}>
            <X size={14} />
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", padding: "10px 0 14px", borderTop: `1px solid ${theme.border}` }}>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={sending}
          style={{ background: "none", border: "none", cursor: "pointer", color: theme.text, opacity: 0.7, display: "flex", padding: 10 }}
          title="Attach PDF or TXT (max 1 MB)"
        >
          <Paperclip size={18} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          style={{ display: "none" }}
          onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }}
        />
        <textarea
          rows={1}
          style={{ ...inputStyle(), resize: "none", minHeight: 42, maxHeight: 120, paddingTop: 10, paddingBottom: 10 }}
          placeholder="Message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          disabled={sending}
        />
        <button
          onClick={send}
          disabled={sending || (!text.trim() && !attachment)}
          style={{
            background: theme.accent, border: "none", borderRadius: 8,
            color: "#fff", cursor: sending ? "wait" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 42, height: 42, opacity: sending || (!text.trim() && !attachment) ? 0.5 : 1,
            flexShrink: 0,
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
