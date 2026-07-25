"use client"

import type { CSSProperties, ReactNode } from "react"
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react"
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
  type Variants,
} from "framer-motion"
import { cn } from "@/lib/utils"

const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const

/* ──────────────────────────────────────────────────────────
 * SlideActiveContext
 *   CrossfadeSlide が「自分は今アクティブか（≒ opacity が立ち上がっているか）」
 *   を内側のリビール用コンポーネントへ伝えるための context。
 *   - null: スライドの外（通常フロー） → 各リビールは whileInView で発火
 *   - bool: スライド内 → active=true のときに発火（== 固定中だけ動く）
 * ────────────────────────────────────────────────────────── */
const SlideActiveContext = createContext<boolean | null>(null)

function useSlideActive(): boolean | null {
  return useContext(SlideActiveContext)
}

/* ──────────────────────────────────────────────────────────
 * RevealOnView
 *   通常フロー: whileInView でフェードイン
 *   スライド内: 親スライドが active になったときにフェードイン
 * ────────────────────────────────────────────────────────── */
export function RevealOnView({
  children,
  delay = 0,
  duration = 0.8,
  y = 24,
  className,
  amount = 0.35,
  once = true,
}: {
  children: ReactNode
  delay?: number
  duration?: number
  y?: number
  className?: string
  amount?: number
  once?: boolean
}) {
  const reduce = useReducedMotion()
  const slideActive = useSlideActive()

  const hidden = { opacity: 0, y: reduce ? 0 : y }
  const show = { opacity: 1, y: 0 }
  const transition = {
    duration: reduce ? 0 : duration,
    delay: reduce ? 0 : delay,
    ease: EASE_OUT_EXPO,
  }

  if (slideActive !== null) {
    return (
      <motion.div
        initial={hidden}
        animate={slideActive ? show : hidden}
        transition={transition}
        className={className}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={hidden}
      whileInView={show}
      viewport={{ once, amount }}
      transition={transition}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ──────────────────────────────────────────────────────────
 * FadeInImage
 * ────────────────────────────────────────────────────────── */
export function FadeInImage({
  children,
  className,
  duration = 1.4,
  delay = 0,
  amount = 0.3,
  zoomFrom = 1.04,
}: {
  children: ReactNode
  className?: string
  duration?: number
  delay?: number
  amount?: number
  zoomFrom?: number
}) {
  const reduce = useReducedMotion()
  const slideActive = useSlideActive()

  const hidden = {
    opacity: 0,
    scale: reduce ? 1 : zoomFrom,
    filter: reduce ? "none" : "blur(6px)",
  }
  const show = { opacity: 1, scale: 1, filter: "blur(0px)" }
  const transition = {
    duration: reduce ? 0 : duration,
    delay: reduce ? 0 : delay,
    ease: EASE_OUT_EXPO,
  }

  if (slideActive !== null) {
    return (
      <motion.div
        initial={hidden}
        animate={slideActive ? show : hidden}
        transition={transition}
        className={className}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={hidden}
      whileInView={show}
      viewport={{ once: true, amount }}
      transition={transition}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ──────────────────────────────────────────────────────────
 * RevealLines
 * ────────────────────────────────────────────────────────── */
export function RevealLines({
  lines,
  className,
  itemClassName,
  baseDelay = 0,
  step = 0.12,
  duration = 0.7,
  amount = 0.35,
}: {
  lines: ReactNode[]
  className?: string
  itemClassName?: string
  baseDelay?: number
  step?: number
  duration?: number
  amount?: number
}) {
  const reduce = useReducedMotion()
  const slideActive = useSlideActive()
  const container: Variants = {
    hidden: {},
    show: {
      transition: {
        delayChildren: reduce ? 0 : baseDelay,
        staggerChildren: reduce ? 0 : step,
      },
    },
  }
  const item: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 18 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduce ? 0 : duration, ease: EASE_OUT_EXPO },
    },
  }

  const common = (
    <>
      {lines.map((line, i) => (
        <motion.div key={i} variants={item} className={itemClassName}>
          {line}
        </motion.div>
      ))}
    </>
  )

  if (slideActive !== null) {
    return (
      <motion.div
        variants={container}
        initial="hidden"
        animate={slideActive ? "show" : "hidden"}
        className={className}
      >
        {common}
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      className={className}
    >
      {common}
    </motion.div>
  )
}

/* ──────────────────────────────────────────────────────────
 * TypewriterHeading
 * ────────────────────────────────────────────────────────── */
function splitGraphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && (Intl as unknown as { Segmenter?: unknown }).Segmenter) {
    try {
      const seg = new Intl.Segmenter("ja", { granularity: "grapheme" })
      return Array.from(seg.segment(text), (s) => s.segment)
    } catch {
      /* noop */
    }
  }
  return Array.from(text)
}

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6"

export function TypewriterHeading({
  text,
  as: Tag = "h2",
  className,
  cursorClassName,
  step = 0.06,
  startDelay = 0.15,
  amount = 0.5,
  caretChar = "_",
  showCaret = true,
}: {
  text: string
  as?: HeadingTag
  className?: string
  cursorClassName?: string
  step?: number
  startDelay?: number
  amount?: number
  caretChar?: string
  showCaret?: boolean
}) {
  const reduce = useReducedMotion()
  const slideActive = useSlideActive()
  const chars = useMemo(() => splitGraphemes(text), [text])

  const container: Variants = {
    hidden: {},
    show: {
      transition: {
        delayChildren: reduce ? 0 : startDelay,
        staggerChildren: reduce ? 0 : step,
      },
    },
  }
  const item: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 6 },
    show: { opacity: 1, y: 0, transition: { duration: reduce ? 0 : 0.18, ease: "easeOut" as const } },
  }

  /** caret は最後の文字が出てから少し遅らせて点滅開始 */
  const caretDelay = reduce ? 0 : startDelay + step * chars.length + 0.15
  const caretStyle: CSSProperties = {
    animation: `tw-caret 1s step-end ${caretDelay}s infinite`,
  }

  const charsNodes = chars.map((c, i) => (
    <motion.span
      key={i}
      variants={item}
      aria-hidden
      style={{ display: "inline-block", whiteSpace: c === " " ? "pre" : "normal" }}
    >
      {c}
    </motion.span>
  ))

  const inner =
    slideActive !== null ? (
      <motion.span
        variants={container}
        initial="hidden"
        animate={slideActive ? "show" : "hidden"}
        style={{ display: "inline" }}
        aria-label={text}
      >
        {charsNodes}
        {showCaret ? (
          <span
            aria-hidden
            className={cn("ml-1 inline-block translate-y-[-0.05em]", cursorClassName)}
            style={caretStyle}
          >
            {caretChar}
          </span>
        ) : null}
      </motion.span>
    ) : (
      <motion.span
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount }}
        style={{ display: "inline" }}
        aria-label={text}
      >
        {charsNodes}
        {showCaret ? (
          <span
            aria-hidden
            className={cn("ml-1 inline-block translate-y-[-0.05em]", cursorClassName)}
            style={caretStyle}
          >
            {caretChar}
          </span>
        ) : null}
      </motion.span>
    )

  return (
    <>
      <style>{`
        @keyframes tw-caret { 0%, 50% { opacity: 1 } 51%, 100% { opacity: 0 } }
      `}</style>
      {Tag === "h1" ? <h1 className={className}>{inner}</h1>
        : Tag === "h2" ? <h2 className={className}>{inner}</h2>
        : Tag === "h3" ? <h3 className={className}>{inner}</h3>
        : Tag === "h4" ? <h4 className={className}>{inner}</h4>
        : Tag === "h5" ? <h5 className={className}>{inner}</h5>
        : <h6 className={className}>{inner}</h6>}
    </>
  )
}

