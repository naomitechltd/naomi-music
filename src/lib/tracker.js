import { functions } from "./appwrite";

let sessionId = null;
let sessionStartedAt = null;
let queue = [];
let flushing = false;
let currentUserId = null;

function uuid() {
  return "s_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function initTracker() {
  if (sessionId) return;
  sessionId = uuid();
  sessionStartedAt = Date.now();

  try { localStorage.setItem("naomi_session_id", sessionId); } catch {}

  // Global error handler
  window.addEventListener("error", (e) => {
    track("error", {
      page: window.location.pathname,
      metadata: `${e.message || "unknown"} at ${e.filename || "?"}:${e.lineno || 0}`,
    });
  });

  // Unhandled promise rejections
  window.addEventListener("unhandledrejection", (e) => {
    track("error", {
      page: window.location.pathname,
      metadata: `promise: ${(e.reason && e.reason.message) || String(e.reason || "unknown")}`.slice(0, 500),
    });
  });

  // Periodic flush every 15s
  setInterval(() => flush(), 15000);

  // Flush on page hide
  window.addEventListener("pagehide", () => flush(true));
  window.addEventListener("beforeunload", () => flush(true));

  // Heartbeat every 30s
  setInterval(() => {
    track("heartbeat", {
      page: window.location.pathname,
      durationMs: Date.now() - sessionStartedAt,
    });
    flush();
  }, 30000);
}

export function setTrackerUser(userId) {
  currentUserId = userId || null;
}

export function track(type, data = {}) {
  if (!sessionId) return;
  queue.push({
    type,
    page: data.page || window.location.pathname,
    songId: data.songId || "",
    durationMs: data.durationMs || (sessionStartedAt ? Date.now() - sessionStartedAt : 0),
    value: data.value || 0,
    metadata: (data.metadata || "").slice(0, 500),
  });

  if (queue.length >= 20) flush();
}

export async function flush(immediate = false) {
  if (flushing || queue.length === 0) return;
  flushing = true;
  const batch = queue.splice(0, 50);

  try {
    await functions.createExecution(
      "api",
      JSON.stringify({
        action: "log-events",
        sessionId,
        events: batch,
      }),
      false
    );
  } catch {
    // Put events back if it failed (unless we're unloading)
    if (!immediate) queue.unshift(...batch);
  } finally {
    flushing = false;
  }
}

export function getSessionId() {
  return sessionId;
}
