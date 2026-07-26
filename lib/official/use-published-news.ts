"use client"

import { useEffect, useState } from "react"
import {
  fetchPublishedNewsItems,
  getCachedPublishedNewsItems,
} from "@/lib/official/fetch-public-news"
import type { NewsItem } from "@/lib/official/news"

/** 閲覧中の更新検知（タブ復帰 + 定期）。GAS 負荷を抑えた間隔 */
const NEWS_POLL_MS = 90_000

/**
 * 公開お知らせ。キャッシュ即表示のあと、マウント時・タブ復帰・定期で再取得する。
 */
export function usePublishedNews(limit?: number): NewsItem[] {
  const [items, setItems] = useState<NewsItem[]>(() => {
    const all = getCachedPublishedNewsItems()
    return typeof limit === "number" ? all.slice(0, limit) : all
  })

  useEffect(() => {
    let cancelled = false

    const apply = (next: NewsItem[]) => {
      if (cancelled) return
      setItems(typeof limit === "number" ? next.slice(0, limit) : next)
    }

    const refresh = () => {
      void fetchPublishedNewsItems({ force: true }).then(apply)
    }

    refresh()

    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh()
    }
    document.addEventListener("visibilitychange", onVisibility)

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh()
    }, NEWS_POLL_MS)

    return () => {
      cancelled = true
      document.removeEventListener("visibilitychange", onVisibility)
      window.clearInterval(timer)
    }
  }, [limit])

  return items
}
