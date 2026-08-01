"use client"

import storiesJson from "@/data/official/stories.json"

/** 作品 ID → プレイ先 URL（ブート時にカタログから温める） */
let playUrlsByCaseId: Record<string, string> = {}
/** 作品 ID → デプロイ origin（絶対URLの正規化に使う） */
let upstreamByCaseId: Record<string, string> = {}

function stripSlash(origin: string): string {
  return origin.trim().replace(/\/+$/, "")
}

function officialPath(workId: string): string {
  return `/play/${encodeURIComponent(workId)}`
}

function seedFromStaticStories() {
  if (typeof window === "undefined") return
  if (Object.keys(playUrlsByCaseId).length > 0) return
  const rows = storiesJson as Array<{ id?: string; externalUrl?: string; upstreamOrigin?: string }>
  for (const s of rows) {
    const id = (s.id || "").trim()
    if (!id) continue
    const origin = stripSlash(s.upstreamOrigin || "")
    if (origin) upstreamByCaseId[id] = origin
    const url = normalizeWorkPlayUrl((s.externalUrl || "").trim(), id)
    if (url) playUrlsByCaseId[id] = url
    else if (origin) playUrlsByCaseId[id] = officialPath(id)
  }
}

/**
 * 作品デプロイ直URLは別オリジンになりログイン情報が消える。
 * upstreamOrigin が分かる作品は公式の `/play/<id>`（同一オリジン）へ正規化する。
 */
export function normalizeWorkPlayUrl(url: string, workId?: string): string {
  const raw = (url || "").trim()
  const id = (workId || "").trim()
  if (!raw) {
    return id && upstreamByCaseId[id] ? officialPath(id) : ""
  }
  if (raw.startsWith("/")) return raw
  try {
    const u = new URL(raw)
    const origin = `${u.protocol}//${u.host}`
    if (id && upstreamByCaseId[id] && stripSlash(upstreamByCaseId[id]) === stripSlash(origin)) {
      return officialPath(id)
    }
    for (const [sid, up] of Object.entries(upstreamByCaseId)) {
      if (stripSlash(up) === stripSlash(origin)) return officialPath(sid)
    }
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
  works: ReadonlyArray<{ id: string; externalUrl?: string | null; upstreamOrigin?: string | null }>
): void {
  seedFromStaticStories()
  const nextUrls: Record<string, string> = { ...playUrlsByCaseId }
  const nextUp: Record<string, string> = { ...upstreamByCaseId }
  for (const w of works) {
    const id = (w.id || "").trim()
    if (!id) continue
    const origin = stripSlash(w.upstreamOrigin || "")
    if (origin) nextUp[id] = origin
    const url = normalizeWorkPlayUrl((w.externalUrl || "").trim(), id)
    if (url) nextUrls[id] = url
    else if (origin || nextUp[id]) nextUrls[id] = officialPath(id)
  }
  playUrlsByCaseId = nextUrls
  upstreamByCaseId = nextUp
}

/** 明示 URL があれば優先。なければキャッシュ／静的シード。upstream があれば /play/<id> */
export function resolveWorkPlayUrl(caseId: string, explicit?: string | null): string | null {
  seedFromStaticStories()
  const id = (caseId || "").trim()
  const e = normalizeWorkPlayUrl((explicit || "").trim(), id)
  if (e) return e
  if (!id) return null
  const cached = normalizeWorkPlayUrl((playUrlsByCaseId[id] || "").trim(), id)
  if (cached) return cached
  if (upstreamByCaseId[id]) return officialPath(id)
  return null
}
