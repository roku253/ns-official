import { playEntryPathForCase } from "@/lib/platform/game-routing.generated"
import { LS_ACCOUNT } from "@/lib/storage-keys"

/**
 * 選択作品の case_id を保存して遷移。
 * - signal-trace（ここにいる等）→ `/play/<caseId>`（作品アプリへ rewrite）
 * - それ以外 → `/play/<enginePackage>`
 *
 * ※ rewrite 先は公式 Next アプリ内にルートが無いため、`<Link>` のソフト遷移だと 404 になる。
 *    必ず `location.assign`（または素の `<a href>`）でフルロードする。
 */
export function setActiveWorkAndOpenPortal(caseId: string) {
  if (typeof window === "undefined") return
  const id = (caseId || "").trim()
  if (!id) return
  window.localStorage.setItem(LS_ACCOUNT.CASE_ID, id)
  window.location.assign(playEntryPathForCase(id))
}

/** 続きから等: case_id は既に保存済みのとき */
export function openPlayEntry(caseId: string) {
  if (typeof window === "undefined") return
  const id = (caseId || "").trim()
  if (!id) return
  window.location.assign(playEntryPathForCase(id))
}
