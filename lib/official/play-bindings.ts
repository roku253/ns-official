/**
 * 公式 /play/<slug>… → 作品デプロイへの同一オリジン転送マップ。
 * コンソールの upstreamOrigin と静的 stories から組み立てる。
 */

import storiesJson from "@/data/official/stories.json"
import type { GasWorksCatalog, WorkStoryRecord } from "@/lib/official/works-catalog"
import { resolveGasWebAppUrl } from "@/lib/gas-url"

export type PlayBindingMap = Record<string, string> // slug → upstream origin (no trailing slash)

const TTL_MS = 60_000

let memory: { at: number; map: PlayBindingMap } | null = null

function stripSlash(origin: string): string {
  return origin.trim().replace(/\/+$/, "")
}

function isHttpOrigin(origin: string): boolean {
  try {
    const u = new URL(origin)
    return u.protocol === "http:" || u.protocol === "https:"
  } catch {
    return false
  }
}

/** 静的カタログからのシード（GAS 未到達時・初回） */
export function playBindingsFromStaticStories(
  stories: ReadonlyArray<Pick<WorkStoryRecord, "id" | "upstreamOrigin" | "externalUrl">> = storiesJson as WorkStoryRecord[]
): PlayBindingMap {
  const map: PlayBindingMap = {}
  for (const s of stories) {
    const id = (s.id || "").trim()
    const origin = stripSlash(s.upstreamOrigin || "")
    if (!id || !origin || !isHttpOrigin(origin)) continue
    map[id] = origin
  }
  // 最低限の本番デフォルト
  if (!map["koko-ni-iru"]) {
    map["koko-ni-iru"] = "https://koko-ni-iru.vercel.app"
  }
  return map
}

export function playBindingsFromCatalog(catalog: GasWorksCatalog | null | undefined): PlayBindingMap {
  const map = playBindingsFromStaticStories()
  const top = catalog?.playBindings
  if (top && typeof top === "object") {
    for (const [slug, raw] of Object.entries(top)) {
      const id = slug.trim()
      const origin =
        typeof raw === "string"
          ? stripSlash(raw)
          : raw && typeof raw === "object" && typeof (raw as { upstreamOrigin?: string }).upstreamOrigin === "string"
            ? stripSlash((raw as { upstreamOrigin: string }).upstreamOrigin)
            : ""
      if (id && origin && isHttpOrigin(origin)) map[id] = origin
    }
  }
  // stories 側の upstreamOrigin も反映
  const stories = [
    ...Object.values(catalog?.cmsStories || {}),
    // overrides / works.stories
  ]
  for (const s of stories) {
    const id = (s.id || "").trim()
    const origin = stripSlash(s.upstreamOrigin || "")
    if (id && origin && isHttpOrigin(origin)) map[id] = origin
  }
  if (catalog?.works) {
    for (const we of Object.values(catalog.works)) {
      for (const [sid, st] of Object.entries(we?.stories || {})) {
        const origin = stripSlash(st?.upstreamOrigin || "")
        if (sid && origin && isHttpOrigin(origin)) map[sid] = origin
      }
    }
  }
  if (catalog?.overrides) {
    for (const [sid, o] of Object.entries(catalog.overrides)) {
      const origin = stripSlash(o?.upstreamOrigin || "")
      if (sid && origin && isHttpOrigin(origin)) map[sid] = origin
    }
  }
  return map
}

/** カタログ保存時にトップレベル playBindings を再構築 */
export function buildPlayBindingsForCatalog(
  stories: ReadonlyArray<Pick<WorkStoryRecord, "id" | "upstreamOrigin">>,
  catalog: GasWorksCatalog
): Record<string, { upstreamOrigin: string }> {
  const map: Record<string, { upstreamOrigin: string }> = {}
  const put = (id: string, origin: string) => {
    const sid = id.trim()
    const o = stripSlash(origin)
    if (!sid || !o || !isHttpOrigin(o)) return
    map[sid] = { upstreamOrigin: o }
  }
  for (const s of stories) put(s.id, s.upstreamOrigin || "")
  for (const s of Object.values(catalog.cmsStories || {})) put(s.id, s.upstreamOrigin || "")
  for (const we of Object.values(catalog.works || {})) {
    for (const [sid, st] of Object.entries(we?.stories || {})) {
      put(sid, st?.upstreamOrigin || "")
    }
  }
  return map
}

export function officialPlayPathForWorkId(workId: string): string {
  const id = workId.trim()
  return id ? `/play/${encodeURIComponent(id)}` : "/"
}

/**
 * リクエストパス /play/<slug>/... を作品 upstream の絶対 URL に変換。
 * 見つからなければ null（公式の既存 /play ページへフォールスルー）。
 */
export function mapPlayPathToUpstream(
  pathname: string,
  search: string,
  bindings: PlayBindingMap
): string | null {
  const m = pathname.match(/^\/play\/([^/]+)(\/.*)?$/)
  if (!m) return null
  const slug = decodeURIComponent(m[1] || "").trim()
  if (!slug) return null
  const origin = bindings[slug]
  if (!origin) return null
  const rest = m[2] || ""
  // 作品アプリは basePath=/play/<slug> 前提（ここにいると同じ）
  return `${origin}/play/${encodeURIComponent(slug)}${rest}${search || ""}`
}

async function fetchBindingsFromGas(): Promise<PlayBindingMap | null> {
  const url = resolveGasWebAppUrl()
  if (!url) return null
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "publicGetWorksCatalog" }),
      cache: "no-store",
    })
    if (!res.ok) return null
    const data = (await res.json()) as { success?: boolean; catalog?: GasWorksCatalog }
    if (!data.success || !data.catalog) return null
    return playBindingsFromCatalog(data.catalog)
  } catch {
    return null
  }
}

function applyEnvOverrides(map: PlayBindingMap): PlayBindingMap {
  const next = { ...map }
  // PLAY_UPSTREAM_<SLUG_WITH_UNDERSCORES>=https://...
  // 例: PLAY_UPSTREAM_KOKO_NI_IRU=http://127.0.0.1:3001
  for (const [key, raw] of Object.entries(process.env)) {
    const m = key.match(/^PLAY_UPSTREAM_(.+)$/)
    if (!m || !raw) continue
    const slug = m[1].toLowerCase().replace(/_/g, "-")
    const origin = stripSlash(raw)
    if (slug && isHttpOrigin(origin)) next[slug] = origin
  }
  return next
}

/** proxy 用。短時間キャッシュ付き */
export async function getPlayBindingMap(): Promise<PlayBindingMap> {
  const now = Date.now()
  if (memory && now - memory.at < TTL_MS) return memory.map
  const fromGas = await fetchBindingsFromGas()
  const map = applyEnvOverrides(fromGas || playBindingsFromStaticStories())
  memory = { at: now, map }
  return map
}

export function invalidatePlayBindingCache() {
  memory = null
}
