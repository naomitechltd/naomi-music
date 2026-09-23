import { functions } from "./appwrite";

async function call(action, payload = {}) {
  const res = await functions.createExecution(
    "api",
    JSON.stringify({ action, ...payload }),
    false
  );
  let out = {};
  try { out = JSON.parse(res.response || "{}"); } catch {}
  if (out.error) throw new Error(out.error);
  return out;
}

export const setRole = (role) => call("set-role", { role });
export const submitSong = (song) => call("submit-song", song);
