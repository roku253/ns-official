"use client"

import { navigateWithOfficialLeaveLoader } from "@/lib/official/show-official-leave-loader"
import { resolveWorkPlayUrl } from "@/lib/official/work-play-urls"
import { LS_ACCOUNT } from "@/lib/storage-keys"

/**
 * 選択作品の case_id を保存してプレイ先へ遷移。
 * プレイ先はカタログの externalUrl（コンソール「プレイ先 URL」）。未設定時は作品詳細へ。
 */
export function setActiveWorkAndOpenPortal(caseId: string, playUrl?: string | null) {
  if (typeof window === "undefined") return
  const id = (caseId || "").trim()
  if (!id) return
  window.localStorage.setItem(LS_ACCOUNT.CASE_ID, id)
  const url = resolveWorkPlayUrl(id, playUrl)
  if (url) {
    navigateWithOfficialLeaveLoader(url)
    return
  }
  navigateWithOfficialLeaveLoader("/works/" + encodeURIComponent(id))
}

/** 続きから等: case_id は既に保存済みのとき */
export function openPlayEntry(caseId: string, playUrl?: string | null) {
  if (typeof window === "undefined") return
  const id = (caseId || "").trim()
  if (!id) return
  const url = resolveWorkPlayUrl(id, playUrl)
  if (url) {
    navigateWithOfficialLeaveLoader(url)
    return
  }
  navigateWithOfficialLeaveLoader("/works/" + encodeURIComponent(id))
}