/* ──────────────────────────────────────────────────────────
 * CrossfadeStack
 *   全セクションを「同じ位置に重ねて」配置し、
 *   スクロール量に応じて opacity だけで切り替える。
 *   sticky による画面固定（スクロールジャック）+ scroll-driven crossfade。
 * ────────────────────────────────────────────────────────── */
export type CrossfadeSlideEntry = { key: string; node: ReactNode }

export function CrossfadeStack({
  slides,
  slideHeightVh = 100,
  className,
}: {
  /** 各スライドはユニーク key と表示要素を持つ */
  slides: CrossfadeSlideEntry[]
  slideHeightVh?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  })
  const total = slides.length

  return (
    <div
      ref={ref}
      style={{ height: `${total * slideHeightVh}vh` }}
      className={cn("relative", className)}
    >
      <div className="sticky top-0 h-svh w-full overflow-hidden bg-[#050607]">
        {slides.map((slide, i) => (
          <CrossfadeSlide
            key={slide.key}
            progress={scrollYProgress}
            index={i}
            total={total}
          >
            {slide.node}
          </CrossfadeSlide>
        ))}
      </div>
    </div>
  )
}

function CrossfadeSlide({
  progress,
  index,
  total,
  children,
}: {
  progress: MotionValue<number>
  index: number
  total: number
  children: ReactNode
}) {
  const isFirst = index === 0
  const isLast = index === total - 1
  const center = total === 1 ? 0.5 : index / (total - 1)
  const stayRaw = 0.55 / Math.max(1, total)
  const fadeRaw = 0.45 / Math.max(1, total)
  const EPS = 0.0001
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

  let stops: [number, number, number, number]
  let values: [number, number, number, number]

  if (isFirst) {
    stops = [0, EPS, clamp01(center + stayRaw), clamp01(center + stayRaw + fadeRaw)]
    values = [1, 1, 1, 0]
  } else if (isLast) {
    stops = [
      clamp01(center - stayRaw - fadeRaw),
      clamp01(center - stayRaw),
      1 - EPS,
      1,
    ]
    values = [0, 1, 1, 1]
  } else {
    stops = [
      clamp01(center - stayRaw - fadeRaw),
      clamp01(center - stayRaw),
      clamp01(center + stayRaw),
      clamp01(center + stayRaw + fadeRaw),
    ]
    values = [0, 1, 1, 0]
  }

  const safe: number[] = []
  let prev = -1
  for (const s of stops) {
    let v = s
    if (v <= prev) v = prev + EPS
    if (v > 1) v = 1
    safe.push(v)
    prev = v
  }
  const safeStops = safe as [number, number, number, number]

  const opacity = useTransform(progress, safeStops, values)

  /**
   * 「自分はアクティブか」=「opacity がしっかり立ち上がっているか」を
   * 内側に伝える。閾値は 0.55（クロスフェード途中で発火しすぎないライン）。
   * 一度 active になったらそのまま（fire-once）。
   */
  const [isActive, setIsActive] = useState(index === 0)

  useEffect(() => {
    if (!isActive && opacity.get() >= 0.55) setIsActive(true)
  }, [isActive, opacity])

  useMotionValueEvent(opacity, "change", (latest) => {
    if (!isActive && latest >= 0.55) setIsActive(true)
  })

  return (
    <motion.div
      style={{ opacity }}
      className="absolute inset-0 flex h-full w-full flex-col overflow-hidden"
    >
      <SlideActiveContext.Provider value={isActive}>{children}</SlideActiveContext.Provider>
    </motion.div>
  )
}
