import { functions } from "./appwrite";

export async function fetchMyRole() {
  try {
    const res = await functions.createExecution(
      "api",
      JSON.stringify({ action: "get-role" }),
      false
    );
    // Debug: expose all response fields
    try {
      window.__roleKeys = Object.keys(res || {});
      window.__roleResJson = JSON.stringify(res || {});
    } catch {}

    const raw = res.responseBody || res.response || "{}";
    try { window.__lastRoleRaw = raw; } catch {}

    const { role } = JSON.parse(raw);
    return role || "listener";
  } catch (e) {
    try { window.__lastRoleRaw = "ERROR: " + e.message; } catch {}
    return "listener";
  }
}
