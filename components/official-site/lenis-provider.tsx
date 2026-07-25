"use client"

import { useEffect, type ReactNode } from "react"
import { ReactLenis, useLenis } from "lenis/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

if (typeof window !== "undefined") {
  /** ScrollTrigger は SSR で評価できないので browser でだけ register */
  gsap.registerPlugin(ScrollTrigger)
}

/**
 * Lenis のスクロールイベントを GSAP ScrollTrigger に流し込み、
 * Lenis の RAF を GSAP ticker に乗せて完全同期させるブリッジ。
 *
 *  - lenis.on('scroll', ScrollTrigger.update)  — Lenis が動くたびに ScrollTrigger を更新
 *  - gsap.ticker.add(t => lenis.raf(t * 1000)) — GSAP ticker が Lenis の RAF を駆動
 *  - gsap.ticker.lagSmoothing(0)               — フレーム遅延の自動補正をオフ
 *
 * これで「Lenis でスムースに進む」「ScrollTrigger は実スクロール量と完全一致」
 * が両立し、pin/scrub のジッターを防ぐ。
 */
function LenisGsapBridge() {
  const lenis = useLenis()

  useEffect(() => {
    if (!lenis) return

    const onScroll = () => ScrollTrigger.update()
    lenis.on("scroll", onScroll)

    const onTick = (time: number) => {
      lenis.raf(time * 1000)
    }
    gsap.ticker.add(onTick)
    gsap.ticker.lagSmoothing(0)

    /** 初期マウント時に ScrollTrigger を refresh（pin の位置算出をやり直す） */
    ScrollTrigger.refresh()

    return () => {
      lenis.off("scroll", onScroll)
      gsap.ticker.remove(onTick)
    }
  }, [lenis])

  return null
}

/**
 * 公式ポータル用のスムーススクロール環境。
 * D4KK と同等構成: Lenis（root scroll）+ GSAP ticker driven。
 *  - prefers-reduced-motion ではどちらも無効化（ネイティブスクロールに任せる）
 */
export function OfficialLenisProvider({ children }: { children: ReactNode }) {
  if (typeof window !== "undefined") {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) {
      return <>{children}</>
    }
  }
  return (
    <ReactLenis
      root
      options={{
        /** GSAP ticker が RAF を駆動するため、Lenis 自前の RAF はオフ */
        autoRaf: false,
        duration: 1.15,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        gestureOrientation: "vertical",
        wheelMultiplier: 1,
        touchMultiplier: 1.6,
      }}
    >
      <LenisGsapBridge />
      {children}
    </ReactLenis>
  )
}
