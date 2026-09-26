import { functions } from "./appwrite";

export async function fetchMyRole() {
  try {
    const res = await functions.createExecution(
      "api",
      JSON.stringify({ action: "get-role" }),
      false
    );
    // Appwrite Web SDK v21+ uses `responseBody`, older versions use `response`.
    const raw = res.responseBody || res.response || "{}";
    const { role } = JSON.parse(raw);
    return role || "listener";
  } catch {
    return "listener";
  }
}
