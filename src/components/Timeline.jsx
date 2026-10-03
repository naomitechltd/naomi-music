import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X, Trash2, Calendar } from "lucide-react";
import { listTimeline, addTimelineEntry, deleteTimelineEntry, listPeople } from "../lib/api";
import { theme, inputStyle, Button } from "../components/ui";

// Parse "@[Name](userId)" tokens into clickable mentions
function renderContent(text, navigate) {
  const parts = [];
  const re = /@\[([^\]]+)\]\(([a-zA-Z0-9]+)\)/g;
  let lastIdx = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIdx) parts.push({ type: "text", value: text.slice(lastIdx, m.index) });
    parts.push({ type: "mention", name: m[1], userId: m[2] });
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) parts.push({ type: "text", value: text.slice(lastIdx) });

  return parts.map((p, i) => {
    if (p.type === "text") return <span key={i}>{p.value}</span>;
    return (
      <button
        key={i}
        onClick={(e) => { e.stopPropagation(); navigate(`/artist/${p.userId}`); }}
        style={{
          background: "none", border: "none", padding: 0,
          color: theme.accent, cursor: "pointer",
          fontFamily: "inherit", fontSize: "inherit",
          fontWeight: 600, textDecoration: "underline",
        }}
      >
        @{p.name}
      </button>
    );
  });
}

export function Timeline({ userId, isOwnProfile, currentUser }) {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [year, setYear] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [people, setPeople] = useState([]);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionIndex, setMentionIndex] = useState(-1);
  const textareaRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await listTimeline(userId);
      setEntries(res.entries || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [userId]);

  // Load people for mentions when editor opens
  useEffect(() => {
    if (!showEditor || people.length > 0) return;
    listPeople().then((res) => setPeople(res.people || [])).catch(() => {});
  }, [showEditor]);

  const onContentChange = (e) => {
    const val = e.target.value;
    setContent(val);

    // Detect "@" in progress
    const cursorPos = e.target.selectionStart;
    const before = val.slice(0, cursorPos);
    const lastAt = before.lastIndexOf("@");
    if (lastAt >= 0) {
      const after = before.slice(lastAt + 1);
      if (!/[\[\]\s]/.test(after) && after.length < 30) {
        setMentionQuery(after);
        setMentionIndex(lastAt);
        return;
      }
    }
    setMentionQuery(null);
    setMentionIndex(-1);
  };

  const insertMention = (person) => {
    if (mentionIndex < 0) return;
    const before = content.slice(0, mentionIndex);
    const after = content.slice(mentionIndex + 1 + (mentionQuery?.length || 0));
    const token = `@[${person.name}](${person.userId})`;
    const next = before + token + after;
    setContent(next);
    setMentionQuery(null);
    setMentionIndex(-1);
    if (textareaRef.current) {
      const pos = before.length + token.length;
      textareaRef.current.focus();
      setTimeout(() => textareaRef.current?.setSelectionRange(pos, pos), 0);
    }
  };

  const submit = async () => {
    if (!year.trim() || !content.trim()) {
      setError("Enter a year and some text.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await addTimelineEntry(year.trim(), content.trim());
      setYear("");
      setContent("");
      setShowEditor(false);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this timeline entry?")) return;
    try {
      await deleteTimelineEntry(id);
      setEntries((e) => e.filter((x) => x.$id !== id));
    } catch (e) {
      setError(e.message);
    }
  };

  const suggestedMentions = mentionQuery !== null && mentionQuery.length >= 1
    ? people.filter((p) => p.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 5)
    : [];

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Music journey</div>
        {isOwnProfile && !showEditor && (
          <button
            onClick={() => setShowEditor(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: theme.accent, color: "#fff",
              border: "none", borderRadius: 10,
              padding: "8px 14px", cursor: "pointer",
              fontFamily: "inherit", fontSize: 12.5, fontWeight: 600,
            }}
          >
            <Plus size={14} /> Add year
          </button>
        )}
      </div>

      {showEditor && (
        <div style={{ background: theme.bgRaised, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>New entry</div>
            <button onClick={() => { setShowEditor(false); setYear(""); setContent(""); }} style={{ background: "none", border: "none", color: theme.text, cursor: "pointer", display: "flex" }}>
              <X size={18} />
            </button>
          </div>

          <input
            style={{ ...inputStyle(), marginBottom: 10, maxWidth: 160 }}
            placeholder="Year (e.g. 2021)"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            maxLength={20}
          />

          <div style={{ position: "relative" }}>
            <textarea
              ref={textareaRef}
              rows={5}
              style={{ ...inputStyle(), resize: "vertical", fontFamily: "inherit" }}
              placeholder="Write about this year… use @ to mention an artist"
              value={content}
              onChange={onContentChange}
              maxLength={2000}
            />
            {suggestedMentions.length > 0 && (
              <div style={{
                position: "absolute", top: "100%", left: 0, zIndex: 50,
                background: theme.bgRaised, border: `1px solid ${theme.border}`,
                borderRadius: 10, minWidth: 200,
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)", marginTop: 4,
              }}>
                {suggestedMentions.map((p) => (
                  <button
                    key={p.userId}
                    onClick={() => insertMention(p)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      width: "100%", padding: "9px 12px",
                      background: "none", border: "none",
                      cursor: "pointer", color: theme.text,
                      fontFamily: "inherit", fontSize: 13,
                      textAlign: "left",
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    <span style={{ opacity: 0.5, fontSize: 11 }}>{p.role}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ fontSize: 11, opacity: 0.5, textAlign: "right", marginTop: 4 }}>
            {content.length}/2000
          </div>

          {error && <div style={{ color: theme.danger, fontSize: 12.5, marginTop: 8 }}>{error}</div>}

          <Button onClick={submit} disabled={busy} style={{ marginTop: 10, width: "100%" }}>
            {busy ? "Saving..." : "Save entry"}
          </Button>
        </div>
      )}

      {loading && <div style={{ opacity: 0.6, fontSize: 13 }}>Loading...</div>}
      {!loading && entries.length === 0 && !showEditor && (
        <div style={{ opacity: 0.55, fontSize: 14, fontStyle: "italic" }}>
          {isOwnProfile ? "Add your first entry to tell your story." : "No journey entries yet."}
        </div>
      )}

      <div style={{ position: "relative", paddingLeft: 24 }}>
        {/* Vertical line */}
        {entries.length > 0 && (
          <div style={{
            position: "absolute", left: 7, top: 8, bottom: 8,
            width: 2, background: theme.border,
          }} />
        )}

        {entries.map((e) => (
          <div key={e.$id} style={{ position: "relative", marginBottom: 22 }}>
            <div style={{
              position: "absolute", left: -22, top: 5,
              width: 14, height: 14, borderRadius: "50%",
              background: theme.accent,
              border: `3px solid ${theme.bg}`,
            }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: theme.accent }}>{e.year}</div>
              {isOwnProfile && (
                <button
                  onClick={() => remove(e.$id)}
                  title="Delete"
                  style={{ background: "none", border: "none", color: theme.danger, opacity: 0.5, cursor: "pointer", padding: 2, display: "flex" }}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.7, opacity: 0.9, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {renderContent(e.content, navigate)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
