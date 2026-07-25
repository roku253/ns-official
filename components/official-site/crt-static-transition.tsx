"use client"

import { useEffect, useRef, useCallback } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

/* ──────────────────────────────────────────────────────────
 * CRT Static Transition + 物語テキスト出現
 *
 * Manifesto（04/Boundary）完了後に挿入するブラウン管ノイズ遷移。
 * ScrollTrigger で pin し、スクロール進捗に応じて以下のシーケンスを実行:
 *
 *   Phase 1 — TV ノイズ → 消灯:
 *     0.00–0.15 : ノイズが出始める（TV乱れ）
 *     0.15–0.30 : ノイズ激化 → 白フラッシュ
 *     0.30–0.42 : 画面が中央の水平ラインに圧縮（クラシック CRT 消灯）
 *     0.42–0.50 : 輝点消灯 → 完全暗転
 *
 *   Phase 2 — 物語テキスト出現（リアルの世界へ）:
 *     0.50–0.55 : 暗転ホールド
 *     0.55–0.90 : 「物語」テキストが line-by-line で出現
 *     0.90–1.00 : 完了 → pin 解除 → 通常スクロールへ
 *
 * Canvas は低解像度（1/4 スケール）で描画しCSS scaleで拡大。
 * ────────────────────────────────────────────────────────── */

const CANVAS_SCALE = 0.25

