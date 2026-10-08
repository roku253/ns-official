import { NextResponse } from "next/server"
import { postGasAdmin } from "@/lib/admin-gas-server"

export const runtime = "nodejs"

const WINDOW_MS = 60 * 60 * 1000
const MAX_PER_WINDOW = 5
const hits = new Map<string, number[]>()

type Body = {
  kind?: string
  email?: string
  message?: string
}

function clientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") || ""
  const ip = forwarded.split(",")[0]?.trim() || "local"
  return ip.slice(0, 80)
}

function allowed(key: string): boolean {
  const now = Date.now()
  const recent = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS)
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(key, recent)
    return false
  }
  recent.push(now)
  hits.set(key, recent)
  return true
}

export async function POST(req: Request) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ ok: false, error: "送信内容を読み取れませんでした。" }, { status: 400 })
  }

  const kind = body.kind === "withdrawal" ? "withdrawal" : body.kind === "inquiry" ? "inquiry" : ""
  const email = typeof body.email === "string" ? body.email.trim() : ""
  const message = typeof body.message === "string" ? body.message.trim() : ""
  if (!kind || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return NextResponse.json({ ok: false, error: "メールアドレスを確認してください。" }, { status: 400 })
  }
  if (message.length < 1 || message.length > 4000) {
    return NextResponse.json({ ok: false, error: "本文を入力してください。" }, { status: 400 })
  }

  const key = clientKey(req)
  if (!allowed(key)) {
    return NextResponse.json(
      { ok: false, error: "送信が続いています。しばらくしてからもう一度送ってください。" },
      { status: 429 }
    )
  }

  const gas = await postGasAdmin({
    action: "submitSiteInquiry",
    kind,
    email,
    message,
  })
  if (!gas.data.success) {
    return NextResponse.json(
      { ok: false, error: "送信できませんでした。時間をおいてもう一度送ってください。" },
      { status: 502 }
    )
  }
  return NextResponse.json({ ok: true })
}
