/** キーワード照合用のゆるい正規化（全角半角・大小・前後空白） */
export function normalizeKeywordAnswer(raw: string): string {
  return String(raw || "")
    .trim()
    .normalize("NFKC")
    .toLowerCase()
}
