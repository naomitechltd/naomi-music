import { functions } from "./appwrite";

// Resolved server-side via the `api` function.
export async function fetchMyRole() {
  try {
    const res = await functions.createExecution(
      "api",
      JSON.stringify({ action: "get-role" }),
      false
    );
    const { role } = JSON.parse(res.response || "{}");
    return role || "listener";
  } catch {
    return "listener";
  }
}
