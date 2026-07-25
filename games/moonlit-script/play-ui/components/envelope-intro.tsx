"use client"

import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

/** 冒頭：封筒を開ける演出。完了で onComplete、スキップは即時。 */

export function EnvelopeIntro({
  onComplete,
  onSkip,
}: {
  onComplete: () => void
  onSkip: () => void
}) {
  const reduce = useReducedMotion()
  const [opening, setOpening] = useState(false)

  useEffect(() => {
    if (!opening || reduce) return
    const t = window.setTimeout(() => onComplete(), 3400)
    return () => window.clearTimeout(t)
  }, [opening, onComplete, reduce])

  const finish = () => {
    if (reduce) onComplete()
    else setOpening(true)
  }

  return (
    <div className="relative flex min-h-[62svh] flex-col items-center justify-center px-4 pb-8 pt-10">
      <button
        type="button"
        className="absolute right-4 top-3 z-20 rounded-md px-3 py-2 text-sm text-[#5c5348] underline underline-offset-4"
        onClick={onSkip}
      >
        スキップ
      </button>
      <p className="mb-8 text-center text-sm tracking-wide text-[#6b6054]">封筒をタップして開く</p>

      <button
        type="button"
        onClick={finish}
        disabled={opening}
        className={cn(
          "relative z-10 outline-none focus-visible:ring-2 focus-visible:ring-[#8a7d6d]",
          opening && "pointer-events-none"
        )}
        aria-label="封筒を開ける"
      >
        <div
          className="relative mx-auto w-[min(18rem,88vw)]"
          style={{ perspective: reduce ? undefined : "900px" }}
        >
          <motion.div
            className="relative z-0 overflow-visible rounded-sm bg-[#b8956a] shadow-[0_18px_40px_rgba(20,16,12,0.35)]"
            style={{ transformStyle: "preserve-3d" }}
            initial={false}
            animate={opening && !reduce ? { rotateX: 4 } : { rotateX: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="h-36 w-full rounded-sm bg-[#c9a882] shadow-[inset_0_2px_0_rgba(255,255,255,0.2)]" />
            <motion.div
              className="absolute left-0 right-0 top-0 h-[4.5rem] origin-top bg-[#d4b08f]"
              style={{
                clipPath: "polygon(0% 100%, 50% 0%, 100% 100%)",
                transformStyle: "preserve-3d",
              }}
              initial={{ rotateX: 0 }}
              animate={opening && !reduce ? { rotateX: 180 } : { rotateX: 0 }}
              transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
            />
            <motion.div
              className="pointer-events-none absolute inset-x-6 top-10 z-10 rounded-sm border border-[#d8ccb8]/80 bg-[#f4ead8] px-4 py-3 text-left text-[0.72rem] leading-relaxed text-[#3d3429] shadow-md"
              initial={{ y: 8, opacity: 0.85 }}
              animate={
                opening && !reduce
                  ? { y: -28, opacity: 1 }
                  : { y: 8, opacity: opening ? 1 : 0.85 }
              }
              transition={{ delay: opening && !reduce ? 0.45 : 0, duration: 0.65 }}
            >
              <p className="font-[family-name:var(--font-mincho-title)] tracking-wider">差出人不明の便箋</p>
              <p className="mt-1 text-[#6b6054]">── 開封してください</p>
            </motion.div>
          </motion.div>
        </div>
      </button>
    </div>
  )
}
