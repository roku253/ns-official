import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-session-constants"
import { adminSessionTokenEdge, timingSafeEqualUtf8 } from "@/lib/admin-session-edge"

/**
 * Next.js 16+: 旧 middleware は proxy に統合（両方あるとビルドエラー）。
 *
 * - `/games/*` … `public/games` 直叩きを抑止（同一 host の Referer のみ許可）。`/_template/` は緩和。
 * - `/admin/*` … 管理セッション（Cookie）検証。
 */
async function verifyAdminSessionEdge(req: NextRequest): Promise<boolean> {
  const secret = process.env.ADMIN_PORTAL_KEY || ""
  if (!secret) return false
  const cookieVal = req.cookies.get(ADMIN_SESSION_COOKIE)?.value
  if (!cookieVal) return false
  const expected = await adminSessionTokenEdge(secret)
  if (!expected) return false
  return timingSafeEqualUtf8(cookieVal, expected)
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith("/games/")) {
    if (!pathname.includes("/_template/")) {
      const referer = req.headers.get("referer") || ""
      const host = req.headers.get("host") || ""
      if (!host || !referer.includes(host)) {
        return new NextResponse("Not Found", { status: 404 })
      }
    }
    return NextResponse.next()
  }

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next()
  }

  const authed = await verifyAdminSessionEdge(req)

  if (pathname.startsWith("/admin/login")) {
    if (authed) {
      return NextResponse.redirect(new URL("/admin", req.url))
    }
    return NextResponse.next()
  }

  if (!authed) {
    const login = new URL("/admin/login", req.url)
    login.searchParams.set("next", pathname + (req.nextUrl.search || ""))
    return NextResponse.redirect(login)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/games/:path*", "/admin", "/admin/:path*"],
}
