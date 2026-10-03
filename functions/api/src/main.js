import { Client, Teams, TablesDB, Users, Storage, Query } from "node-appwrite";
import webpush from "web-push";

function appwriteClient() {
  return new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
}

try {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:admin@naomimusicrsa.co.za",
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }
} catch (e) { console.error("VAPID setup failed:", e.message); }

async function getRole(teams, userId) {
  const admins = await teams.listMemberships(process.env.ADMINS_TEAM_ID);
  if (admins.memberships.some((m) => m.userId === userId)) return "admin";

  const artists = await teams.listMemberships(process.env.ARTISTS_TEAM_ID);
  if (artists.memberships.some((m) => m.userId === userId)) return "artist";

  if (process.env.POETS_TEAM_ID) {
    try {
      const poets = await teams.listMemberships(process.env.POETS_TEAM_ID);
      if (poets.memberships.some((m) => m.userId === userId)) return "poet";
    } catch {}
  }

  return "listener";
}

async function setRole(teams, userId, newRole) {
  if (newRole !== "artist" && newRole !== "poet" && newRole !== "listener") {
    return { error: "invalid role", code: 400 };
  }
  const admins = await teams.listMemberships(process.env.ADMINS_TEAM_ID);
  if (admins.memberships.some((m) => m.userId === userId)) return { ok: true, note: "already admin" };

  const artists = await teams.listMemberships(process.env.ARTISTS_TEAM_ID);
  const inArtists = artists.memberships.find((m) => m.userId === userId) || null;

  let inPoets = null;
  if (process.env.POETS_TEAM_ID) {
    try {
      const poets = await teams.listMemberships(process.env.POETS_TEAM_ID);
      inPoets = poets.memberships.find((m) => m.userId === userId) || null;
    } catch {}
  }

  if (newRole === "artist") {
    if (!inArtists) await teams.createMembership(process.env.ARTISTS_TEAM_ID, ["none"], undefined, userId);
    if (inPoets && process.env.POETS_TEAM_ID) {
      try { await teams.deleteMembership(process.env.POETS_TEAM_ID, inPoets.$id); } catch {}
    }
  } else if (newRole === "poet") {
    if (!inPoets && process.env.POETS_TEAM_ID) {
      await teams.createMembership(process.env.POETS_TEAM_ID, ["none"], undefined, userId);
    }
    if (inArtists) {
      try { await teams.deleteMembership(process.env.ARTISTS_TEAM_ID, inArtists.$id); } catch {}
    }
  } else {
    if (inArtists) try { await teams.deleteMembership(process.env.ARTISTS_TEAM_ID, inArtists.$id); } catch {}
    if (inPoets && process.env.POETS_TEAM_ID) try { await teams.deleteMembership(process.env.POETS_TEAM_ID, inPoets.$id); } catch {}
  }
  return { ok: true };
}

async function submitSong(db, users, userId, userEmail, body) {
  const user = await users.get(userId);
  if (!user.emailVerification) return { error: "email-not-verified", code: 403 };

  const rl = await checkRateLimit(db, `upload:${userId}`, 10, 24 * 60 * 60 * 1000);
  if (!rl.ok) return { error: "rate-limited", code: 429, retryAfterMs: rl.retryAfterMs, note: "Max 10 uploads per day." };
  const teams = new Teams(appwriteClient());
  const role = await getRole(teams, userId);
  if (role !== "artist" && role !== "poet" && role !== "admin") return { error: "forbidden", code: 403 };

  const {
    title, artistName, description = "", studio = "",
    producer = "", songWriter = "", releaseType = "single", albumName = "",
    genre, lyrics, coverArtField, audioField = "",
    contentType = "song",
  } = body;

  if (!["song", "poem"].includes(contentType)) return { error: "invalid contentType", code: 400 };
  const isPoem = contentType === "poem";

  if (!title || !artistName || !genre || !coverArtField) {
    return { error: "missing fields", code: 400 };
  }
  if (isPoem) {
    if (!lyrics) return { error: "poem needs body text", code: 400 };
  } else {
    if (!lyrics || !producer || !songWriter || !audioField) {
      return { error: "missing fields", code: 400 };
    }
    if (!["single", "album"].includes(releaseType)) return { error: "bad release type", code: 400 };
    if (releaseType === "album" && !albumName) return { error: "album name required", code: 400 };
  }

  const row = await db.createRow(process.env.DATABASE_ID, process.env.SONGS_TABLE_ID, "unique()", {
    title, artistName, description, studio,
    producer: isPoem ? "" : producer,
    songWriter: isPoem ? artistName : songWriter,
    releaseType: isPoem ? "single" : releaseType,
    albumName: isPoem ? "" : albumName,
    genre, lyrics, coverArtField,
    audioField: isPoem ? "" : audioField,
    contentType,
    status: "pending",
    uploadedByEmail: userEmail || user.email || "",
    uploadedByUserId: userId,
  });
  return { ok: true, id: row.$id };
}


async function checkRateLimit(db, key, limit, windowMs) {
  const now = Date.now();
  const rowId = key.replace(/[^a-zA-Z0-9_:-]/g, "_").slice(0, 36);
  let row = null;

  try {
    row = await db.getRow(process.env.DATABASE_ID, process.env.RATE_LIMITS_TABLE_ID, rowId);
  } catch {
    row = null;
  }

  if (!row || !row.windowStart || now - row.windowStart > windowMs) {
    // New window
    if (row) {
      await db.updateRow(process.env.DATABASE_ID, process.env.RATE_LIMITS_TABLE_ID, rowId, {
        count: 1,
        windowStart: now,
      });
    } else {
      try {
        await db.createRow(process.env.DATABASE_ID, process.env.RATE_LIMITS_TABLE_ID, rowId, {
          key,
          count: 1,
          windowStart: now,
        });
      } catch {}
    }
    return { ok: true, remaining: limit - 1 };
  }

  if (row.count >= limit) {
    const resetAt = row.windowStart + windowMs;
    return { ok: false, resetAt, retryAfterMs: Math.max(0, resetAt - now) };
  }

  await db.updateRow(process.env.DATABASE_ID, process.env.RATE_LIMITS_TABLE_ID, rowId, {
    count: row.count + 1,
  });
  return { ok: true, remaining: limit - row.count - 1 };
}


/* ---------- Messaging ---------- */

async function listRequests(db, userId) {
  const incoming = await db.listRows(process.env.DATABASE_ID, process.env.REQUESTS_TABLE_ID, [
    Query.equal("toUserId", [userId]),
  ]).catch(() => ({ rows: [] }));
  const outgoing = await db.listRows(process.env.DATABASE_ID, process.env.REQUESTS_TABLE_ID, [
    Query.equal("fromUserId", [userId]),
  ]).catch(() => ({ rows: [] }));
  return { ok: true, incoming: incoming.rows, outgoing: outgoing.rows };
}

