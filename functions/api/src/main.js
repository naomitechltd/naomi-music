import { Client, Teams, Databases } from "node-appwrite";

function appwriteClient() {
  return new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
}

async function getRole(teams, userId) {
  const admins = await teams.listMemberships("admins");
  if (admins.memberships.some((m) => m.userId === userId)) return "admin";
  const artists = await teams.listMemberships("artists");
  if (artists.memberships.some((m) => m.userId === userId)) return "artist";
  return "listener";
}

async function setRole(teams, userId, newRole) {
  if (newRole !== "artist" && newRole !== "listener") {
    return { error: "invalid role", code: 400 };
  }

  const admins = await teams.listMemberships("admins");
  if (admins.memberships.some((m) => m.userId === userId)) {
    return { ok: true, note: "already admin" };
  }

  const artists = await teams.listMemberships("artists");
  const existing = artists.memberships.find((m) => m.userId === userId) || null;

  if (newRole === "artist") {
    if (existing) return { ok: true, note: "already artist" };
    await teams.createMembership("artists", ["none"], undefined, userId);
  } else if (existing) {
    await teams.deleteMembership("artists", existing.$id);
  }
  return { ok: true };
}

async function submitSong(db, userId, userEmail, body) {
  const teams = new Teams(appwriteClient());
  const role = await getRole(teams, userId);
  if (role !== "artist" && role !== "admin") {
    return { error: "forbidden", code: 403 };
  }

  const {
    title, artistName, description = "", studio = "",
    producer, songWriter, releaseType, albumName = "",
    genre, lyrics, coverArtField, audioField,
  } = body;

  if (!title || !artistName || !producer || !songWriter || !genre || !lyrics || !coverArtField || !audioField) {
    return { error: "missing fields", code: 400 };
  }
  if (!["single", "album"].includes(releaseType)) {
    return { error: "bad release type", code: 400 };
  }
  if (releaseType === "album" && !albumName) {
    return { error: "album name required", code: 400 };
  }

  const row = await db.createRow(
    process.env.DATABASE_ID,
    process.env.SONGS_TABLE_ID,
    "unique()",
    {
      title, artistName, description, studio, producer, songWriter,
      releaseType, albumName, genre, lyrics,
      coverArtField, audioField,
      status: "pending",
      uploadedByEmail: userEmail || "",
      uploadedByUserId: userId,
    }
  );
  return { ok: true, id: row.$id };
}

export default async ({ req, res, log, error }) => {
  const userId = req.headers["x-appwrite-user-id"];
  const userEmail = req.headers["x-appwrite-user-email"];

  let body = {};
  try { body = JSON.parse(req.body || "{}"); } catch {}
  const action = body.action || "get-role";

  if (!userId && action !== "get-role") {
    return res.json({ error: "unauthorized" }, 401);
  }

  const client = appwriteClient();
  const teams = new Teams(client);
  const db = new Databases(client);

  try {
    if (action === "get-role") {
      const role = userId ? await getRole(teams, userId) : "listener";
      return res.json({ role }, 200);
    }
    if (action === "set-role") {
      const out = await setRole(teams, userId, body.role);
      return res.json(out, out.code || 200);
    }
    if (action === "submit-song") {
      const out = await submitSong(db, userId, userEmail, body);
      return res.json(out, out.code || 200);
    }
    return res.json({ error: "unknown action" }, 400);
  } catch (e) {
    error("api error: " + e.message);
    return res.json({ error: e.message }, 500);
  }
};
