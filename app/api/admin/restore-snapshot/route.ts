import { NextRequest, NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { postGasAdmin } from "@/lib/admin-gas-server"
import { isAdminBackupAllowed } from "@/lib/admin-backup-allowed"

export async function POST(req: NextRequest) {
  if (!isAdminBackupAllowed()) {
    return NextResponse.json(
      {
        success: false,
        message:
          "復元 API は無効です。next dev か ENABLE_ADMIN_BACKUP_TOOLS=true を設定してください。",
      },
      { status: 403 }
    )
  }
  if (!verifyAdminSession(req)) {
    return NextResponse.json({ success: false, message: "認証が必要です。" }, { status: 401 })
  }

  let body: { targetLoginId?: string; snapshotId?: string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, message: "不正な JSON です。" }, { status: 400 })
  }

  const targetLoginId = String(body.targetLoginId || "").trim()
  const snapshotId = String(body.snapshotId || "").trim()
  if (!targetLoginId || !snapshotId) {
    return NextResponse.json(
      { success: false, message: "targetLoginId と snapshotId が必要です。" },
      { status: 400 }
    )
  }

  const { ok, status, data } = await postGasAdmin({
    action: "adminRestoreProgressSnapshot",
    targetLoginId,
    snapshotId,
  })

  if (!ok || data.success !== true) {
    return NextResponse.json(
      { success: false, message: String(data.message || "復元に失敗しました。") },
      { status: ok ? 400 : status }
    )
  }

  return NextResponse.json(data)
}
