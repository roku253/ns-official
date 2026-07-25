/**
 * 端末識別（別端末ログイン通知用）。ブラウザごとに1つ localStorage に保持。
 * GAS 側は known_device_ids（JSON 配列）に登録済みの端末からの再ログインではメールを送らない。
 */

const DEVICE_ID_KEY = "investigator_device_id_v1"

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return ""
  try {
    let id = window.localStorage.getItem(DEVICE_ID_KEY)
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
      window.localStorage.setItem(DEVICE_ID_KEY, id)
    }
    return id
  } catch {
    return ""
  }
}

/** GAS に渡す端末メモ（User-Agent 先頭。個人特定には使わない旨を通知文に書く） */
export function getDeviceLabelForAlert(): string {
  if (typeof navigator === "undefined") return ""
  return String(navigator.userAgent || "").slice(0, 240)
}
