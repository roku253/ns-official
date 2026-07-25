/** 位置情報・通知などがブラウザにブロックされやすい環境（http + LAN IP など） */
export function isDeviceApiLikelyBlocked(): boolean {
  if (typeof window === "undefined") return false
  return !window.isSecureContext
}
