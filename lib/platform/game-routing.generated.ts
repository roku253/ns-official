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

/** signal-trace 系案件（別作品デプロイへ rewrite する対象） */
export const SIGNAL_TRACE_CASE_IDS = ["koko-ni-iru"] as readonly string[]

export function usesMissionPortal(caseId: string): boolean {
  const id = (caseId || "").trim()
  return SIGNAL_TRACE_CASE_IDS.includes(id)
}

/** 作品選択後の第一遷移先。signal-trace は /play/<caseId>（公式 rewrite → 作品アプリ） */
export function playEntryPathForCase(caseId: string): string {
  const id = (caseId || "").trim()
  if (!id) return "/"
  if (usesMissionPortal(id)) return "/play/" + encodeURIComponent(id)
  const engine = CASE_ID_TO_ENGINE_PACKAGE[id]
  return engine ? "/play/" + encodeURIComponent(engine) : "/"
}
