export function getNotificationPermission(): NotificationPermission {
  if (typeof window === "undefined" || typeof Notification === "undefined") return "denied"
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || typeof Notification === "undefined") return "denied"
  if (Notification.permission === "granted") return "granted"
  if (Notification.permission === "denied") return "denied"
  try {
    return await Notification.requestPermission()
  } catch {
    return "denied"
  }
}

export function showBriefNotification(title: string, body: string) {
  if (typeof window === "undefined" || typeof Notification === "undefined") return
  if (Notification.permission !== "granted") return
  try {
    new Notification(title, { body, icon: "/icon.svg" })
  } catch {
    /* ignore */
  }
}
