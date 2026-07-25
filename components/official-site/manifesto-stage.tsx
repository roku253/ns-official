"use client"

import { useEffect, useRef, type CSSProperties } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { fireGlitchBurst } from "@/components/official-site/glitch-canvas"
import { GlitchText } from "@/components/official-site/glitch-text"
import { cn } from "@/lib/utils"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

/* ──────────────────────────────────────────────────────────
 * D4KK と同等の introduction セクションを GSAP ScrollTrigger で再現。
 *
 *  - position: sticky は使わず、`pin: true` で物理的にピン留め
 *    （sticky と違って overflow-x: hidden 等の祖先指定の影響を受けない）
 *  - scrub: 0.5 で Lenis のスムース移動と GSAP の補間を融合
 *  - onUpdate で global progress (0..1) を取り、各 slide の opacity と
 *    sub-progress を計算 → slide 要素に CSS 変数 --sub を書き込む
 *  - 各 line 要素は CSS の `clamp(...)` で --sub から自分の opacity / y を導出
 *    （JS で各 line を毎フレーム書き換えるより軽い）
 * ────────────────────────────────────────────────────────── */

export type ManifestoLineEntry = {
  text: string
  /** この行を lead（大きい）サイズにするか。省略時は false */
  lead?: boolean
}

export type ManifestoSlideContent = {
  eyebrow?: string
  /** PC 用の行定義 */
  body: (string | ManifestoLineEntry)[]
  /** スマホ用の行定義。省略時は body をそのまま使用 */
  mobileBody?: (string | ManifestoLineEntry)[]
  variant?: "lead" | "ground"
  /** 先頭から何行を lead サイズにするか（body が string[] のときに使用）。省略時は 1 */
  leadLines?: number
}

const FADE_RATIO = 0.06 // crossfade 幅 = slot * 0.12（隣接 slide とは 0.5/0.5 でクロス）

/** slide index → dotRatio: デジタル→リアルへの段階変化 */
const DOT_RATIOS = [0.8, 0.6, 0.3, 0.1] as const

