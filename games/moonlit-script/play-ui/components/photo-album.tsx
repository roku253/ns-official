"use client"

import { useCallback, useState } from "react"
import Image from "next/image"
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { ALBUM_SPREADS } from "../data/album-photos"
import { cn } from "@/lib/utils"

const BASE = "/games/moonlit-script/album"

export function PhotoAlbum() {
  const reduce = useReducedMotion()
  const [spread, setSpread] = useState(0)
  const max = ALBUM_SPREADS.length - 1

  const go = useCallback((d: -1 | 1) => {
    setSpread((s) => Math.min(max, Math.max(0, s + d)))
  }, [max])

  const onDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (info.offset.x < -48) go(1)
      else if (info.offset.x > 48) go(-1)
    },
    [go]
  )

  const current = ALBUM_SPREADS[spread]

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#1a1d24] px-2 py-3 sm:px-4">
      <div
        className="relative mx-auto w-full max-w-3xl flex-1 rounded-lg border border-black/40 shadow-inner"
        style={{ perspective: reduce ? undefined : "1500px" }}
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={spread}
            className="touch-pan-y rounded-lg bg-[#14161c] p-4 sm:p-6"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={onDragEnd}
            initial={reduce ? { opacity: 0 } : { opacity: 0, rotateY: -24 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, rotateY: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, rotateY: 18 }}
            transition={{ duration: reduce ? 0.2 : 0.65, ease: [0.4, 0, 0.2, 1] }}
            style={{ transformStyle: "preserve-3d" }}
          >
            <p className="mb-4 text-center text-[10px] tracking-[0.35em] text-[#9a9daa]">アルバム</p>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-6">
              {current.photos.map((ph, i) => {
                const rot = i % 2 === 0 ? -3.2 : 3.8
                return (
                  <figure
                    key={`${current.id}-p${i}`}
                    className="relative mx-auto w-full max-w-[16rem]"
                    style={{ transform: `rotate(${rot}deg)` }}
                  >
                    <div
                      className={cn(
                        "relative rounded-sm bg-white p-2 pb-10 shadow-[0_10px_28px_rgba(0,0,0,0.45)]",
                        "before:pointer-events-none before:absolute before:-top-2 before:left-1/2 before:h-5 before:w-12 before:-translate-x-1/2 before:rounded-sm before:bg-[rgba(255,255,200,0.72)] before:shadow-sm before:content-['']",
                        "before:rotate-[-12deg]"
                      )}
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#e8e4dc]">
                        <Image
                          src={`${BASE}/${ph.file}`}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width:640px) 80vw, 16rem"
                        />
                      </div>
                      <figcaption
                        className="mt-3 px-1 text-center text-[0.82rem] leading-relaxed text-[#2a231c]"
                        style={{ fontFamily: "var(--font-handwriting-yomogi)" }}
                      >
                        <span className="sr-only">キャプション（手書き風表示）: </span>
                        {ph.caption}
                      </figcaption>
                      <p className="mt-1 text-center text-[10px] text-[#6b6054]">{ph.dateNote}</p>
                    </div>
                  </figure>
                )
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mx-auto mt-4 flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-1 pb-1">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={spread === 0}
          className="inline-flex min-h-11 min-w-[7rem] items-center justify-center gap-1 rounded-full border border-[#3d4250] bg-[#242833] px-4 py-2.5 text-sm text-[#e8e4dc] disabled:opacity-35"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
          前へ
        </button>
        <span className="text-xs text-[#9a9daa]">
          見開き {spread + 1} / {ALBUM_SPREADS.length}
        </span>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={spread >= max}
          className="inline-flex min-h-11 min-w-[7rem] items-center justify-center gap-1 rounded-full border border-[#3d4250] bg-[#242833] px-4 py-2.5 text-sm text-[#e8e4dc] disabled:opacity-35"
        >
          次へ
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </div>
  )
}
