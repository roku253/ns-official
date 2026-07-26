"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { OfficialLoadingScreen } from "@/components/official-site/official-loading-screen"
import { OfficialSiteHeader } from "@/components/official-site/official-site-header"
import { OfficialSitePortalFooter } from "@/components/official-site/official-site-portal-footer"
import { fetchPublishedNewsItems } from "@/lib/official/fetch-public-news"
import { formatNewsDate, type NewsItem } from "@/lib/official/news"
import { useOfficialBootstrap } from "@/lib/official/use-official-bootstrap"

function NewsMain() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [loadingNews, setLoadingNews] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const next = await fetchPublishedNewsItems()
      if (!cancelled) {
        setItems(next)
        setLoadingNews(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <main className="flex-1 font-official-sans-jp">
        <div className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
          <p className="font-official-serif-latin text-[10px] uppercase tracking-[0.4em] text-[#7f9cb8]/85">
            News
          </p>
          <h1 className="mt-4 font-official-display text-3xl tracking-[0.15em] text-[#e8d89a] md:text-4xl">
            お知らせ
          </h1>

          <div className="mt-12 space-y-10">
            {loadingNews && items.length === 0 ? (
              <p className="text-sm leading-[2] text-zinc-500">読み込み中…</p>
            ) : items.length === 0 ? (
              <p className="text-sm leading-[2] text-zinc-500">
                現在、掲載中のお知らせはありません。
              </p>
            ) : (
              items.map((item) => (
                <article key={item.id} className="border-b border-zinc-800/80 pb-8 last:border-b-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <time
                      dateTime={item.date}
                      className="font-official-serif-latin text-[11px] tracking-[0.2em] text-[#7f9cb8]"
                    >
                      {formatNewsDate(item.date)}
                    </time>
                    <span className="rounded-sm border border-[#c9a227]/40 px-2 py-0.5 text-[10px] tracking-[0.2em] text-[#c9a227]/90">
                      {item.category}
                    </span>
                  </div>
                  <h2 className="mt-3 font-official-display text-lg tracking-[0.08em] text-zinc-100 md:text-xl">
                    {item.title}
                  </h2>
                  <p className="mt-3 whitespace-pre-line text-sm leading-[2] text-zinc-400">
                    {item.body}
                  </p>
                </article>
              ))
            )}
          </div>

          <p className="mt-14">
            <Link
              href="/"
              className="font-official-serif-latin text-[11px] uppercase tracking-[0.25em] text-[#7f9cb8] transition-colors hover:text-[#c9a227] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c9a227]/50"
            >
              ← Home
            </Link>
          </p>
        </div>
      </main>
      <OfficialSitePortalFooter className="bg-[#050607]" />
    </>
  )
}

export default function NewsPage() {
  const { ready, loadingProgress, sessionOk, mergedWorks } = useOfficialBootstrap()

  if (!ready) {
    return <OfficialLoadingScreen progress={loadingProgress} />
  }

  return (
    <div className="official-portal-surface flex min-h-screen flex-col bg-[#0a0c10] text-zinc-200 antialiased">
      <OfficialSiteHeader sessionOk={sessionOk} mergedWorks={mergedWorks} />
      <Suspense
        fallback={
          <main className="px-4 py-16 text-sm text-zinc-500 md:px-6">読み込み中…</main>
        }
      >
        <NewsMain />
      </Suspense>
    </div>
  )
}
