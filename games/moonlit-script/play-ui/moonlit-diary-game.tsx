"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react"
import { ReturnToOfficialLink } from "@/components/official-site/return-to-official-link"
import { cn } from "@/lib/utils"
import {
  LETTER_FINAL_BLOCK,
  LETTER_INTRO_PAGES,
  LETTER_SEGMENTS,
  type LetterSegment,
} from "./data/letter-template"
import { BottomNav, type MoonlitTab } from "./components/bottom-nav"
import { DeskHub } from "./components/desk-hub"
import { EnvelopeIntro } from "./components/envelope-intro"
import { LetterSheet } from "./components/letter-sheet"
import { MemoirBook } from "./components/memoir-book"
import { PhotoAlbum } from "./components/photo-album"
import { vaultPaperClass } from "./paper-styles"

const GAME_SLUG = "moonlit-script"
const LS_CLEARED = "ms:moonlit-script:cleared"

function loadCleared(): Record<string, string> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(LS_CLEARED)
    if (!raw) return {}
    const j = JSON.parse(raw) as unknown
    if (!j || typeof j !== "object") return {}
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(j as Record<string, unknown>)) {
      if (typeof v === "string" && v.length > 0) out[k] = v
    }
    return out
  } catch {
    return {}
  }
}

function saveCleared(next: Record<string, string>) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(LS_CLEARED, JSON.stringify(next))
}

type Phase = "envelope" | "intro" | "hub" | "play" | "clear"

export function MoonlitDiaryGame({ gameId = GAME_SLUG }: { gameId?: string }) {
  const searchParams = useSearchParams()
  const caseIdParam = searchParams.get("caseId")?.trim() ?? ""

  const [phase, setPhase] = useState<Phase>("envelope")
  const [introIx, setIntroIx] = useState(0)
  const [tab, setTab] = useState<MoonlitTab>("letter")
  const [cleared, setCleared] = useState<Record<string, string>>({})

  useEffect(() => {
    const c = loadCleared()
    setCleared(c)
    const blanks = LETTER_SEGMENTS.filter(
      (s): s is Extract<LetterSegment, { kind: "blank" }> => s.kind === "blank"
    ).map((s) => s.stageId)
    const fullyDone = blanks.every((id) => Boolean(c[id])) && Boolean(c[LETTER_FINAL_BLOCK.stageId])
    if (fullyDone) setPhase("clear")
  }, [])

  const onSolved = useCallback((stageId: string, answer: string) => {
    setCleared((prev) => {
      const next = { ...prev, [stageId]: answer }
      saveCleared(next)
      return next
    })
  }, [])

  const onAllStagesClear = useCallback(() => {
    setPhase("clear")
  }, [])

  const openFromHub = (t: MoonlitTab) => {
    setTab(t)
    setPhase("play")
  }

  const introLast = introIx >= LETTER_INTRO_PAGES.length - 1

  return (
    <div
      className={cn(
        "flex h-svh min-h-0 flex-col overflow-hidden bg-[#ebe4d9] text-[#2a231c]",
        "[font-feature-settings:'palt']"
      )}
    >
      <header className="z-30 shrink-0 border-b border-[#c9bdad]/80 bg-[#f2ebe1]/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-xs tracking-wider text-[#5c5348]">
            <BookOpen className="h-4 w-4" aria-hidden />
            月下の手記
          </span>
          <ReturnToOfficialLink
            href="/"
            className="text-xs text-[#6b5f52] underline-offset-4 hover:text-[#2a231c] hover:underline"
          >
            公式サイトへ
          </ReturnToOfficialLink>
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {phase === "envelope" ? (
          <EnvelopeIntro
            onComplete={() => setPhase("intro")}
            onSkip={() => setPhase("intro")}
          />
        ) : null}

        {phase === "intro" ? (
          <div className="flex min-h-0 flex-1 flex-col justify-center px-4 py-6 sm:px-6">
            <article className={cn(vaultPaperClass(), "mx-auto w-full max-w-lg p-6 sm:p-8")}>
              <p className="mb-4 text-center text-[10px] tracking-[0.35em] text-[#8a7d6d]">導入</p>
              <div
                className="space-y-5 text-[0.92rem] leading-[2.05] text-[#1f1a14]"
                style={{ fontFamily: "var(--font-handwriting)" }}
              >
                {LETTER_INTRO_PAGES[introIx].split("\n").map((para, i) => (
                  <p key={i} className="indent-[0.9em]">
                    {para}
                  </p>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={introIx === 0}
                  onClick={() => setIntroIx((x) => Math.max(0, x - 1))}
                  className="inline-flex min-h-11 items-center gap-1 rounded-full border border-[#a89882] bg-[#faf6ef]/90 px-4 py-2.5 text-sm disabled:opacity-35"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                  前へ
                </button>
                {introLast ? (
                  <button
                    type="button"
                    onClick={() => setPhase("hub")}
                    className="inline-flex min-h-11 items-center gap-1 rounded-full bg-[#3d3429] px-5 py-2.5 text-sm text-[#f5f0e8]"
                  >
                    机へ
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIntroIx((x) => x + 1)}
                    className="inline-flex min-h-11 items-center gap-1 rounded-full border border-[#a89882] bg-[#faf6ef]/90 px-5 py-2.5 text-sm"
                  >
                    次へ
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
            </article>
          </div>
        ) : null}

        {phase === "hub" ? <DeskHub onOpen={openFromHub} /> : null}

        {phase === "play" ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto pb-1">
              {tab === "memoir" ? <MemoirBook /> : null}
              {tab === "album" ? <PhotoAlbum /> : null}
              {tab === "letter" ? (
                <LetterSheet
                  gameId={gameId}
                  caseIdParam={caseIdParam}
                  cleared={cleared}
                  onSolved={onSolved}
                  onAllStagesClear={onAllStagesClear}
                />
              ) : null}
            </div>
            <BottomNav active={tab} onSelect={setTab} />
          </>
        ) : null}

        {phase === "clear" ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-10">
            <div className="w-full max-w-lg border-2 border-[#1f1a14] bg-[#f4ead8] px-8 py-10 shadow-[8px_8px_0_#2a231c]">
              <p className="mb-2 text-center font-mono text-[10px] tracking-[0.5em] text-[#5c5348]">CASE MARK</p>
              <p className="mb-1 text-center text-xs tracking-[0.35em] text-[#7a2317]">COMPLETE</p>
              <h2 className="mb-4 text-center text-lg font-medium text-[#1f1a14]">便箋は、一通り辿れた。</h2>
              <p
                className="mb-8 text-center text-sm leading-relaxed text-[#5c5348]"
                style={{ fontFamily: "var(--font-mincho-title)" }}
              >
                差出人：{cleared[LETTER_FINAL_BLOCK.stageId] ?? "──"}
                <br />
                宛先：みーちゃんへ
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <ReturnToOfficialLink
                  href="/works"
                  className="rounded-full border border-[#a89882] bg-[#faf6ef] px-6 py-2.5 text-sm text-[#3d3429] hover:bg-[#fffefb]"
                >
                  作品一覧へ
                </ReturnToOfficialLink>
                <ReturnToOfficialLink href="/" className="text-sm text-[#6b5f52] underline-offset-4 hover:underline">
                  トップへ
                </ReturnToOfficialLink>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
