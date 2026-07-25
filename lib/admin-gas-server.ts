/**
 * サーバー専用: 管理者キー付きで GAS doPost に JSON を送る
 */

export function getAdminGasConfig(): { adminKey: string; url: string } | { error: string } {
  const adminKey = process.env.ADMIN_PORTAL_KEY || ""
  const url = (process.env.GAS_WEBAPP_URL || process.env.NEXT_PUBLIC_GAS_URL || "").trim()
  if (!adminKey) return { error: "ADMIN_PORTAL_KEY が未設定です。" }
  if (!url) return { error: "GAS の URL が未設定です。" }
  return { adminKey, url }
}

export async function postGasAdmin(
  body: Record<string, unknown>
): Promise<{ ok: boolean; status: number; data: Record<string, unknown>; raw: string }> {
  const cfg = getAdminGasConfig()
  if ("error" in cfg) {
    return { ok: false, status: 503, data: { success: false, message: cfg.error }, raw: "" }
  }

  let res: Response
  try {
    res = await fetch(cfg.url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ ...body, adminKey: cfg.adminKey }),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return {
      ok: false,
      status: 502,
      data: { success: false, message: `GAS に接続できません: ${msg}` },
      raw: "",
    }
  }

  const raw = await res.text()
  let data: Record<string, unknown> = {}
  try {
    data = JSON.parse(raw) as Record<string, unknown>
  } catch {
    data = { success: false, message: "GAS の応答が JSON ではありません。", rawPreview: raw.slice(0, 200) }
  }
  return { ok: res.ok, status: res.status, data, raw }
}
