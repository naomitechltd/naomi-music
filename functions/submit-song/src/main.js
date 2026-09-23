import { Client, Databases, Teams } from "node-appwrite";

export default async ({ req, res, log, error }) => {
  const userId = req.headers["x-appwrite-user-id"];
  const userEmail = req.headers["x-appwrite-user-email"];
  if (!userId) return res.json({ error: "unauthorized" }, 401);

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const teams = new Teams(client);
  try {
    const admins = await teams.listMemberships("admins");
    const artists = await teams.listMemberships("artists");
    const isAdmin = admins.memberships.some((m) => m.userId === userId);
    const isArtist = artists.memberships.some((m) => m.userId === userId);
    if (!isAdmin && !isArtist) {
      return res.json({ error: "forbidden" }, 403);
    }
  } catch (e) {
    error("team check: " + e.message);
    return res.json({ error: "forbidden" }, 403);
  }

  let b;
  try { b = JSON.parse(req.body || "{}"); }
  catch { return res.json({ error: "bad json" }, 400); }

  const {
    title, artistName, description = "", studio = "",
    producer, songWriter, releaseType, albumName = "",
    genre, lyrics, coverArtField, audioField,
  } = b;

  if (!title || !artistName || !producer || !songWriter || !genre || !lyrics || !coverArtField || !audioField) {
    return res.json({ error: "missing fields" }, 400);
  }
  if (!["single", "album"].includes(releaseType)) {
    return res.json({ error: "bad release type" }, 400);
  }
  if (releaseType === "album" && !albumName) {
    return res.json({ error: "album name required" }, 400);
  }

  const db = new Databases(client);
  try {
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
    return res.json({ ok: true, id: row.$id }, 200);
  } catch (e) {
    error("create row failed: " + e.message);
    return res.json({ error: "could not save" }, 500);
  }
};