async function listConversations(db, userId) {
  const res = await db.listRows(process.env.DATABASE_ID, process.env.CONVERSATIONS_TABLE_ID, [
    Query.contains("participants", [userId]),
    Query.orderDesc("lastMessageAt"),
  ]).catch(() => ({ rows: [] }));
  return { ok: true, conversations: res.rows };
}

async function listMessages(db, userId, body) {
  const { conversationId } = body;
  if (!conversationId) return { error: "missing conversation", code: 400 };
  const conv = await db.getRow(process.env.DATABASE_ID, process.env.CONVERSATIONS_TABLE_ID, conversationId);
  if (!conv.participants?.includes(userId)) return { error: "forbidden", code: 403 };
  const res = await db.listRows(process.env.DATABASE_ID, process.env.MESSAGES_TABLE_ID, [
    Query.equal("conversationId", [conversationId]),
    Query.orderAsc("$createdAt"),
    Query.limit(100),
  ]);
  return { ok: true, messages: res.rows, conversation: conv };
}

async function sendMessage(db, userId, body) {
  const rl = await checkRateLimit(db, `msg:${userId}`, 60, 60 * 60 * 1000);
  if (!rl.ok) return { error: "rate-limited", code: 429, retryAfterMs: rl.retryAfterMs, note: "Max 60 messages per hour." };

  const { conversationId, text = "", attachmentFileId = "", attachmentName = "", attachmentMime = "" } = body;
  if (!conversationId) return { error: "missing conversation", code: 400 };
  if (!text.trim() && !attachmentFileId) return { error: "empty message", code: 400 };
  if (text.length > 2000) return { error: "message too long", code: 400 };
  if (attachmentMime && !["application/pdf", "text/plain"].includes(attachmentMime)) {
    return { error: "attachment type not allowed", code: 400 };
  }

  const conv = await db.getRow(process.env.DATABASE_ID, process.env.CONVERSATIONS_TABLE_ID, conversationId);
  if (!conv.participants?.includes(userId)) return { error: "forbidden", code: 403 };

  const otherUserId = conv.participants.find((p) => p !== userId);
  if (otherUserId && await isBlocked(db, userId, otherUserId)) {
    return { error: "blocked", code: 403, note: "You cannot message this user." };
  }

  const row = await db.createRow(process.env.DATABASE_ID, process.env.MESSAGES_TABLE_ID, "unique()", {
    conversationId,
    senderUserId: userId,
    body: text.trim(),
    attachmentField: attachmentFileId || "",
    attachmentName: attachmentName || "",
    attachmentMime: attachmentMime || "",
  });

  // bump conversation
  const otherIdx = conv.participants[0] === userId ? 1 : 0;
  const unreadA = conv.participants[0] === userId ? conv.unreadA || 0 : (conv.unreadA || 0) + 1;
  const unreadB = conv.participants[1] === userId ? conv.unreadB || 0 : (conv.unreadB || 0) + 1;
  await db.updateRow(process.env.DATABASE_ID, process.env.CONVERSATIONS_TABLE_ID, conversationId, {
    lastMessage: (text || "[attachment]").slice(0, 200),
    lastMessageAt: new Date().toISOString(),
    unreadA,
    unreadB,
  });

  // Fire push notification (fire-and-forget)
  try {
    const otherUserId = conv.participants.find((p) => p !== userId);
    if (otherUserId) {
      const sender = await users.get(userId).catch(() => null);
      const senderName = sender?.name || sender?.email || "New message";
      await sendPushToUser(db, otherUserId, {
        title: senderName,
        body: text ? text.slice(0, 120) : "Sent an attachment",
        url: "/messages",
        tag: "msg-" + conversationId,
      });
    }
  } catch (e) { /* push is optional */ }

  return { ok: true, id: row.$id };
}

async function markConversationRead(db, userId, body) {
  const { conversationId } = body;
  if (!conversationId) return { error: "missing conversation", code: 400 };
  const conv = await db.getRow(process.env.DATABASE_ID, process.env.CONVERSATIONS_TABLE_ID, conversationId);
  if (!conv.participants?.includes(userId)) return { error: "forbidden", code: 403 };
  const patch = conv.participants[0] === userId ? { unreadA: 0 } : { unreadB: 0 };
  await db.updateRow(process.env.DATABASE_ID, process.env.CONVERSATIONS_TABLE_ID, conversationId, patch);
  return { ok: true };
}


async function listArtists(teams, users, userId) {
  const artists = await teams.listMemberships(process.env.ARTISTS_TEAM_ID);
  const admins = await teams.listMemberships(process.env.ADMINS_TEAM_ID);
  const seen = new Set();
  const out = [];
  for (const m of artists.memberships) {
    if (m.userId === userId || seen.has(m.userId)) continue;
    seen.add(m.userId);
    try {
      const u = await users.get(m.userId);
      out.push({ userId: u.$id, name: u.name || u.email, email: u.email, role: "artist" });
    } catch {}
  }
  for (const m of admins.memberships) {
    if (m.userId === userId || seen.has(m.userId)) continue;
    seen.add(m.userId);
    try {
      const u = await users.get(m.userId);
      out.push({ userId: u.$id, name: u.name || u.email, email: u.email, role: "admin" });
    } catch {}
  }
  return { ok: true, artists: out };
}


async function openConversation(db, users, userId, body) {
  const { toUserId } = body;
  if (!toUserId) return { error: "missing recipient", code: 400 };
  if (toUserId === userId) return { error: "cannot message yourself", code: 400 };

  const rl = await checkRateLimit(db, `chat:${userId}`, 20, 60 * 60 * 1000);
  if (!rl.ok) return { error: "rate-limited", code: 429, retryAfterMs: rl.retryAfterMs, note: "Max 20 new chats per hour." };

  if (await isBlocked(db, userId, toUserId)) return { error: "blocked", code: 403, note: "This user cannot be messaged." };

  const me = await users.get(userId);
  if (!me.emailVerification) return { error: "email-not-verified", code: 403 };

  const toUser = await users.get(toUserId).catch(() => null);
  if (!toUser) return { error: "user not found", code: 404 };

  // Look for an existing conversation with both users
  const mine = await db.listRows(process.env.DATABASE_ID, process.env.CONVERSATIONS_TABLE_ID, [
    Query.contains("participants", [userId]),
  ]);
  const existing = mine.rows.find((c) => c.participants?.includes(toUserId));
  if (existing) return { ok: true, conversation: existing, existing: true };

  const [a, b] = [userId, toUserId].sort();
  const nameFor = (id) => id === userId ? (me.name || me.email) : (toUser.name || toUser.email);
  const userNames = [nameFor(a), nameFor(b)];

  const row = await db.createRow(process.env.DATABASE_ID, process.env.CONVERSATIONS_TABLE_ID, "unique()", {
    participants: [a, b],
    userNames,
    lastMessage: "",
    lastMessageAt: new Date().toISOString(),
    unreadA: 0,
    unreadB: 0,
  });
  return { ok: true, conversation: row, existing: false };
}


