import { Client, Teams, Databases, Users, Storage } from "node-appwrite";

function appwriteClient() {
  return new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
}

async function getRole(teams, userId) {
  const admins = await teams.listMemberships(process.env.ADMINS_TEAM_ID);
  if (admins.memberships.some((m) => m.userId === userId)) return "admin";
  const artists = await teams.listMemberships(process.env.ARTISTS_TEAM_ID);
  if (artists.memberships.some((m) => m.userId === userId)) return "artist";
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
    await teams.createMembership(process.env.ARTISTS_TEAM_ID, ["none"], "", userId);
  } else if (existing) {
    await teams.deleteMembership(process.env.ARTISTS_TEAM_ID, existing.$id);
  }
  return { ok: true };
}

async function submitSong(db, users, userId, userEmail, body) {
  const user = await users.get(userId);
  if (!user.emailVerification) return { error: "email-not-verified", code: 403 };
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

/* ---------- Messaging ---------- */

async function requestMessage(db, users, teams, userId, body) {
  const { toUserId, toName, toEmail, intro = "" } = body;
  if (!toUserId) return { error: "missing recipient", code: 400 };
  if (toUserId === userId) return { error: "cannot message yourself", code: 400 };
  if (intro.length > 500) return { error: "intro too long", code: 400 };

  const me = await users.get(userId);
  if (!me.emailVerification) return { error: "email-not-verified", code: 403 };

  const myRole = await getRole(teams, userId);
  const theirRole = await getRole(teams, toUserId);
  const listenerToArtist = myRole !== "artist" && myRole !== "admin" && (theirRole === "artist" || theirRole === "admin");
  const artistToArtist = (myRole === "artist" || myRole === "admin") && (theirRole === "artist" || theirRole === "admin");
  if (!listenerToArtist && !artistToArtist) {
    return { error: "not allowed", code: 403 };
  }

  // Already a conversation?
  const convRes = await db.listRows(process.env.DATABASE_ID, process.env.CONVERSATIONS_TABLE_ID, [
    `contains("participants", ["${userId}"])`,
  ]).catch(() => ({ rows: [] }));
  const hasConv = convRes.rows.some((c) => c.participants?.includes(toUserId));
  if (hasConv) return { ok: true, note: "conversation exists" };

  // Existing request?
  const existing = await db.listRows(process.env.DATABASE_ID, process.env.REQUESTS_TABLE_ID, [
    `equal("fromUserId", ["${userId}"])`,
    `equal("toUserId", ["${toUserId}"])`,
  ]).catch(() => ({ rows: [] }));
  const prior = existing.rows[0];
  if (prior) {
    if (prior.status === "pending") return { error: "request already pending", code: 409 };
    if (prior.status === "approved") return { ok: true, note: "already approved" };
    if (prior.status === "declined" && prior.respondedAt) {
      const days = (Date.now() - new Date(prior.respondedAt).getTime()) / 86400000;
      if (days < 7) return { error: "cooldown", code: 429, daysLeft: Math.ceil(7 - days) };
    }
  }

  const toUser = await users.get(toUserId).catch(() => null);
  const row = await db.createRow(process.env.DATABASE_ID, process.env.REQUESTS_TABLE_ID, "unique()", {
    fromUserId: userId,
    toUserId,
    fromName: me.name || "",
    toName: toName || toUser?.name || "",
    fromEmail: me.email || "",
    toEmail: toEmail || toUser?.email || "",
    status: "pending",
    intro: intro || "",
  });
  return { ok: true, requestId: row.$id };
}

async function listRequests(db, userId) {
  const incoming = await db.listRows(process.env.DATABASE_ID, process.env.REQUESTS_TABLE_ID, [
    `equal("toUserId", ["${userId}"])`,
  ]).catch(() => ({ rows: [] }));
  const outgoing = await db.listRows(process.env.DATABASE_ID, process.env.REQUESTS_TABLE_ID, [
    `equal("fromUserId", ["${userId}"])`,
  ]).catch(() => ({ rows: [] }));
  return { ok: true, incoming: incoming.rows, outgoing: outgoing.rows };
}

async function respondRequest(db, teams, userId, body) {
  const { requestId, decision } = body;
  if (!requestId || !["approve", "decline"].includes(decision)) {
    return { error: "invalid input", code: 400 };
  }
  const req = await db.getRow(process.env.DATABASE_ID, process.env.REQUESTS_TABLE_ID, requestId);
  if (req.toUserId !== userId) return { error: "not yours", code: 403 };
  if (req.status !== "pending") return { error: "already resolved", code: 409 };

  const status = decision === "approve" ? "approved" : "declined";
  await db.updateRow(process.env.DATABASE_ID, process.env.REQUESTS_TABLE_ID, requestId, {
    status,
    respondedAt: new Date().toISOString(),
  });

  if (decision === "approve") {
    const [a, b] = [req.fromUserId, req.toUserId].sort();
    await db.createRow(process.env.DATABASE_ID, process.env.CONVERSATIONS_TABLE_ID, "unique()", {
      participants: [a, b],
      userNames: [
        a === req.fromUserId ? req.fromName : req.toName,
        b === req.toUserId ? req.toName : req.fromName,
      ],
      lastMessage: "",
      lastMessageAt: new Date().toISOString(),
      unreadA: 0,
      unreadB: 0,
    });
  }
  return { ok: true, status };
}

async function listConversations(db, userId) {
  const res = await db.listRows(process.env.DATABASE_ID, process.env.CONVERSATIONS_TABLE_ID, [
    `contains("participants", ["${userId}"])`,
    `orderDesc("lastMessageAt")`,
  ]).catch(() => ({ rows: [] }));
  return { ok: true, conversations: res.rows };
}

async function listMessages(db, userId, body) {
  const { conversationId } = body;
  if (!conversationId) return { error: "missing conversation", code: 400 };
  const conv = await db.getRow(process.env.DATABASE_ID, process.env.CONVERSATIONS_TABLE_ID, conversationId);
  if (!conv.participants?.includes(userId)) return { error: "forbidden", code: 403 };
  const res = await db.listRows(process.env.DATABASE_ID, process.env.MESSAGES_TABLE_ID, [
    `equal("conversationId", ["${conversationId}"])`,
    `orderAsc("${'$'}createdAt")`,
    `limit(100)`,
  ]);
  return { ok: true, messages: res.rows, conversation: conv };
}

async function sendMessage(db, userId, body) {
  const { conversationId, text = "", attachmentFileId = "", attachmentName = "", attachmentMime = "" } = body;
  if (!conversationId) return { error: "missing conversation", code: 400 };
  if (!text.trim() && !attachmentFileId) return { error: "empty message", code: 400 };
  if (text.length > 2000) return { error: "message too long", code: 400 };
  if (attachmentMime && !["application/pdf", "text/plain"].includes(attachmentMime)) {
    return { error: "attachment type not allowed", code: 400 };
  }

  const conv = await db.getRow(process.env.DATABASE_ID, process.env.CONVERSATIONS_TABLE_ID, conversationId);
  if (!conv.participants?.includes(userId)) return { error: "forbidden", code: 403 };

  const row = await db.createRow(process.env.DATABASE_ID, process.env.MESSAGES_TABLE_ID, "unique()", {
    conversationId,
    senderUserId: userId,
    body: text.trim(),
    attachmentFileId: attachmentFileId || "",
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
  const db = new Databases(client);
  const users = new Users(client);

  try {
    if (action === "get-role") return res.json({ role: userId ? await getRole(teams, userId) : "listener" }, 200);
    if (action === "set-role") { const out = await setRole(teams, userId, body.role); return res.json(out, out.code || 200); }
    if (action === "submit-song") { const out = await submitSong(db, users, userId, userEmail, body); return res.json(out, out.code || 200); }

    if (action === "request-message") { const out = await requestMessage(db, users, teams, userId, body); return res.json(out, out.code || 200); }
    if (action === "list-requests") { const out = await listRequests(db, userId); return res.json(out, 200); }
    if (action === "respond-request") { const out = await respondRequest(db, teams, userId, body); return res.json(out, out.code || 200); }
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
