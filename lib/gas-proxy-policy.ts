/**
 * `/api/gas` が GAS へ転送してよい action。
 * 公式サイトと作品アプリで同じ中身にする。ここを変えるときは両方を揃える。
 */
export const GAS_PROXY_ALLOWED_ACTIONS = [
  "auth",
  "setupAccount",
  "loginAccount",
  "saveProgress",
  "publicGetWorksCatalog",
  "publicGetNews",
  "changeLoginId",
  "changeAccountEmail",
  "changeAccountPassword",
  "resetInvestigatorProgress",
] as const

export type GasProxyAllowedAction = (typeof GAS_PROXY_ALLOWED_ACTIONS)[number]

const ALLOWED = new Set<string>(GAS_PROXY_ALLOWED_ACTIONS)

/** スプレッドシートのロックを取る action。中継 25 秒、クライアント 30 秒。 */
const LOCK_ACTIONS = new Set<string>([
  "auth",
  "setupAccount",
  "loginAccount",
  "saveProgress",
  "changeLoginId",
  "changeAccountEmail",
  "changeAccountPassword",
  "resetInvestigatorProgress",
])

/** 読み取り。中継 10 秒、クライアント 12 秒。 */
const READ_ACTIONS = new Set<string>(["publicGetWorksCatalog", "publicGetNews"])

export const GAS_PROXY_BODY_LIMIT_BYTES = 64 * 1024

export const GAS_PROXY_LOCK_TIMEOUT_MS = 25_000
export const GAS_PROXY_READ_TIMEOUT_MS = 10_000
export const GAS_CLIENT_LOCK_TIMEOUT_MS = 30_000
export const GAS_CLIENT_READ_TIMEOUT_MS = 12_000

export function isGasProxyAllowedAction(action: string): action is GasProxyAllowedAction {
  return ALLOWED.has(action)
}

/** 中継が GAS を待つ時間。許可外は null（転送しない）。 */
export function gasProxyRelayTimeoutMs(action: string): number | null {
  if (READ_ACTIONS.has(action)) return GAS_PROXY_READ_TIMEOUT_MS
  if (LOCK_ACTIONS.has(action)) return GAS_PROXY_LOCK_TIMEOUT_MS
  return null
}

/** クライアントの待ち。中継より長くする。許可外はロック系と同じ 30 秒（中継は即 4xx）。 */
export function gasClientTimeoutMs(action: string): number {
  if (READ_ACTIONS.has(action)) return GAS_CLIENT_READ_TIMEOUT_MS
  return GAS_CLIENT_LOCK_TIMEOUT_MS
}

export type GasProxyForwardDecision =
  | { ok: true; action: GasProxyAllowedAction; timeoutMs: number; body: string }
  | { ok: false; status: number; message: string }

/**
 * 本文を転送してよいか判定する。許可外は ok: false（4xx）で、呼び出し側は GAS へ送らない。
 */
export function decideGasProxyForward(rawBody: string): GasProxyForwardDecision {
  const bytes = new TextEncoder().encode(rawBody).byteLength
  if (bytes > GAS_PROXY_BODY_LIMIT_BYTES) {
    return { ok: false, status: 413, message: "リクエスト本文が大きすぎます。" }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawBody)
  } catch {
    return { ok: false, status: 400, message: "JSON として読めません。" }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, status: 400, message: "JSON オブジェクトが必要です。" }
  }

  const action = (parsed as { action?: unknown }).action
  if (typeof action !== "string" || action.length === 0) {
    return { ok: false, status: 400, message: "action がありません。" }
  }

  if (!isGasProxyAllowedAction(action)) {
    return { ok: false, status: 403, message: "この action は中継できません。" }
  }

  const timeoutMs = gasProxyRelayTimeoutMs(action)
  if (timeoutMs == null) {
    return { ok: false, status: 403, message: "この action は中継できません。" }
  }

  return { ok: true, action, timeoutMs, body: rawBody }
}