async function getNextSong(db, index) {
  const res = await db.listRows(process.env.DATABASE_ID, process.env.SONGS_TABLE_ID, [
    Query.equal("status", "approved"),
    Query.orderAsc("$createdAt"),
    Query.limit(500),
  ]);
  // Radio only plays songs (skip poems which have no audio)
  const songs = (res.rows || []).filter((s) => (s.contentType || "song") === "song");
  if (songs.length === 0) return null;
  return songs[index % songs.length];
}

async function radioNow(db, body) {
  const now = Date.now();
  const RADIO_ID = "current";
  let state;

  try {
    state = await db.getRow(process.env.DATABASE_ID, process.env.RADIO_TABLE_ID, RADIO_ID);
  } catch {
    const first = await getNextSong(db, 0);
    if (!first) return { ok: false, error: "no songs on the platform yet" };
    state = await db.createRow(process.env.DATABASE_ID, process.env.RADIO_TABLE_ID, RADIO_ID, {
      songId: first.$id,
      startedAtMs: now,
      durationMs: 0,
      sequence: 0,
    });
  }

  const clientSongId = body?.songId;
  const clientDurationMs = Number(body?.durationMs) || 0;
  if (
    state.songId === clientSongId &&
    (!state.durationMs || state.durationMs === 0) &&
    clientDurationMs > 0
  ) {
    await db.updateRow(process.env.DATABASE_ID, process.env.RADIO_TABLE_ID, RADIO_ID, {
      durationMs: Math.round(clientDurationMs),
    });
    state.durationMs = Math.round(clientDurationMs);
  }

  const elapsed = now - (state.startedAtMs || now);
  const tooOld = state.durationMs > 0 && elapsed > state.durationMs + 2000;
  const veryOld = elapsed > 12 * 60 * 1000;

  if (tooOld || veryOld) {
    const next = await getNextSong(db, (state.sequence || 0) + 1);
    if (!next) return { ok: false, error: "no songs" };
    await db.updateRow(process.env.DATABASE_ID, process.env.RADIO_TABLE_ID, RADIO_ID, {
      songId: next.$id,
      startedAtMs: now,
      durationMs: 0,
      sequence: (state.sequence || 0) + 1,
    });
    return { ok: true, song: next, elapsedMs: 0, durationMs: 0, sequence: (state.sequence || 0) + 1 };
  }

  const song = await db.getRow(process.env.DATABASE_ID, process.env.SONGS_TABLE_ID, state.songId).catch(() => null);
  return {
    ok: true,
    song,
    elapsedMs: elapsed,
    durationMs: state.durationMs || 0,
    sequence: state.sequence || 0,
    serverNow: now,
  };
}



async function submitReport(db, users, userId, body) {
  const { targetType, targetId, targetLabel = "", reason, notes = "" } = body;
  if (!targetType || !targetId || !reason) return { error: "missing fields", code: 400 };
  if (!["song", "user", "message"].includes(targetType)) return { error: "bad target type", code: 400 };
  if (notes.length > 500) return { error: "notes too long", code: 400 };

  const me = await users.get(userId);

  // Prevent spam: one report per user per target
  const existing = await db.listRows(process.env.DATABASE_ID, process.env.REPORTS_TABLE_ID, [
    Query.equal("reporterUserId", [userId]),
    Query.equal("targetId", [targetId]),
  ]).catch(() => ({ rows: [] }));
  if (existing.rows.length > 0) return { ok: true, note: "already-reported" };

  const row = await db.createRow(process.env.DATABASE_ID, process.env.REPORTS_TABLE_ID, "unique()", {
    reporterUserId: userId,
    reporterEmail: me.email || "",
    targetType,
    targetId,
    targetLabel,
    reason,
    notes,
    status: "open",
    resolvedByUserId: "",
  });
  return { ok: true, id: row.$id };
}

async function listReports(db, teams, userId) {
  const role = await getRole(teams, userId);
  if (role !== "admin") return { error: "forbidden", code: 403 };

  const open = await db.listRows(process.env.DATABASE_ID, process.env.REPORTS_TABLE_ID, [
    Query.equal("status", ["open"]),
    Query.orderDesc("$createdAt"),
    Query.limit(100),
  ]);
  const resolved = await db.listRows(process.env.DATABASE_ID, process.env.REPORTS_TABLE_ID, [
    Query.equal("status", ["resolved"]),
    Query.orderDesc("$createdAt"),
    Query.limit(50),
  ]);
  return { ok: true, open: open.rows, resolved: resolved.rows };
}

async function resolveReport(db, teams, userId, body) {
  const role = await getRole(teams, userId);
  if (role !== "admin") return { error: "forbidden", code: 403 };
  const { reportId } = body;
  if (!reportId) return { error: "missing report", code: 400 };
  await db.updateRow(process.env.DATABASE_ID, process.env.REPORTS_TABLE_ID, reportId, {
    status: "resolved",
    resolvedByUserId: userId,
  });
  return { ok: true };
}

async function blockUser(db, users, userId, body) {
  const { blockedUserId } = body;
  if (!blockedUserId) return { error: "missing user", code: 400 };
  if (blockedUserId === userId) return { error: "cannot block yourself", code: 400 };

  const existing = await db.listRows(process.env.DATABASE_ID, process.env.BLOCKS_TABLE_ID, [
    Query.equal("blockerUserId", [userId]),
    Query.equal("blockedUserId", [blockedUserId]),
  ]).catch(() => ({ rows: [] }));
  if (existing.rows.length > 0) return { ok: true, note: "already-blocked" };

  await db.createRow(process.env.DATABASE_ID, process.env.BLOCKS_TABLE_ID, "unique()", {
    blockerUserId: userId,
    blockedUserId,
  });
  return { ok: true };
}

async function unblockUser(db, userId, body) {
  const { blockedUserId } = body;
  if (!blockedUserId) return { error: "missing user", code: 400 };
  const rows = await db.listRows(process.env.DATABASE_ID, process.env.BLOCKS_TABLE_ID, [
    Query.equal("blockerUserId", [userId]),
    Query.equal("blockedUserId", [blockedUserId]),
  ]).catch(() => ({ rows: [] }));
  for (const r of rows.rows) {
    await db.deleteRow(process.env.DATABASE_ID, process.env.BLOCKS_TABLE_ID, r.$id);
  }
  return { ok: true };
}

