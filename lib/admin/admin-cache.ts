/** sessionStorage 付き SWR 風キャッシュ（運営コンソール用） */

export function adminCacheRead<T>(key: string): T | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { at?: number; data?: T }
    if (!parsed || typeof parsed !== "object" || parsed.data === undefined) return null
    return parsed.data
  } catch {
    return null
  }
}

export function adminCacheWrite<T>(key: string, data: T) {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data }))
  } catch {
    /* quota */
  }
}

export const ADMIN_CACHE_KEYS = {
  progress: "ns_admin_progress_v1",
  worksCatalog: "ns_admin_works_catalog_v1",
  news: "ns_admin_news_v1",
} as const
