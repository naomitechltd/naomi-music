import { functions } from "./appwrite";

async function call(action, payload = {}) {
  const res = await functions.createExecution(
    "api",
    JSON.stringify({ action, ...payload }),
    false
  );
  const raw =
    res?.responseBody ??
    res?.response ??
    res?.data?.responseBody ??
    res?.data?.response ??
    "{}";
  let out = {};
  try { out = JSON.parse(raw); } catch {}
  if (out.error) {
    let msg = out.error;
    if (out.error === "rate-limited") {
      const mins = Math.ceil((out.retryAfterMs || 0) / 60000);
      msg = out.note || `Too many requests. Try again in ${mins} min.`;
    } else if (out.error === "email-not-verified") {
      msg = "Verify your email first.";
    }
    const err = new Error(msg);
    err.code = out.error;
    err.retryAfterMs = out.retryAfterMs;
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
export const openConversation = (toUserId) => call("open-conversation", { toUserId });
export const listMessages = (conversationId) => call("list-messages", { conversationId });
export const sendMessage = (payload) => call("send-message", payload);
export const markRead = (conversationId) => call("mark-read", { conversationId });

export const reportContent = (payload) => call("report", payload);
export const listReports = () => call("list-reports");
export const resolveReport = (reportId) => call("resolve-report", { reportId });
export const blockUser = (blockedUserId) => call("block", { blockedUserId });
export const unblockUser = (blockedUserId) => call("unblock", { blockedUserId });
export const listBlocks = () => call("list-blocks");

export const submitRating = (songId, value) => call("submit-rating", { songId, value });
export const listRatings = (songId) => call("list-ratings", { songId });
export const submitComment = (songId, body) => call("submit-comment", { songId, body });
export const listComments = (songId, limit) => call("list-comments", { songId, limit });
export const deleteComment = (commentId) => call("delete-comment", { commentId });

export const getArtistProfile = (userId) => call("get-artist-profile", { userId });

export const followUser = (targetUserId) => call("follow", { targetUserId });
export const unfollowUser = (targetUserId) => call("unfollow", { targetUserId });
export const getFollowStats = (targetUserId) => call("follow-stats", { targetUserId });
export const listFollowers = (targetUserId) => call("list-followers", { targetUserId });
export const listFollowing = (targetUserId) => call("list-following", { targetUserId });
export const incrementPlay = (songId) => call("increment-play", { songId });
export const changeEmail = (email, password) => call("change-email", { email, password });
export const deleteMyAccount = () => call("delete-my-account");
export const exportMyData = () => call("export-my-data");

export const resendVerification = async () => {
  const { account } = await import("./appwrite");
  return account.createVerification(`${window.location.origin}/`);
};
