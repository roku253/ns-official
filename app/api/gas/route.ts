import { NextRequest, NextResponse } from "next/server"
import { resolveGasWebAppUrl } from "@/lib/gas-url"

/**
 * ブラウザ → 同一オリジンのこのルート → GAS へ中継。
 * script.google.com への直接 fetch が「Failed to fetch」（CORS 等）になる環境向け。
 * URL は環境変数のみ（ハードコードの /exec フォールバックは置かない）。
 */
export async function POST(request: NextRequest) {
  const target = resolveGasWebAppUrl()
  if (!target) {
    return NextResponse.json(
      {
        success: false,
        message:
          "GAS URL が未設定です。GAS_WEBAPP_URL または NEXT_PUBLIC_GAS_URL を設定してください。",
      },
      { status: 500 }
    )
  }

  const body = await request.text()

  let upstream: Response
  try {
    upstream = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: body || "{}",
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      {
        success: false,
        message: `サーバーから GAS に接続できません: ${msg}。GAS_WEBAPP_URL または NEXT_PUBLIC_GAS_URL を確認してください。`,
      },
      { status: 502 }
    )
  }

  const text = await upstream.text()
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  })
}
