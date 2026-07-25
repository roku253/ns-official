/**
 * 任務ポータルから外部調査サイト（GitHub Pages 等）を開くときの認証橋渡し。
 *
 * 思想：URL に ?token= を載せない。
 * 1) ポータル起動時に grant-case-access で AccessTokens に
 *    (loginId, caseId, resourceKey) 行を作る（プレイ開始＝権利付与）。
 * 2) 外部サイトは自分の localStorage に
 *    ns_login_id / ns_master_token / ns_case_id を持ち、
 *    /api/platform/validate-entitlement で確認して表示する。
 * 3) localStorage が空の外部サイトは、opener へ postMessage で要求し
 *    本ファイルのリスナーが NS_AUTH_GRANT で返す。
 */
import { LS_ACCOUNT } from "@/lib/storage-keys"
import { DEFAULT_CASE_ID } from "@/games/signal-trace/portal-engine/registry"

/** 子ページの postMessage がこの origin から来ることだけ許可する */
const ALLOWED_CHILD_ORIGINS = new Set<string>(["https://roku253.github.io"])

const MSG_AUTH_REQUEST = "NS_AUTH_REQUEST"
const MSG_AUTH_GRANT = "NS_AUTH_GRANT"

type AuthRequestMessage = { type: typeof MSG_AUTH_REQUEST; resourceKey?: string }

function normalizeExternalHref(href: string): string {
  const t = href.trim()
  if (!t) return t
  try {
    const u = new URL(t)
    u.searchParams.delete("token")
    return u.toString()
  } catch {
    return t.replace(/([?&])token=[^&]*&?/g, "$1").replace(/\?$/, "")
  }
}

/**
 * 公開調査URL → AccessTokens の resource_key（GAS と外部サイトの __TOKEN_RESOURCE_KEY__ と一致させる）。
 * koko-ni-iru で使う全ての外部サイトを列挙しておくと、プレイ開始時に一括 grant できる。
 */
export const KOKO_NI_IRU_EXTERNAL_RESOURCES = [
  "ext:urban-legend-board",
  "ext:kasuminomori",
  "ext:kasuminomori-shougakkou",
  "ext:yootube:kasuminomori-pr",
  "ext:yootube",
  "ext:gougle-map",
  /* "ext:name-to-coord" は v3 で廃止（サイトは公開終了ページ化済み） */
] as const

export function getResourceKeyForExternalUrl(href: string): string | null {
  let u: URL
  try {
    u = new URL(href.trim())
  } catch {
    return null
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null
  const host = u.hostname.toLowerCase()
  const path = u.pathname.toLowerCase()

  if (host === "roku253.github.io") {
    if (path.includes("/kasuminomori-shougakkou")) return "ext:kasuminomori-shougakkou"
    if (path.includes("/urban-legend-board")) return "ext:urban-legend-board"
    if (path.includes("/kasuminomori")) return "ext:kasuminomori"
    if (path.includes("/yootube")) return "ext:yootube:kasuminomori-pr"
    if (path.includes("/gougle-map")) return "ext:gougle-map"
  }
  return null
}

function getCurrentLoginId(): string {
  if (typeof window === "undefined") return ""
  return window.localStorage.getItem(LS_ACCOUNT.LOGIN_ID)?.trim() || ""
}

function getCurrentMasterToken(): string {
  if (typeof window === "undefined") return ""
  return window.localStorage.getItem(LS_ACCOUNT.MASTER_TOKEN)?.trim() || ""
}

function getCurrentCaseId(): string {
  if (typeof window === "undefined") return DEFAULT_CASE_ID
  return window.localStorage.getItem(LS_ACCOUNT.CASE_ID)?.trim() || DEFAULT_CASE_ID
}

const SS_ENTITLEMENT_GRANT_DONE = "ns_entitlement_grant_done_v1"

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function postPlatformJson(
  path: string,
  body: Record<string, unknown>,
  opts?: { retries?: number }
): Promise<{ ok: boolean; status: number; message?: string }> {
  const retries = opts?.retries ?? 0
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = (await res.json()) as { success?: boolean; message?: string }
      if (res.ok && data.success) {
        return { ok: true, status: res.status }
      }
      const message =
        typeof data.message === "string" ? data.message : `HTTP ${res.status}`
      if (res.status === 502 && attempt < retries) {
        await sleep(2500)
        continue
      }
      if (process.env.NODE_ENV === "development") {
        console.warn(`[portal-entitlement] ${path} failed:`, message)
      }
      return { ok: false, status: res.status, message }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      if (attempt < retries) {
        await sleep(2500)
        continue
      }
      if (process.env.NODE_ENV === "development") {
        console.warn(`[portal-entitlement] ${path} error:`, message)
      }
      return { ok: false, status: 0, message }
    }
  }
  return { ok: false, status: 0 }
}

