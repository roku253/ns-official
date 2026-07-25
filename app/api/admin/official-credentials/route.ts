import { NextRequest, NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { postGasAdmin } from "@/lib/admin-gas-server"

export async function GET(req: NextRequest) {
  if (!verifyAdminSession(req)) {
    return NextResponse.json({ success: false, message: "認証が必要です。" }, { status: 401 })
  }

  const loginId = req.nextUrl.searchParams.get("loginId")?.trim() || ""

  const { ok, status, data } = await postGasAdmin({
    action: "adminListOfficialCredentials",
  })

  if (!ok || data.success !== true) {
    return NextResponse.json(
      { success: false, message: String(data.message || "取得に失敗しました。") },
      { status: ok ? 400 : status }
    )
  }

  const creds = (data.credentials as unknown[]) || []
  if (!loginId) {
    return NextResponse.json({ success: true, credentials: creds })
  }
  const filtered = creds.filter(
    (c) => typeof c === "object" && c !== null && String((c as { loginId?: string }).loginId || "") === loginId
  )
  return NextResponse.json({ success: true, credentials: filtered })
}

export async function POST(req: NextRequest) {
  if (!verifyAdminSession(req)) {
    return NextResponse.json({ success: false, message: "認証が必要です。" }, { status: 401 })
  }

  let body: {
    mode?: "upsert" | "delete"
    loginId?: string
    resourceKey?: string
    label?: string
    url?: string
    username?: string
    password?: string
    notes?: string
  } = {}

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, message: "不正な JSON です。" }, { status: 400 })
  }

  const mode = body.mode === "delete" ? "delete" : "upsert"

  if (mode === "delete") {
    const { ok, status, data } = await postGasAdmin({
      action: "adminDeleteOfficialCredential",
      loginId: String(body.loginId || "").trim(),
      resourceKey: String(body.resourceKey || "").trim(),
    })
    if (!ok || data.success !== true) {
      return NextResponse.json(
        { success: false, message: String(data.message || "削除に失敗しました。") },
        { status: ok ? 400 : status }
      )
    }
    return NextResponse.json(data)
  }

  const { ok, status, data } = await postGasAdmin({
    action: "adminUpsertOfficialCredential",
    loginId: String(body.loginId || "").trim(),
    resourceKey: String(body.resourceKey || "").trim(),
    label: body.label ?? "",
    url: body.url ?? "",
    username: body.username ?? "",
    password: body.password ?? "",
    notes: body.notes ?? "",
  })

  if (!ok || data.success !== true) {
    return NextResponse.json(
      { success: false, message: String(data.message || "保存に失敗しました。") },
      { status: ok ? 400 : status }
    )
  }

  return NextResponse.json(data)
}
