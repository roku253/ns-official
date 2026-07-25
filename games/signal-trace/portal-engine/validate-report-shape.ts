/** 調査報告の形式チェック（羅列・文数など） */

export interface ReportShapeResult {
  ok: boolean
  sentenceCount: number
  hasReason: boolean
  hasBoardMention: boolean
  isKeywordStuffing: boolean
  issues: string[]
}

const SENTENCE_SPLIT = /[。．！？\n]+/

const REASON_MARKERS = [
  "ので",
  "から",
  "ため",
  "理由",
  "と思",
  "と考",
  "ため、",
  "ので、",
  "から、",
  "によって",
  "により",
]

const BOARD_MARKERS = [
  "掲示板",
  "板",
  "スレ",
  "ログ",
  "書き込",
  "投稿",
  "レス",
  "スレッド",
]

function splitSentences(text: string): string[] {
  return text
    .split(SENTENCE_SPLIT)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2)
}

/** 短い句がカンマ・読点だけで並んでいる */
function looksLikeKeywordStuffing(text: string, sentences: string[]): boolean {
  if (sentences.length <= 1 && (text.match(/[、,]/g)?.length ?? 0) >= 2) {
    const parts = text.split(/[、,]/).map((p) => p.trim())
    if (parts.length >= 3 && parts.every((p) => p.length <= 12)) return true
  }
  if (sentences.length === 1 && text.length < 80) {
    const parts = text.split(/[、,\s]+/).filter(Boolean)
    if (parts.length >= 4 && parts.every((p) => p.length <= 8)) return true
  }
  return false
}

export function validateReportShape(text: string): ReportShapeResult {
  const trimmed = text.trim()
  const sentences = splitSentences(trimmed)
  const issues: string[] = []
  const hasReason = REASON_MARKERS.some((m) => trimmed.includes(m))
  const hasBoardMention = BOARD_MARKERS.some((m) => trimmed.includes(m))
  const isKeywordStuffing = looksLikeKeywordStuffing(trimmed, sentences)

  if (sentences.length < 2) {
    issues.push("sentence_count")
  }
  if (isKeywordStuffing) {
    issues.push("keyword_stuffing_shape")
  }

  const ok =
    sentences.length >= 2 &&
    !isKeywordStuffing &&
    (hasReason || hasBoardMention || sentences.length >= 3)

  return {
    ok,
    sentenceCount: sentences.length,
    hasReason,
    hasBoardMention,
    isKeywordStuffing,
    issues,
  }
}

export function splitReportSentences(text: string): string[] {
  return splitSentences(text)
}