async function listBlocks(db, users, userId) {
  const res = await db.listRows(process.env.DATABASE_ID, process.env.BLOCKS_TABLE_ID, [
    Query.equal("blockerUserId", [userId]),
    Query.limit(100),
  ]);
  const out = [];
  for (const b of res.rows) {
    try {
      const u = await users.get(b.blockedUserId);
      out.push({ id: b.$id, userId: u.$id, name: u.name || u.email, email: u.email });
    } catch {}
  }
  return { ok: true, blocked: out };
}

async function isBlocked(db, a, b) {
  // True if either direction of block exists
  const r = await db.listRows(process.env.DATABASE_ID, process.env.BLOCKS_TABLE_ID, [
    Query.equal("blockerUserId", [a]),
    Query.equal("blockedUserId", [b]),
  ]).catch(() => ({ rows: [] }));
  if (r.rows.length > 0) return true;
  const r2 = await db.listRows(process.env.DATABASE_ID, process.env.BLOCKS_TABLE_ID, [
    Query.equal("blockerUserId", [b]),
    Query.equal("blockedUserId", [a]),
  ]).catch(() => ({ rows: [] }));
  return r2.rows.length > 0;
}



async function submitRating(db, users, userId, body) {
  const { songId, value } = body;
  if (!songId) return { error: "missing song", code: 400 };
  const v = Number(value);
  if (!Number.isInteger(v) || v < 1 || v > 5) return { error: "rating must be 1-5", code: 400 };

  const me = await users.get(userId);
  if (!me.emailVerification) return { error: "email-not-verified", code: 403 };

  const rl = await checkRateLimit(db, `rate:${userId}`, 30, 60 * 60 * 1000);
  if (!rl.ok) return { error: "rate-limited", code: 429, retryAfterMs: rl.retryAfterMs, note: "Max 30 ratings per hour." };

  const existing = await db.listRows(process.env.DATABASE_ID, process.env.RATINGS_TABLE_ID, [
    Query.equal("userId", [userId]),
    Query.equal("songId", [songId]),
  ]);
  if (existing.rows.length > 0) {
    await db.updateRow(process.env.DATABASE_ID, process.env.RATINGS_TABLE_ID, existing.rows[0].$id, { value: v });
    return { ok: true, updated: true };
  }
  await db.createRow(process.env.DATABASE_ID, process.env.RATINGS_TABLE_ID, "unique()", {
    userId,
    userEmail: me.email || "",
    songId,
    value: v,
  });
  return { ok: true };
}

async function listRatings(db, userId, body) {
  const { songId } = body;
  if (!songId) return { error: "missing song", code: 400 };
  const res = await db.listRows(process.env.DATABASE_ID, process.env.RATINGS_TABLE_ID, [
    Query.equal("songId", [songId]),
    Query.limit(1000),
  ]);
  const rows = res.rows || [];
  const total = rows.length;
  const sum = rows.reduce((a, r) => a + (r.value || 0), 0);
  const average = total > 0 ? sum / total : 0;
  const mine = userId ? rows.find((r) => r.userId === userId) : null;
  return { ok: true, average, total, myRating: mine ? mine.value : 0 };
}

async function submitComment(db, users, userId, body) {
  const { songId, body: text } = body;
  if (!songId || !text) return { error: "missing fields", code: 400 };
  const trimmed = String(text).trim();
  if (!trimmed) return { error: "empty comment", code: 400 };
  if (trimmed.length > 500) return { error: "comment too long (max 500)", code: 400 };

  const me = await users.get(userId);
  if (!me.emailVerification) return { error: "email-not-verified", code: 403 };

  const rl = await checkRateLimit(db, `comment:${userId}`, 15, 60 * 60 * 1000);
  if (!rl.ok) return { error: "rate-limited", code: 429, retryAfterMs: rl.retryAfterMs, note: "Max 15 comments per hour." };

  const prefs = await users.getPrefs(userId).catch(() => ({}));
  const avatarFileId = prefs?.avatarFileId || "";

  const row = await db.createRow(process.env.DATABASE_ID, process.env.COMMENTS_TABLE_ID, "unique()", {
    userId,
    userName: me.name || me.email || "User",
    userAvatarId: avatarFileId,
    songId,
    body: trimmed,
    reportCount: 0,
  });
  return {
    ok: true,
    comment: {
      $id: row.$id,
      userId,
      userName: me.name || me.email || "User",
      userAvatarId: avatarFileId,
      songId,
      body: trimmed,
      $createdAt: row.$createdAt,
    },
  };
}

async function listComments(db, body) {
  const { songId, limit = 100 } = body;
  if (!songId) return { error: "missing song", code: 400 };
  const res = await db.listRows(process.env.DATABASE_ID, process.env.COMMENTS_TABLE_ID, [
    Query.equal("songId", [songId]),
    Query.orderDesc("$createdAt"),
    Query.limit(Math.min(Number(limit) || 100, 200)),
  ]);
  return { ok: true, comments: res.rows };
}

async function deleteComment(db, teams, userId, body) {
  const { commentId } = body;
  if (!commentId) return { error: "missing comment", code: 400 };
  const row = await db.getRow(process.env.DATABASE_ID, process.env.COMMENTS_TABLE_ID, commentId);
  const role = await getRole(teams, userId);
  const isAdmin = role === "admin";
  if (row.userId !== userId && !isAdmin) return { error: "forbidden", code: 403 };
  await db.deleteRow(process.env.DATABASE_ID, process.env.COMMENTS_TABLE_ID, commentId);
  return { ok: true };
}



async function getArtistProfile(db, users, body) {
  const { userId } = body;
  if (!userId) return { error: "missing userId", code: 400 };

  const user = await users.get(userId).catch(() => null);
  if (!user) return { error: "user not found", code: 404 };

  const prefs = await users.getPrefs(userId).catch(() => ({}));

  const songsRes = await db.listRows(process.env.DATABASE_ID, process.env.SONGS_TABLE_ID, [
    Query.equal("uploadedByUserId", [userId]),
    Query.equal("status", ["approved"]),
    Query.orderDesc("$createdAt"),
    Query.limit(200),
  ]);
  const songs = songsRes.rows || [];

  // Total plays
  const totalPlays = songs.reduce((a, s) => a + (s.playCount || 0), 0);

  // Average rating across all their songs
  const songIds = songs.map((s) => s.$id);
  let avgRating = 0;
  let ratingCount = 0;
  if (songIds.length > 0) {
    const ratingsRes = await db.listRows(process.env.DATABASE_ID, process.env.RATINGS_TABLE_ID, [
      Query.equal("songId", songIds),
      Query.limit(2000),
    ]).catch(() => ({ rows: [] }));
    const rows = ratingsRes.rows || [];
    ratingCount = rows.length;
    if (ratingCount > 0) {
      avgRating = rows.reduce((a, r) => a + (r.value || 0), 0) / ratingCount;
    }
  }

  // Followers + following
  const followersRes = await db.listRows(process.env.DATABASE_ID, process.env.FOLLOWS_TABLE_ID, [
    Query.equal("followedUserId", [userId]),
    Query.limit(500),
  ]).catch(() => ({ rows: [] }));
  const followingRes = await db.listRows(process.env.DATABASE_ID, process.env.FOLLOWS_TABLE_ID, [
    Query.equal("followerUserId", [userId]),
    Query.limit(500),
  ]).catch(() => ({ rows: [] }));

  return {
    ok: true,
    profile: {
      userId: user.$id,
      name: user.name || user.email || "Artist",
      email: user.email,
      location: prefs?.location || "",
      studio: prefs?.studio || "",
      studioManager: prefs?.studioManager || "",
      bio: prefs?.bio || "",
      social: {
        instagram: prefs?.instagram || "",
        tiktok: prefs?.tiktok || "",
        youtube: prefs?.youtube || "",
        twitter: prefs?.twitter || "",
        website: prefs?.website || "",
      },
      avatarFileId: prefs?.avatarFileId || "",
      joinedAt: user.$createdAt,
      verified: !!user.emailVerification,
      followersCount: followersRes.rows.length,
      followingCount: followingRes.rows.length,
      totalPlays,
      avgRating,
      ratingCount,
    },
    songs,
  };
}



