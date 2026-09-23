import { Client, Teams } from "node-appwrite";

export default async ({ req, res, log, error }) => {
  const userId = req.headers["x-appwrite-user-id"];
  if (!userId) return res.json({ role: "listener" }, 200);

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const teams = new Teams(client);

  try {
    const admins = await teams.listMemberships("admins");
    if (admins.memberships.some((m) => m.userId === userId)) {
      return res.json({ role: "admin" }, 200);
    }
    const artists = await teams.listMemberships("artists");
    if (artists.memberships.some((m) => m.userId === userId)) {
      return res.json({ role: "artist" }, 200);
    }
  } catch (e) {
    error("role lookup failed: " + e.message);
  }

  return res.json({ role: "listener" }, 200);
};