/**
 * 「作品をプレイ開始した」タイミングで、案件×アカウント単位の権利を一括付与する。
 * 既に登録済みのリソースキーはスキップされる。
 */
export async function grantCaseAccessForCurrentAccount(resources: readonly string[]): Promise<boolean> {
  const loginId = getCurrentLoginId()
  const masterToken = getCurrentMasterToken()
  const caseId = getCurrentCaseId()
  if (!loginId || !masterToken || !caseId || resources.length === 0) return false
  const r = await postPlatformJson(
    "/api/platform/grant-case-access",
    { loginId, masterToken, caseId, resources },
    { retries: 2 }
  )
  return r.ok
}

/**
 * /portal を開いたタイミングで、Vercel と GAS をあらかじめ一度叩いて温めておく。
 * これをやることで、外部サイトに飛んだ最初の 1 回のレイテンシが大幅に下がる。
 * 失敗しても何もしない（任意の最適化なので）。
 */
export async function prewarmEntitlementEndpoint(resources: readonly string[]): Promise<void> {
  const loginId = getCurrentLoginId()
  const masterToken = getCurrentMasterToken()
  const caseId = getCurrentCaseId()
  if (!loginId || !masterToken || !caseId || resources.length === 0) return
  const resourceKey = resources[0]
  await postPlatformJson(
    "/api/platform/validate-entitlement",
    { loginId, masterToken, caseId, resourceKey },
    { retries: 1 }
  )
}

/**
 * 任務ポータル起動時: 進行同期（/api/gas）と競合しないよう grant → prewarm を直列化。
 * 同一タブで成功済みなら grant をスキップ（GET /portal のたびに GAS を叩かない）。
 */
export async function syncPortalExternalEntitlements(
  caseId: string,
  resources: readonly string[]
): Promise<void> {
  if (typeof window === "undefined" || caseId !== "koko-ni-iru" || resources.length === 0) return
  const loginId = getCurrentLoginId()
  const masterToken = getCurrentMasterToken()
  if (!loginId || !masterToken) return

  const grantKey = `${SS_ENTITLEMENT_GRANT_DONE}:${loginId}:${caseId}`
  await sleep(2000)

  if (window.sessionStorage.getItem(grantKey) !== "1") {
    const ok = await grantCaseAccessForCurrentAccount(resources)
    if (ok) window.sessionStorage.setItem(grantKey, "1")
  }

  await prewarmEntitlementEndpoint(resources)
}

let bridgeInstalled = false

/**
 * 外部子ウィンドウからのアカウント要求に応答するリスナーを1回だけ登録する。
 * URL にトークンを載せず、postMessage で loginId/masterToken/caseId を渡す。
 */
export function installPortalExternalAuthListener(): () => void {
  if (typeof window === "undefined" || bridgeInstalled) {
    return () => {}
  }
  bridgeInstalled = true

  const onMessage = (ev: MessageEvent) => {
    const data = ev.data as AuthRequestMessage | undefined
    if (!data || data.type !== MSG_AUTH_REQUEST) return
    if (!ALLOWED_CHILD_ORIGINS.has(ev.origin)) return
    const source = ev.source as Window | null
    if (!source || typeof source.postMessage !== "function") return

    const loginId = getCurrentLoginId()
    const masterToken = getCurrentMasterToken()
    const caseId = getCurrentCaseId()
    if (!loginId || !masterToken || !caseId) return

    try {
      source.postMessage(
        { type: MSG_AUTH_GRANT, loginId, masterToken, caseId },
        ev.origin
      )
    } catch {
      /* ignore */
    }
  }

  window.addEventListener("message", onMessage)
  return () => {
    window.removeEventListener("message", onMessage)
    bridgeInstalled = false
  }
}

/** トークンを URL に載せず、別タブで素のURLを開く */
export function openExternalInvestigationUrl(href: string): void {
  const clean = normalizeExternalHref(href)
  const key = getResourceKeyForExternalUrl(clean)
  if (!key) {
    window.open(clean, "_blank", "noopener,noreferrer")
    return
  }
  window.open(clean, "_blank")
}

/** 本文中の http(s) URL を検出（末尾の句読点は除外） */
export function splitTextByHttpUrls(text: string): ({ kind: "text"; value: string } | { kind: "url"; value: string })[] {
  const re = /https?:\/\/[^\s<>"'()]+/gi
  const out: ({ kind: "text"; value: string } | { kind: "url"; value: string })[] = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ kind: "text", value: text.slice(last, m.index) })
    let url = m[0]
    url = url.replace(/[),.;:]+$/g, "")
    out.push({ kind: "url", value: url })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ kind: "text", value: text.slice(last) })
  return out
}