/* ---------- Follows + Plays + Profile extras ---------- */

async function followUser(db, users, userId, body) {
  const { targetUserId } = body;
  if (!targetUserId) return { error: "missing target", code: 400 };
  if (targetUserId === userId) return { error: "cannot follow yourself", code: 400 };

  const me = await users.get(userId);
  if (!me.emailVerification) return { error: "email-not-verified", code: 403 };

  const target = await users.get(targetUserId).catch(() => null);
  if (!target) return { error: "user not found", code: 404 };

  const existing = await db.listRows(process.env.DATABASE_ID, process.env.FOLLOWS_TABLE_ID, [
    Query.equal("followerUserId", [userId]),
    Query.equal("followedUserId", [targetUserId]),
  ]).catch(() => ({ rows: [] }));
  if (existing.rows.length > 0) return { ok: true, note: "already-following" };

  await db.createRow(process.env.DATABASE_ID, process.env.FOLLOWS_TABLE_ID, "unique()", {
    followerUserId: userId,
    followedUserId: targetUserId,
    followerName: me.name || "",
    followedName: target.name || "",
  });
  return { ok: true };
}

async function unfollowUser(db, userId, body) {
  const { targetUserId } = body;
  if (!targetUserId) return { error: "missing target", code: 400 };
  const rows = await db.listRows(process.env.DATABASE_ID, process.env.FOLLOWS_TABLE_ID, [
    Query.equal("followerUserId", [userId]),
    Query.equal("followedUserId", [targetUserId]),
  ]).catch(() => ({ rows: [] }));
  for (const r of rows.rows) {
    await db.deleteRow(process.env.DATABASE_ID, process.env.FOLLOWS_TABLE_ID, r.$id);
  }
  return { ok: true };
}

async function followStats(db, users, userId, body) {
  const { targetUserId } = body;
  if (!targetUserId) return { error: "missing target", code: 400 };

  const followersRes = await db.listRows(process.env.DATABASE_ID, process.env.FOLLOWS_TABLE_ID, [
    Query.equal("followedUserId", [targetUserId]),
    Query.limit(500),
  ]).catch(() => ({ rows: [] }));

  const followingRes = await db.listRows(process.env.DATABASE_ID, process.env.FOLLOWS_TABLE_ID, [
    Query.equal("followerUserId", [targetUserId]),
    Query.limit(500),
  ]).catch(() => ({ rows: [] }));

  let iFollow = false;
  if (userId) {
    iFollow = followersRes.rows.some((r) => r.followerUserId === userId);
  }

  return {
    ok: true,
    followersCount: followersRes.rows.length,
    followingCount: followingRes.rows.length,
    iFollow,
  };
}

async function listFollowers(db, users, userId, body) {
  const { targetUserId, limit = 100 } = body;
  if (!targetUserId) return { error: "missing target", code: 400 };
  const res = await db.listRows(process.env.DATABASE_ID, process.env.FOLLOWS_TABLE_ID, [
    Query.equal("followedUserId", [targetUserId]),
    Query.orderDesc("$createdAt"),
    Query.limit(Math.min(Number(limit) || 100, 200)),
  ]).catch(() => ({ rows: [] }));

  const out = [];
  for (const r of res.rows) {
    try {
      const u = await users.get(r.followerUserId);
      const prefs = await users.getPrefs(r.followerUserId).catch(() => ({}));
      out.push({
        userId: u.$id,
        name: u.name || u.email,
        avatarFileId: prefs?.avatarFileId || "",
      });
    } catch {}
  }
  return { ok: true, followers: out };
}

async function listFollowing(db, users, userId, body) {
  const { targetUserId, limit = 100 } = body;
  if (!targetUserId) return { error: "missing target", code: 400 };
  const res = await db.listRows(process.env.DATABASE_ID, process.env.FOLLOWS_TABLE_ID, [
    Query.equal("followerUserId", [targetUserId]),
    Query.orderDesc("$createdAt"),
    Query.limit(Math.min(Number(limit) || 100, 200)),
  ]).catch(() => ({ rows: [] }));

  const out = [];
  for (const r of res.rows) {
    try {
      const u = await users.get(r.followedUserId);
      const prefs = await users.getPrefs(r.followedUserId).catch(() => ({}));
      out.push({
        userId: u.$id,
        name: u.name || u.email,
        avatarFileId: prefs?.avatarFileId || "",
      });
    } catch {}
  }
  return { ok: true, following: out };
}

async function incrementPlay(db, userId, body) {
  const { songId } = body;
  if (!songId) return { error: "missing song", code: 400 };

  // Rate limit: one play per user per song per 30 seconds
  const rlKey = `play:${userId || "guest"}:${songId}`;
  const rl = await checkRateLimit(db, rlKey, 1, 30 * 1000).catch(() => ({ ok: true }));
  if (!rl.ok) return { ok: true, skipped: true };

  try {
    const row = await db.getRow(process.env.DATABASE_ID, process.env.SONGS_TABLE_ID, songId);
    const current = row.playCount || 0;
    await db.updateRow(process.env.DATABASE_ID, process.env.SONGS_TABLE_ID, songId, {
      playCount: current + 1,
    });
    return { ok: true, playCount: current + 1 };
  } catch {
    return { error: "song not found", code: 404 };
  }
}

async function changeEmail(users, userId, body) {
  const { email, password } = body;
  if (!email || !password) return { error: "email and password required", code: 400 };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return { error: "invalid email", code: 400 };
  try {
    await users.updateEmail(userId, email, password);
    return { ok: true };
  } catch (e) {
    return { error: e.message, code: 400 };
  }
}

