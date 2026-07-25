"use client"

import { cn } from "@/lib/utils"

export type MoonlitTab = "memoir" | "album" | "letter"

export function BottomNav({
  active,
  onSelect,
}: {
  active: MoonlitTab
  onSelect: (t: MoonlitTab) => void
}) {
  const tabs: { id: MoonlitTab; label: string }[] = [
    { id: "memoir", label: "手記" },
    { id: "album", label: "アルバム" },
    { id: "letter", label: "手紙" },
  ]

  return (
    <nav
      className="z-40 grid shrink-0 grid-cols-3 border-t border-[#c9bdad]/90 bg-[#f2ebe1]/96 px-1 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md"
      aria-label="手記・アルバム・手紙の切り替え"
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onSelect(t.id)}
          className={cn(
            "rounded-lg py-3 text-sm font-medium tracking-wide transition-colors",
            active === t.id
              ? "bg-[#e8dfd2] text-[#1f1a14] shadow-inner"
              : "text-[#6b6054] hover:bg-[#ebe4d9]/80"
          )}
        >
          {t.label}
        </button>
      ))}
    </nav>
  )
}
