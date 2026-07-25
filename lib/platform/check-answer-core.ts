import { findTaskTemplateAll } from "@/lib/platform/case-task-lookup"
import { resolveCaseIdForPublicGameId } from "@/lib/platform/game-routing.generated"
import { keywordMatchesAnswers } from "@/games/signal-trace/portal-engine/validate-keyword"
import { getKeywordAnswers, runDocumentValidation } from "@/games/signal-trace/portal-engine/server/player-validation"
import type { CompletionPayload } from "@/games/signal-trace/portal-engine/task-completion"
import { applyTaskCompletion } from "@/games/signal-trace/portal-engine/task-completion"
import { mergeProgressTasksWithTemplates } from "@/games/signal-trace/portal-engine/bootstrap-tasks"
import { deserializeProgress, serializeProgressForGas } from "@/games/signal-trace/portal-engine/progress-json"
import { mergeHqBriefingFromGas, type GasHqBriefing } from "@/games/signal-trace/portal-engine/hq-briefing"
import type { ProgressState } from "@/lib/types"
import { postGasPlayerServer } from "@/lib/platform/gas-player-server"

/** 公開用 API 向け。manifest の publicGameIds から解決（生成: game-routing.generated） */
export function resolveCaseIdForGame(gameId: string, caseIdOverride?: string): string {
  return resolveCaseIdForPublicGameId(gameId, caseIdOverride)
}

export type StageEvaluation = {
  correct: boolean
  error?: string
  completionType?: string
}

/**
 * テキスト解答の正誤（キーワード・文書）。画像タスクは別 API。
 */
export function evaluateStageTextAnswer(
  caseId: string,
  stageId: string,
  answer: string
): StageEvaluation {
  const taskId = stageId.trim()
  if (!taskId) return { correct: false, error: "stageId が空です。" }

  const tpl = findTaskTemplateAll(caseId, taskId)
  if (!tpl) {
    return { correct: false, error: "タスクが見つかりません。" }
  }

  if (tpl.completionType === "photo" || tpl.completionType === "item") {
    return {
      correct: false,
      error: "このステージは画像照合です。/api/player/validate-photo を使うか、フォーム送信で提出してください。",
      completionType: tpl.completionType,
    }
  }

  if (tpl.completionType === "keyword") {
    const answers = getKeywordAnswers(caseId, taskId)
    if (!answers?.length) {
      return { correct: false, error: "キーワードマスタが未設定です。", completionType: "keyword" }
    }
    const ok = keywordMatchesAnswers(answers, answer)
    return ok
      ? { correct: true, completionType: "keyword" }
      : { correct: false, error: "キーワードが一致しません。", completionType: "keyword" }
  }

  if (tpl.completionType === "document") {
    const doc = runDocumentValidation(caseId, taskId, answer)
    if (doc.ok) return { correct: true, completionType: "document" }
    return { correct: false, error: doc.reason, completionType: "document" }
  }

  return {
    correct: false,
    error: "このタスク種別は check-answer のテキスト判定に未対応です。",
    completionType: tpl.completionType,
  }
}

export function buildCompletionPayload(completionType: string | undefined, answer: string): CompletionPayload {
  if (completionType === "document") return { documentText: answer }
  return { reportedKeyword: answer }
}

/**
 * 正解時に GAS の progress を読み、タスク完了を反映して saveProgress する。
 */
export async function persistProgressAfterCorrectAnswer(
  loginId: string,
  password: string,
  caseId: string,
  taskId: string,
  answer: string,
  completionType: string | undefined
): Promise<{ ok: boolean; message?: string }> {
  const loginRes = (await postGasPlayerServer({
    action: "loginAccount",
    loginId: loginId.trim(),
    password,
    caseId,
  })) as {
    success?: boolean
    message?: string
    progress?: unknown
    hqBriefing?: GasHqBriefing
  }

  if (!loginRes.success) {
    return { ok: false, message: loginRes.message || "loginAccount に失敗しました。" }
  }

  let state = mergeHqBriefingFromGas(
    deserializeProgress(loginRes.progress),
    loginRes.hqBriefing,
    caseId
  )
  state = {
    ...state,
    tasks: mergeProgressTasksWithTemplates(state.tasks, caseId),
  }

  const row = state.tasks.find((t) => t.id === taskId || t.templateId === taskId)
  if (row?.status === "completed") {
    return { ok: true }
  }

  const payload = buildCompletionPayload(completionType, answer)
  const applied = applyTaskCompletion(
    caseId,
    state.tasks,
    state.achievements,
    state.archiveItems,
    state.communications,
    taskId,
    payload
  )

  const nextState: ProgressState = {
    ...state,
    tasks: applied.tasks,
    achievements: applied.achievements,
    archiveItems: applied.archiveItems,
    communications: applied.communications,
  }

  const saveRes = (await postGasPlayerServer({
    action: "saveProgress",
    loginId: loginId.trim(),
    password,
    caseId,
    progress: serializeProgressForGas(nextState),
  })) as { success?: boolean; message?: string }

  if (!saveRes.success) {
    return { ok: false, message: saveRes.message || "saveProgress に失敗しました。" }
  }
  return { ok: true }
}
