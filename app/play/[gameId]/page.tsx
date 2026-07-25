"use client"

import { Suspense, use, useEffect, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { LS_ACCOUNT, LS_SESSION } from "@/lib/storage-keys"
import { MoonlitDiaryGame } from "@/games/moonlit-script/play-ui/moonlit-diary-game"

function PlayFrame({ gameId }: { gameId: string }) {
  const searchParams = useSearchParams()
  const path = searchParams.get("path")?.trim() || ""
  const caseIdParam = searchParams.get("caseId")?.trim() || ""

  const iframeSrc = useMemo(() => {
    if (path && path.startsWith("/games/")) {
      const u = new URL(path, typeof window !== "undefined" ? window.location.origin : "http://localhost")
      u.searchParams.set("gameId", gameId)
      return u.pathname + u.search
    }
    return `/games/${encodeURIComponent(gameId)}/_template/index.html?gameId=${encodeURIComponent(gameId)}`
  }, [path, gameId])

  useEffect(() => {
    async function onMessage(ev: MessageEvent) {
      if (ev.origin !== window.location.origin) return
      const d = ev.data as { type?: string; gameId?: string; stageId?: string; answer?: string }
      if (!d || d.type !== "SUBMIT_ANSWER") return

      const loginId = window.localStorage.getItem(LS_ACCOUNT.LOGIN_ID)?.trim() || ""
      const password =
        window.sessionStorage.getItem(LS_SESSION.PASSWORD) ||
        window.localStorage.getItem(LS_ACCOUNT.PASSWORD) ||
        ""
      const caseId =
        caseIdParam || window.localStorage.getItem(LS_ACCOUNT.CASE_ID)?.trim() || undefined

      const res = await fetch("/api/platform/check-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: d.gameId || gameId,
          stageId: d.stageId,
          answer: typeof d.answer === "string" ? d.answer : "",
          caseId,
          loginId: loginId || undefined,
          password: password || undefined,
          persist: Boolean(loginId && password),
        }),
      })
      const json = (await res.json()) as {
        correct?: boolean
        message?: string
        persisted?: boolean
      }
      const source = ev.source as Window | null
      if (!source) return
      source.postMessage(
        {
          type: "CHECK_RESULT",
          correct: json.correct === true,
          message: json.message,
          persisted: json.persisted === true,
        },
        window.location.origin
      )
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [gameId, caseIdParam])

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2 text-sm">
        <span className="font-mono text-xs text-muted-foreground">play / {gameId}</span>
        <Link href="/" className="text-primary hover:underline">
          公式サイトへ
        </Link>
      </header>
      <iframe title="game" className="min-h-0 w-full flex-1 border-0 bg-black" src={iframeSrc} />
    </div>
  )
}

export default function PlayGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId: rawGameId } = use(params)
  const gameId = decodeURIComponent(rawGameId || "demo")
  return (
    <Suspense
      fallback={
        <div className="relative flex min-h-screen items-center justify-center bg-[#020303] font-mono">
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden
            style={{
              background: `radial-gradient(
                ellipse 80% 75% at 50% 50%,
                transparent 45%,
                rgba(0, 0, 0, 0.5) 78%,
                rgba(0, 0, 0, 0.9) 100%
              )`,
            }}
          />
          <p className="relative text-[10px] uppercase tracking-[0.55em] text-[#7f9cb8]/90">
            Loading…
          </p>
        </div>
      }
    >
      {gameId === "moonlit-script" ? <MoonlitDiaryGame gameId={gameId} /> : <PlayFrame gameId={gameId} />}
    </Suspense>
  )
}
