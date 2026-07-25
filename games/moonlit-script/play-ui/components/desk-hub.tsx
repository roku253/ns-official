"use client"

import { BookOpen, ImageIcon, Mail } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MoonlitTab } from "./bottom-nav"

/** 机の上：三つの資料へ。 */

export function DeskHub({ onOpen }: { onOpen: (t: MoonlitTab) => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-3 py-6">
      <p className="mb-6 text-center text-xs tracking-[0.25em] text-[#6b6054]">── 机の上 ──</p>
      <div className="grid w-full max-w-lg grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-3">
        <button
          type="button"
          onClick={() => onOpen("memoir")}
          className={cn(
            "flex flex-col items-center gap-3 rounded-xl border border-[#c9bdad] bg-[#faf6ef] p-6 shadow-md transition hover:bg-[#fffefb] sm:min-h-[11rem]",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a7d6d]"
          )}
        >
          <BookOpen className="h-10 w-10 text-[#5c5348]" aria-hidden />
          <span className="text-sm font-medium text-[#2a231c]">手記</span>
          <span className="text-center text-xs leading-relaxed text-[#6b6054]">綴じ目のないノート</span>
        </button>

        <button
          type="button"
          onClick={() => onOpen("letter")}
          className={cn(
            "flex flex-col items-center gap-3 rounded-xl border border-[#b8a090] bg-[#f7f0e6] p-6 shadow-lg transition hover:bg-[#fffefb] sm:min-h-[11rem] sm:scale-[1.02]",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a7d6d]"
          )}
        >
          <Mail className="h-10 w-10 text-[#7a2317]/90" aria-hidden />
          <span
            className="text-sm font-medium text-[#2a231c]"
            style={{ fontFamily: "var(--font-handwriting-pop)" }}
          >
            書きかけの手紙
          </span>
          <span className="text-center text-xs leading-relaxed text-[#6b6054]">空欄のある便箋</span>
        </button>

        <button
          type="button"
          onClick={() => onOpen("album")}
          className={cn(
            "flex flex-col items-center gap-3 rounded-xl border border-[#c9bdad] bg-[#faf6ef] p-6 shadow-md transition hover:bg-[#fffefb] sm:min-h-[11rem]",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a7d6d]"
          )}
        >
          <ImageIcon className="h-10 w-10 text-[#5c5348]" aria-hidden />
          <span className="text-sm font-medium text-[#2a231c]">アルバム</span>
          <span className="text-center text-xs leading-relaxed text-[#6b6054]">台紙に貼られた写真</span>
        </button>
      </div>
    </div>
  )
}
