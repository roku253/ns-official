"use client"

import { postGas } from "@/lib/gas"
import {
  getPublishedNewsItems,
  getStaticNewsCatalog,
  normalizeNewsCatalog,
  type NewsCatalog,
  type NewsItem,
} from "@/lib/official/news"

const SS_PUBLIC_NEWS = "ns_public_news_v1"

/** ソフト遷移用（同一タブの JS ヒープ） */
let memoryPublished: NewsItem[] | null = null
let inflight: Promise<NewsItem[]> | null = null

function readSessionPublished(): NewsItem[] | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(SS_PUBLIC_NEWS)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    return getPublishedNewsItems(normalizeNewsCatalog({ items: parsed }))
  } catch {
    return null
  }
}

function writeCache(items: NewsItem[]) {
  memoryPublished = items
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(SS_PUBLIC_NEWS, JSON.stringify(items))
  } catch {
    /* quota */
  }
}

/** 同期で取れる最新キャッシュ（なければ空）。描画初期値用 */
export function getCachedPublishedNewsItems(): NewsItem[] {
  if (memoryPublished) return memoryPublished
  const fromSs = readSessionPublished()
  if (fromSs) {
    memoryPublished = fromSs
    return fromSs
  }
  return []
}

export function clearPublicNewsCache() {
  memoryPublished = null
  inflight = null
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(SS_PUBLIC_NEWS)
  } catch {
    /* ignore */
  }
}

/** ブラウザから GAS publicGetNews。失敗時は静的 JSON */
export async function fetchPublicNewsCatalog(): Promise<NewsCatalog> {
  try {
    const res = await postGas<{ success?: boolean; news?: unknown }>({
      action: "publicGetNews",
    })
    if (res.success && res.news != null) {
      const cat = normalizeNewsCatalog(res.news)
      if (cat.items.length > 0 || Array.isArray((res.news as { items?: unknown }).items)) {
        return cat
      }
    }
  } catch {
    /* オフライン / 未デプロイ */
  }
  return getStaticNewsCatalog()
}

async function loadPublishedNewsItems(): Promise<NewsItem[]> {
  const cat = await fetchPublicNewsCatalog()
  const items = getPublishedNewsItems(cat)
  writeCache(items)
  return items
}

/**
 * 公開お知らせ。キャッシュがあれば即返し、裏で再取得する。
 * force 時は GAS 完了まで待ち、結果でキャッシュを更新する。
 */
export async function fetchPublishedNewsItems(opts?: {
  force?: boolean
}): Promise<NewsItem[]> {
  const force = opts?.force === true
  if (!force && memoryPublished !== null) {
    if (!inflight) {
      inflight = loadPublishedNewsItems().finally(() => {
        inflight = null
      })
    }
    return memoryPublished
  }
  if (!force) {
    const fromSs = readSessionPublished()
    if (fromSs) {
      memoryPublished = fromSs
      if (!inflight) {
        inflight = loadPublishedNewsItems().finally(() => {
          inflight = null
        })
      }
      return fromSs
    }
  }

  if (!inflight || force) {
    inflight = loadPublishedNewsItems().finally(() => {
      inflight = null
    })
  }
  return inflight
}

/** 起動ブートストラップ用。完了まで待ちキャッシュを温める */
export async function prefetchPublicNews(): Promise<NewsItem[]> {
  return fetchPublishedNewsItems({ force: true })
}
