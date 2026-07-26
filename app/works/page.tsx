"use client"

import { Suspense, useMemo, useEffect, useState, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { useSearchParams, useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Play, Search, X } from "lucide-react"
import { OfficialLoadingScreen } from "@/components/official-site/official-loading-screen"
import { OfficialSiteHeader } from "@/components/official-site/official-site-header"
import { OfficialSitePortalFooter } from "@/components/official-site/official-site-portal-footer"
import { PlayThisWorkTextLink } from "@/components/official-site/play-this-work-button"
import { useOfficialBootstrap } from "@/lib/official/use-official-bootstrap"
import type { MergedWorkItem } from "@/lib/official/works-catalog"
import { caseMarkCodeForWorkId, filterMergedWorksByCatalog } from "@/lib/official/works-catalog"
import { labelForGameKind, OFFICIAL_GAME_KIND_OPTIONS } from "@/lib/official/game-kinds"
import { cn } from "@/lib/utils"

function WorksCatalogMain({
  mergedWorks,
  sessionOk,
}: {
  mergedWorks: MergedWorkItem[]
  sessionOk: boolean
}) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const q = searchParams.get("q") ?? ""
  const kind = searchParams.get("kind") ?? "all"

  const [searchInput, setSearchInput] = useState(q)

  useEffect(() => { setSearchInput(q) }, [q])

  const pushParams = useCallback(
    (newQ: string, newKind: string) => {
      const params = new URLSearchParams()
      if (newQ.trim()) params.set("q", newQ.trim())
      if (newKind && newKind !== "all") params.set("kind", newKind)
      const qs = params.toString()
      router.push(qs ? `/works?${qs}` : "/works", { scroll: false })
    },
    [router]
  )

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      pushParams(searchInput, kind)
    },
    [searchInput, kind, pushParams]
  )

  const handleKindChange = useCallback(
    (newKind: string) => {
      pushParams(q, newKind)
    },
    [q, pushParams]
  )

  const handleClear = useCallback(() => {
    setSearchInput("")
    pushParams("", "all")
  }, [pushParams])

  const filteredWorks = useMemo(
    () => filterMergedWorksByCatalog(mergedWorks, q, kind),
    [mergedWorks, q, kind]
  )

  useEffect(() => {
    if (typeof window === "undefined") return
    const hash = window.location.hash
    if (!hash.startsWith("#work-")) return
    const id = hash.slice(1)
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }, [filteredWorks])

  const filterActive = Boolean(q.trim()) || (kind && kind !== "all")
  const emptyFiltered = filteredWorks.length === 0 && mergedWorks.length > 0

  const enterClass =
    "inline-flex items-center gap-2 font-official-serif-latin text-[11px] uppercase tracking-[0.22em] text-[#7f9cb8] underline-offset-4 transition-colors hover:text-[#c9a227] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c9a227]/50"

  return (
    <>
    <main className="flex-1 font-official-sans-jp">
      <div className="mx-auto max-w-5xl px-4 pb-10 pt-24 md:px-6 md:pb-14 md:pt-28">
        <h1 className="font-official-display text-2xl tracking-[0.2em] text-[#e8d89a] md:text-3xl">作品一覧</h1>
        <p className="mt-3 max-w-2xl text-sm leading-[1.95] text-zinc-500">
          Case archive — 公開中の謎解き・物語体験を、番号付きで整列しています。
        </p>

        {/* ── 検索 + ジャンルフィルター ── */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <form onSubmit={handleSearch} className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f9cb8]/60" aria-hidden />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="タイトル・キーワードで検索"
              className="w-full border border-[#c9a227]/25 bg-[#0a0c10]/80 py-2.5 pl-10 pr-9 font-official-sans-jp text-sm text-zinc-200 placeholder:text-zinc-600 transition-colors focus:border-[#c9a227]/55 focus:outline-none"
            />
            {searchInput ? (
              <button
                type="button"
                onClick={() => { setSearchInput(""); pushParams("", kind) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 transition-colors hover:text-zinc-300"
                aria-label="検索をクリア"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </form>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleKindChange("all")}
              className={cn(
                "border px-3 py-2 text-[11px] uppercase tracking-[0.18em] transition-colors",
                kind === "all" || !kind
                  ? "border-[#c9a227]/55 bg-[#c9a227]/12 text-[#e8d89a]"
                  : "border-[#c9a227]/20 bg-transparent text-zinc-500 hover:border-[#c9a227]/40 hover:text-zinc-300"
              )}
            >
              すべて
            </button>
            {OFFICIAL_GAME_KIND_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleKindChange(opt.id)}
                className={cn(
                  "border px-3 py-2 text-[11px] tracking-[0.08em] transition-colors",
                  kind === opt.id
                    ? "border-[#c9a227]/55 bg-[#c9a227]/12 text-[#e8d89a]"
                    : "border-[#c9a227]/20 bg-transparent text-zinc-500 hover:border-[#c9a227]/40 hover:text-zinc-300"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {filterActive ? (
          <p className="mt-6 text-center text-xs text-zinc-500">
            {filteredWorks.length} 件が該当
            {" "}
            <button
              onClick={handleClear}
              className="font-medium text-[#c9a227] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a227]/50"
            >
              条件をクリア
            </button>
          </p>
        ) : null}

        {mergedWorks.length === 0 ? (
          <p className="mt-12 text-sm text-zinc-500">現在公開中の作品はありません。</p>
        ) : emptyFiltered ? (
          <p className="mt-12 text-center text-sm text-zinc-500">
            条件に一致する作品がありません。
            <button
              onClick={handleClear}
              className="ml-1 font-medium text-[#c9a227] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a227]/50"
            >
              条件をクリア
            </button>
          </p>
        ) : (
          <ul className="mt-12 flex flex-col border-t border-[#c9a227]/25">
            {filteredWorks.map((s) => (
              <li key={s.id} id={`work-${s.id}`} className="scroll-mt-28 border-b border-[#c9a227]/20">
                <article className="group flex flex-col transition-colors hover:bg-[#c9a227]/[0.04] md:flex-row">
                  <div className="flex flex-col justify-center border-[#c9a227]/15 px-5 py-8 md:w-[32%] md:border-r md:px-6 md:py-10">
                    <p className="font-official-serif-latin text-[9px] uppercase tracking-[0.35em] text-[#7f9cb8]/85">
                      Case mark
                    </p>
                    <p className="mt-3 font-mono text-sm tracking-wide text-[#e8d89a] tabular-nums md:text-base">
                      {caseMarkCodeForWorkId(mergedWorks, s.id)}
                    </p>
                    <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-zinc-600">{s.id}</p>
                    <p className="mt-2 text-xs text-zinc-500">{labelForGameKind(s.gameKind)}</p>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-5 p-5 md:flex-row md:items-stretch md:gap-6 md:p-8">
                    <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden border border-[#c9a227]/20 md:aspect-auto md:h-auto md:w-[42%] md:max-w-md">
                      {s.coverImage ? (
                        <Image
                          src={s.coverImage}
                          alt=""
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                          sizes="(max-width:768px) 100vw, 280px"
                        />
                      ) : (
                        <div className={cn("h-full min-h-[140px] w-full bg-gradient-to-br md:min-h-full", s.accent || "from-slate-900 to-black")} />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-center">
                      <h2 className="font-official-display text-xl tracking-wide text-zinc-100 md:text-2xl">
                        <Link
                          href={`/works/${encodeURIComponent(s.id)}`}
                          className="transition-colors hover:text-[#e8d89a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c9a227]/50"
                        >
                          {s.displayTitle}
                        </Link>
                      </h2>
                      {s.displaySubtitle ? (
                        <p className="mt-2 text-sm text-[#7f9cb8]/85">{s.displaySubtitle}</p>
                      ) : null}
                      <p className="mt-4 text-sm leading-[1.95] text-zinc-500">{s.displayTagline}</p>
                      <div className="mt-6 flex flex-wrap items-center gap-5">
                        <Link
                          href={`/works/${encodeURIComponent(s.id)}`}
                          className={enterClass}
                        >
                          詳細 <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                        <PlayThisWorkTextLink
                          workId={s.id}
                          sessionOk={sessionOk}
                          className={enterClass}
                          externalUrl={s.externalUrl}
                          tokenResource={s.tokenResource}
                        >
                          Enter <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
                        </PlayThisWorkTextLink>
                      </div>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>

    </main>
      <OfficialSitePortalFooter className="bg-[#050607]" />
    </>
  )
}

export default function WorksCatalogPage() {
  const { ready, loadingProgress, sessionOk, mergedWorks } = useOfficialBootstrap()

  if (!ready) {
    return <OfficialLoadingScreen progress={loadingProgress} />
  }

  return (
    <div className="official-portal-surface flex min-h-screen flex-col bg-[#0a0c10] font-sans text-zinc-200 antialiased">
      <OfficialSiteHeader
        sessionOk={sessionOk}
        mergedWorks={mergedWorks}
        leading={
          <div className="flex min-w-0 shrink items-center gap-2 font-official-sans-jp">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-[#c9a227] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a227]/50"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              トップ
            </Link>
            <span className="text-zinc-700">|</span>
            <span className="text-sm font-medium text-zinc-300">作品一覧</span>
          </div>
        }
      />

      <Suspense
        fallback={
          <main className="mx-auto max-w-5xl px-4 py-10 text-sm text-zinc-500 md:px-6">
            一覧を読み込み中…
          </main>
        }
      >
        <WorksCatalogMain mergedWorks={mergedWorks} sessionOk={sessionOk} />
      </Suspense>
    </div>
  )
}
