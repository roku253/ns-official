"use client"

import { useEffect, useRef, useState } from "react"

type OfficialLoadingScreenProps = {
  progress: number
  statusLine?: string
}

/**
 * CRT ブートアップ風ローディング画面。
 * ブラウン管テレビが起動する演出：
 *   1. 暗闇 → 中央から水平ラインが広がる
 *   2. 蛍光体のウォームアップ（緑→通常色）
 *   3. スキャンラインとノイズが走る中、進捗表示
 */
export function OfficialLoadingScreen({ progress, statusLine }: OfficialLoadingScreenProps) {
  const pct = Math.min(100, Math.max(0, Math.round(progress)))
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [booted, setBooted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setBooted(true), 400)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let raf: number
    let running = true

    const draw = () => {
      if (!running) return
      const w = Math.ceil(window.innerWidth * 0.25)
      const h = Math.ceil(window.innerHeight * 0.25)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      const imageData = ctx.createImageData(w, h)
      const data = imageData.data
      for (let i = 0; i < data.length; i += 4) {
        const v = Math.random() * 18
        data[i] = v
        data[i + 1] = v
        data[i + 2] = v
        data[i + 3] = 255
      }
      ctx.putImageData(imageData, 0, 0)
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => {
      running = false
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020303] font-mono text-zinc-200">
      <style>{`
        @keyframes crt-boot-expand {
          0%   { clip-path: inset(49.5% 0 49.5% 0); }
          40%  { clip-path: inset(20% 0 20% 0); }
          100% { clip-path: inset(0 0 0 0); }
        }
        @keyframes crt-phosphor-warmup {
          0%   { filter: brightness(0.3) saturate(0.5) hue-rotate(40deg); }
          60%  { filter: brightness(0.8) saturate(0.9) hue-rotate(5deg); }
          100% { filter: brightness(1) saturate(1) hue-rotate(0deg); }
        }
        @keyframes crt-load-pulse {
          0%, 100% { text-shadow: 0 0 6px rgba(201,162,39,0.4); }
          50%      { text-shadow: 0 0 14px rgba(201,162,39,0.65); }
        }
        .crt-boot-screen {
          animation: crt-boot-expand 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards,
                     crt-phosphor-warmup 1.6s ease-out forwards;
        }
      `}</style>

      {/* Background noise canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full opacity-[0.06]"
        style={{ imageRendering: "pixelated" }}
        aria-hidden
      />

      {/* Aperture grille */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          opacity: 0.04,
          backgroundImage: `repeating-linear-gradient(
            90deg,
            rgba(255, 60, 60, 0.4) 0px,
            rgba(60, 255, 60, 0.35) 1px,
            rgba(60, 60, 255, 0.4) 2px,
            transparent 3px
          )`,
          backgroundSize: "3px 100%",
        }}
      />

      {/* Vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background: `radial-gradient(
            ellipse 80% 75% at 50% 50%,
            transparent 45%,
            rgba(0, 0, 0, 0.5) 78%,
            rgba(0, 0, 0, 0.9) 100%
          )`,
        }}
      />

      {/* Content with CRT boot animation */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center px-6 ${booted ? "crt-boot-screen" : ""}`}
        style={{
          clipPath: booted ? undefined : "inset(49.5% 0 49.5% 0)",
          background: `
            radial-gradient(ellipse at 50% 30%, rgba(127,156,184,0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 100%, rgba(201,162,39,0.05) 0%, transparent 45%),
            #050607
          `,
        }}
      >
        <p
          className="text-center text-[10px] uppercase tracking-[0.55em] text-[#7f9cb8]/90 md:text-[11px] md:tracking-[0.65em]"
          style={{ animation: booted ? "crt-load-pulse 2.8s ease-in-out infinite" : undefined }}
        >
          Connecting to NS Portal
        </p>
        <p
          className="mt-14 text-5xl font-medium text-[#e8d89a] md:mt-16 md:text-7xl"
          aria-live="polite"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          <span>{pct}</span>
          <span className="text-[#c9a227]/80">%</span>
        </p>
        <p className="mt-10 max-w-md text-center font-official-sans-jp text-xs leading-relaxed text-zinc-500">
          {statusLine || "カタログとアカウント状態を同期しています…"}
        </p>

        {/* Horizontal scan bar */}
        {booted ? (
          <div
            className="pointer-events-none absolute left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-[#c9a227]/20 to-transparent"
            style={{
              animation: "crt-scan-bar 3s linear infinite",
            }}
          />
        ) : null}
      </div>

      <style>{`
        @keyframes crt-scan-bar {
          0%   { top: -2px; opacity: 0; }
          5%   { opacity: 0.6; }
          50%  { opacity: 0.3; }
          95%  { opacity: 0.6; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  )
}
