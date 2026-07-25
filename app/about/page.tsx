"use client"

import { Suspense } from "react"
import Link from "next/link"
import { OfficialLoadingScreen } from "@/components/official-site/official-loading-screen"
import { OfficialSiteHeader } from "@/components/official-site/official-site-header"
import { OfficialSitePortalFooter } from "@/components/official-site/official-site-portal-footer"
import { useOfficialBootstrap } from "@/lib/official/use-official-bootstrap"
import { OFFICIAL_GAME_KIND_OPTIONS } from "@/lib/official/game-kinds"

function AboutMain() {
  return (
    <>
      <main className="flex-1 font-official-sans-jp">
        <div className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
          <p className="font-official-serif-latin text-[10px] uppercase tracking-[0.4em] text-[#7f9cb8]/85">About</p>
          <h1 className="mt-4 font-official-display text-3xl tracking-[0.15em] text-[#e8d89a] md:text-4xl">NS について</h1>

          <div className="mt-12 space-y-8 text-sm leading-[2.05] text-zinc-400 md:text-base md:leading-[2.1]">
            <p>
              NS は、没入型の物語と謎解きをひとつの導線に載せるための公式ポータルです。作品ごとに異なる界面へ遷移しつつも、進行の記録と再開の作法は共通の礼儀として保ちます。
            </p>
            <p>
              ここで扱うのは娯楽としての速度ではなく、読み手が自分の歩幅で思考を深められる余地です。仕掛けの詳細は各作品に委ね、ポータル側は静かな待合室の役割を心がけています。
            </p>
          </div>

          <section className="mt-16 border-t border-[#c9a227]/20 pt-12">
            <h2 className="font-official-serif-latin text-[11px] uppercase tracking-[0.3em] text-[#c9a227]/85">Genres on file</h2>
            <ul className="mt-6 space-y-3 text-sm text-zinc-500">
              {OFFICIAL_GAME_KIND_OPTIONS.map((o) => (
                <li key={o.id} className="flex gap-3">
                  <span className="font-mono text-xs text-[#7f9cb8]/80">{o.id}</span>
                  <span>{o.label}</span>
                </li>
              ))}
            </ul>
          </section>

          <p className="mt-14">
            <Link
              href="/works"
              className="font-official-serif-latin text-[11px] uppercase tracking-[0.25em] text-[#7f9cb8] transition-colors hover:text-[#c9a227] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c9a227]/50"
            >
              ← Works
            </Link>
          </p>
        </div>
      </main>
      <OfficialSitePortalFooter className="bg-[#050607]" />
    </>
  )
}

export default function AboutPage() {
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
        <AboutMain />
      </Suspense>
    </div>
  )
}
