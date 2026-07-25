/** 調査報告タグの会話累積 */

export function mergeReportTagsCollected(
  previous: string[],
  thisTurn: string[]
): string[] {
  const set = new Set(previous.map((t) => t.trim()).filter(Boolean))
  for (const t of thisTurn) {
    const id = t.trim()
    if (id) set.add(id)
  }
  return [...set]
}

export function newlyCollectedReportTags(
  before: string[],
  after: string[]
): string[] {
  const prev = new Set(before)
  return after.filter((t) => !prev.has(t))
}
