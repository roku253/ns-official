/**
 * GAS Web アプリ URL の単一解決。ハードコードの /exec は置かない（デプロイ取り違え・漏洩防止）。
 * クライアント: NEXT_PUBLIC_GAS_URL
 * サーバー: GAS_WEBAPP_URL があれば優先、なければ NEXT_PUBLIC_GAS_URL
 */
export function resolveGasWebAppUrl(): string {
  const serverOnly =
    typeof process !== "undefined" && typeof window === "undefined"
      ? (process.env.GAS_WEBAPP_URL || "").trim()
      : ""
  const pub =
    typeof process !== "undefined" ? (process.env.NEXT_PUBLIC_GAS_URL || "").trim() : ""
  return serverOnly || pub
}

export function requireGasWebAppUrl(): string {
  const url = resolveGasWebAppUrl()
  if (!url) {
    throw new Error(
      "GAS URL が未設定です。main-portal-next/.env.local に NEXT_PUBLIC_GAS_URL=（Webアプリの /exec）を設定してください。"
    )
  }
  return url
}
