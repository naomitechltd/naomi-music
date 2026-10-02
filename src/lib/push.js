import { savePushSub } from "./api";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function isPushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window;
}

export async function isPushEnabled() {
  if (!(await isPushSupported())) return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return !!sub && Notification.permission === "granted";
}

export async function enablePush() {
  if (!(await isPushSupported())) throw new Error("Push not supported on this browser");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Permission denied");

  const reg = await navigator.serviceWorker.ready;
  const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapid) throw new Error("VAPID public key missing");

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid),
    });
  }

  const json = sub.toJSON();
  await savePushSub(json.endpoint, json.keys.p256dh, json.keys.auth);
  return true;
}

export async function disablePush() {
  if (!(await isPushSupported())) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) await sub.unsubscribe();
}