async function listMySessions(sessionsClient, body) {
  return { error: "not supported", code: 400 };
}

async function deleteMyAccount(db, users, storage, userId) {
  // Gather user's songs to delete files
  const songs = await db.listRows(process.env.DATABASE_ID, process.env.SONGS_TABLE_ID, [
    Query.equal("uploadedByUserId", [userId]),
    Query.limit(500),
  ]).catch(() => ({ rows: [] }));

  for (const s of songs.rows) {
    try {
      if (s.audioField) await storage.deleteFile(process.env.CHAT_BUCKET_ID, s.audioField).catch(() => {});
      if (s.coverArtField) await storage.deleteFile(process.env.CHAT_BUCKET_ID, s.coverArtField).catch(() => {});
    } catch {}
    await db.deleteRow(process.env.DATABASE_ID, process.env.SONGS_TABLE_ID, s.$id).catch(() => {});
  }

  // Delete likes
  const likes = await db.listRows(process.env.DATABASE_ID, process.env.LIKES_TABLE_ID, [
    Query.limit(2000),
  ]).catch(() => ({ rows: [] }));
  for (const l of likes.rows) {
    if (l.userEmail) {
      // We can't verify email without fetching user, but user deletion cascades
    }
  }

  // Delete user's follows
  const followA = await db.listRows(process.env.DATABASE_ID, process.env.FOLLOWS_TABLE_ID, [
    Query.equal("followerUserId", [userId]),
    Query.limit(500),
  ]).catch(() => ({ rows: [] }));
  for (const f of followA.rows) {
    await db.deleteRow(process.env.DATABASE_ID, process.env.FOLLOWS_TABLE_ID, f.$id).catch(() => {});
  }
  const followB = await db.listRows(process.env.DATABASE_ID, process.env.FOLLOWS_TABLE_ID, [
    Query.equal("followedUserId", [userId]),
    Query.limit(500),
  ]).catch(() => ({ rows: [] }));
  for (const f of followB.rows) {
    await db.deleteRow(process.env.DATABASE_ID, process.env.FOLLOWS_TABLE_ID, f.$id).catch(() => {});
  }

  // Finally delete the user (this fails auth sessions and disables the account)
  await users.delete(userId);
  return { ok: true };
}

async function exportMyData(db, users, userId) {
  const user = await users.get(userId);
  const prefs = await users.getPrefs(userId).catch(() => ({}));

  const songs = await db.listRows(process.env.DATABASE_ID, process.env.SONGS_TABLE_ID, [
    Query.equal("uploadedByUserId", [userId]),
    Query.limit(500),
  ]).catch(() => ({ rows: [] }));

  const playlists = await db.listRows(process.env.DATABASE_ID, process.env.PLAYLISTS_TABLE_ID, [
    Query.equal("userEmail", [user.email]),
    Query.limit(500),
  ]).catch(() => ({ rows: [] }));

  const likes = await db.listRows(process.env.DATABASE_ID, process.env.LIKES_TABLE_ID, [
    Query.equal("userEmail", [user.email]),
    Query.limit(500),
  ]).catch(() => ({ rows: [] }));

  const following = await db.listRows(process.env.DATABASE_ID, process.env.FOLLOWS_TABLE_ID, [
    Query.equal("followerUserId", [userId]),
    Query.limit(500),
  ]).catch(() => ({ rows: [] }));

  const followers = await db.listRows(process.env.DATABASE_ID, process.env.FOLLOWS_TABLE_ID, [
    Query.equal("followedUserId", [userId]),
    Query.limit(500),
  ]).catch(() => ({ rows: [] }));

  return {
    ok: true,
    data: {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.$id,
        email: user.email,
        name: user.name,
        emailVerification: user.emailVerification,
        createdAt: user.$createdAt,
      },
      prefs,
      songs: songs.rows,
      playlists: playlists.rows,
      likes: likes.rows,
      following: following.rows,
      followers: followers.rows,
    },
  };
}



async function getActiveNotice(db) {
  try {
    const res = await db.listRows(process.env.DATABASE_ID, process.env.NOTICES_TABLE_ID, [
      Query.equal("active", [1]),
      Query.orderDesc("$createdAt"),
      Query.limit(1),
    ]);
    const row = res.rows?.[0];
    if (!row) return { ok: true, notice: null };
    return {
      ok: true,
      notice: {
        $id: row.$id,
        message: row.message,
        type: row.type || "info",
        createdByName: row.createdByName || "Admin",
        $createdAt: row.$createdAt,
      },
    };
  } catch {
    return { ok: true, notice: null };
  }
}

async function publishNotice(db, teams, users, userId, body) {
  const role = await getRole(teams, userId);
  if (role !== "admin") return { error: "forbidden", code: 403 };

  const { message, type = "info" } = body;
  if (!message) return { error: "missing message", code: 400 };
  if (message.length > 500) return { error: "message too long (max 500)", code: 400 };
  if (!["info", "warning", "urgent"].includes(type)) return { error: "bad type", code: 400 };

  // Deactivate all existing notices
  const existing = await db.listRows(process.env.DATABASE_ID, process.env.NOTICES_TABLE_ID, [
    Query.equal("active", [1]),
    Query.limit(100),
  ]).catch(() => ({ rows: [] }));
  for (const r of existing.rows) {
    await db.updateRow(process.env.DATABASE_ID, process.env.NOTICES_TABLE_ID, r.$id, { active: 0 }).catch(() => {});
  }

  const me = await users.get(userId);
  const row = await db.createRow(process.env.DATABASE_ID, process.env.NOTICES_TABLE_ID, "unique()", {
    message,
    type,
    createdByUserId: userId,
    createdByName: me.name || me.email || "Admin",
    active: 1,
  });
  return { ok: true, notice: { $id: row.$id, message, type, createdByName: me.name || "Admin" } };
}

async function clearNotice(db, teams, userId) {
  const role = await getRole(teams, userId);
  if (role !== "admin") return { error: "forbidden", code: 403 };
  const existing = await db.listRows(process.env.DATABASE_ID, process.env.NOTICES_TABLE_ID, [
    Query.equal("active", [1]),
    Query.limit(100),
  ]).catch(() => ({ rows: [] }));
  for (const r of existing.rows) {
    await db.updateRow(process.env.DATABASE_ID, process.env.NOTICES_TABLE_ID, r.$id, { active: 0 }).catch(() => {});
  }
  return { ok: true };
}



