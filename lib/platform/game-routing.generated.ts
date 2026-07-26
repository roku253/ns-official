/* eslint-disable */
/** AUTO-GENERATED — do not edit. Regenerate: npm run generate:games */
export const DEFAULT_CASE_ID = "koko-ni-iru"

export const PUBLIC_GAME_ID_TO_CASE_ID: Record<string, string> = {
  "kieta_shounen": "koko-ni-iru",
  "kieta-shounen": "koko-ni-iru",
  "koko_ni_iru": "koko-ni-iru",
  "koko-ni-iru": "koko-ni-iru",
  "signal_trace": "koko-ni-iru",
  "signal-trace": "koko-ni-iru",
}

export function resolveCaseIdForPublicGameId(gameId: string, caseIdOverride?: string): string {
  const o = (caseIdOverride || "").trim()
  if (o) return o
  const g = (gameId || "").trim().toLowerCase()
  return PUBLIC_GAME_ID_TO_CASE_ID[g] ?? DEFAULT_CASE_ID
}

/** manifest の case_id → games/<フォルダ>（静的配信・/play のスラッグ） */
export const CASE_ID_TO_ENGINE_PACKAGE: Record<string, string> = {
  "koko-ni-iru": "signal-trace",
}

/** signal-trace 系案件（任務ポータル作品。プレイ先は catalog.externalUrl） */
export const SIGNAL_TRACE_CASE_IDS = ["koko-ni-iru"] as readonly string[]

export function usesMissionPortal(caseId: string): boolean {
  const id = (caseId || "").trim()
  return SIGNAL_TRACE_CASE_IDS.includes(id)
}

/** プレイ先未設定時のフォールバック（作品詳細）。本番プレイは externalUrl を使う */
export function playEntryPathForCase(caseId: string): string {
  const id = (caseId || "").trim()
  if (!id) return "/"
  return "/works/" + encodeURIComponent(id)
}
