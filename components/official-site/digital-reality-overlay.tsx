"use client"

import { usePathname } from "next/navigation"
import { useMemo } from "react"
import { GlitchCanvas } from "@/components/official-site/glitch-canvas"

/* ──────────────────────────────────────────────────────────
 * DigitalRealityOverlay
 *
 * 公式サイトの全ページに薄く乗せる「デジタルとリアルのはざま」
 * 表現用の固定オーバーレイ。
 *
 *  - 作品詳細ページ（/works/<slug>）では没入感のため非表示。
 *  - ゲームプレイ系（/play, /games, /admin など）でも非表示。
 *  - 会員ログイン・登録（/login, /setup, /register）は静かな画面のため非表示。
 *  - z-index は 30：fixed なヘッダー（z-40）よりは下、本文より上。
 *  - 全レイヤー pointerEvents: none。
 * ────────────────────────────────────────────────────────── */

const HIDE_PREFIXES = [
  "/play",
  "/games",
  "/admin",
  "/login",
  "/setup",
  "/register",
  "/account",
  "/test",
  "/dev",
]

export function DigitalRealityOverlay() {
  const pathname = usePathname() ?? "/"

  /** 表示判定。/works/[id] の詳細ページも没入優先で非表示にする */
  const visible = useMemo(() => {
    if (HIDE_PREFIXES.some((p) => pathname.startsWith(p))) return false
    /** /works/[slug]（詳細）は非表示。/works そのものは表示 */
    if (pathname.startsWith("/works/")) return false
    return true
  }, [pathname])

  if (!visible) return null

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-30"
      style={{
        /** 薄く乗せる前提。ここで透明度の上限をガードする */
        opacity: 0.55,
        mixBlendMode: "screen",
      }}
    >
      {/* HUD っぽい走査ライン（CSS のみ） */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            rgba(232, 216, 154, 0.025) 0px,
            rgba(232, 216, 154, 0.025) 1px,
            transparent 1px,
            transparent 3px
          )`,
        }}
      />
      {/* 動的グリッチ・粒子 */}
      <GlitchCanvas intensity="ambient" />
    </div>
  )
}
