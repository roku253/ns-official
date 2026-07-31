"use client"

import storiesJson from "@/data/official/stories.json"

/** 作品 ID → プレイ先 URL（ブート時にカタログから温める） */
let playUrlsByCaseId: Record<string, string> = {}

function seedFromStaticStories() {
  if (typeof window === "undefined") return
  if (Object.keys(playUrlsByCaseId).length > 0) return
  const rows = storiesJson as Array<{ id?: string; externalUrl?: string }>
  for (const s of rows) {
    const id = (s.id || "").trim()
    const url = normalizeWorkPlayUrl((s.externalUrl || "").trim())
    if (id && url) playUrlsByCaseId[id] = url
  }
}

/**
 * 作品デプロイ直URLは別オリジンになりログイン情報が消える。
 * 「ここにいる」は公式の rewrite 経路（同一オリジン）へ正規化する。
 */
export function normalizeWorkPlayUrl(url: string): string {
  const raw = (url || "").trim()
  if (!raw) return ""
  if (raw.startsWith("/")) return raw
  try {
    const u = new URL(raw)
    if (u.hostname === "koko-ni-iru.vercel.app") {
      const path = `${u.pathname}${u.search}${u.hash}`
      if (path === "/" || path === "") return "/play/koko-ni-iru"
      if (path.startsWith("/play/koko-ni-iru")) return path
      return `/play/koko-ni-iru${path.startsWith("/") ? path : `/${path}`}`
    }
  } catch {
    /* ignore */
  }
  return raw
}

export function rememberWorkPlayUrls(
  works: ReadonlyArray<{ id: string; externalUrl?: string | null }>
): void {
  seedFromStaticStories()
  const next: Record<string, string> = { ...playUrlsByCaseId }
  for (const w of works) {
    const id = (w.id || "").trim()
    if (!id) continue
    const url = normalizeWorkPlayUrl((w.externalUrl || "").trim())
    if (url) next[id] = url
  }
  playUrlsByCaseId = next
}

/** 明示 URL があれば優先。なければキャッシュ／静的シード */
export function resolveWorkPlayUrl(caseId: string, explicit?: string | null): string | null {
  seedFromStaticStories()
  const e = normalizeWorkPlayUrl((explicit || "").trim())
  if (e) return e
  const id = (caseId || "").trim()
  if (!id) return null
  const cached = normalizeWorkPlayUrl((playUrlsByCaseId[id] || "").trim())
  return cached || null
}
