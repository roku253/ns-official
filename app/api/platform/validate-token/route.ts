import { NextRequest, NextResponse } from "next/server"
import { postGasPlayerServer } from "@/lib/platform/gas-player-server"

const corsJson = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })

/**
 * 外部サイト（GitHub Pages 等）から呼ぶトークン検証。CORS 全開。
 * POST JSON: { token, resourceKey?, consume? } — consume が false のときは使用回数を増やさない。
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}

export async function POST(req: NextRequest) {
  let body: { token?: string; resourceKey?: string; consume?: boolean }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return corsJson({ success: false, valid: false, message: "JSON が不正です。" }, 400)
  }

  const token = typeof body.token === "string" ? body.token.trim() : ""
  if (!token) {
    return corsJson({ success: false, valid: false, message: "token が必要です。" }, 400)
  }

  try {
    const res = (await postGasPlayerServer({
      action: "validateAccessToken",
      token,
      resourceKey: typeof body.resourceKey === "string" ? body.resourceKey.trim() : "",
      consume: body.consume === false ? false : true,
    })) as Record<string, unknown>

    return corsJson(res)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return corsJson({ success: false, valid: false, message: msg }, 502)
  }
}
