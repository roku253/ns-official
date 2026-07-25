"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

type OfficialDigitalCurtainProps = {
  /** カーテンの高さ（CSS） */
  height?: string
  /** 中央に重ねる短い英数字キャプション（任意） */
  caption?: string
  /** セクションの subtitle 風 ASCII ラベル（任意） */
  subLabel?: string
  className?: string
}

const GLYPHS =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$%#@*+=<>?/|\\日月火水木金土山川風雨光影"

/**
 * セクション転換用の「緑デジタル文字が降る」帯。
 * - スクロールで画面に入ったときだけ Canvas 描画を起動
 * - 画面外に出たら一時停止して負荷を抑える
 * - prefers-reduced-motion に対応
 */
export function OfficialDigitalCurtain({
  height = "min(58svh, 460px)",
  caption,
  subLabel,
  className,
}: OfficialDigitalCurtainProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const dropsRef = useRef<number[]>([])
  const sizeRef = useRef({ w: 0, h: 0, fontPx: 14, cols: 0 })
  const [active, setActive] = useState(false)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { threshold: 0.05 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const rect = wrap.getBoundingClientRect()
      const w = Math.max(1, Math.floor(rect.width))
      const h = Math.max(1, Math.floor(rect.height))
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const fontPx = w < 480 ? 12 : w < 1024 ? 14 : 16
      const cols = Math.ceil(w / fontPx)
      sizeRef.current = { w, h, fontPx, cols }
      dropsRef.current = Array.from({ length: cols }, () =>
        Math.floor((Math.random() * h) / fontPx) - Math.floor(h / fontPx)
      )
      ctx.fillStyle = "rgba(4, 8, 6, 1)"
      ctx.fillRect(0, 0, w, h)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    let frame = 0
    const draw = () => {
      const { w, h, fontPx, cols } = sizeRef.current
      ctx.fillStyle = "rgba(4, 8, 6, 0.18)"
      ctx.fillRect(0, 0, w, h)
      ctx.font = `${fontPx}px ui-monospace, SFMono-Regular, Menlo, monospace`
      ctx.textBaseline = "top"

      for (let i = 0; i < cols; i += 1) {
        const ch = GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length))
        const x = i * fontPx
        const y = (dropsRef.current[i] ?? 0) * fontPx
        const lead = Math.random() < 0.04
        ctx.fillStyle = lead
          ? "rgba(220, 255, 230, 0.95)"
          : "rgba(80, 230, 140, 0.85)"
        ctx.fillText(ch, x, y)
        if (y > h && Math.random() > 0.965) {
          dropsRef.current[i] = 0
        } else {
          dropsRef.current[i] = (dropsRef.current[i] ?? 0) + 1
        }
      }
      frame += 1
      if (active && !reduceMotion) {
        rafRef.current = window.requestAnimationFrame(draw)
      }
    }

    if (active && !reduceMotion) {
      rafRef.current = window.requestAnimationFrame(draw)
    } else {
      ctx.fillStyle = "rgba(4, 8, 6, 1)"
      const { w, h } = sizeRef.current
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = "rgba(80, 230, 140, 0.4)"
      ctx.font = `${sizeRef.current.fontPx}px ui-monospace, monospace`
      ctx.fillText("// signal idle", 12, 12)
    }

    return () => {
      ro.disconnect()
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [active])

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative w-full overflow-hidden border-y border-[#c9a227]/15 bg-[#040806] text-[#caffd6]",
        className
      )}
      style={{ height }}
      aria-hidden
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(4,8,6,0.55) 0%, rgba(4,8,6,0) 22%, rgba(4,8,6,0) 78%, rgba(4,8,6,0.55) 100%)",
        }}
      />
      {(caption || subLabel) ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
          {subLabel ? (
            <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-emerald-300/70 md:text-[11px]">
              {subLabel}
            </p>
          ) : null}
          {caption ? (
            <p className="font-mono text-base tracking-[0.32em] text-emerald-200/95 md:text-xl lg:text-2xl">
              {caption}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
