"use client"

/** 作品 ID → プレイ先 URL（ブート時にカタログから温める） */
let playUrlsByCaseId: Record<string, string> = {}

export function rememberWorkPlayUrls(
  works: ReadonlyArray<{ id: string; externalUrl?: string | null }>
): void {
  const next: Record<string, string> = { ...playUrlsByCaseId }
  for (const w of works) {
    const id = (w.id || "").trim()
    if (!id) continue
    const url = (w.externalUrl || "").trim()
    if (url) next[id] = url
  }
  playUrlsByCaseId = next
}

/** 明示 URL があれば優先。なければキャッシュ／静的シード */
export function resolveWorkPlayUrl(caseId: string, explicit?: string | null): string | null {
  const e = (explicit || "").trim()
  if (e) return e
  const id = (caseId || "").trim()
  if (!id) return null
  const cached = (playUrlsByCaseId[id] || "").trim()
  return cached || null
}
