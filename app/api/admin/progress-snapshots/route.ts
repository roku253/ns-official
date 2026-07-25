import { NextRequest, NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { postGasAdmin } from "@/lib/admin-gas-server"
import { isAdminBackupAllowed } from "@/lib/admin-backup-allowed"

export async function GET(req: NextRequest) {
  if (!isAdminBackupAllowed()) {
    return NextResponse.json(
      {
        success: false,
        message:
          "スナップショット一覧は無効です。next dev か ENABLE_ADMIN_BACKUP_TOOLS=true を設定してください。",
      },
      { status: 403 }
    )
  }
  if (!verifyAdminSession(req)) {
    return NextResponse.json({ success: false, message: "認証が必要です。" }, { status: 401 })
  }

  const loginId = req.nextUrl.searchParams.get("loginId")?.trim() || ""
  if (!loginId) {
    return NextResponse.json({ success: false, message: "loginId が空です。" }, { status: 400 })
  }

  const limitRaw = req.nextUrl.searchParams.get("limit")
  const limit = limitRaw ? parseInt(limitRaw, 10) : 50

  const { ok, status, data } = await postGasAdmin({
    action: "adminListProgressSnapshots",
    targetLoginId: loginId,
    limit: Number.isFinite(limit) ? limit : 50,
  })

  if (!ok || data.success !== true) {
    return NextResponse.json(
      { success: false, message: String(data.message || "取得に失敗しました。") },
      { status: ok ? 400 : status }
    )
  }

  return NextResponse.json(data)
}
