"use client"

import { Suspense } from "react"
import Link from "next/link"
import { OfficialLoadingScreen } from "@/components/official-site/official-loading-screen"
import { OfficialSiteHeader } from "@/components/official-site/official-site-header"
import { OfficialSitePortalFooter } from "@/components/official-site/official-site-portal-footer"
import { useOfficialBootstrap } from "@/lib/official/use-official-bootstrap"

function ContactMain() {
  return (
    <>
      <main className="flex-1 font-official-sans-jp">
        <div className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
          <p className="font-official-serif-latin text-[10px] uppercase tracking-[0.4em] text-[#7f9cb8]/85">Contact</p>
          <h1 className="mt-4 font-official-display text-3xl tracking-[0.15em] text-[#e8d89a] md:text-4xl">お問い合わせ</h1>

          <p className="mt-10 text-sm leading-[2] text-zinc-400">
            運営への連絡は、メールにて受け付けています（ダミーアドレス — 実運用時に差し替えてください）。
          </p>

          <p className="mt-8">
            <a
              href="mailto:contact@example.com"
              className="inline-flex border border-[#c9a227]/50 px-5 py-2.5 font-official-serif-latin text-[11px] uppercase tracking-[0.22em] text-[#e8d89a] transition-colors hover:border-[#c9a227] hover:bg-[#c9a227]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c9a227]/50"
            >
              contact@example.com
            </a>
          </p>

          <section className="mt-16 border-t border-[#c9a227]/20 pt-10">
            <h2 className="font-official-serif-latin text-[11px] uppercase tracking-[0.3em] text-zinc-500">Social</h2>
            <ul className="mt-4 space-y-2 text-sm text-zinc-600">
              <li>
                <span className="cursor-not-allowed no-underline opacity-60" aria-disabled="true">
                  Fediverse（準備中）
                </span>
              </li>
              <li>
                <span className="cursor-not-allowed opacity-60" aria-disabled="true">
                  動画チャネル（準備中）
                </span>
              </li>
            </ul>
          </section>

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

export default function ContactPage() {
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
        <ContactMain />
      </Suspense>
    </div>
  )
}
