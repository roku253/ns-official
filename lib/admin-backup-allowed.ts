/**
 * スナップショット一覧・手動バックアップ・復元（運営向け）。
 * 開発環境では常に可。本番では ENABLE_ADMIN_BACKUP_TOOLS=true のときのみ。
 * （進行のシミュレーション上書きは引き続き isDevToolsAllowed のみ）
 */
export function isAdminBackupAllowed(): boolean {
  if (process.env.NODE_ENV === "development") return true
  return process.env.ENABLE_ADMIN_BACKUP_TOOLS === "true"
}
