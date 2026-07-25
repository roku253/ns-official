import type { NextRequest } from "next/server"
import { createHmac, timingSafeEqual } from "node:crypto"
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_HMAC_MESSAGE } from "@/lib/admin-session-constants"

export { ADMIN_SESSION_COOKIE }

export function adminSessionToken(): string {
  const k = process.env.ADMIN_PORTAL_KEY || ""
  if (!k) return ""
  return createHmac("sha256", k).update(ADMIN_SESSION_HMAC_MESSAGE).digest("hex")
}

export function verifyAdminSession(req: NextRequest): boolean {
  const cookieVal = req.cookies.get(ADMIN_SESSION_COOKIE)?.value
  const expected = adminSessionToken()
  if (!cookieVal || !expected) return false
  if (cookieVal.length !== expected.length) return false
  try {
    return timingSafeEqual(Buffer.from(cookieVal, "utf8"), Buffer.from(expected, "utf8"))
  } catch {
    return false
  }
}

export function timingSafePasswordEq(input: string, expected: string): boolean {
  if (input.length !== expected.length) return false
  try {
    return timingSafeEqual(Buffer.from(input, "utf8"), Buffer.from(expected, "utf8"))
  } catch {
    return false
  }
}