function drawNoise(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number,
  whiteLevel: number
) {
  const iw = Math.ceil(w * CANVAS_SCALE)
  const ih = Math.ceil(h * CANVAS_SCALE)

  if (ctx.canvas.width !== iw || ctx.canvas.height !== ih) {
    ctx.canvas.width = iw
    ctx.canvas.height = ih
  }

  const imageData = ctx.createImageData(iw, ih)
  const data = imageData.data
  const noise = intensity
  const white = whiteLevel * 255

  for (let i = 0; i < data.length; i += 4) {
    const n = Math.random() * noise * 255
    const v = Math.min(255, white + n)
    data[i] = v
    data[i + 1] = v
    data[i + 2] = v
    data[i + 3] = 255
  }

  if (intensity > 0.3) {
    const glitchLines = Math.floor(intensity * 12)
    for (let g = 0; g < glitchLines; g++) {
      const y = Math.floor(Math.random() * ih)
      const lineStart = y * iw * 4
      const shift = Math.floor((Math.random() - 0.5) * iw * 0.4) * 4
      for (let x = 0; x < iw * 4; x += 4) {
        const src = lineStart + ((x + shift + iw * 4) % (iw * 4))
        if (src >= 0 && src + 3 < data.length) {
          const brightness = Math.min(255, data[src] + 80)
          data[lineStart + x] = brightness
          data[lineStart + x + 1] = brightness
          data[lineStart + x + 2] = brightness
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0)
}

const MONOGATARI_LINES = [
  { type: "eyebrow" as const, text: "// CASE ARCHIVE" },
  { type: "heading" as const, text: "物語" },
  { type: "body" as const, text: "現実と虚構の境界で迷子になった物語が、ここに保管されています。" },
  { type: "body" as const, text: "真相を読み解けるのは、あなただけです。" },
]

export function CrtStaticTransition({
  heightVh = 400,
  className,
}: {
  heightVh?: number
  className?: string
}) {
  const sectionRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const whiteRef = useRef<HTMLDivElement | null>(null)
  const blackRef = useRef<HTMLDivElement | null>(null)
  const crtOffRef = useRef<HTMLDivElement | null>(null)
  const crtLineRef = useRef<HTMLDivElement | null>(null)
  const textContainerRef = useRef<HTMLDivElement | null>(null)
  const textLineRefs = useRef<(HTMLElement | null)[]>([])
  const rafRef = useRef<number>(0)
  const progressRef = useRef(0)
  const activeRef = useRef(false)

  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return

    const p = progressRef.current
    const vw = window.innerWidth
    const vh = window.innerHeight

    // --- Phase 1: TV noise → off (0..0.50) ---
    let noiseIntensity = 0
    let whiteLevel = 0

    if (p < 0.15) {
      noiseIntensity = (p / 0.15) * 0.5
    } else if (p < 0.28) {
      const t = (p - 0.15) / 0.13
      noiseIntensity = 0.5 + t * 0.5
      whiteLevel = t * 0.3
    } else if (p < 0.35) {
      const t = (p - 0.28) / 0.07
      noiseIntensity = 1.0
      whiteLevel = 0.3 + t * 0.7
    } else if (p < 0.42) {
      noiseIntensity = 0
      whiteLevel = 0
    } else {
      noiseIntensity = 0
      whiteLevel = 0
    }

    if (noiseIntensity > 0.01) {
      drawNoise(ctx, vw, vh, noiseIntensity, whiteLevel)
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    // Canvas overlay visibility
    if (overlayRef.current) {
      overlayRef.current.style.opacity = String(noiseIntensity > 0.01 ? 1 : 0)
    }

    // White flash
    if (whiteRef.current) {
      let whiteOp = 0
      if (p >= 0.28 && p < 0.35) {
        whiteOp = ((p - 0.28) / 0.07) * 0.95
      } else if (p >= 0.35 && p < 0.38) {
        whiteOp = 0.95 - ((p - 0.35) / 0.03) * 0.95
      }
      whiteRef.current.style.opacity = String(whiteOp)
    }

    // CRT power-off: vertical compression to center line
    if (crtOffRef.current && crtLineRef.current) {
      if (p >= 0.35 && p < 0.50) {
        crtOffRef.current.style.opacity = "1"
        if (p < 0.42) {
          // Compress to horizontal line
          const t = (p - 0.35) / 0.07
          const scaleY = Math.max(0.003, 1 - t)
          const brightness = 1 + t * 2
          crtOffRef.current.style.transform = `scaleY(${scaleY})`
          crtOffRef.current.style.filter = `brightness(${brightness})`
          crtLineRef.current.style.opacity = String(t)
        } else {
          // Luminous dot fades out
          const t = (p - 0.42) / 0.08
          crtOffRef.current.style.transform = `scaleY(0.003) scaleX(${Math.max(0, 1 - t * 1.2)})`
          crtOffRef.current.style.filter = `brightness(${3 - t * 3})`
          crtLineRef.current.style.opacity = String(Math.max(0, 1 - t))
        }
      } else {
        crtOffRef.current.style.opacity = p >= 0.50 ? "0" : "0"
        crtLineRef.current.style.opacity = "0"
      }
    }

    // Black overlay
    if (blackRef.current) {
      let blackOp = 0
      if (p >= 0.38 && p < 0.50) {
        blackOp = (p - 0.38) / 0.12
      } else if (p >= 0.50) {
        blackOp = p < 0.92 ? 1 : Math.max(0, 1 - (p - 0.92) / 0.08)
      }
      blackRef.current.style.opacity = String(blackOp)
    }

    // --- Phase 2: 物語テキスト出現 (0.55..0.90) ---
    if (textContainerRef.current) {
      const textVisible = p >= 0.52
      textContainerRef.current.style.opacity = textVisible ? "1" : "0"
    }

    const lineCount = MONOGATARI_LINES.length
    for (let i = 0; i < lineCount; i++) {
      const el = textLineRefs.current[i]
      if (!el) continue
      const lineStart = 0.55 + (i / lineCount) * 0.30
      const lineEnd = lineStart + 0.12
      let lineOp = 0
      let lineY = 20
      if (p >= lineEnd) {
        lineOp = 1
        lineY = 0
      } else if (p >= lineStart) {
        const t = (p - lineStart) / (lineEnd - lineStart)
        lineOp = t
        lineY = 20 * (1 - t)
      }
      el.style.opacity = String(lineOp)
      el.style.transform = `translate3d(0, ${lineY}px, 0)`
    }

    if (activeRef.current) {
      rafRef.current = requestAnimationFrame(renderFrame)
    }
  }, [])

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: () => `+=${window.innerHeight * (heightVh / 100)}`,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        scrub: 0.3,
        onUpdate: (self) => {
          progressRef.current = self.progress
        },
        onEnter: () => {
          activeRef.current = true
          rafRef.current = requestAnimationFrame(renderFrame)
        },
        onLeave: () => {
          activeRef.current = false
          cancelAnimationFrame(rafRef.current)
        },
        onEnterBack: () => {
          activeRef.current = true
          rafRef.current = requestAnimationFrame(renderFrame)
        },
        onLeaveBack: () => {
          activeRef.current = false
          cancelAnimationFrame(rafRef.current)
        },
      })
    }, section)

    return () => {
      activeRef.current = false
      cancelAnimationFrame(rafRef.current)
      ctx.revert()
    }
  }, [heightVh, renderFrame])

  return (
    <div ref={sectionRef} className={className}>
      <div className="relative h-svh w-full overflow-hidden bg-[#06080c]">
        {/* Canvas noise layer */}
        <div ref={overlayRef} className="absolute inset-0" style={{ opacity: 0 }}>
          <canvas
            ref={canvasRef}
            className="h-full w-full"
            style={{ imageRendering: "pixelated" }}
          />
        </div>

        {/* White flash */}
        <div
          ref={whiteRef}
          className="absolute inset-0 bg-white"
          style={{ opacity: 0 }}
        />

        {/* CRT power-off visual: content compresses to center line */}
        <div
          ref={crtOffRef}
          className="absolute inset-0 bg-[#06080c]"
          style={{ opacity: 0, transformOrigin: "50% 50%" }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#111] via-white/20 to-[#111]" />
        </div>

        {/* Bright horizontal line at center during compression */}
        <div
          ref={crtLineRef}
          className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2"
          style={{ opacity: 0 }}
        >
          <div
            className="mx-auto h-[2px] w-full"
            style={{
              background: "linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.95) 30%, white 50%, rgba(255,255,255,0.95) 70%, transparent 95%)",
              boxShadow: "0 0 30px 8px rgba(255,255,255,0.6), 0 0 80px 20px rgba(200,200,255,0.3)",
            }}
          />
        </div>

        {/* Black overlay for final fade */}
        <div
          ref={blackRef}
          className="absolute inset-0 bg-[#080a0e]"
          style={{ opacity: 0 }}
        />

        {/* 物語テキスト — CRT消灯後にスクロール連動で出現 */}
        <div
          ref={textContainerRef}
          className="absolute inset-0 z-10 flex items-center justify-center px-5 md:px-10"
          style={{ opacity: 0 }}
        >
          <div className="mx-auto w-full max-w-3xl text-center">
            {MONOGATARI_LINES.map((line, i) => (
              <p
                key={i}
                ref={(el) => { textLineRefs.current[i] = el }}
                className={
                  line.type === "eyebrow"
                    ? "font-official-serif-latin text-[10px] uppercase tracking-[0.45em] text-[#7f9cb8]/85"
                    : line.type === "heading"
                    ? "mt-3 font-official-display text-4xl tracking-[0.18em] text-[#e8d89a] md:text-5xl"
                    : "mt-4 text-sm leading-[2] text-zinc-400 md:text-base"
                }
                style={{ opacity: 0, transform: "translate3d(0, 20px, 0)", willChange: "opacity, transform" }}
              >
                {line.text}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
