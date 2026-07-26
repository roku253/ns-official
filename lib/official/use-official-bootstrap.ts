"use client"

import { useEffect, useState } from "react"
import { postGas } from "@/lib/gas"
import { LS_ACCOUNT, LS_AUTH, LS_SESSION } from "@/lib/storage-keys"
import type { GasWorksCatalog, MergedWorkItem, WorkStoryRecord } from "@/lib/official/works-catalog"
import { mergeWorksCatalog } from "@/lib/official/works-catalog"
import { rememberWorkPlayUrls } from "@/lib/official/work-play-urls"
import { DEFAULT_CASE_ID } from "@/lib/platform/game-routing.generated"
import { consumeOfficialLoaderRequest } from "@/lib/official/official-loader-intent"
import { prefetchPublicNews } from "@/lib/official/fetch-public-news"
import storiesJson from "@/data/official/stories.json"

const REL_LOGIN_WINDOW_MS = 1000 * 60 * 60 * 24 * 30

/** ロード画面が一瞬で消えないよう最低表示（ms）。画像プリロード完了も待つ */
const OFFICIAL_LOAD_MIN_MS = 480

function preloadOfficialPlaceholders(): Promise<void> {
  return new Promise((resolve) => {
    let done = 0
    const finish = () => {
      done += 1
      if (done >= 2) resolve()
    }
    const w = new window.Image()
    w.onload = finish
    w.onerror = finish
    w.src = "/placeholder.webp"
    const j = new window.Image()
    j.onload = finish
    j.onerror = finish
    j.src = "/placeholder.jpg"
  })
}

export type OfficialBootstrapState = {
  ready: boolean
  loadingProgress: number
  sessionOk: boolean
  gasCatalog: GasWorksCatalog
  mergedWorks: MergedWorkItem[]
}

type CachedBootstrap = {
  sessionOk: boolean
  gasCatalog: GasWorksCatalog
  mergedWorks: MergedWorkItem[]
}

/** 公式ページ間のソフト遷移では同じ JS ヒープが残るため、タブ切替で再ブートしない */
let bootstrapCache: CachedBootstrap | null = null

async function runOfficialBootstrap(opts: {
  onProgress: (n: number) => void
  signal: { cancelled: boolean }
  /** ローダー表示時のみ最低表示時間を守る */
  withMinDelay: boolean
}): Promise<CachedBootstrap> {
  const { onProgress, signal, withMinDelay } = opts
  const staticStories = storiesJson as unknown as WorkStoryRecord[]
  rememberWorkPlayUrls(staticStories)
  const startedAt = Date.now()
  onProgress(5)

  const started = window.localStorage.getItem(LS_AUTH.STARTED) === "true"
  const loginId = (window.localStorage.getItem(LS_ACCOUNT.LOGIN_ID) || "").trim()
  const lastLoginAt = Number(window.localStorage.getItem(LS_AUTH.LAST_LOGIN_AT) || "0")
  const fresh = Number.isFinite(lastLoginAt) && Date.now() - lastLoginAt <= REL_LOGIN_WINDOW_MS
  const pw =
    window.sessionStorage.getItem(LS_SESSION.PASSWORD) || window.localStorage.getItem(LS_ACCOUNT.PASSWORD) || ""
  const ok = Boolean(started && loginId && fresh && pw)
  if (signal.cancelled) throw new Error("cancelled")

  if (!window.sessionStorage.getItem(LS_SESSION.PASSWORD) && window.localStorage.getItem(LS_ACCOUNT.PASSWORD)) {
    window.sessionStorage.setItem(LS_SESSION.PASSWORD, window.localStorage.getItem(LS_ACCOUNT.PASSWORD)!)
  }
  onProgress(18)

  const catalogPromise = (async (): Promise<GasWorksCatalog> => {
    try {
      const res = await postGas<{ success?: boolean; catalog?: GasWorksCatalog }>({
        action: "publicGetWorksCatalog",
      })
      if (res.success && res.catalog && typeof res.catalog === "object") {
        return res.catalog
      }
    } catch {
      /* オフライン時は静的カタログのみ */
    }
    return {}
  })()
  const newsPromise = prefetchPublicNews().catch(() => [])

  const catalog = await catalogPromise
  if (signal.cancelled) throw new Error("cancelled")

  const merged = mergeWorksCatalog(staticStories, catalog)
  rememberWorkPlayUrls(merged)
  onProgress(42)

  const preloadPromise = preloadOfficialPlaceholders()

  if (ok && loginId && pw) {
    try {
      const caseId = window.localStorage.getItem(LS_ACCOUNT.CASE_ID)?.trim() || DEFAULT_CASE_ID
      await postGas({
        action: "loginAccount",
        loginId,
        password: pw,
        caseId,
      })
    } catch {
      /* 検証失敗時もページは表示 */
    }
  }
  if (signal.cancelled) throw new Error("cancelled")
  onProgress(72)
  await Promise.all([preloadPromise, newsPromise])
  if (signal.cancelled) throw new Error("cancelled")
  onProgress(92)

  if (withMinDelay) {
    const elapsed = Date.now() - startedAt
    if (elapsed < OFFICIAL_LOAD_MIN_MS) {
      await new Promise((r) => window.setTimeout(r, OFFICIAL_LOAD_MIN_MS - elapsed))
    }
    if (signal.cancelled) throw new Error("cancelled")
    onProgress(100)
    await new Promise((r) => window.setTimeout(r, 90))
  } else {
    onProgress(100)
  }
  if (signal.cancelled) throw new Error("cancelled")

  return { sessionOk: ok, gasCatalog: catalog, mergedWorks: merged }
}

