import { ADMIN_SESSION_HMAC_MESSAGE } from "@/lib/admin-session-constants"

function hexFromBuffer(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let s = ""
  for (let i = 0; i < bytes.length; i++) {
    s += bytes[i].toString(16).padStart(2, "0")
  }
  return s
}

export async function adminSessionTokenEdge(secret: string): Promise<string> {
  if (!secret) return ""
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(ADMIN_SESSION_HMAC_MESSAGE))
  return hexFromBuffer(sig)
}

/** 長さが等しい前提で定数時間比較に近い XOR 比較 */
export function timingSafeEqualUtf8(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const enc = new TextEncoder()
  const ba = enc.encode(a)
  const bb = enc.encode(b)
  if (ba.length !== bb.length) return false
  let diff = 0
  for (let i = 0; i < ba.length; i++) {
    diff |= ba[i] ^ bb[i]
  }
  return diff === 0
}
