"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

/* ──────────────────────────────────────────────────────────
 * GlitchCanvas
 *
 * 「デジタルとリアルのはざま」を表現する canvas2D ベースの
 * 描画プリミティブ。Three.js / PixiJS を使わず軽量に保つ。
 *
 * レイヤー（毎フレーム合成）：
 *  L1  バックグラウンドの薄いノイズ点描（"data dust"）
 *  L2  低密度の格子ライン（HUD 風の sparse grid）
 *  L3  たまに走る走査線（scanline sweep）
 *  L4  確率的 RGB スプリットフラッシュ（"glitch burst"）
 *  L5  外部イベント "glitch-burst" を受けた瞬間の強フラッシュ
 *
 *  - Intensity を弱く（density / alpha 小）保ち、本文の可読性を絶対に阻害しない。
 *  - prefers-reduced-motion / hidden tab / mount 解除で停止。
 *  - canvas は CSS でフルサイズ、DPR 補正付き。
 *  - pointerEvents: none を強制。
 * ────────────────────────────────────────────────────────── */

export type GlitchCanvasIntensity = "ambient" | "panel" | "burst"

type Props = {
  /**
   * ambient … 全画面常駐用（薄め）
   * panel   … メニュー内パネル背景用（やや濃いめ）
   * burst   … クリック時の派手フラッシュ用（テスト用）
   */
  intensity?: GlitchCanvasIntensity
  /** ヒント色（粒子の主色） */
  hue?: { r: number; g: number; b: number }
  className?: string
  /** 外部イベント名で強い flash を発火する（既定 "glitch-burst"） */
  burstEventName?: string
}

const PROFILES: Record<
  GlitchCanvasIntensity,
  {
    dustPerFrame: number
    dustAlpha: number
    gridStep: number
    gridAlpha: number
    scanlineChance: number
    glitchBurstChance: number
    rgbSplitMax: number
  }
> = {
  ambient: {
    dustPerFrame: 22,
    dustAlpha: 0.08,
    gridStep: 64,
    gridAlpha: 0.02,
    scanlineChance: 0.012,
    glitchBurstChance: 0.0035,
    rgbSplitMax: 4,
  },
  panel: {
    dustPerFrame: 60,
    dustAlpha: 0.16,
    gridStep: 48,
    gridAlpha: 0.05,
    scanlineChance: 0.04,
    glitchBurstChance: 0.012,
    rgbSplitMax: 7,
  },
  burst: {
    dustPerFrame: 200,
    dustAlpha: 0.4,
    gridStep: 32,
    gridAlpha: 0.12,
    scanlineChance: 0.18,
    glitchBurstChance: 0.08,
    rgbSplitMax: 16,
  },
}

