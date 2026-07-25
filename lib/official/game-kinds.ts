/** manifest `catalog.gameKind` と対応（フィルター UI 用） */
export const OFFICIAL_GAME_KIND_OPTIONS = [
  { id: "investigation", label: "調査・ミステリー" },
  { id: "escape", label: "脱出・閉鎖空間" },
  { id: "narrative", label: "物語・ADV" },
  { id: "demo", label: "デモ・検証" },
] as const

export type OfficialGameKindId = (typeof OFFICIAL_GAME_KIND_OPTIONS)[number]["id"]

export function labelForGameKind(kind: string | undefined | null): string {
  const k = (kind || "").trim()
  if (!k) return "種類未設定"
  const hit = OFFICIAL_GAME_KIND_OPTIONS.find((o) => o.id === k)
  return hit?.label ?? k
}