export function useOfficialBootstrap(): OfficialBootstrapState {
  const [boot] = useState(() => {
    const force = typeof window !== "undefined" ? consumeOfficialLoaderRequest() : null
    const cached = bootstrapCache
    const hit = Boolean(cached) && !force
    return {
      useCache: hit,
      ready: hit,
      loadingProgress: hit ? 100 : 0,
      sessionOk: cached?.sessionOk ?? false,
      gasCatalog: (cached?.gasCatalog ?? {}) as GasWorksCatalog,
      mergedWorks: (cached?.mergedWorks ?? []) as MergedWorkItem[],
    }
  })

  const [ready, setReady] = useState(boot.ready)
  const [loadingProgress, setLoadingProgress] = useState(boot.loadingProgress)
  const [sessionOk, setSessionOk] = useState(boot.sessionOk)
  const [gasCatalog, setGasCatalog] = useState<GasWorksCatalog>(boot.gasCatalog)
  const [mergedWorks, setMergedWorks] = useState<MergedWorkItem[]>(boot.mergedWorks)

  useEffect(() => {
    let cancelled = false
    const signal = { cancelled: false }
    const useCache = boot.useCache

    async function bootstrap() {
      try {
        // タブ切替など: キャッシュがあればローダーなしで即表示（裏で静かに再同期）
        if (useCache && bootstrapCache) {
          setSessionOk(bootstrapCache.sessionOk)
          setGasCatalog(bootstrapCache.gasCatalog)
          setMergedWorks(bootstrapCache.mergedWorks)
          setLoadingProgress(100)
          setReady(true)
          try {
            const fresh = await runOfficialBootstrap({
              onProgress: () => {},
              signal,
              withMinDelay: false,
            })
            if (cancelled) return
            bootstrapCache = fresh
            setSessionOk(fresh.sessionOk)
            setGasCatalog(fresh.gasCatalog)
            setMergedWorks(fresh.mergedWorks)
          } catch {
            /* 裏同期失敗は表示済みのキャッシュのまま */
          }
          return
        }

        const result = await runOfficialBootstrap({
          onProgress: (n) => {
            if (!cancelled) setLoadingProgress(n)
          },
          signal,
          withMinDelay: true,
        })
        if (cancelled) return
        bootstrapCache = result
        setSessionOk(result.sessionOk)
        setGasCatalog(result.gasCatalog)
        setMergedWorks(result.mergedWorks)
        setReady(true)
      } catch {
        if (!cancelled) {
          if (bootstrapCache) {
            setSessionOk(bootstrapCache.sessionOk)
            setGasCatalog(bootstrapCache.gasCatalog)
            setMergedWorks(bootstrapCache.mergedWorks)
          }
          setReady(true)
        }
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
      signal.cancelled = true
    }
  }, [boot.useCache])

  return { ready, loadingProgress, sessionOk, gasCatalog, mergedWorks }
}
