"use client"

import { postGas } from "@/lib/gas"
import {
  getPublishedNewsItems,
  getStaticNewsCatalog,
  normalizeNewsCatalog,
  type NewsCatalog,
  type NewsItem,
} from "@/lib/official/news"

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

export async function fetchPublishedNewsItems(): Promise<NewsItem[]> {
  const cat = await fetchPublicNewsCatalog()
  return getPublishedNewsItems(cat)
}
