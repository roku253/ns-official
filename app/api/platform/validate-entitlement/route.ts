import { NextRequest, NextResponse } from "next/server"
import { postGasPlayerServer } from "@/lib/platform/gas-player-server"

const corsJson = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })

/**
 * 外部サイト（GitHub Pages 等）から呼ぶ「アカウント単位の権利確認」。
 * URL にトークンを載せず、外部サイトの localStorage に保存した
 * loginId + masterToken + caseId のみで認証する。
 * POST JSON: { loginId, masterToken, caseId, resourceKey }
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}

export async function POST(req: NextRequest) {
  let body: { loginId?: string; masterToken?: string; caseId?: string; resourceKey?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return corsJson({ success: false, valid: false, message: "JSON が不正です。" }, 400)
  }
  const loginId = typeof body.loginId === "string" ? body.loginId.trim() : ""
  const masterToken = typeof body.masterToken === "string" ? body.masterToken.trim() : ""
  const caseId = typeof body.caseId === "string" ? body.caseId.trim() : ""
  const resourceKey = typeof body.resourceKey === "string" ? body.resourceKey.trim() : ""
  if (!loginId || !masterToken || !caseId || !resourceKey) {
    return corsJson(
      { success: false, valid: false, message: "loginId, masterToken, caseId, resourceKey が必要です。" },
      400
    )
  }
  try {
    const res = (await postGasPlayerServer({
      action: "validateEntitlement",
      loginId,
      masterToken,
      caseId,
      resourceKey,
    })) as Record<string, unknown>
    return corsJson(res)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (process.env.NODE_ENV === "development") {
      console.error("[validate-entitlement]", msg)
    }
    return corsJson({ success: false, valid: false, message: msg }, 502)
  }
}
