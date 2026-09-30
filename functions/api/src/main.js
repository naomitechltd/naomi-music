import { Client, Teams, TablesDB, Users, Storage, Query } from "node-appwrite";

function appwriteClient() {
  return new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
}

async function getRole(teams, userId) {
  console.log("[debug] getRole called userId=" + userId);
  const admins = await teams.listMemberships(process.env.ADMINS_TEAM_ID);
  console.log("[debug] admins team size=" + admins.memberships.length + " ids=" + admins.memberships.map((m) => m.userId).join("|"));
  if (admins.memberships.some((m) => m.userId === userId)) { console.log("[debug] matched admin"); return "admin"; }

  const artists = await teams.listMemberships(process.env.ARTISTS_TEAM_ID);
  console.log("[debug] artists team size=" + artists.memberships.length + " ids=" + artists.memberships.map((m) => m.userId).join("|"));
  if (artists.memberships.some((m) => m.userId === userId)) { console.log("[debug] matched artist"); return "artist"; }

  console.log("[debug] no match, returning listener");
  return "listener";
}

async function setRole(teams, userId, newRole) {
  if (newRole !== "artist" && newRole !== "listener") return { error: "invalid role", code: 400 };
  const admins = await teams.listMemberships(process.env.ADMINS_TEAM_ID);
  if (admins.memberships.some((m) => m.userId === userId)) return { ok: true, note: "already admin" };
  const artists = await teams.listMemberships(process.env.ARTISTS_TEAM_ID);
  const existing = artists.memberships.find((m) => m.userId === userId) || null;
  if (newRole === "artist") {
    if (existing) return { ok: true, note: "already artist" };
    await teams.createMembership(process.env.ARTISTS_TEAM_ID, ["none"], undefined, userId);
  } else if (existing) {
    await teams.deleteMembership(process.env.ARTISTS_TEAM_ID, existing.$id);
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
  if (role !== "artist" && role !== "admin") return { error: "forbidden", code: 403 };

  const {
    title, artistName, description = "", studio = "",
    producer, songWriter, releaseType, albumName = "",
    genre, lyrics, coverArtField, audioField,
  } = body;
  if (!title || !artistName || !producer || !songWriter || !genre || !lyrics || !coverArtField || !audioField) {
    return { error: "missing fields", code: 400 };
  }
  if (!["single", "album"].includes(releaseType)) return { error: "bad release type", code: 400 };
  if (releaseType === "album" && !albumName) return { error: "album name required", code: 400 };

  const row = await db.createRow(process.env.DATABASE_ID, process.env.SONGS_TABLE_ID, "unique()", {
    title, artistName, description, studio, producer, songWriter,
    releaseType, albumName, genre, lyrics, coverArtField, audioField,
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
  const songs = res.rows || [];
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
