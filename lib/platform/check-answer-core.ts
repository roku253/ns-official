import { resolveCaseIdForPublicGameId } from "@/lib/platform/game-routing.generated"

/**
 * 公式サイト側の解答 API。
 * 任務ポータル本体・タスクマスタは作品デプロイ側にあるため、ここでは判定しない。
 */
export function resolveCaseIdForGame(gameId: string, caseIdOverride?: string): string {
  return resolveCaseIdForPublicGameId(gameId, caseIdOverride)
}

export type StageEvaluation = {
  correct: boolean
  error?: string
  completionType?: string
}

export function evaluateStageTextAnswer(
  _caseId: string,
  _stageId: string,
  _answer: string
): StageEvaluation {
  return {
    correct: false,
    error:
      "公式サイトでは解答判定できません。作品プレイ画面（/play/<caseId> → 作品アプリ）から提出してください。",
  }
}

export async function persistProgressAfterCorrectAnswer(
  _loginId: string,
  _password: string,
  _caseId: string,
  _taskId: string,
  _answer: string,
  _completionType: string | undefined
): Promise<{ ok: boolean; message?: string }> {
  return {
    ok: false,
    message: "公式サイトでは進捗反映できません。作品アプリ側でセーブしてください。",
  }
}
