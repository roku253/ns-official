import { resolveGasWebAppUrl } from "@/lib/gas-url"

function gasDirectUrl(): string {
  const url = resolveGasWebAppUrl()
  if (!url) {
    throw new Error(
      "GAS URL が未設定です。.env.local に NEXT_PUBLIC_GAS_URL=（Webアプリの /exec）を設定し、dev を再起動してください。"
    )
  }
  return url
}

/** ブラウザでは同一オリジンの API 経由（CORS 回避）。サーバー／直指定デバッグ用は直 URL */
const USE_DIRECT =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_GAS_CLIENT_DIRECT === "true"

function postUrlForThisRuntime(): string {
  if (typeof window === "undefined") {
    return gasDirectUrl()
  }
  if (USE_DIRECT) {
    return gasDirectUrl()
  }
  return `${window.location.origin}/api/gas`
}

const GAS_FETCH_TIMEOUT_MS = 12_000

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GAS_FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * GAS Web アプリは application/json だと CORS プリフライトで失敗することがあるため、
 * text/plain で JSON 本文を送る（doPost の postData.contents はそのまま読める）。
 *
 * ブラウザからは既定で `/api/gas` に送り、Next サーバーが GAS へ中継する（Failed to fetch 対策）。
 */
export async function postGas<T extends Record<string, unknown>>(
  payload: Record<string, unknown>
): Promise<T> {
  const url = postUrlForThisRuntime()
  let response: Response
  try {
    response = await fetchWithTimeout(url, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    })
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError"
    const hint =
      typeof window !== "undefined" && window.location.protocol === "https:"
        ? "（https ページから http の GAS を叩けない場合は mixed content の制限の可能性）"
        : ""
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(
      aborted
        ? `GAS が ${GAS_FETCH_TIMEOUT_MS / 1000} 秒以内に応答しませんでした。`
        : `GAS に接続できません: ${msg}。${hint} .env.local に NEXT_PUBLIC_GAS_URL=（Webアプリの /exec）を設定し、dev を再起動してください。`
    )
  }

  const text = await response.text()
  if (!response.ok) {
    throw new Error(`GAS が HTTP ${response.status} を返しました: ${text.slice(0, 240)}`)
  }
  try {
    return JSON.parse(text) as T
  } catch {
    const isGasHtmlError =
      /<!DOCTYPE html/i.test(text) ||
      /<title>エラー<\/title>/i.test(text) ||
      /docs\/script/i.test(text)
    const htmlHint = isGasHtmlError
      ? " ← Google のエラー HTML です。Apps Script の doPost 内で例外が出ているか、スクリプトがスプレッドシートに紐づいていません。エディタで「実行」→ 実行ログを確認し、reference-code.gs.txt の doPost を貼り直してウェブアプリを再デプロイしてください。"
      : ""
    throw new Error(
      `GAS の応答が JSON ではありません (${response.status}): ${text.slice(0, 200)}${htmlHint}`
    )
  }
}

/**
 * タブ閉じ・遷移時のベストエフォート送信（fetch keepalive）。
 * 本文が大きいとブラウザ制限で落ちることがあるため、巨大な progress では使わない。
 */
export function postGasKeepalive(payload: Record<string, unknown>): void {
  if (typeof window === "undefined") return
  const body = JSON.stringify(payload)
  if (body.length > 55_000) return
  const url = postUrlForThisRuntime()
  void fetch(url, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body,
    keepalive: true,
  })
}
