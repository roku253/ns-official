"use client"

import { useEffect, useRef, useState } from "react"

type OfficialLoadingScreenProps = {
  progress: number
  statusLine?: string
  /**
   * 遷移引き継ぎなど。スリットから開き直す CRT ブートを省略し、最初から全面表示。
   */
  skipBootAnimation?: boolean
}

/**
 * CRT 風ローディング。進捗％は常に全面で見える（背景だけ開閉演出）。
 * clip で％が隙間に隠れる問題を避ける。
 */
export function OfficialLoadingScreen({
  progress,
  statusLine,
  skipBootAnimation = false,
}: OfficialLoadingScreenProps) {
  const pct = Math.min(100, Math.max(0, Math.round(progress)))
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [booted, setBooted] = useState(skipBootAnimation)

  useEffect(() => {
    if (skipBootAnimation) {
      setBooted(true)
      return
    }
    const timer = setTimeout(() => setBooted(true), 120)
    return () => clearTimeout(timer)
  }, [skipBootAnimation])

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

  // 背景の CRT 開口は進捗にも連動（最低でも少し開き、100%で全開）
  const closedInset = skipBootAnimation || booted ? 0 : Math.max(0, 48 - pct * 0.48)

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020303] font-mono text-zinc-200">
      <style>{`
        @keyframes crt-phosphor-warmup {
          0%   { filter: brightness(0.45) saturate(0.6) hue-rotate(28deg); }
          100% { filter: brightness(1) saturate(1) hue-rotate(0deg); }
        }
        @keyframes crt-load-pulse {
          0%, 100% { text-shadow: 0 0 6px rgba(201,162,39,0.4); }
          50%      { text-shadow: 0 0 14px rgba(201,162,39,0.65); }
        }
        @keyframes crt-scan-bar {
          0%   { top: -2px; opacity: 0; }
          5%   { opacity: 0.6; }
          50%  { opacity: 0.3; }
          95%  { opacity: 0.6; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>

      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full opacity-[0.06]"
        style={{ imageRendering: "pixelated" }}
        aria-hidden
      />

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

      {/* 背景パネルのみ clip（％表示は外） */}
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          clipPath: `inset(${closedInset}% 0 ${closedInset}% 0)`,
          transition: skipBootAnimation ? undefined : "clip-path 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
          filter: skipBootAnimation ? undefined : undefined,
          animation: booted && !skipBootAnimation ? "crt-phosphor-warmup 1.1s ease-out forwards" : undefined,
          background: `
            radial-gradient(ellipse at 50% 30%, rgba(127,156,184,0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 100%, rgba(201,162,39,0.05) 0%, transparent 45%),
            #050607
          `,
        }}
      />

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

      {/* 進捗は常に全面で読める */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6">
        <p
          className="text-center text-[10px] uppercase tracking-[0.55em] text-[#7f9cb8]/90 md:text-[11px] md:tracking-[0.65em]"
          style={{ animation: "crt-load-pulse 2.8s ease-in-out infinite" }}
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
        <div className="mt-6 h-[2px] w-40 max-w-[50vw] overflow-hidden rounded-full bg-[#c9a227]/15 md:w-56">
          <div
            className="h-full rounded-full bg-[#c9a227]/70 transition-[width] duration-200 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-8 max-w-md text-center font-official-sans-jp text-xs leading-relaxed text-zinc-500">
          {statusLine || "カタログとアカウント状態を同期しています…"}
        </p>
      </div>

      {booted ? (
        <div
          className="pointer-events-none absolute left-0 z-[5] h-[2px] w-full bg-gradient-to-r from-transparent via-[#c9a227]/20 to-transparent"
          style={{ animation: "crt-scan-bar 3s linear infinite" }}
          aria-hidden
        />
      ) : null}
    </div>
  )
}
