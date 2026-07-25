"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { OFFICIAL_GAME_KIND_OPTIONS } from "@/lib/official/game-kinds"
import { cn } from "@/lib/utils"

const DEBOUNCE_MS = 320

/**
 * 公式ヘッダー中央: 作品名検索 + 種類フィルター。
 * `q` / `kind` を URL に同期（トップ・作品一覧は同一パス上、`/account` からは `/works` へ遷移）。
 */
export function OfficialCatalogToolbar({ className }: { className?: string }) {
  const router = useRouter()
  const pathname = usePathname() || "/"
  const searchParams = useSearchParams()

  const urlQ = searchParams.get("q") ?? ""
  const urlKind = searchParams.get("kind") ?? "all"

  const [draftQ, setDraftQ] = useState(urlQ)

  useEffect(() => {
    setDraftQ(urlQ)
  }, [urlQ])

  const isWorksPage = pathname === "/works" || pathname.startsWith("/works/")

  const pushCatalogUrl = useCallback(
    (nextQ: string, nextKind: string) => {
      const params = new URLSearchParams()
      const t = nextQ.trim()
      if (t) params.set("q", t)
      const k = (nextKind || "all").trim()
      if (k && k !== "all") params.set("kind", k)
      const qs = params.toString()
      const suffix = qs ? `?${qs}` : ""

      if (isWorksPage) {
        router.replace(`/works${suffix}`)
      } else {
        router.push(`/works${suffix}`)
      }
    },
    [isWorksPage, router]
  )

  useEffect(() => {
    if (!isWorksPage) return
    const t = window.setTimeout(() => {
      if (draftQ.trim() === urlQ) return
      pushCatalogUrl(draftQ, urlKind)
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [draftQ, urlQ, urlKind, pushCatalogUrl, isWorksPage])

  return (
    <div
      className={cn(
        "flex w-full min-w-0 max-w-full flex-col gap-2 sm:max-w-xl sm:flex-row sm:items-stretch sm:justify-center lg:max-w-none lg:w-full",
        className
      )}
    >
      <label className="relative flex min-w-0 flex-1 items-center sm:min-w-[8rem]">
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={draftQ}
          onChange={(e) => setDraftQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              pushCatalogUrl(draftQ, urlKind)
            }
          }}
          placeholder="作品名で検索"
          autoComplete="off"
          className="h-10 w-full rounded-full border border-border bg-secondary/40 py-2 pl-9 pr-4 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
          aria-label="作品名で検索"
        />
      </label>
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">種類</span>
        <select
          value={urlKind}
          onChange={(e) => pushCatalogUrl(draftQ, e.target.value)}
          className="h-10 min-w-0 w-full flex-1 rounded-full border border-border bg-secondary/40 px-3 text-sm text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 sm:w-auto sm:min-w-[9.5rem] sm:flex-none sm:max-w-[13rem]"
          aria-label="ゲームの種類で絞り込み"
        >
          <option value="all">すべて</option>
          {OFFICIAL_GAME_KIND_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
