/** 開発者向けの進行書き換えなど。本番 build では既定で無効（next dev か明示フラグのみ） */
export function isDevToolsAllowed(): boolean {
  if (process.env.NODE_ENV === "development") return true
  return process.env.ENABLE_DEV_TOOLS === "true"
}
