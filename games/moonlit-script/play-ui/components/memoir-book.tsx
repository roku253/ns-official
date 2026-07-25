"use client"

import { useCallback, useState } from "react"
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { MEMOIR_PAGES } from "../data/memoir-pages"
import { lineInkClass, lineTiltDeg, vaultPaperClass } from "../paper-styles"
import { cn } from "@/lib/utils"

const SPREAD_COUNT = Math.ceil(MEMOIR_PAGES.length / 2)

function renderPageLines(text: string, baseLine: number) {
  const lines = text.split("\n")
  let idx = baseLine
  return lines.map((line, li) => {
    const n = idx++
    const tilt = lineTiltDeg(n)
    const variant = li === 0 && line.includes("買い物") ? ("red" as const) : ("ink" as const)
    return (
      <p
        key={li}
        className={cn("min-h-[1.82rem] pl-1", lineInkClass(variant))}
        style={{ transform: `rotate(${tilt}deg)` }}
      >
        {line || "\u00a0"}
      </p>
    )
  })
}

export function MemoirBook() {
  const reduce = useReducedMotion()
  const [spread, setSpread] = useState(0)

  const go = useCallback(
    (d: -1 | 1) => {
      setSpread((s) => Math.min(SPREAD_COUNT - 1, Math.max(0, s + d)))
    },
    []
  )

  const onDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (info.offset.x < -48) go(1)
      else if (info.offset.x > 48) go(-1)
    },
    [go]
  )

  const leftIdx = spread * 2
  const rightIdx = leftIdx + 1
  const leftText = MEMOIR_PAGES[leftIdx] ?? ""
  const rightText = MEMOIR_PAGES[rightIdx] ?? ""

  return (
    <div className="flex min-h-0 flex-1 flex-col px-2 py-3 sm:px-4">
      <div
        className="relative mx-auto w-full max-w-3xl flex-1"
        style={{ perspective: reduce ? undefined : "1500px" }}
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={spread}
            className="touch-pan-y"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.14}
            onDragEnd={onDragEnd}
            initial={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, rotateY: -28, transformOrigin: "left center" }
            }
            animate={reduce ? { opacity: 1 } : { opacity: 1, rotateY: 0 }}
            exit={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, rotateY: 22, transformOrigin: "right center" }
            }
            transition={{ duration: reduce ? 0.2 : 0.68, ease: [0.4, 0, 0.2, 1] }}
            style={{ transformStyle: "preserve-3d" }}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <article
                className={cn(vaultPaperClass(), "min-h-[14rem] p-4 sm:p-5")}
                style={{ fontFamily: "var(--font-handwriting)" }}
                aria-label={`手記 左ページ ${leftIdx + 1} ページ目`}
              >
                <p className="mb-2 text-[10px] tracking-[0.35em] text-[#8a7d6d]">手記</p>
                <div className="space-y-0.5 text-[0.88rem] leading-[1.82rem]">
                  {renderPageLines(leftText, leftIdx * 20)}
                </div>
              </article>
              <article
                className={cn(vaultPaperClass(), "min-h-[14rem] p-4 sm:p-5")}
                style={{ fontFamily: "var(--font-handwriting)" }}
                aria-label={`手記 右ページ ${rightIdx + 1} ページ目`}
              >
                {rightText ? (
                  <div className="space-y-0.5 text-[0.88rem] leading-[1.82rem]">
                    {renderPageLines(rightText, rightIdx * 20)}
                  </div>
                ) : (
                  <p className="text-sm text-[#8a7d6d]">（白紙）</p>
                )}
              </article>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mx-auto mt-4 flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-1">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={spread === 0}
          className="inline-flex min-h-11 min-w-[7rem] items-center justify-center gap-1 rounded-full border border-[#a89882] bg-[#faf6ef]/95 px-4 py-2.5 text-sm text-[#3d3429] shadow-sm disabled:opacity-35"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
          前へ
        </button>
        <span className="text-xs text-[#6b6054]">
          見開き {spread + 1} / {SPREAD_COUNT}
        </span>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={spread >= SPREAD_COUNT - 1}
          className="inline-flex min-h-11 min-w-[7rem] items-center justify-center gap-1 rounded-full border border-[#a89882] bg-[#faf6ef]/95 px-4 py-2.5 text-sm text-[#3d3429] shadow-sm disabled:opacity-35"
        >
          次へ
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </div>
  )
}
