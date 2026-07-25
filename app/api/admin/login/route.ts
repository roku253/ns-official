import { NextRequest, NextResponse } from "next/server"
import { ADMIN_SESSION_COOKIE, adminSessionToken, timingSafePasswordEq } from "@/lib/admin-auth"

export async function POST(req: NextRequest) {
  const expected = process.env.ADMIN_PORTAL_KEY || ""
  if (!expected) {
    return NextResponse.json(
      { ok: false, message: "ADMIN_PORTAL_KEY が .env.local に設定されていません。" },
      { status: 503 }
    )
  }

  let body: { password?: string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, message: "不正なリクエストです。" }, { status: 400 })
  }

  const password = String(body.password ?? "")
  if (!timingSafePasswordEq(password, expected)) {
    return NextResponse.json({ ok: false, message: "キーが正しくありません。" }, { status: 401 })
  }

  const token = adminSessionToken()
  if (!token) {
    return NextResponse.json({ ok: false, message: "セッション生成に失敗しました。" }, { status: 500 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  })
  return res
}
