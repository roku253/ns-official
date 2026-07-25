import { NextRequest, NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"

function gasUrl(): string {
  return (process.env.GAS_WEBAPP_URL || process.env.NEXT_PUBLIC_GAS_URL || "").trim()
}

function adminKey(): string {
  return process.env.ADMIN_PORTAL_KEY || ""
}

export async function GET(req: NextRequest) {
  if (!verifyAdminSession(req)) {
    return NextResponse.json({ success: false, message: "認証が必要です。" }, { status: 401 })
  }
  const key = adminKey()
  if (!key) {
    return NextResponse.json({ success: false, message: "ADMIN_PORTAL_KEY が未設定です。" }, { status: 503 })
  }
  const url = gasUrl()
  if (!url) {
    return NextResponse.json({ success: false, message: "GAS URL が未設定です。" }, { status: 503 })
  }
  let upstream: Response
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "adminGetNews", adminKey: key }),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ success: false, message: `GAS 接続エラー: ${msg}` }, { status: 502 })
  }
  const text = await upstream.text()
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  })
}

export async function POST(req: NextRequest) {
  if (!verifyAdminSession(req)) {
    return NextResponse.json({ success: false, message: "認証が必要です。" }, { status: 401 })
  }
  const key = adminKey()
  if (!key) {
    return NextResponse.json({ success: false, message: "ADMIN_PORTAL_KEY が未設定です。" }, { status: 503 })
  }
  const url = gasUrl()
  if (!url) {
    return NextResponse.json({ success: false, message: "GAS URL が未設定です。" }, { status: 503 })
  }
  let body: { news?: unknown }
  try {
    body = (await req.json()) as { news?: unknown }
  } catch {
    return NextResponse.json({ success: false, message: "JSON が不正です。" }, { status: 400 })
  }
  let upstream: Response
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "adminSetNews",
        adminKey: key,
        news: body.news ?? { items: [] },
      }),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ success: false, message: `GAS 接続エラー: ${msg}` }, { status: 502 })
  }
  const text = await upstream.text()
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  })
}
