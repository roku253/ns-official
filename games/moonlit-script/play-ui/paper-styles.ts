import { cn } from "@/lib/utils"

/** 手記・便箋の紙面（汚れ・罫線・赤い縦線） */
export function vaultPaperClass() {
  return cn(
    "relative overflow-hidden rounded-sm border border-[#c4b8a8]/88",
    "bg-[radial-gradient(ellipse_70%_55%_at_18%_22%,rgba(139,115,85,0.09),transparent_52%),radial-gradient(ellipse_50%_40%_at_82%_78%,rgba(120,100,80,0.07),transparent_48%),#f4ead8]",
    "shadow-[inset_0_0_70px_rgba(90,70,50,0.05),0_14px_38px_rgba(28,22,16,0.14)]",
    "before:pointer-events-none before:absolute before:inset-0 before:bg-[repeating-linear-gradient(to_bottom,transparent_0px,transparent_26px,rgba(100,85,65,0.075)_26px,rgba(100,85,65,0.075)_27px)] before:content-['']",
    "after:pointer-events-none after:absolute after:left-7 after:top-0 after:h-full after:w-px after:bg-[rgba(180,70,55,0.14)] after:content-['']"
  )
}

/** 行ごとの手書きゆらぎ（角度は style で渡す） */
export function lineInkClass(variant: "ink" | "blue" | "red" = "ink") {
  const color =
    variant === "blue" ? "text-[#22487a]" : variant === "red" ? "text-[#7a2317]" : "text-[#1f1a14]"
  return cn(color, "inline-block w-full origin-left")
}

export function lineTiltDeg(lineIndex: number): number {
  const seed = (lineIndex * 13 + 7) % 17
  return (seed / 17) * 0.8 - 0.35
}
