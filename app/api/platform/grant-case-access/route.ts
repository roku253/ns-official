import { NextRequest, NextResponse } from "next/server"
import { postGasPlayerServer } from "@/lib/platform/gas-player-server"

/**
 * 任務ポータルから呼ぶ「作品プレイ開始」の権利付与。
 * POST JSON: { loginId, masterToken, caseId, resources: string[] }
 */
export async function POST(req: NextRequest) {
  let body: { loginId?: string; masterToken?: string; caseId?: string; resources?: string[] }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ success: false, message: "JSON が不正です。" }, { status: 400 })
  }
  const loginId = typeof body.loginId === "string" ? body.loginId.trim() : ""
  const masterToken = typeof body.masterToken === "string" ? body.masterToken.trim() : ""
  const caseId = typeof body.caseId === "string" ? body.caseId.trim() : ""
  const resources = Array.isArray(body.resources)
    ? body.resources.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    : []
  if (!loginId || !masterToken || !caseId || resources.length === 0) {
    return NextResponse.json(
      { success: false, message: "loginId, masterToken, caseId, resources が必要です。" },
      { status: 400 }
    )
  }
  try {
    const res = (await postGasPlayerServer({
      action: "grantCaseAccess",
      loginId,
      masterToken,
      caseId,
      resources,
    })) as Record<string, unknown>
    return NextResponse.json(res)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (process.env.NODE_ENV === "development") {
      console.error("[grant-case-access]", msg)
    }
    return NextResponse.json({ success: false, message: msg }, { status: 502 })
  }
}
