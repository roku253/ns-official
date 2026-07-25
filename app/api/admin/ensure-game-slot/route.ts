import { NextRequest, NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { postGasAdmin } from "@/lib/admin-gas-server"

export async function POST(req: NextRequest) {
  if (!verifyAdminSession(req)) {
    return NextResponse.json({ success: false, message: "認証が必要です。" }, { status: 401 })
  }

  let body: { targetLoginId?: string; caseId?: string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, message: "不正な JSON です。" }, { status: 400 })
  }

  const targetLoginId = String(body.targetLoginId || "").trim()
  const caseId = String(body.caseId || "").trim()
  if (!targetLoginId || !caseId) {
    return NextResponse.json(
      { success: false, message: "targetLoginId と caseId が必要です。" },
      { status: 400 }
    )
  }

  const { ok, status, data } = await postGasAdmin({
    action: "adminEnsureGameProgressSlot",
    targetLoginId,
    caseId,
  })

  if (!ok || data.success !== true) {
    return NextResponse.json(
      { success: false, message: String(data.message || "追加に失敗しました。") },
      { status: ok ? 400 : status }
    )
  }

  return NextResponse.json(data)
}
