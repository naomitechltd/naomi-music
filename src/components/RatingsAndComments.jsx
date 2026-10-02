import React, { useEffect, useState } from "react";
import { Star, Trash2, Send } from "lucide-react";
import { submitRating, listRatings, submitComment, listComments, deleteComment } from "../lib/api";
import { fileUrl } from "../lib/appwrite";
import { theme, inputStyle } from "./ui";

export function RatingsAndComments({ songId, currentUser }) {
  const [rating, setRating] = useState({ average: 0, total: 0, myRating: 0 });
  const [hoverValue, setHoverValue] = useState(0);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadRatings = async () => {
    try {
      const r = await listRatings(songId);
      setRating({ average: r.average || 0, total: r.total || 0, myRating: r.myRating || 0 });
    } catch {}
  };

  const loadAllComments = async () => {
    setLoadingComments(true);
    try {
      const res = await listComments(songId, 100);
      setComments(res.comments || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    setComments([]);
    setRating({ average: 0, total: 0, myRating: 0 });
    loadRatings();
    loadAllComments();
  }, [songId]);

  const setMyRating = async (v) => {
    try {
      await submitRating(songId, v);
      await loadRatings();
    } catch (e) {
      setError(e.message);
    }
  };

  const sendComment = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setBusy(true);
    setError("");
    try {
      const res = await submitComment(songId, trimmed);
      if (res.comment) {
        setComments((c) => [res.comment, ...c]);
      } else {
        await loadAllComments();
      }
      setText("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    try {
      await deleteComment(id);
      setComments((c) => c.filter((x) => x.$id !== id));
    } catch (e) {
      setError(e.message);
    }
  };

  const canDelete = (c) => c.userId === currentUser?.$id || currentUser?.role === "admin";

  return (
    <div style={{ marginTop: 30, paddingTop: 22, borderTop: `1px solid ${theme.border}` }}>
      {/* Ratings */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Rating</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", gap: 2 }}>
              {[1, 2, 3, 4, 5].map((n) => {
                const active = (hoverValue || rating.myRating) >= n;
                return (
                  <button
                    key={n}
                    onClick={() => setMyRating(n)}
                    onMouseEnter={() => setHoverValue(n)}
                    onMouseLeave={() => setHoverValue(0)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
                  >
                    <Star
                      size={24}
                      fill={active ? "#ffb800" : "none"}
                      color={active ? "#ffb800" : theme.textDim}
                    />
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 13, opacity: 0.75 }}>
              {rating.total > 0 ? (
                <>{rating.average.toFixed(1)} / 5 · {rating.total} rating{rating.total === 1 ? "" : "s"}</>
              ) : (
                <>No ratings yet</>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Comments */}
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
        Comments {comments.length > 0 && <span style={{ opacity: 0.5, fontWeight: 500 }}>({comments.length})</span>}
      </div>

      {/* Composer */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "flex-end" }}>
        <textarea
          rows={1}
          style={{ ...inputStyle(), minHeight: 42, maxHeight: 120, resize: "none", paddingTop: 10, paddingBottom: 10 }}
          placeholder="Add a comment…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          disabled={busy}
        />
        <button
          onClick={sendComment}
          disabled={busy || !text.trim()}
          style={{
            background: theme.accent,
            border: "none",
            borderRadius: 8,
            color: "#fff",
            width: 42, height: 42,
            cursor: busy || !text.trim() ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: busy || !text.trim() ? 0.5 : 1,
            flexShrink: 0,
          }}
        >
          <Send size={16} />
        </button>
      </div>

      {error && <div style={{ color: theme.danger, fontSize: 12.5, marginBottom: 12 }}>{error}</div>}

      {loadingComments && <div style={{ opacity: 0.6, fontSize: 13 }}>Loading comments…</div>}
      {!loadingComments && comments.length === 0 && (
        <div style={{ opacity: 0.5, fontSize: 13 }}>No comments yet — be the first.</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {comments.map((c) => (
          <div key={c.$id} style={{ display: "flex", gap: 10, padding: "10px 12px", background: theme.bgRaised, border: `1px solid ${theme.border}`, borderRadius: 10 }}>
            {c.userAvatarId ? (
              <img src={fileUrl(c.userAvatarId)} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
            ) : (
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: theme.bg, display: "flex", alignItems: "center", justifyContent: "center", color: theme.accent, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                {c.userName?.[0]?.toUpperCase() || "?"}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{c.userName}</div>
                <div style={{ fontSize: 11, opacity: 0.5 }}>
                  {c.$createdAt ? new Date(c.$createdAt).toLocaleDateString() : ""}
                </div>
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {c.body}
              </div>
            </div>
            {canDelete(c) && (
              <button
                onClick={() => remove(c.$id)}
                title="Delete"
                style={{ background: "none", border: "none", cursor: "pointer", color: theme.danger, opacity: 0.6, display: "flex", padding: 4 }}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
