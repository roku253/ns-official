"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

type Shot = { src: string; alt?: string }

type WorkScreenshotsCarouselProps = {
  shots: Shot[]
  className?: string
}

/* ──────────────────────────────────────────────────────────
 * Play view カルーセル（参照レイアウト寄せ）
 *
 *  方式：
 *   - 1 本のトラックに各スライドを 1 度だけ並べる（ピーク画像の複製なし）。
 *   - 各スライド幅 S = viewportWidth - 2*peek - 2*gap。
 *   - トラック translateX を center-anchor:
 *       baseX = (viewportWidth - S) / 2   ← 1 枚目を中央に揃える
 *       trackX = baseX - active * (S + gap) + dragPx
 *   - これで隣スライドが両端 peek 分だけ自然に見切れる。
 *   - ドラッグ方向は finger に追従（右へ引けば content 右へ）。
 *
 *  サイズ：
 *   - viewport の高さは active 画像の自然アスペクトと S から JS で算出。
 *     ⇒ 中央画像が letterbox 黒帯にならない。
 *
 *  操作：
 *   - Pointer Events の capture phase でドラッグを取る（image は
 *     pointer-events:none）。`data-lenis-prevent` は使わないので、
 *     カルーセル上に乗ったまま縦スクロール可能。
 * ────────────────────────────────────────────────────────── */

const RESIST = 0.4
const GAP_PX = 12 /* ≒ 0.75rem at 16px root */
const MAX_SLIDE_W = 820
/** ピーク幅（px）。ビューポート幅依存で min(14vw, 9rem) 相当 */
function computePeek(): number {
  if (typeof window === "undefined") return 80
  return Math.min(window.innerWidth * 0.14, 9 * 16)
}