export function GlitchCanvas({
  intensity = "ambient",
  hue = { r: 232, g: 216, b: 154 }, // ゴールド系（既存サイトの #e8d89a 寄り）
  className,
  burstEventName = "glitch-burst",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  /** 外部イベントで一時的に強度を引き上げるための残り時間（秒） */
  const burstUntilRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) return

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const profile = PROFILES[intensity]

    let raf = 0
    let running = true
    let dpr = Math.min(2, window.devicePixelRatio || 1)
    let cssW = 0
    let cssH = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      cssW = Math.max(1, Math.floor(rect.width))
      cssH = Math.max(1, Math.floor(rect.height))
      dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.floor(cssW * dpr)
      canvas.height = Math.floor(cssH * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    /** 粒子位置のサンプリングを高速化するためにオフセット系列を使う */
    let frame = 0
    let scanY = -50
    let scanActive = false

    const onBurst = (ev: Event) => {
      const detail = (ev as CustomEvent<{ duration?: number }>).detail
      const dur = detail?.duration ?? 0.45
      burstUntilRef.current = performance.now() / 1000 + dur
    }
    window.addEventListener(burstEventName, onBurst as EventListener)

    const tick = (now: number) => {
      if (!running) return
      raf = requestAnimationFrame(tick)
      frame++

      const tSec = now / 1000
      const inBurst = tSec < burstUntilRef.current
      const burstK = inBurst ? 1 : 0

      /** タブが非表示のときは描画スキップ（visibilitychange より軽い判定） */
      if (document.hidden) return

      ctx.clearRect(0, 0, cssW, cssH)

      const { r, g, b } = hue
      const dustAlpha = profile.dustAlpha * (1 + burstK * 1.8)
      const dustCount =
        Math.floor(profile.dustPerFrame * (1 + burstK * 3) * (cssW * cssH) / (1280 * 720))

      /* L1: data dust */
      ctx.fillStyle = `rgba(${r},${g},${b},${dustAlpha})`
      for (let i = 0; i < dustCount; i++) {
        const x = Math.random() * cssW
        const y = Math.random() * cssH
        const s = Math.random() < 0.92 ? 1 : 2
        ctx.fillRect(x, y, s, s)
      }

      /* L2: sparse HUD grid（毎フレームうっすら） */
      if (!reduce) {
        ctx.strokeStyle = `rgba(${r},${g},${b},${profile.gridAlpha * (1 + burstK)})`
        ctx.lineWidth = 1
        ctx.beginPath()
        const step = profile.gridStep
        const offX = (frame * 0.2) % step
        const offY = (frame * 0.1) % step
        for (let x = -offX; x < cssW; x += step) {
          ctx.moveTo(x + 0.5, 0)
          ctx.lineTo(x + 0.5, cssH)
        }
        for (let y = -offY; y < cssH; y += step) {
          ctx.moveTo(0, y + 0.5)
          ctx.lineTo(cssW, y + 0.5)
        }
        ctx.stroke()
      }

      /* L3: scanline sweep（時々下に流れる） */
      if (!reduce) {
        if (!scanActive && Math.random() < profile.scanlineChance) {
          scanActive = true
          scanY = -40
        }
        if (scanActive) {
          scanY += 14 + burstK * 30
          const scanH = 36
          const grad = ctx.createLinearGradient(0, scanY, 0, scanY + scanH)
          grad.addColorStop(0, `rgba(${r},${g},${b},0)`)
          grad.addColorStop(0.5, `rgba(${r},${g},${b},${0.06 + burstK * 0.18})`)
          grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
          ctx.fillStyle = grad
          ctx.fillRect(0, scanY, cssW, scanH)
          if (scanY > cssH + 40) {
            scanActive = false
          }
        }
      }

      /* L4 / L5: 確率的（または burst 中）に RGB スプリットの細い帯を描く */
      if (!reduce) {
        const trigger = Math.random() < profile.glitchBurstChance + burstK * 0.4
        if (trigger) {
          const bands = 1 + Math.floor(Math.random() * (inBurst ? 4 : 2))
          for (let i = 0; i < bands; i++) {
            const by = Math.random() * cssH
            const bh = 6 + Math.random() * (inBurst ? 36 : 16)
            const sx = (Math.random() * 2 - 1) * profile.rgbSplitMax * (1 + burstK * 2.5)
            ctx.fillStyle = `rgba(255, 64, 96, ${0.18 + burstK * 0.35})`
            ctx.fillRect(-sx, by, cssW, bh)
            ctx.fillStyle = `rgba(64, 224, 255, ${0.18 + burstK * 0.35})`
            ctx.fillRect(sx, by + 1, cssW, bh - 2)
          }
        }
      }

      /* burst 中の追加：縦方向のチャネルずれ */
      if (inBurst) {
        ctx.fillStyle = `rgba(255,255,255,0.04)`
        const slices = 6
        for (let i = 0; i < slices; i++) {
          const sy = Math.floor((cssH / slices) * i + Math.random() * 8)
          const sh = Math.floor(cssH / slices) - 4
          const dx = (Math.random() * 2 - 1) * 18
          ctx.fillRect(dx, sy, cssW, sh)
        }
      }
    }

    raf = requestAnimationFrame(tick)

    const onVis = () => {
      // visibilitychange だけでは不安定な環境があるので毎フレーム document.hidden もチェックしている
      if (!document.hidden && raf === 0) {
        raf = requestAnimationFrame(tick)
      }
    }
    document.addEventListener("visibilitychange", onVis)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener(burstEventName, onBurst as EventListener)
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [intensity, hue, burstEventName])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
    />
  )
}

/**
 * どこからでも呼べるヘルパー：強いグリッチ flash を 1 回発火する。
 * 各 GlitchCanvas は同名の event を listen している。
 */
export function fireGlitchBurst(durationSec = 0.5, eventName = "glitch-burst") {
  if (typeof window === "undefined") return
  window.dispatchEvent(
    new CustomEvent(eventName, { detail: { duration: durationSec } })
  )
}
