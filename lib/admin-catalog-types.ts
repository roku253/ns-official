/**
 * 運営コンソールのゲーム／ストーリー対応（型のみ）。
 * 実データは admin-game-catalog.generated から供給。
 */

export type AdminGameStory = {
  caseId: string
  title: string
}

export type AdminGameDefinition = {
  id: string
  title: string
  stories: AdminGameStory[]
  adminProgressView: "portal" | "minimal"
}
