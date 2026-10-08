import { NextRequest, NextResponse } from "next/server"
import { resolveGasWebAppUrl } from "@/lib/gas-url"
import {
  GAS_PROXY_BODY_LIMIT_BYTES,
  decideGasProxyForward,
} from "@/lib/gas-proxy-policy"

/**
 * ロック系 action は GAS を最大 25 秒待つ。
 * Vercel Hobby の関数上限は Fluid ありで 300 秒、なしでも 60 秒なので 25 は収まる。
 */
export const maxDuration = 25

/**
 * ブラウザ → 同一オリジンのこのルート → 許可された action だけ GAS へ中継。
 * script.google.com への直接 fetch が「Failed to fetch」（CORS 等）になる環境向け。
 * URL は環境変数のみ（ハードコードの /exec フォールバックは置かない）。
 */
export async function POST(request: NextRequest) {
  const body = await readBodyLimited(request)
  if (!body.ok) {
    return NextResponse.json({ success: false, message: body.message }, { status: body.status })
  }

  const decision = decideGasProxyForward(body.text)
  if (!decision.ok) {
    return NextResponse.json(
      { success: false, message: decision.message },
      { status: decision.status }
    )
  }

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

  let upstream: Response
  try {
    upstream = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: decision.body,
      signal: AbortSignal.timeout(decision.timeoutMs),
    })
  } catch (e) {
    if (isTimeoutError(e)) {
      return NextResponse.json(
        {
          success: false,
          message: `GAS が ${decision.timeoutMs / 1000} 秒以内に応答しませんでした。`,
        },
        { status: 504 }
      )
    }
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

async function readBodyLimited(
  request: NextRequest
): Promise<{ ok: true; text: string } | { ok: false; status: number; message: string }> {
  const declared = request.headers.get("content-length")
  if (declared != null && declared !== "") {
    const n = Number(declared)
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, status: 400, message: "Content-Length が不正です。" }
    }
    if (n > GAS_PROXY_BODY_LIMIT_BYTES) {
      return { ok: false, status: 413, message: "リクエスト本文が大きすぎます。" }
    }
  }

  const stream = request.body
  if (!stream) {
    return { ok: true, text: "" }
  }

  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value || value.byteLength === 0) continue
      total += value.byteLength
      if (total > GAS_PROXY_BODY_LIMIT_BYTES) {
        await reader.cancel().catch(() => undefined)
        return { ok: false, status: 413, message: "リクエスト本文が大きすぎます。" }
      }
      chunks.push(value)
    }
  } catch {
    return { ok: false, status: 400, message: "本文を読めません。" }
  }

  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return { ok: true, text: new TextDecoder().decode(merged) }
}

function isTimeoutError(e: unknown): boolean {
  if (!(e instanceof Error)) return false
  return e.name === "TimeoutError" || e.name === "AbortError"
}
