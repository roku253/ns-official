"use client"

import { useEffect, useState } from "react"
import { postGas } from "@/lib/gas"
import { LS_ACCOUNT, LS_AUTH, LS_SESSION } from "@/lib/storage-keys"
import type { GasWorksCatalog, MergedWorkItem, WorkStoryRecord } from "@/lib/official/works-catalog"
import { mergeWorksCatalog } from "@/lib/official/works-catalog"
import { DEFAULT_CASE_ID } from "@/games/signal-trace/portal-engine/registry"
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

export function useOfficialBootstrap(): OfficialBootstrapState {
  const [ready, setReady] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [sessionOk, setSessionOk] = useState(false)
  const [gasCatalog, setGasCatalog] = useState<GasWorksCatalog>({})
  const [mergedWorks, setMergedWorks] = useState<MergedWorkItem[]>([])

  useEffect(() => {
    let cancelled = false
    const staticStories = storiesJson as unknown as WorkStoryRecord[]

    async function bootstrap() {
      try {
      const startedAt = Date.now()
      setLoadingProgress(5)
      const started = window.localStorage.getItem(LS_AUTH.STARTED) === "true"
      const loginId = (window.localStorage.getItem(LS_ACCOUNT.LOGIN_ID) || "").trim()
      const lastLoginAt = Number(window.localStorage.getItem(LS_AUTH.LAST_LOGIN_AT) || "0")
      const fresh = Number.isFinite(lastLoginAt) && Date.now() - lastLoginAt <= REL_LOGIN_WINDOW_MS
      const pw =
        window.sessionStorage.getItem(LS_SESSION.PASSWORD) || window.localStorage.getItem(LS_ACCOUNT.PASSWORD) || ""
      const ok = Boolean(started && loginId && fresh && pw)
      if (cancelled) return
      setSessionOk(ok)
      if (!window.sessionStorage.getItem(LS_SESSION.PASSWORD) && window.localStorage.getItem(LS_ACCOUNT.PASSWORD)) {
        window.sessionStorage.setItem(LS_SESSION.PASSWORD, window.localStorage.getItem(LS_ACCOUNT.PASSWORD)!)
      }
      setLoadingProgress(18)

      let catalog: GasWorksCatalog = {}
      try {
        const res = await postGas<{ success?: boolean; catalog?: GasWorksCatalog }>({
          action: "publicGetWorksCatalog",
        })
        if (res.success && res.catalog && typeof res.catalog === "object") {
          catalog = res.catalog
        }
      } catch {
        /* オフライン時は静的カタログのみ */
      }
      if (cancelled) return
      setGasCatalog(catalog)
      setMergedWorks(mergeWorksCatalog(staticStories, catalog))
      setLoadingProgress(42)

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
      if (cancelled) return
      setLoadingProgress(72)
      await preloadPromise
      if (cancelled) return
      setLoadingProgress(92)
      const elapsed = Date.now() - startedAt
      if (elapsed < OFFICIAL_LOAD_MIN_MS) {
        await new Promise((r) => window.setTimeout(r, OFFICIAL_LOAD_MIN_MS - elapsed))
      }
      if (cancelled) return
      setLoadingProgress(100)
      await new Promise((r) => window.setTimeout(r, 90))
      if (!cancelled) setReady(true)
      } catch {
        if (!cancelled) setReady(true)
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  return { ready, loadingProgress, sessionOk, gasCatalog, mergedWorks }
}