export function WorkScreenshotsCarousel({
  shots,
  className,
}: WorkScreenshotsCarouselProps) {
  const total = shots.length
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [active, setActive] = useState(0)
  const [dragPx, setDragPx] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [viewportW, setViewportW] = useState(0)
  const [peek, setPeek] = useState<number>(() => computePeek())

  const activeRef = useRef(active)
  const dragRef = useRef(dragPx)
  useEffect(() => {
    activeRef.current = active
  }, [active])
  useEffect(() => {
    dragRef.current = dragPx
  }, [dragPx])

  /** viewport 幅を計測 + ピーク幅をリサイズ追従 */
  useLayoutEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const update = () => {
      setViewportW(el.offsetWidth || 0)
      setPeek(computePeek())
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener("resize", update)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", update)
    }
  }, [])

  /* ── 寸法（16:9 固定） ─────────────────────────────── */
  const FIXED_ASPECT = 16 / 9
  const slideW = Math.min(Math.max(1, viewportW - 2 * peek - 2 * GAP_PX), MAX_SLIDE_W)
  const baseX = (viewportW - slideW) / 2
  const viewportH = slideW / FIXED_ASPECT

  /* ── 操作 ────────────────────────────────────────────── */
  const goTo = useCallback(
    (i: number) => {
      if (total === 0) return
      setActive(Math.max(0, Math.min(total - 1, i)))
    },
    [total]
  )

  const goBy = useCallback(
    (delta: number) => {
      goTo(activeRef.current + delta)
    },
    [goTo]
  )

  /** 横ドラッグ — finger と同方向に追従 */
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return

    let dragging = false
    let startX = 0
    let startDrag = 0
    let pointerId = -1
    let didMove = false

    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("button")) return
      dragging = true
      didMove = false
      startX = e.clientX
      startDrag = dragRef.current
      pointerId = e.pointerId
      try {
        el.setPointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      setIsDragging(true)
    }

    const onMove = (e: PointerEvent) => {
      if (!dragging || pointerId !== e.pointerId) return
      const dx = e.clientX - startX
      if (Math.abs(dx) > 4) didMove = true
      const a = activeRef.current
      let next = startDrag + dx
      /** 端のゴム抵抗：先頭で右へ / 末尾で左へ引いたとき抵抗をかける */
      if (a === 0 && next > 0) next *= RESIST
      if (a === total - 1 && next < 0) next *= RESIST
      setDragPx(next)
    }

    const settle = (e: PointerEvent) => {
      if (!dragging || pointerId !== e.pointerId) return
      dragging = false
      setIsDragging(false)
      const a = activeRef.current
      const d = dragRef.current
      const w = el.offsetWidth || 1
      const threshold = w / 4
      let delta = 0
      /** 右へドラッグ（d>0）= 前へ、左へ（d<0）= 次へ */
      if (d > threshold) delta = -1
      else if (d < -threshold) delta = 1
      goTo(a + delta)
      setDragPx(0)
      try {
        el.releasePointerCapture(pointerId)
      } catch {
        /* ignore */
      }
    }

    const onClickCapture = (e: MouseEvent) => {
      if (didMove) {
        e.stopPropagation()
        e.preventDefault()
        didMove = false
      }
    }

    /** capture: pointer-events:none の Image より先にドラッグを掴む */
    el.addEventListener("pointerdown", onDown, true)
    el.addEventListener("pointermove", onMove, true)
    el.addEventListener("pointerup", settle, true)
    el.addEventListener("pointercancel", settle, true)
    el.addEventListener("pointerleave", settle, true)
    el.addEventListener("click", onClickCapture, true)

    return () => {
      el.removeEventListener("pointerdown", onDown, true)
      el.removeEventListener("pointermove", onMove, true)
      el.removeEventListener("pointerup", settle, true)
      el.removeEventListener("pointercancel", settle, true)
      el.removeEventListener("pointerleave", settle, true)
      el.removeEventListener("click", onClickCapture, true)
    }
  }, [total, goTo])

  if (total === 0) return null

  /** トラック X：右へドラッグ＝中身も右へ */
  const trackX = baseX - active * (slideW + GAP_PX) + dragPx

  return (
    <div
      className={cn("relative", className)}
      role="region"
      aria-roledescription="carousel"
      aria-label="作品スクリーンショット"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault()
          goBy(1)
        } else if (e.key === "ArrowLeft") {
          e.preventDefault()
          goBy(-1)
        }
      }}
    >
      <div
        ref={viewportRef}
        className={cn(
          "relative w-full overflow-hidden bg-[#0a0c10] select-none touch-pan-y",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
        style={{
          height: `${viewportH}px`,
        }}
      >
        {/** トラック：全スライドを 1 度だけ並べる */}
        <div
          className={cn(
            "absolute left-0 top-0 flex h-full pointer-events-none",
            isDragging ? "" : "transition-transform duration-500 ease-out"
          )}
          style={{
            gap: `${GAP_PX}px`,
            transform: `translate3d(${trackX}px, 0, 0)`,
            willChange: "transform",
          }}
        >
          {shots.map((s, i) => {
            const isActive = i === active
            return (
              <div
                key={`${s.src}-${i}`}
                className="relative h-full shrink-0 overflow-hidden bg-black"
                style={{ width: `${slideW}px` }}
                aria-hidden={!isActive}
              >
                    <Image
                  src={s.src}
                  alt={s.alt ?? ""}
                  fill
                  className="pointer-events-none object-cover"
                  sizes="(max-width: 768px) 100vw, min(80vw, 1200px)"
                  draggable={false}
                  priority={i === 0}
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.06)_3px)] opacity-40"
                  aria-hidden
                />
              </div>
            )
          })}
        </div>

        {/** 矢印：トラックと独立、ガター中央に固定 */}
        {total > 1 ? (
          <>
            <button
              type="button"
              onClick={() => goBy(-1)}
              disabled={active === 0}
              aria-label="前のスクリーンショット"
              className="pointer-events-auto absolute top-1/2 z-30 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-sm border border-zinc-600/60 bg-black/50 text-zinc-100 backdrop-blur-[2px] transition-colors hover:border-[#c9a227]/55 hover:text-[#e8d89a] disabled:cursor-not-allowed disabled:opacity-25"
              style={{ left: `${Math.max(8, peek + GAP_PX / 2 - 18)}px` }}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => goBy(1)}
              disabled={active === total - 1}
              aria-label="次のスクリーンショット"
              className="pointer-events-auto absolute top-1/2 z-30 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-sm border border-zinc-600/60 bg-black/50 text-zinc-100 backdrop-blur-[2px] transition-colors hover:border-[#c9a227]/55 hover:text-[#e8d89a] disabled:cursor-not-allowed disabled:opacity-25"
              style={{ right: `${Math.max(8, peek + GAP_PX / 2 - 18)}px` }}
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </>
        ) : null}
      </div>

      {total > 1 ? (
        <div
          className="mt-5 flex items-center justify-center gap-2"
          role="tablist"
          aria-label="スクリーンショットの位置"
        >
          {shots.map((_, i) => {
            const isActive = i === active
            return (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`${i + 1} 番目に移動`}
                onClick={() => goTo(i)}
                className="group relative inline-flex h-2.5 items-center justify-center p-0.5"
              >
                <span
                  className={cn(
                    "block h-2 w-2 rounded-[1px] transition-colors",
                    isActive
                      ? "bg-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.45)]"
                      : "bg-zinc-600 group-hover:bg-zinc-500"
                  )}
                />
              </button>
            )
          })}
        </div>
      ) : null}

      <p className="mt-2 text-center font-mono text-[10px] tracking-[0.3em] text-zinc-500 tabular-nums">
        {String(active + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </p>
    </div>
  )
}
