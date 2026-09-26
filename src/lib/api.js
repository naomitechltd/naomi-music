import { functions } from "./appwrite";

async function call(action, payload = {}) {
  const res = await functions.createExecution(
    "api",
    JSON.stringify({ action, ...payload }),
    false
  );
  const raw = res.responseBody || res.response || "{}";
  let out = {};
  try { out = JSON.parse(raw); } catch {}
  if (out.error) {
    const err = new Error(out.error);
    err.code = out.error;
    throw err;
  }
  return out;
}

export const setRole = (role) => call("set-role", { role });
export const submitSong = (song) => call("submit-song", song);

export const requestMessage = (payload) => call("request-message", payload);
export const listRequests = () => call("list-requests");
export const respondRequest = (requestId, decision) => call("respond-request", { requestId, decision });
export const listConversations = () => call("list-conversations");
export const listMessages = (conversationId) => call("list-messages", { conversationId });
export const sendMessage = (payload) => call("send-message", payload);
export const markRead = (conversationId) => call("mark-read", { conversationId });

export const resendVerification = async () => {
  const { account } = await import("./appwrite");
  return account.createVerification(`${window.location.origin}/`);
};
