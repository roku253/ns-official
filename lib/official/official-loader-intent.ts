/** sessionStorage: 公式 CRT ローダーを意図的に再表示するとき */
export const SS_OFFICIAL_LOADER = "ns_official_show_loader"

export type OfficialLoaderReason = "cold" | "enter-play" | "return-from-play"

export function requestOfficialLoader(reason: OfficialLoaderReason) {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(SS_OFFICIAL_LOADER, reason)
  } catch {
    /* private mode 等 */
  }
}

/** 読み取ってクリア。true ならローダーを強制表示 */
export function consumeOfficialLoaderRequest(): OfficialLoaderReason | null {
  if (typeof window === "undefined") return null
  try {
    const v = window.sessionStorage.getItem(SS_OFFICIAL_LOADER)
    if (!v) return null
    window.sessionStorage.removeItem(SS_OFFICIAL_LOADER)
    if (v === "cold" || v === "enter-play" || v === "return-from-play") return v
    return "cold"
  } catch {
    return null
  }
}
