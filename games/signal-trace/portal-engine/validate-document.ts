import type { DocumentMatchRule } from "./types"

function normalizeForCompare(input: string, normalizeWhitespace: boolean): string {
  const normalized = input.replace(/\r\n?/g, "\n").trim()
  if (!normalizeWhitespace) return normalized
  return normalized.replace(/\s+/g, " ")
}

function foldCase(input: string, ignoreCase: boolean): string {
  return ignoreCase ? input.toLocaleLowerCase("ja-JP") : input
}

function matchRule(content: string, rule: DocumentMatchRule): boolean {
  if (rule.type === "exact") {
    const left = foldCase(normalizeForCompare(content, !!rule.normalizeWhitespace), !!rule.ignoreCase)
    const right = foldCase(normalizeForCompare(rule.expectedText, !!rule.normalizeWhitespace), !!rule.ignoreCase)
    return left === right
  }
  if (rule.type === "containsTerm") {
    const left = foldCase(content, !!rule.ignoreCase)
    const needle = foldCase(rule.term, !!rule.ignoreCase).trim()
    return needle.length > 0 && left.includes(needle)
  }
  const left = foldCase(normalizeForCompare(content, !!rule.normalizeWhitespace), !!rule.ignoreCase)
  const needle = foldCase(normalizeForCompare(rule.phrase, !!rule.normalizeWhitespace), !!rule.ignoreCase)
  return needle.length > 0 && left.includes(needle)
}

export function documentMatchesRules(
  rules: DocumentMatchRule[],
  mode: "all" | "any" | undefined,
  content: string
): { ok: true } | { ok: false; reason: string } {
  const m = mode ?? "all"
  if (rules.length === 0) return { ok: true }
  if (m === "any") {
    for (const rule of rules) {
      if (matchRule(content, rule)) return { ok: true }
    }
    return { ok: false, reason: "提出文書が条件を満たしていません（完全一致または必須語句を確認してください）。" }
  }
  for (const rule of rules) {
    if (matchRule(content, rule)) continue
    if (rule.type === "exact") return { ok: false, reason: "文書内容が指定テキストと一致しません。" }
    if (rule.type === "containsTerm") return { ok: false, reason: `必須用語「${rule.term}」が見つかりません。` }
    return { ok: false, reason: "指定フレーズが文書内に見つかりません。" }
  }
  return { ok: true }
}
