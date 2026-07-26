"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { ArrowRight, ChevronDown } from "lucide-react"
import { OfficialLoadingScreen } from "@/components/official-site/official-loading-screen"
import { OfficialSiteHeader } from "@/components/official-site/official-site-header"
import { OfficialSitePortalFooter } from "@/components/official-site/official-site-portal-footer"
import { OfficialLenisProvider } from "@/components/official-site/lenis-provider"
import { ManifestoStage } from "@/components/official-site/manifesto-stage"
import { CrtStaticTransition } from "@/components/official-site/crt-static-transition"
import { CrtBarrelWrapper } from "@/components/official-site/crt-screen-overlay"
import {
  RevealLines,
  RevealOnView,
  TypewriterHeading,
} from "@/components/official-site/scroll-reveal"
import { WORKS_CATALOG_PATH } from "@/lib/routes"
import { formatNewsDate, type NewsItem } from "@/lib/official/news"
import {
  fetchPublishedNewsItems,
  getCachedPublishedNewsItems,
} from "@/lib/official/fetch-public-news"
import { useOfficialBootstrap } from "@/lib/official/use-official-bootstrap"
import type { GasWorksCatalog, MergedWorkItem } from "@/lib/official/works-catalog"
import {
  caseMarkCodeForWorkId,
  filterMergedWorksByCatalog,
  pickFeaturedWithMeta,
  worksExceptFeatured,
} from "@/lib/official/works-catalog"
import { cn } from "@/lib/utils"

const cardEnterClass =
  "inline-flex items-center gap-2 font-official-serif-latin text-[11px] uppercase tracking-[0.28em] text-[#7f9cb8] underline-offset-4 transition-colors group-hover:text-[#c9a227]"

/* ── Hero ────────────────────────────────────────────────── */