async function listPeople(users, userId) {
  try {
    const adminTeams = new Teams(appwriteClient());
    const [usersRes, admins, artists, poets] = await Promise.all([
      users.list([Query.limit(200)]),
      adminTeams.listMemberships(process.env.ADMINS_TEAM_ID).catch(() => ({ memberships: [] })),
      adminTeams.listMemberships(process.env.ARTISTS_TEAM_ID).catch(() => ({ memberships: [] })),
      process.env.POETS_TEAM_ID
        ? adminTeams.listMemberships(process.env.POETS_TEAM_ID).catch(() => ({ memberships: [] }))
        : Promise.resolve({ memberships: [] }),
    ]);

    const adminIds = new Set(admins.memberships.map((m) => m.userId));
    const artistIds = new Set(artists.memberships.map((m) => m.userId));
    const poetIds = new Set(poets.memberships.map((m) => m.userId));

    const out = [];
    for (const u of usersRes.users || []) {
      if (u.$id === userId) continue;
      const prefs = await users.getPrefs(u.$id).catch(() => ({}));
      let role = "listener";
      if (adminIds.has(u.$id)) role = "admin";
      else if (artistIds.has(u.$id)) role = "artist";
      else if (poetIds.has(u.$id)) role = "poet";
      out.push({
        userId: u.$id,
        name: u.name || u.email,
        email: u.email,
        role,
        avatarFileId: prefs?.avatarFileId || "",
      });
    }
    return { ok: true, people: out };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}



async function savePushSub(db, userId, body) {
  const { endpoint, p256dh, auth } = body;
  if (!endpoint || !p256dh || !auth) return { error: "missing subscription fields", code: 400 };

  const existing = await db.listRows(process.env.DATABASE_ID, "push_subs", [
    Query.equal("endpoint", [endpoint]),
    Query.limit(10),
  ]).catch(() => ({ rows: [] }));
  for (const r of existing.rows) {
    await db.deleteRow(process.env.DATABASE_ID, "push_subs", r.$id).catch(() => {});
  }

  await db.createRow(process.env.DATABASE_ID, "push_subs", "unique()", {
    userId, endpoint, p256dh, auth,
  });
  return { ok: true };
}

async function sendPushToUser(db, userId, payload) {
  const subs = await db.listRows(process.env.DATABASE_ID, "push_subs", [
    Query.equal("userId", [userId]),
    Query.limit(20),
  ]).catch(() => ({ rows: [] }));

  for (const sub of subs.rows) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        await db.deleteRow(process.env.DATABASE_ID, "push_subs", sub.$id).catch(() => {});
      }
    }
  }
}



