import { NextRequest, NextResponse } from "next/server"
import { postGasPlayerServer } from "@/lib/platform/gas-player-server"

/**
 * ログイン済みプレイヤー向け: 外部サイト用アクセストークンを GAS 経由で発行する。
 * POST JSON: { loginId, password, caseId?, resourceKey, maxUses?, expiresAt? }
 */
export async function POST(req: NextRequest) {
  let body: {
    loginId?: string
    password?: string
    caseId?: string
    resourceKey?: string
    maxUses?: number
    expiresAt?: string
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ success: false, message: "JSON が不正です。" }, { status: 400 })
  }

  const loginId = typeof body.loginId === "string" ? body.loginId.trim() : ""
  const password = typeof body.password === "string" ? body.password : ""
  const resourceKey = typeof body.resourceKey === "string" ? body.resourceKey.trim() : ""

  if (!loginId || !password || !resourceKey) {
    return NextResponse.json(
      { success: false, message: "loginId, password, resourceKey が必要です。" },
      { status: 400 }
    )
  }

  try {
    const res = (await postGasPlayerServer({
      action: "issueAccessToken",
      loginId,
      password,
      caseId: typeof body.caseId === "string" ? body.caseId.trim() : undefined,
      resourceKey,
      maxUses: typeof body.maxUses === "number" ? body.maxUses : undefined,
      expiresAt: typeof body.expiresAt === "string" ? body.expiresAt : undefined,
    })) as { success?: boolean; message?: string; token?: string }

    return NextResponse.json(res)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ success: false, message: msg }, { status: 502 })
  }
}
