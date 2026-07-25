import { NextRequest, NextResponse } from "next/server"
import {
  evaluateStageTextAnswer,
  persistProgressAfterCorrectAnswer,
  resolveCaseIdForGame,
} from "@/lib/platform/check-answer-core"

/**
 * 統合解答 API（iframe / 外部ゲーム向け）
 *
 * POST JSON:
 * - gameId, stageId, answer（必須）
 * - caseId（任意・既定は gameId から解決）
 * - loginId, password, persist（任意）— persist===true かつ正解時のみ GAS saveProgress
 */
export async function POST(req: NextRequest) {
  let body: {
    gameId?: string
    stageId?: string
    answer?: unknown
    caseId?: string
    loginId?: string
    password?: string
    persist?: boolean
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ ok: false, message: "JSON が不正です。" }, { status: 400 })
  }

  const gameId = typeof body.gameId === "string" ? body.gameId.trim() : ""
  const stageId = typeof body.stageId === "string" ? body.stageId.trim() : ""
  const answer = typeof body.answer === "string" ? body.answer : ""

  if (!gameId || !stageId) {
    return NextResponse.json(
      { ok: false, correct: false, message: "gameId と stageId が必要です。" },
      { status: 400 }
    )
  }

  const caseId = resolveCaseIdForGame(gameId, typeof body.caseId === "string" ? body.caseId : undefined)
  const ev = evaluateStageTextAnswer(caseId, stageId, answer)

  if (!ev.correct) {
    return NextResponse.json({
      ok: true,
      correct: false,
      flags: {},
      message: ev.error || "不正解です。",
    })
  }

  const persist =
    body.persist === true &&
    typeof body.loginId === "string" &&
    body.loginId.trim() &&
    typeof body.password === "string" &&
    body.password.length > 0

  if (persist) {
    const p = await persistProgressAfterCorrectAnswer(
      body.loginId!.trim(),
      body.password!,
      caseId,
      stageId,
      answer,
      ev.completionType
    )
    if (!p.ok) {
      return NextResponse.json({
        ok: true,
        correct: true,
        flags: {},
        persisted: false,
        message: `判定は正解ですが、進捗の保存に失敗しました: ${p.message || ""}`,
      })
    }
    return NextResponse.json({
      ok: true,
      correct: true,
      persisted: true,
      flags: { stageCleared: true },
    })
  }

  return NextResponse.json({
    ok: true,
    correct: true,
    persisted: false,
    flags: { stageCleared: true },
    message: "正解です。persist に認証情報を付けるとスプレッドシートへ自動保存します。",
  })
}
