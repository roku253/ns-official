"use client"

import { useCallback, useState } from "react"
import { motion } from "framer-motion"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LS_ACCOUNT, LS_SESSION } from "@/lib/storage-keys"
import { cn } from "@/lib/utils"
import { LETTER_FINAL_BLOCK, LETTER_SEGMENTS, type LetterSegment } from "../data/letter-template"
import { vaultPaperClass } from "../paper-styles"

const BLANK_ORDER = LETTER_SEGMENTS.filter((s): s is Extract<LetterSegment, { kind: "blank" }> => s.kind === "blank").map(
  (s) => s.stageId
)

export function LetterSheet({
  gameId,
  caseIdParam,
  cleared,
  onSolved,
  onAllStagesClear,
}: {
  gameId: string
  caseIdParam: string
  cleared: Record<string, string>
  onSolved: (stageId: string, answer: string) => void
  onAllStagesClear: () => void
}) {
  const [activeStage, setActiveStage] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [wrongByStage, setWrongByStage] = useState<Record<string, number>>({})
  const [shakeStage, setShakeStage] = useState<string | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)

  const openFor = (stageId: string) => {
    if (cleared[stageId]) return
    setActiveStage(stageId)
    setDraft("")
    setDialogError(null)
  }

  const closeDialog = () => {
    setActiveStage(null)
    setDraft("")
    setDialogError(null)
  }

  const submit = useCallback(async () => {
    if (!activeStage) return
    const answer = draft.trim()
    if (!answer) return

    const loginId = typeof window !== "undefined" ? window.localStorage.getItem(LS_ACCOUNT.LOGIN_ID)?.trim() || "" : ""
    const password =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem(LS_SESSION.PASSWORD) ||
          window.localStorage.getItem(LS_ACCOUNT.PASSWORD) ||
          ""
        : ""
    const caseId =
      caseIdParam || (typeof window !== "undefined" ? window.localStorage.getItem(LS_ACCOUNT.CASE_ID)?.trim() : "") || ""

    setSubmitting(true)
    setDialogError(null)
    try {
      const res = await fetch("/api/platform/check-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          stageId: activeStage,
          answer,
          caseId: caseId || undefined,
          loginId: loginId || undefined,
          password: password || undefined,
          persist: Boolean(loginId && password),
        }),
      })
      const json = (await res.json()) as { correct?: boolean; message?: string }
      if (json.correct === true) {
        onSolved(activeStage, answer)
        closeDialog()
        const nextCleared = { ...cleared, [activeStage]: answer }
        const allBlanks = BLANK_ORDER.every((id) => Boolean(nextCleared[id]))
        const finalDone = Boolean(nextCleared[LETTER_FINAL_BLOCK.stageId])
        if (allBlanks && finalDone) onAllStagesClear()
      } else {
        setWrongByStage((w) => ({ ...w, [activeStage]: (w[activeStage] ?? 0) + 1 }))
        setShakeStage(activeStage)
        window.setTimeout(() => setShakeStage(null), 520)
        setDialogError(json.message?.trim() || "まだ、紙が受け入れてくれません。")
      }
    } catch {
      setDialogError("通信に失敗しました。もう一度お試しください。")
    } finally {
      setSubmitting(false)
    }
  }, [activeStage, caseIdParam, cleared, draft, gameId, onAllStagesClear, onSolved])

  const showFinal = BLANK_ORDER.every((id) => Boolean(cleared[id]))
  const allDone = showFinal && Boolean(cleared[LETTER_FINAL_BLOCK.stageId])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 py-3 sm:px-4">
      <article
        className={cn(vaultPaperClass(), "mx-auto w-full max-w-xl p-5 sm:p-8")}
        style={{ fontFamily: "var(--font-handwriting)" }}
        aria-label="書きかけの手紙"
      >
        <p className="mb-4 text-center text-[10px] tracking-[0.35em] text-[#8a7d6d]">便箋</p>
        <div className="text-[0.92rem] leading-[2rem] text-[#1f1a14]">
          {LETTER_SEGMENTS.map((seg, i) => {
            if (seg.kind === "text") {
              return (
                <span key={`t-${i}`} className="whitespace-pre-wrap">
                  {seg.value}
                </span>
              )
            }
            const solved = Boolean(cleared[seg.stageId])
            const isShake = shakeStage === seg.stageId
            return (
              <motion.span
                key={seg.stageId}
                className="inline-block align-baseline"
                animate={isShake ? { x: [0, -7, 7, -5, 5, 0] } : { x: 0 }}
                transition={{ duration: 0.45 }}
              >
                <button
                  type="button"
                  disabled={solved}
                  onClick={() => openFor(seg.stageId)}
                  className={cn(
                    "mx-0.5 inline-flex min-h-8 min-w-[2.5rem] items-center justify-center rounded-sm border-b-2 px-1 align-baseline transition-colors",
                    solved
                      ? "cursor-default border-[#22487a]/55 text-[#22487a]"
                      : "border-[#8a7d6d]/55 border-dashed text-[#1f1a14] hover:bg-black/[0.03]"
                  )}
                  aria-label={`${seg.ariaPlain} ${solved ? `確定: ${cleared[seg.stageId]}` : "タップして入力"}`}
                >
                  {solved ? cleared[seg.stageId] : seg.placeholder}
                </button>
              </motion.span>
            )
          })}

          {showFinal ? (
            <>
              <span className="mt-6 block whitespace-pre-wrap font-[family-name:var(--font-mincho-title)] text-[0.88rem] text-[#1f1a14]">
                {"差出人："}
              </span>
              <motion.span className="inline-block align-baseline" animate={{ opacity: 1 }}>
                <button
                  type="button"
                  disabled={Boolean(cleared[LETTER_FINAL_BLOCK.stageId])}
                  onClick={() => openFor(LETTER_FINAL_BLOCK.stageId)}
                  className={cn(
                    "mx-0.5 inline-flex min-h-8 min-w-[3rem] items-center justify-center rounded-sm border-b-2 px-1 align-baseline",
                    cleared[LETTER_FINAL_BLOCK.stageId]
                      ? "border-[#22487a]/55 text-[#22487a]"
                      : "border-[#7a2317]/45 border-dashed text-[#1f1a14]"
                  )}
                  aria-label={`${LETTER_FINAL_BLOCK.ariaPlain} ${cleared[LETTER_FINAL_BLOCK.stageId] ? `確定: ${cleared[LETTER_FINAL_BLOCK.stageId]}` : ""}`}
                >
                  {cleared[LETTER_FINAL_BLOCK.stageId] ?? "　　　"}
                </button>
              </motion.span>
              <span
                className={cn(
                  "mt-4 block whitespace-pre-wrap font-[family-name:var(--font-mincho-title)] text-[0.88rem] transition-opacity duration-1000",
                  allDone ? "opacity-100 text-[#22487a]" : "opacity-0"
                )}
              >
                宛先：みーちゃんへ
              </span>
            </>
          ) : null}
        </div>
      </article>

      <Dialog open={Boolean(activeStage)} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="border-[#c9bdad] bg-[#faf6ef] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-[family-name:var(--font-mincho-title)] text-[#2a231c]">空欄に入力</DialogTitle>
            <DialogDescription className="text-[#5c5348]">
              {activeStage
                ? (() => {
                    const n = wrongByStage[activeStage] ?? 0
                    if (activeStage === LETTER_FINAL_BLOCK.stageId) {
                      return n >= 3 ? LETTER_FINAL_BLOCK.strongHint : LETTER_FINAL_BLOCK.hint
                    }
                    const seg = LETTER_SEGMENTS.find(
                      (s): s is Extract<LetterSegment, { kind: "blank" }> =>
                        s.kind === "blank" && s.stageId === activeStage
                    )
                    if (!seg) return null
                    return n >= 3 ? seg.strongHint : seg.hint
                  })()
                : null}
            </DialogDescription>
          </DialogHeader>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit()
            }}
            autoComplete="off"
            className="w-full rounded-md border border-[#c9bdad] bg-white px-3 py-2.5 text-[#1f1a14] outline-none focus:border-[#8a7d6d]"
            style={{ fontFamily: "var(--font-handwriting)" }}
            aria-label="解答入力"
          />
          {dialogError ? (
            <p className="text-sm text-[#7a2317]" role="alert">
              {dialogError}
            </p>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              className="rounded-md border border-[#c9bdad] px-4 py-2 text-sm text-[#3d3429]"
              onClick={closeDialog}
            >
              閉じる
            </button>
            <button
              type="button"
              disabled={submitting || !draft.trim()}
              className="rounded-md bg-[#3d3429] px-4 py-2 text-sm text-[#f5f0e8] disabled:opacity-45"
              onClick={() => void submit()}
            >
              {submitting ? "確認中…" : "確定"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
