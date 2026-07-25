import { NextRequest, NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { postGasAdmin } from "@/lib/admin-gas-server"

export async function GET(req: NextRequest) {
  if (!verifyAdminSession(req)) {
    return NextResponse.json({ success: false, message: "認証が必要です。" }, { status: 401 })
  }

  const loginId = req.nextUrl.searchParams.get("loginId")?.trim() || ""
  if (!loginId) {
    return NextResponse.json({ success: false, message: "loginId が空です。" }, { status: 400 })
  }

  const targetCaseId = req.nextUrl.searchParams.get("caseId")?.trim() || ""

  const { ok, status, data } = await postGasAdmin({
    action: "adminGetProgress",
    targetLoginId: loginId,
    ...(targetCaseId ? { targetCaseId } : {}),
  })

  if (!ok || data.success !== true) {
    return NextResponse.json(
      { success: false, message: String(data.message || "取得に失敗しました。") },
      { status: ok ? 400 : status }
    )
  }

  return NextResponse.json(data)
}
