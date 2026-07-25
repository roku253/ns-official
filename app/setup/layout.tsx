import type { Metadata } from "next"
import type { ReactNode } from "react"
import Link from "next/link"

export const metadata: Metadata = {
  title: "調査員登録 | NS",
  description: "認証メールのリンクから開く、ログインID・パスワードの登録フォームです。",
}

/**
 * メール用「ID・パスワード登録」専用。公式サイトトーンに揃えつつ、通常の閲覧導線とは区別する。
 */
export default function SetupLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <div className="relative min-h-screen bg-[#050607] font-official-sans-jp text-zinc-200 antialiased">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.8]"
        aria-hidden
        style={{
          backgroundImage: `
            linear-gradient(152deg, rgba(10, 12, 16, 0.4) 0%, transparent 50%),
            radial-gradient(ellipse at 20% 15%, rgba(127,156,184,0.07) 0%, transparent 46%),
            radial-gradient(ellipse at 80% 85%, rgba(201,162,39,0.05) 0%, transparent 44%)
          `,
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-[#06080c]" aria-hidden />

      <header className="relative z-10 border-b border-[#c9a227]/25 bg-black/55 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="min-w-0 text-left">
            <p className="font-official-serif-latin text-[10px] uppercase tracking-[0.4em] text-[#7f9cb8]/85">// MAIL REGISTRATION</p>
            <p className="mt-1.5 text-xs text-zinc-500">通常のログイン（/login）とは別の手続きです</p>
          </div>
          <Link
            href="/"
            className="shrink-0 font-official-serif-latin text-[11px] uppercase tracking-[0.22em] text-[#c9a227]/90 transition-colors hover:text-[#e8d89a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c9a227]/50"
          >
            公式トップへ
          </Link>
        </div>
      </header>
      {children}
    </div>
  )
}
