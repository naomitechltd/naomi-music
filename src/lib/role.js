import { functions } from "./appwrite";

export async function fetchMyRole() {
  try {
    const res = await functions.createExecution(
      "api",
      JSON.stringify({ action: "get-role" }),
      false
    );
    // Different SDK versions put the body in different fields
    const raw =
      res?.responseBody ??
      res?.response ??
      res?.data?.responseBody ??
      res?.data?.response ??
      "{}";
    try { window.__lastRoleRaw = raw; } catch {}
    const { role } = JSON.parse(raw);
    return role || "listener";
  } catch (e) {
    try { window.__lastRoleRaw = "ERROR: " + e.message; } catch {}
    return "listener";
  }
}