export function ManifestoStage({
  slides,
  /**
   * 1 slide あたりに割り当てるスクロール量（vh 単位）。
   * デフォルト 110vh：1 slide ≒ 1 viewport 強で進む。
   */
  slideHeightVh = 110,
  className,
}: {
  slides: ManifestoSlideContent[]
  slideHeightVh?: number
  className?: string
}) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const pinRef = useRef<HTMLDivElement | null>(null)
  const slidesRef = useRef<(HTMLDivElement | null)[]>([])
  /** boundary 切替検知用：直前にアクティブだった slide index */
  const activeIndexRef = useRef<number>(-1)
  const total = slides.length

  useEffect(() => {
    if (typeof window === "undefined") return
    const pinEl = pinRef.current
    const sectionEl = sectionRef.current
    if (!pinEl || !sectionEl) return

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const ctx = gsap.context(() => {
      const computePinDuration = () =>
        total * window.innerHeight * (slideHeightVh / 100)

      const trigger = ScrollTrigger.create({
        trigger: pinEl,
        start: "top top",
        end: () => `+=${computePinDuration()}`,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        scrub: reduce ? false : 0.5,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress // 0..1（pin 区間内の進捗）
          const els = slidesRef.current

          /**
           * 「いまの中心が何枚目の slide か」を progress から逆算。
           * 切替が起きた瞬間に不規則なグリッチ flash を全画面オーバーレイへ
           * 発火する（短く 0.35s）。先頭フレームでは発火しない。
           */
          const idx = Math.min(total - 1, Math.max(0, Math.floor(p * total)))
          if (activeIndexRef.current >= 0 && idx !== activeIndexRef.current) {
            const dur = 0.28 + Math.random() * 0.22
            fireGlitchBurst(dur)
          }
          activeIndexRef.current = idx

          for (let i = 0; i < els.length; i++) {
            const el = els[i]
            if (!el) continue
            const slot = 1 / total
            const center = (i + 0.5) * slot
            const half = slot * 0.5
            const fadeHalf = slot * FADE_RATIO

            const a = Math.max(0, center - half - fadeHalf)
            const b = Math.max(0, center - half + fadeHalf)
            const c = Math.min(1, center + half - fadeHalf)
            const d = Math.min(1, center + half + fadeHalf)

            /** opacity: 0 → 1 → 1 → 0 across [a, b, c, d]
             *  端の slide では区間外でも 1 を保つ（端が黒落ちしないように） */
            let opacity = 0
            if (p <= a) opacity = i === 0 ? 1 : 0
            else if (p < b) opacity = (p - a) / Math.max(0.0001, b - a)
            else if (p <= c) opacity = 1
            else if (p < d) opacity = 1 - (p - c) / Math.max(0.0001, d - c)
            else opacity = i === total - 1 ? 1 : 0

            /** 内側 line に渡す sub-progress: 0 → 1 across [b, c]
             *  active hold 中だけ立ち上がる */
            let sub = 0
            if (p <= b) sub = 0
            else if (p >= c) sub = 1
            else sub = (p - b) / Math.max(0.0001, c - b)

            /** 入退場のパララックス（D4KK 風の控えめな上下移動） */
            let py = 0
            if (!reduce) {
              if (p < b) py = 24 * (1 - (p - a) / Math.max(0.0001, b - a))
              else if (p > c) py = -24 * ((p - c) / Math.max(0.0001, d - c))
            }

            el.style.opacity = String(opacity)
            el.style.transform = `translate3d(0, ${py}px, 0)`
            el.style.setProperty("--sub", String(sub))
          }
        },
      })

      /** 画面サイズ変化や font load 後にレイアウトが変わるので refresh */
      const onResize = () => ScrollTrigger.refresh()
      window.addEventListener("resize", onResize)
      const cleanup = () => {
        window.removeEventListener("resize", onResize)
        trigger.kill()
      }
      return cleanup
    }, sectionRef)

    return () => ctx.revert()
  }, [total, slideHeightVh])

  return (
    <section
      ref={sectionRef}
      className={cn("relative w-full bg-[#06080c]", className)}
    >
      {/**
       * .manifesto-line に各行が持つ inline 変数 --from / --to と、
       * slide 要素から継承される --sub から、CSS だけで opacity と y を導出。
       *
       * --t = clamp(0, (sub - from) / (to - from), 1)
       *   → opacity     = --t
       *   → translateY  = (1 - --t) * 28px
       */}
      <style>{`
        .manifesto-line {
          --from: 0;
          --to: 1;
          --t: clamp(0, calc((var(--sub, 0) - var(--from)) / (var(--to) - var(--from))), 1);
          opacity: var(--t);
          transform: translate3d(0, calc((1 - var(--t)) * 28px), 0);
          will-change: opacity, transform;
        }
      `}</style>

      <div
        ref={pinRef}
        className="relative flex h-svh w-full items-center justify-center overflow-hidden"
      >
        {/* 背景：D4KK の __canvas に相当する固定背景レイヤー */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(ellipse at 50% 38%, rgba(201,162,39,0.22) 0%, transparent 55%),
              radial-gradient(ellipse at 12% 88%, rgba(127,156,184,0.10) 0%, transparent 55%),
              radial-gradient(ellipse at 88% 22%, rgba(127,156,184,0.08) 0%, transparent 50%),
              repeating-linear-gradient(20deg, transparent 0px, transparent 4px, rgba(255,255,255,0.025) 4px, rgba(255,255,255,0.025) 5px)
            `,
          }}
        />
        {/* 上下端 12% を地色へ落とすマスク（D4KK の mask-gradient 同等） */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, #06080c 0%, transparent 12%, transparent 88%, #06080c 100%)",
          }}
        />

        {/* セクションラベル */}
        <p className="absolute left-5 top-6 z-20 font-mono text-[10px] uppercase tracking-[0.45em] text-[#c9a227]/80 md:left-10 md:top-8">
          // BPS Manifesto
        </p>

        {/* 進捗ドット */}
        <div className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 md:flex">
          {slides.map((_, i) => (
            <ProgressDot key={i} index={i} total={total} />
          ))}
        </div>

        {/* slides */}
        {slides.map((slide, i) => (
          <div
            key={i}
            ref={(el) => {
              slidesRef.current[i] = el
            }}
            className="absolute inset-0 z-10 flex items-center justify-center px-2 md:px-10"
            style={{ opacity: i === 0 ? 1 : 0 }}
          >
            <div className="mx-auto w-full max-w-5xl text-center">
              {slide.eyebrow ? (
                /**
                 * eyebrow は manifesto-line を付けずに置く。
                 * 親 slide の opacity / transform に追従するので、slide が見えて
                 * いる間は常に表示される（ユーザーが入った瞬間に「01 / Boundary」
                 * が見える状態）。
                 */
                <p className="font-official-serif-latin text-[10px] uppercase tracking-[0.5em] text-[#c9a227]/85 md:text-[11px]">
                  {slide.eyebrow}
                </p>
              ) : null}

              {/* PC 用 */}
              <div className="mt-5 hidden space-y-3 md:mt-7 md:block md:space-y-5">
                <SlideLines slide={slide} slideIndex={i} />
              </div>
              {/* スマホ用 */}
              <div className="mt-5 space-y-3 md:hidden">
                <SlideLines slide={slide} slideIndex={i} mobile />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/** 行エントリを正規化：string → { text, lead: undefined } */
function normalizeLine(entry: string | ManifestoLineEntry): ManifestoLineEntry {
  return typeof entry === "string" ? { text: entry } : entry
}

function SlideLines({
  slide,
  slideIndex,
  mobile = false,
}: {
  slide: ManifestoSlideContent
  slideIndex: number
  mobile?: boolean
}) {
  const rawLines = mobile && slide.mobileBody ? slide.mobileBody : slide.body
  const lines = rawLines.map(normalizeLine)
  const dotRatio = DOT_RATIOS[Math.min(slideIndex, DOT_RATIOS.length - 1)]
  const defaultLeadCount = slide.leadLines ?? 1

  return (
    <>
      {lines.map((entry, lineIdx) => {
        const span = Math.min(0.22, 0.65 / Math.max(1, lines.length))
        const startPerLine = 0.16 + lineIdx * span
        const endPerLine = Math.min(0.95, startPerLine + span * 1.1)
        const isLead =
          (slide.variant ?? "lead") === "lead" &&
          (entry.lead !== undefined ? entry.lead : lineIdx < defaultLeadCount)

        return (
          <div
            key={lineIdx}
            className="manifesto-line"
            style={
              {
                "--from": startPerLine,
                "--to": endPerLine,
                textShadow: "0 0 14px rgba(0,0,0,0.55)",
              } as CSSProperties
            }
          >
            <GlitchText
              text={entry.text}
              dotRatio={dotRatio}
              className={cn(
                "tracking-[0.06em] text-zinc-100",
                isLead
                  ? mobile
                    ? "text-xl leading-[1.95]"
                    : "text-4xl leading-[1.85]"
                  : mobile
                    ? "text-sm leading-[2.0] text-zinc-300"
                    : "text-xl leading-[2.0] text-zinc-300"
              )}
            />
          </div>
        )
      })}
    </>
  )
}

function ProgressDot({ index, total }: { index: number; total: number }) {
  /** 進捗ドットも CSS 変数経由で active 中だけハイライト。
   *  --activeIndex は親（slidesRef[i] に書く --sub）からは取れないので、
   *  簡易的に .manifesto-dot で常時表示し、active のものだけ強調 */
  return (
    <span
      aria-hidden
      data-index={index}
      data-total={total}
      className="manifesto-dot block h-2 w-2 rounded-full bg-[#c9a227] opacity-60"
    />
  )
}
