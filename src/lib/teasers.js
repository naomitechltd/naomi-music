import { useEffect, useState } from "react";
import { functions, account } from "./appwrite";
import { fetchMyRole } from "./role";

export async function teaserApi(body) {
  try {
    const res = await functions.createExecution("api", JSON.stringify(body), false);
    return JSON.parse(res?.responseBody ?? res?.response ?? "{}");
  } catch {
    return {};
  }
}

export const daysLeft = (t) => Math.max(0, Math.ceil((t.expiresAt - Date.now()) / 86400000));

export function useMe() {
  const [me, setMe] = useState({ id: "", role: "listener" });
  useEffect(() => {
    let off = false;
    (async () => {
      const [u, r] = await Promise.all([account.get().catch(() => null), fetchMyRole()]);
      if (!off) setMe({ id: u?.$id || "", role: r });
    })();
    return () => { off = true; };
  }, []);
  return me;
}
