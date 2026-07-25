/**
 * 運営コンソール用: 「大本の game」と「その中のストーリー（GAS の case_id）」の対応。
 * プレイヤー保存のキーは引き続き case_id（ストーリー単位）。game_id は UI・フィルタ用。
 *
 * エントリの正本: 各ゲームの cases/<caseId>/manifest.json（生成: npm run generate:games）
 */

import type { AdminGameDefinition, AdminGameStory } from "./admin-catalog-types"

export type { AdminGameDefinition, AdminGameStory }
import { ADMIN_GAME_CATALOG_GENERATED } from "./admin-game-catalog.generated"

export const UNCATEGORIZED_GAME_ID = "_uncategorized"

export const ADMIN_GAME_CATALOG: AdminGameDefinition[] = ADMIN_GAME_CATALOG_GENERATED

const storyIndex: Map<string, { game: AdminGameDefinition; story: AdminGameStory }> = new Map()
for (const game of ADMIN_GAME_CATALOG) {
  for (const story of game.stories) {
    storyIndex.set(story.caseId.trim(), { game, story })
  }
}

export function resolveStoryInCatalog(caseId: string): { game: AdminGameDefinition; story: AdminGameStory } | null {
  const id = (caseId || "").trim()
  if (!id) return null
  return storyIndex.get(id) ?? null
}

export function getAdminGame(gameId: string): AdminGameDefinition | undefined {
  const id = (gameId || "").trim()
  return ADMIN_GAME_CATALOG.find((g) => g.id === id)
}

/** ユーザー一覧のゲーム別フィルタ用 */
export function allStoryCaseIdsForGame(gameId: string): string[] {
  const g = getAdminGame(gameId)
  return g ? g.stories.map((s) => s.caseId) : []
}

export type AdminSaveSlot = {
  caseId: string
  gameId: string
  gameTitle: string
  storyTitle: string
  adminProgressView: "portal" | "minimal"
}

export function buildSaveSlotsForUser(
  loginId: string,
  primaryCaseId: string,
  gameProgressCaseIds: string[]
): AdminSaveSlot[] {
  const seen = new Set<string>()
  const ordered: string[] = []
  const push = (raw: string) => {
    const c = (raw || "").trim()
    if (!c || seen.has(c)) return
    seen.add(c)
    ordered.push(c)
  }
  push(primaryCaseId)
  for (const c of gameProgressCaseIds) push(c)

  const slots: AdminSaveSlot[] = ordered.map((caseId) => {
    const hit = resolveStoryInCatalog(caseId)
    if (hit) {
      return {
        caseId,
        gameId: hit.game.id,
        gameTitle: hit.game.title,
        storyTitle: hit.story.title,
        adminProgressView: hit.game.adminProgressView,
      }
    }
    return {
      caseId,
      gameId: UNCATEGORIZED_GAME_ID,
      gameTitle: "カタログ外（別タイトル用の ID など）",
      storyTitle: caseId,
      adminProgressView: "minimal",
    }
  })
  return slots
}
