"use client"

import { useEffect, useRef, useMemo, useState, useCallback } from "react"

/* ──────────────────────────────────────────────────────────
 * GlitchText
 *
 * 各文字が独立して「ドット文字（DotGothic16）⇔ きれいな文字（Shippori Mincho）」を
 * ランダムにフリッカーするコンポーネント。
 *
 * `dotRatio` (0..1) でドット文字が表示される確率を制御:
 *   0.8 = 80%ドット（ほぼデジタル）
 *   0.1 = 10%ドット（ほぼリアル）
 *
 * スライド index に応じて呼び出し側が dotRatio を変えることで、
 * スクロールにつれてデジタル→リアルへ段階的に変化する演出を実現。
 *
 * パフォーマンス:
 *   - setInterval で 120–280ms ごとにランダムで各文字のフォント状態を更新
 *   - React re-render を避け、DOM 直接操作で状態更新
 *   - prefers-reduced-motion / document.hidden のときは停止
 * ────────────────────────────────────────────────────────── */

const DOT_FONT = "var(--font-dot-gothic), 'DotGothic16', monospace"
const CLEAN_FONT = "var(--font-official-display), 'Shippori Mincho B1', serif"

type Props = {
  text: string
  dotRatio: number
  className?: string
  as?: "p" | "span" | "h1" | "h2" | "h3"
}

export function GlitchText({ text, dotRatio, className, as: Tag = "p" }: Props) {
  const containerRef = useRef<HTMLElement | null>(null)
  const charsRef = useRef<HTMLSpanElement[]>([])
  const [mounted, setMounted] = useState(false)
  const ratioRef = useRef(dotRatio)
  ratioRef.current = dotRatio

  const chars = useMemo(() => text.split(""), [text])

  useEffect(() => {
    setMounted(true)
  }, [])

  const registerChar = useCallback((el: HTMLSpanElement | null, idx: number) => {
    if (el) charsRef.current[idx] = el
  }, [])

  useEffect(() => {
    if (!mounted) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) return

    let running = true

    const shuffleAll = () => {
      const els = charsRef.current
      const ratio = ratioRef.current
      for (let i = 0; i < els.length; i++) {
        const el = els[i]
        if (!el) continue
        if (el.textContent === " " || el.textContent === "\u3000") continue
        const isDot = Math.random() < ratio
        el.style.fontFamily = isDot ? DOT_FONT : CLEAN_FONT
      }
    }

    shuffleAll()

    const tick = () => {
      if (!running) return
      if (!document.hidden) {
        const els = charsRef.current
        const ratio = ratioRef.current
        const count = Math.max(1, Math.ceil(els.length * 0.35))
        for (let n = 0; n < count; n++) {
          const i = Math.floor(Math.random() * els.length)
          const el = els[i]
          if (!el) continue
          if (el.textContent === " " || el.textContent === "\u3000") continue
          const isDot = Math.random() < ratio
          el.style.fontFamily = isDot ? DOT_FONT : CLEAN_FONT
        }
      }
      const delay = 100 + Math.random() * 180
      timer = window.setTimeout(tick, delay)
    }

    let timer = window.setTimeout(tick, 120 + Math.random() * 160)

    return () => {
      running = false
      clearTimeout(timer)
    }
  }, [mounted, chars.length])

  return (
    <Tag
      ref={containerRef as React.Ref<HTMLParagraphElement>}
      className={className}
      style={{ willChange: "contents" }}
    >
      {chars.map((ch, i) => (
        <span
          key={i}
          ref={(el) => registerChar(el, i)}
          style={{
            fontFamily: CLEAN_FONT,
            display: "inline",
            transition: "font-family 0.08s",
          }}
        >
          {ch}
        </span>
      ))}
    </Tag>
  )
}