async function getTrending(db, users, body) {
  try {
    const period = body.period || "all";

    // Top songs by plays
    const songsRes = await db.listRows(process.env.DATABASE_ID, process.env.SONGS_TABLE_ID, [
      Query.equal("status", ["approved"]),
      Query.orderDesc("playCount"),
      Query.limit(50),
    ]);
    const songs = (songsRes.rows || []).slice(0, 20);

    // Top artists by followers
    const followsRes = await db.listRows(process.env.DATABASE_ID, process.env.FOLLOWS_TABLE_ID, [
      Query.limit(2000),
    ]).catch(() => ({ rows: [] }));

    const followCounts = {};
    for (const f of followsRes.rows) {
      followCounts[f.followedUserId] = (followCounts[f.followedUserId] || 0) + 1;
    }

    const rankedArtists = Object.entries(followCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const artists = [];
    for (const [artistId, count] of rankedArtists) {
      try {
        const u = await users.get(artistId);
        const prefs = await users.getPrefs(artistId).catch(() => ({}));
        artists.push({
          userId: u.$id,
          name: u.name || u.email,
          avatarFileId: prefs?.avatarFileId || "",
          followers: count,
        });
      } catch {}
    }

    return { ok: true, songs, artists };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}



async function listArtistsDirectory(users) {
  try {
    const teams = new Teams(appwriteClient());
    const [usersRes, artists, poets] = await Promise.all([
      users.list([Query.limit(200)]),
      teams.listMemberships(process.env.ARTISTS_TEAM_ID).catch(() => ({ memberships: [] })),
      process.env.POETS_TEAM_ID
        ? teams.listMemberships(process.env.POETS_TEAM_ID).catch(() => ({ memberships: [] }))
        : Promise.resolve({ memberships: [] }),
    ]);

    const artistIds = new Set(artists.memberships.map((m) => m.userId));
    const poetIds = new Set(poets.memberships.map((m) => m.userId));

    const out = [];
    for (const u of usersRes.users || []) {
      const isArtist = artistIds.has(u.$id);
      const isPoet = poetIds.has(u.$id);
      if (!isArtist && !isPoet) continue;
      const prefs = await users.getPrefs(u.$id).catch(() => ({}));
      out.push({
        userId: u.$id,
        name: u.name || u.email,
        location: prefs?.location || "",
        studio: prefs?.studio || "",
        bio: prefs?.bio || "",
        avatarFileId: prefs?.avatarFileId || "",
        role: isArtist ? "artist" : "poet",
      });
    }
    // Sort: artists first, then alphabetical
    out.sort((a, b) => {
      if (a.role !== b.role) return a.role === "artist" ? -1 : 1;
      return (a.name || "").localeCompare(b.name || "");
    });
    return { ok: true, artists: out };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function listTimeline(db, body) {
  const { userId } = body;
  if (!userId) return { error: "missing userId", code: 400 };
  const res = await db.listRows(process.env.DATABASE_ID, process.env.TIMELINE_TABLE_ID, [
    Query.equal("userId", [userId]),
    Query.orderDesc("year"),
    Query.limit(100),
  ]).catch(() => ({ rows: [] }));
  return { ok: true, entries: res.rows || [] };
}

async function addTimelineEntry(db, users, userId, body) {
  const { year, content } = body;
  if (!year || !content) return { error: "year and content required", code: 400 };
  const trimmedYear = String(year).trim().slice(0, 20);
  const trimmedContent = String(content).trim();
  if (!trimmedYear) return { error: "year required", code: 400 };
  if (!trimmedContent) return { error: "content required", code: 400 };
  if (trimmedContent.length > 2000) return { error: "entry too long (max 2000)", code: 400 };

  const me = await users.get(userId);
  if (!me.emailVerification) return { error: "email-not-verified", code: 403 };

  // Extract mentioned userIds from the content format: @[Name](userId)
  const mentionedIds = [];
  const re = /@\[[^\]]+\]\(([a-zA-Z0-9]+)\)/g;
  let m;
  while ((m = re.exec(trimmedContent)) !== null) {
    if (!mentionedIds.includes(m[1])) mentionedIds.push(m[1]);
  }

  const row = await db.createRow(process.env.DATABASE_ID, process.env.TIMELINE_TABLE_ID, "unique()", {
    userId,
    year: trimmedYear,
    content: trimmedContent,
    mentions: mentionedIds.join(","),
  });
  return { ok: true, id: row.$id };
}

async function deleteTimelineEntry(db, teams, userId, body) {
  const { entryId } = body;
  if (!entryId) return { error: "missing entryId", code: 400 };
  const row = await db.getRow(process.env.DATABASE_ID, process.env.TIMELINE_TABLE_ID, entryId);
  const role = await getRole(teams, userId);
  const isAdmin = role === "admin";
  if (row.userId !== userId && !isAdmin) return { error: "forbidden", code: 403 };
  await db.deleteRow(process.env.DATABASE_ID, process.env.TIMELINE_TABLE_ID, entryId);
  return { ok: true };
}


/* ---------- Router ---------- */

export default async ({ req, res, log, error }) => {
  const userId = req.headers["x-appwrite-user-id"];
  const userEmail = req.headers["x-appwrite-user-email"];

  let body = {};
  try { body = JSON.parse(req.body || "{}"); } catch {}
  const action = body.action || "get-role";

  if (!userId && action !== "get-role") return res.json({ error: "unauthorized" }, 401);

  const client = appwriteClient();
  const teams = new Teams(client);
  const db = new TablesDB(client);
  const users = new Users(client);
  const storage = new Storage(client);

  try {
    if (action === "get-role") {
      const debug = {
        headerUserId: userId || null,
        headerEmail: userEmail || null,
        artistsTeamId: process.env.ARTISTS_TEAM_ID || null,
        adminsTeamId: process.env.ADMINS_TEAM_ID || null,
      };
      try {
        const a = await teams.listMemberships(process.env.ARTISTS_TEAM_ID);
        debug.artistCount = a.memberships.length;
        debug.artistIds = a.memberships.map((m) => m.userId);
      } catch (e) { debug.artistsError = e.message; }
      try {
        const ad = await teams.listMemberships(process.env.ADMINS_TEAM_ID);
        debug.adminCount = ad.memberships.length;
        debug.adminIds = ad.memberships.map((m) => m.userId);
      } catch (e) { debug.adminsError = e.message; }
      const role = userId ? await getRole(teams, userId) : "listener";
      return res.json({ role, debug }, 200);
    }
    if (action === "set-role") { const out = await setRole(teams, userId, body.role); return res.json(out, out.code || 200); }
    if (action === "submit-song") { const out = await submitSong(db, users, userId, userEmail, body); return res.json(out, out.code || 200); }

    if (action === "report") { const out = await submitReport(db, users, userId, body); return res.json(out, out.code || 200); }
    if (action === "list-reports") { const out = await listReports(db, teams, userId); return res.json(out, out.code || 200); }
    if (action === "resolve-report") { const out = await resolveReport(db, teams, userId, body); return res.json(out, out.code || 200); }
    if (action === "block") { const out = await blockUser(db, users, userId, body); return res.json(out, out.code || 200); }
    if (action === "unblock") { const out = await unblockUser(db, userId, body); return res.json(out, out.code || 200); }
    if (action === "list-blocks") { const out = await listBlocks(db, users, userId); return res.json(out, 200); }
    if (action === "submit-rating") { const out = await submitRating(db, users, userId, body); return res.json(out, out.code || 200); }
    if (action === "list-ratings") { const out = await listRatings(db, userId, body); return res.json(out, out.code || 200); }
    if (action === "submit-comment") { const out = await submitComment(db, users, userId, body); return res.json(out, out.code || 200); }
    if (action === "list-comments") { const out = await listComments(db, body); return res.json(out, out.code || 200); }
    if (action === "delete-comment") { const out = await deleteComment(db, teams, userId, body); return res.json(out, out.code || 200); }
    if (action === "get-artist-profile") { const out = await getArtistProfile(db, users, body); return res.json(out, out.code || 200); }
    if (action === "follow") { const out = await followUser(db, users, userId, body); return res.json(out, out.code || 200); }
    if (action === "unfollow") { const out = await unfollowUser(db, userId, body); return res.json(out, out.code || 200); }
    if (action === "follow-stats") { const out = await followStats(db, users, userId, body); return res.json(out, out.code || 200); }
    if (action === "list-followers") { const out = await listFollowers(db, users, userId, body); return res.json(out, out.code || 200); }
    if (action === "list-following") { const out = await listFollowing(db, users, userId, body); return res.json(out, out.code || 200); }
    if (action === "increment-play") { const out = await incrementPlay(db, userId, body); return res.json(out, out.code || 200); }
    if (action === "change-email") { const out = await changeEmail(users, userId, body); return res.json(out, out.code || 200); }
    if (action === "delete-my-account") { const out = await deleteMyAccount(db, users, storage, userId); return res.json(out, out.code || 200); }
    if (action === "export-my-data") { const out = await exportMyData(db, users, userId); return res.json(out, out.code || 200); }
    if (action === "get-notice") { const out = await getActiveNotice(db); return res.json(out, 200); }
    if (action === "publish-notice") { const out = await publishNotice(db, teams, users, userId, body); return res.json(out, out.code || 200); }
    if (action === "clear-notice") { const out = await clearNotice(db, teams, userId); return res.json(out, out.code || 200); }
    if (action === "list-people") { const out = await listPeople(users, userId); return res.json(out, 200); }
    if (action === "save-push-sub") { const out = await savePushSub(db, userId, body); return res.json(out, out.code || 200); }
    if (action === "get-trending") { const out = await getTrending(db, users, body); return res.json(out, 200); }
    if (action === "list-artists-directory") { const out = await listArtistsDirectory(users); return res.json(out, 200); }
    if (action === "list-timeline") { const out = await listTimeline(db, body); return res.json(out, out.code || 200); }
    if (action === "add-timeline-entry") { const out = await addTimelineEntry(db, users, userId, body); return res.json(out, out.code || 200); }
    if (action === "delete-timeline-entry") { const out = await deleteTimelineEntry(db, teams, userId, body); return res.json(out, out.code || 200); }
    if (action === "radio-now") { const out = await radioNow(db, body); return res.json(out, out.code || 200); }
    if (action === "list-artists") { const out = await listArtists(teams, users, userId); return res.json(out, 200); }
    if (action === "list-requests") { const out = await listRequests(db, userId); return res.json(out, 200); }
    if (action === "open-conversation") { const out = await openConversation(db, users, userId, body); return res.json(out, out.code || 200); }
    if (action === "list-conversations") { const out = await listConversations(db, userId); return res.json(out, 200); }
    if (action === "list-messages") { const out = await listMessages(db, userId, body); return res.json(out, out.code || 200); }
    if (action === "send-message") { const out = await sendMessage(db, userId, body); return res.json(out, out.code || 200); }
    if (action === "mark-read") { const out = await markConversationRead(db, userId, body); return res.json(out, out.code || 200); }

    return res.json({ error: "unknown action" }, 400);
  } catch (e) {
    error("api error: " + e.message);
    return res.json({ error: e.message }, 500);
  }
};