function HeroSection() {
  return (
    <section className="relative flex min-h-[100svh] w-full flex-col bg-[#050607] text-zinc-200">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.7]"
        aria-hidden
        style={{
          backgroundImage: `
            linear-gradient(152deg, rgba(10, 12, 16, 0.2) 0%, transparent 45%),
            linear-gradient(118deg, rgba(127, 156, 184, 0.07) 0%, transparent 40%),
            repeating-linear-gradient(
              -18deg,
              transparent 0px,
              transparent 4px,
              rgba(255, 255, 255, 0.02) 4px,
              rgba(255, 255, 255, 0.02) 5px
            )
          `,
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#06080c]" aria-hidden />

      <div className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-5 pt-16 text-center md:px-8 md:pt-24">
        <TypewriterHeading
          text="Welcome to NS"
          as="h1"
          className="font-dot-gothic text-4xl font-normal tracking-[0.08em] text-[#e8d89a] md:text-6xl lg:text-7xl"
          cursorClassName="text-[#c9a227]/85"
          step={0.07}
          startDelay={0.2}
        />

        <RevealOnView delay={0.6}>
          <div className="mt-10 max-w-md text-left font-dot-gothic text-sm leading-[2.15] tracking-wide text-zinc-300 md:mt-14 md:max-w-lg md:text-base">
            <p className="text-balance">
              ────あなたの知らない場所で、
              <br />
              いくつもの物語が静かに始まっている。
            </p>
            <p className="mt-4 text-balance text-zinc-400">
              画面の向こう側に、手がかりが待っている。
              <br />
              その扉を開くかどうかは、あなた次第────。
            </p>
          </div>
        </RevealOnView>
      </div>

      <div className="mb-8 flex flex-col items-center gap-2 self-center text-[#c9a227]/70 md:mb-12" aria-hidden>
        <ChevronDown className="h-6 w-6 animate-bounce" />
        <span className="font-mono text-[9px] uppercase tracking-[0.4em] text-[#c9a227]/60">scroll</span>
      </div>
    </section>
  )
}

/* ── Cases ───────────────────────────────────────────────── */

function CasesSection({
  featured,
  rest,
  mergedWorks,
}: {
  featured: MergedWorkItem | null
  rest: MergedWorkItem[]
  mergedWorks: MergedWorkItem[]
}) {
  return (
    <section className="relative w-full bg-[#080a0e] py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 opacity-60" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(ellipse at 0% 0%, rgba(127,156,184,0.08) 0%, transparent 40%),
              radial-gradient(ellipse at 100% 100%, rgba(201,162,39,0.07) 0%, transparent 40%)
            `,
          }}
        />
      </div>
      <div className="relative mx-auto w-full max-w-5xl px-4 md:px-6">
        <div className="mb-12 flex items-end justify-end md:mb-16">
          <RevealOnView delay={0.3}>
            <Link
              href={WORKS_CATALOG_PATH}
              className="font-official-serif-latin text-[11px] uppercase tracking-[0.25em] text-[#7f9cb8] transition-colors hover:text-[#c9a227] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c9a227]/50"
            >
              View all →
            </Link>
          </RevealOnView>
        </div>

        {featured ? (
          <RevealOnView delay={0.15}>
            <Link
              href={`/works/${encodeURIComponent(featured.id)}`}
              className="group mb-10 block overflow-hidden border border-[#c9a227]/35 bg-[#080a0e] shadow-[0_0_0_1px_rgba(127,156,184,0.06)] transition-colors hover:border-[#c9a227]/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c9a227]/55 md:mb-14"
            >
              <div className="border-b border-[#c9a227]/25 px-5 py-3 md:px-6">
                <span className="font-official-serif-latin text-[10px] uppercase tracking-[0.35em] text-[#c9a227]/90">
                  Featured case
                </span>
                <span className="ml-3 font-mono text-[11px] text-zinc-500 tabular-nums">
                  {caseMarkCodeForWorkId(mergedWorks, featured.id)}
                </span>
              </div>
              <div className="grid gap-0 md:grid-cols-2">
                <div className="relative aspect-[16/10] min-h-[200px] overflow-hidden md:aspect-auto md:min-h-[300px]">
                  {featured.coverImage ? (
                    <Image
                      src={featured.coverImage}
                      alt=""
                      fill
                      className="object-cover opacity-[0.96] transition-transform duration-700 group-hover:scale-[1.04]"
                      sizes="(max-width:768px) 100vw, 50vw"
                    />
                  ) : (
                    <div className={cn("h-full w-full bg-gradient-to-br opacity-95", featured.accent || "from-slate-900 to-black")} />
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30 md:bg-gradient-to-r" />
                </div>
                <div className="flex flex-col justify-center p-6 md:p-10">
                  <p className="font-official-serif-latin text-[10px] uppercase tracking-[0.3em] text-[#7f9cb8]/85">
                    Featured entry
                  </p>
                  <h3 className="mt-3 font-official-display text-2xl tracking-wide text-zinc-100 md:text-3xl">
                    {featured.displayTitle}
                  </h3>
                  {featured.displaySubtitle ? (
                    <p className="mt-1 text-sm text-[#7f9cb8]/90">{featured.displaySubtitle}</p>
                  ) : null}
                  <p className="mt-4 text-sm leading-[1.95] text-zinc-400">{featured.displayTagline}</p>
                  <div className="mt-6">
                    <span className={cardEnterClass}>
                      作品詳細を見る <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </RevealOnView>
        ) : null}

        {rest.length > 0 ? (
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((s, i) => (
              <li key={s.id}>
                <RevealOnView delay={0.1 + 0.08 * i}>
                  <Link
                    href={`/works/${encodeURIComponent(s.id)}`}
                    className="group block h-full overflow-hidden border border-[#c9a227]/30 bg-[#0a0c10] transition-colors hover:border-[#c9a227]/55 hover:shadow-[0_0_24px_-8px_rgba(201,162,39,0.25)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c9a227]/55"
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden">
                      {s.coverImage ? (
                        <Image
                          src={s.coverImage}
                          alt=""
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                          sizes="(max-width:768px) 100vw, 360px"
                        />
                      ) : (
                        <div className={cn("h-full w-full bg-gradient-to-br opacity-95", s.accent || "from-slate-900 to-black")} />
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <p className="absolute left-3 top-3 font-mono text-[10px] uppercase tracking-wider text-[#e8d89a]/95 tabular-nums">
                        {caseMarkCodeForWorkId(mergedWorks, s.id)}
                      </p>
                    </div>
                    <div className="flex flex-col p-5">
                      <h3 className="font-official-display text-base tracking-wide text-zinc-100 md:text-lg">
                        {s.displayTitle}
                      </h3>
                      <p className="mt-2 text-xs leading-[1.85] text-zinc-500 md:text-sm md:leading-[1.95]">
                        {s.displayTagline}
                      </p>
                      <div className="mt-4">
                        <span className={cardEnterClass}>
                          詳細へ <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </span>
                      </div>
                    </div>
                  </Link>
                </RevealOnView>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  )
}

/* ── News ────────────────────────────────────────────────── */

function NewsSection() {
  const [items, setItems] = useState<NewsItem[]>(() => getCachedPublishedNewsItems().slice(0, 3))

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const next = await fetchPublishedNewsItems({ force: true })
      if (!cancelled) setItems(next.slice(0, 3))
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section id="news" className="relative w-full bg-[#0a0c10] py-24 text-center md:py-32">
      <div className="mx-auto max-w-2xl px-4 md:px-6">
        <RevealOnView>
          <p className="font-official-serif-latin text-[10px] uppercase tracking-[0.45em] text-[#7f9cb8]/85">
            // NEWS
          </p>
        </RevealOnView>
        <TypewriterHeading
          text="お知らせ"
          as="h2"
          className="mt-3 font-official-display text-3xl tracking-[0.2em] text-[#e8d89a] md:text-4xl"
          cursorClassName="text-[#c9a227]/85"
        />
        {items.length === 0 ? (
          <RevealLines
            className="mt-8 text-sm leading-[2] text-zinc-500"
            baseDelay={0.4}
            lines={[<p key="a">現在、掲載中のお知らせはありません。</p>]}
          />
        ) : (
          <RevealOnView delay={0.3}>
            <ul className="mt-10 space-y-5 text-left">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href="/news"
                    className="group flex flex-col gap-1 border-b border-zinc-800/70 pb-4 transition-colors sm:flex-row sm:items-baseline sm:gap-4"
                  >
                    <time
                      dateTime={item.date}
                      className="shrink-0 font-official-serif-latin text-[11px] tracking-[0.2em] text-[#7f9cb8]"
                    >
                      {formatNewsDate(item.date)}
                    </time>
                    <span className="text-sm leading-[1.9] text-zinc-300 transition-colors group-hover:text-[#e8d89a]">
                      {item.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </RevealOnView>
        )}
        <RevealOnView delay={0.6}>
          <Link
            href="/news"
            className="mt-10 inline-block font-official-serif-latin text-[11px] uppercase tracking-[0.25em] text-[#7f9cb8] transition-colors hover:text-[#c9a227] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c9a227]/50"
          >
            View all news →
          </Link>
        </RevealOnView>
      </div>
    </section>
  )
}

/* ── Page main ───────────────────────────────────────────── */

const MANIFESTO_SLIDES = [
  {
    eyebrow: "01 / Boundary",
    leadLines: 3,
    body: [
      "現実とは、誰かの記憶が積み重なってできた",
      "地層のようなものだ。",
      "虚構とは、まだ誰にも見つけられていない記憶のことだ。",
    ],
    mobileBody: [
      { text: "現実とは、", lead: true },
      { text: "誰かの記憶が積み重なってできた", lead: true },
      { text: "地層のようなものだ。", lead: true },
      { text: "虚構とは、", lead: true },
      { text: "まだ誰にも見つけられていない", lead: true },
      { text: "記憶のことだ。", lead: true },
    ],
  },
  {
    eyebrow: "02 / Boundary",
    leadLines: 2,
    body: [
      "二つの世界は表裏ではなく、どこかで繋がっている。",
      "その接続点に、解かれるのを待つ謎が眠っている。",
    ],
    mobileBody: [
      { text: "二つの世界は表裏ではなく、", lead: true },
      { text: "どこかで繋がっている。", lead: true },
      { text: "その接続点に、", lead: true },
      { text: "解かれるのを待つ謎が眠っている。", lead: true },
    ],
  },
  {
    eyebrow: "03 / Boundary",
    leadLines: 2,
    body: [
      "あなたが読み解くひとつひとつの手がかりが",
      "物語をあるべき結末へと導いていく。",
    ],
    mobileBody: [
      { text: "あなたが読み解く", lead: true },
      { text: "ひとつひとつの手がかりが", lead: true },
      { text: "物語をあるべき結末へと", lead: true },
      { text: "導いていく。", lead: true },
    ],
  },
  {
    eyebrow: "04 / Boundary",
    leadLines: 3,
    body: [
      "ここは、現実と虚構が交差する場所。",
      "この先に広がる物語の中へ、",
      "どうぞ、お進みください。",
    ],
    mobileBody: [
      { text: "ここは、", lead: true },
      { text: "現実と虚構が交差する場所。", lead: true },
      { text: "この先に広がる", lead: true },
      { text: "物語の中へ、", lead: true },
      { text: "どうぞ、お進みください。", lead: true },
    ],
  },
]

function OfficialHomeMain({
  mergedWorks,
  gasCatalog,
}: {
  mergedWorks: MergedWorkItem[]
  gasCatalog: GasWorksCatalog
  sessionOk: boolean
}) {
  const searchParams = useSearchParams()
  const q = searchParams.get("q") ?? ""
  const kind = searchParams.get("kind") ?? "all"

  const filteredWorks = useMemo(
    () => filterMergedWorksByCatalog(mergedWorks, q, kind),
    [mergedWorks, q, kind]
  )

  const { featured } = pickFeaturedWithMeta(filteredWorks, gasCatalog)
  const restWorks = worksExceptFeatured(filteredWorks, featured)
  const filterActive = Boolean(q.trim()) || (kind && kind !== "all")
  const emptyFiltered = filteredWorks.length === 0 && mergedWorks.length > 0

  if (emptyFiltered) {
    return (
      <>
        <main className="flex-1 font-official-sans-jp">
          <section className="bg-[#0a0c10] px-4 py-24 text-center md:px-6">
            <p className="text-sm text-zinc-500">
              条件に一致する作品がありません。検索語や種類を変えるか、
              <Link
                href="/"
                className="font-medium text-[#c9a227] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a227]/50"
              >
                条件をクリア
              </Link>
              してください。
            </p>
          </section>
        </main>
        <OfficialSitePortalFooter className="bg-[#050607]" />
      </>
    )
  }

  return (
    <>
      <main className="flex-1 font-official-sans-jp">
        {filterActive ? (
          <p className="bg-[#0a0c10] px-4 pb-2 pt-8 text-center text-xs text-zinc-500 md:px-6">
            検索・フィルター適用中 — {filteredWorks.length} 件が該当
          </p>
        ) : null}

        <HeroSection />
        <ManifestoStage slides={MANIFESTO_SLIDES} slideHeightVh={130} />
        <CrtStaticTransition heightVh={400} />
        <CasesSection featured={featured ?? null} rest={restWorks} mergedWorks={mergedWorks} />
        <NewsSection />
      </main>
      <OfficialSitePortalFooter className="bg-[#050607]" />
    </>
  )
}

export default function OfficialHomePage() {
  const { ready, loadingProgress, sessionOk, gasCatalog, mergedWorks } = useOfficialBootstrap()

  if (!ready) {
    return <OfficialLoadingScreen progress={loadingProgress} />
  }

  return (
    <OfficialLenisProvider>
      <CrtBarrelWrapper active>
        <div className="official-portal-surface flex min-h-screen flex-col bg-[#0a0c10] text-zinc-200 antialiased">
          <OfficialSiteHeader sessionOk={sessionOk} mergedWorks={mergedWorks} />

          <Suspense
            fallback={
              <main className="mx-auto max-w-5xl px-4 py-16 text-sm text-zinc-500 md:px-6">
                作品情報を読み込み中…
              </main>
            }
          >
            <OfficialHomeMain
              mergedWorks={mergedWorks}
              gasCatalog={gasCatalog}
              sessionOk={sessionOk}
            />
          </Suspense>
        </div>
      </CrtBarrelWrapper>
    </OfficialLenisProvider>
  )
}
