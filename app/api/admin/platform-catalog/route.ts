import { NextRequest, NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"

function gasUrl(): string {
  return (process.env.GAS_WEBAPP_URL || process.env.NEXT_PUBLIC_GAS_URL || "").trim()
}

export async function GET(req: NextRequest) {
  if (!verifyAdminSession(req)) {
    return NextResponse.json({ success: false, message: "認証が必要です。" }, { status: 401 })
  }
  const adminKey = process.env.ADMIN_PORTAL_KEY || ""
  if (!adminKey) {
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
      body: JSON.stringify({ action: "adminGetWorksCatalog", adminKey }),
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
  const adminKey = process.env.ADMIN_PORTAL_KEY || ""
  if (!adminKey) {
    return NextResponse.json({ success: false, message: "ADMIN_PORTAL_KEY が未設定です。" }, { status: 503 })
  }
  const url = gasUrl()
  if (!url) {
    return NextResponse.json({ success: false, message: "GAS URL が未設定です。" }, { status: 503 })
  }
  let body: { catalog?: unknown }
  try {
    body = (await req.json()) as { catalog?: unknown }
  } catch {
    return NextResponse.json({ success: false, message: "JSON が不正です。" }, { status: 400 })
  }
  let upstream: Response
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "adminSetWorksCatalog",
        adminKey,
        catalog: body.catalog ?? {},
      }),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ success: false, message: `GAS 接続エラー: ${msg}` }, { status: 502 })
  }
  const text = await upstream.text()
  try {
    const { invalidatePlayBindingCache } = await import("@/lib/official/play-bindings")
    invalidatePlayBindingCache()
  } catch {
    /* ignore */
  }
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  })
}
