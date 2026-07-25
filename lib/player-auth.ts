import "server-only"
import { resolveGasWebAppUrl } from "@/lib/gas-url"

/**
 * プレイヤー向け API（班長チャット等）のサーバー側認証とレート制限。
 *
 * 認証: loginId + masterToken を GAS の verifyMasterToken（読み取り専用）で照合。
 * 結果は短時間メモリキャッシュして GAS への往復を減らす。
 *
 * レート制限: プロセス内メモリの固定ウィンドウカウンタ。
 * サーバーレス環境ではインスタンスごとに独立するため厳密ではないが、
 * Claude API の連打・課金攻撃への実効的な抑止として機能する。
 */

const GAS_URL = resolveGasWebAppUrl()

const VERIFY_CACHE_TTL_MS = 10 * 60 * 1000
const VERIFY_TIMEOUT_MS = 10_000

type VerifyCacheEntry = { ok: boolean; expiresAt: number }
const verifyCache = new Map<string, VerifyCacheEntry>()

export type PlayerAuthResult =
  | { ok: true; loginId: string }
  | { ok: false; status: number; error: string }

/** loginId + masterToken を検証。失敗時は API レスポンスにそのまま使える status / error を返す */
export async function verifyPlayerAuth(
  loginIdRaw: unknown,
  masterTokenRaw: unknown
): Promise<PlayerAuthResult> {
  const loginId = typeof loginIdRaw === "string" ? loginIdRaw.trim() : ""
  const masterToken = typeof masterTokenRaw === "string" ? masterTokenRaw.trim() : ""
  if (!loginId || !masterToken) {
    return {
      ok: false,
      status: 401,
      error: "認証情報がありません。再ログインしてください。",
    }
  }
  if (!GAS_URL) {
    console.error("[player-auth] GAS_WEBAPP_URL / NEXT_PUBLIC_GAS_URL が未設定")
    return { ok: false, status: 500, error: "サーバー設定エラーです。" }
  }

  const cacheKey = `${loginId}::${masterToken}`
  const cached = verifyCache.get(cacheKey)
  const now = Date.now()
  if (cached && cached.expiresAt > now) {
    return cached.ok
      ? { ok: true, loginId }
      : { ok: false, status: 401, error: "認証に失敗しました。再ログインしてください。" }
  }

  let valid = false
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS)
    let res: Response
    try {
      res = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "verifyMasterToken", loginId, masterToken }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }
    const data = (await res.json()) as { valid?: boolean }
    valid = data.valid === true
  } catch (e) {
    console.error("[player-auth] verifyMasterToken 失敗", e)
    // GAS 側の一時障害で全プレイヤーを弾かないよう、検証不能時は 503 を返す
    return {
      ok: false,
      status: 503,
      error: "認証サーバーに接続できません。しばらくして再送してください。",
    }
  }

  // 失敗結果は短めにキャッシュ（総当たりの往復も抑える）
  verifyCache.set(cacheKey, {
    ok: valid,
    expiresAt: now + (valid ? VERIFY_CACHE_TTL_MS : 60_000),
  })
  if (verifyCache.size > 1000) {
    for (const [k, v] of verifyCache) {
      if (v.expiresAt <= now) verifyCache.delete(k)
    }
  }

  return valid
    ? { ok: true, loginId }
    : { ok: false, status: 401, error: "認証に失敗しました。再ログインしてください。" }
}

type RateBucket = { windowStart: number; count: number }
const rateBuckets = new Map<string, RateBucket>()

/**
 * 固定ウィンドウのレート制限。制限内なら true。
 * key はスコープ込みで渡す（例: "chat:login:xxx", "chat:ip:1.2.3.4"）。
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const bucket = rateBuckets.get(key)
  if (!bucket || now - bucket.windowStart >= windowMs) {
    rateBuckets.set(key, { windowStart: now, count: 1 })
    if (rateBuckets.size > 5000) {
      for (const [k, v] of rateBuckets) {
        if (now - v.windowStart >= windowMs) rateBuckets.delete(k)
      }
    }
    return true
  }
  bucket.count += 1
  return bucket.count <= limit
}

/** プロキシ経由を考慮したクライアント IP の取得（Vercel は x-forwarded-for 先頭） */
export function clientIpFromRequest(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) {
    const first = fwd.split(",")[0]?.trim()
    if (first) return first
  }
  return req.headers.get("x-real-ip") || "unknown"
}
