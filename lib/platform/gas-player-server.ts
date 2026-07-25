/**
 * サーバー側からプレイヤー向け GAS doPost を呼ぶ（adminKey なし）
 */
const GAS_FETCH_TIMEOUT_MS = 90_000

function gasWebAppUrl(): string {
  const url = (process.env.GAS_WEBAPP_URL || process.env.NEXT_PUBLIC_GAS_URL || "").trim()
  if (!url) throw new Error("GAS_WEBAPP_URL または NEXT_PUBLIC_GAS_URL が未設定です。")
  return url
}

export async function postGasPlayerServer(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const url = gasWebAppUrl()
  const action = typeof body.action === "string" ? body.action : "?"
  let res: Response
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(GAS_FETCH_TIMEOUT_MS),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/abort|timeout/i.test(msg)) {
      throw new Error(
        `GAS が ${GAS_FETCH_TIMEOUT_MS / 1000} 秒以内に応答しませんでした（action=${action}）。同時に /api/gas など複数リクエストを送っていないか確認してください。`
      )
    }
    throw new Error(`GAS に接続できません（action=${action}）: ${msg}`)
  }

  const text = await res.text()
  if (!res.ok) {
    throw new Error(`GAS HTTP ${res.status}（action=${action}）: ${text.slice(0, 200)}`)
  }

  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    throw new Error(`GAS の応答が JSON ではありません（action=${action}, HTTP ${res.status}）: ${text.slice(0, 200)}`)
  }
}
