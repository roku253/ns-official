"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import Image from "next/image"
import type { MergedWorkItem } from "@/lib/official/works-catalog"
import { OfficialNavOverlay } from "@/components/official-site/official-nav-overlay"
import { cn } from "@/lib/utils"

type OfficialSiteHeaderProps = {
  sessionOk: boolean
  mergedWorks: MergedWorkItem[]
  /** トップではロゴを / に、作品一覧では省略可 */
  logoHref?: string
  /** 左側に「トップへ」などを差し込む */
  leading?: ReactNode
  className?: string
}

/**
 * D4KK 系の最小ヘッダー：
 *  ┌──────────────────────────────┐
 *  │ [leading]  LOGO        [≡]   │
 *  └──────────────────────────────┘
 *  ハンバーガーから OfficialNavOverlay が全画面で開く。
 *
 *  position: fixed で運用する理由：
 *    - body に overflow-x: hidden があり、sticky が viewport 基準ではなく
 *      body 内部基準になってスクロール時に流れて消える既知の挙動を回避
 *    - GSAP ScrollTrigger.pin がページ内で scroll context を作るときに
 *      sticky 要素が一緒に流される副作用も回避
 *  ハンバーガーは画面右上に常時固定表示される。
 */
export function OfficialSiteHeader({
  sessionOk,
  mergedWorks,
  logoHref = "/",
  leading,
  className,
}: OfficialSiteHeaderProps) {
  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 border-b border-[#c9a227]/25 bg-black/55 font-official-serif-latin backdrop-blur-md",
        className
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 md:px-6 md:py-3.5">
        {leading ? <div className="flex min-w-0 shrink items-center">{leading}</div> : null}

        {/**
         * ロゴはイメージのみ（"N S" テキストはイメージと冗長なので撤去）。
         */}
        <Link
          href={logoHref}
          className="flex shrink-0 items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c9a227]/55"
          aria-label="NS トップへ"
        >
          <Image
            src="/placeholder-logo.png"
            alt="NS"
            width={140}
            height={42}
            className="h-8 w-auto opacity-95 md:h-9"
            priority
          />
        </Link>

        <div className="ml-auto flex items-center">
          <OfficialNavOverlay sessionOk={sessionOk} mergedWorks={mergedWorks} />
        </div>
      </div>
    </header>
  )
}
