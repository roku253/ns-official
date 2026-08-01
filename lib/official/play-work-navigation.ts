"use client"

import storiesJson from "@/data/official/stories.json"
import { navigateWithOfficialLeaveLoader } from "@/lib/official/show-official-leave-loader"
import { resolveWorkPlayUrl } from "@/lib/official/work-play-urls"
import { LS_ACCOUNT } from "@/lib/storage-keys"
import type { PlayEntranceMeta } from "@/lib/official/play-load-handoff"

function entranceMetaForCase(caseId: string): PlayEntranceMeta {
  const rows = storiesJson as Array<{
    id?: string
    title?: string
    tagline?: string
    coverImage?: string
  }>
  const s = rows.find((x) => (x.id || "").trim() === caseId)
  return {
    title: (s?.title || caseId).trim() || "作品",
    tagline: (s?.tagline || "").trim() || undefined,
    coverImage: (s?.coverImage || "").trim() || undefined,
  }
}

/**
 * 選択作品の case_id を保存してプレイ先へ遷移。
 * 公式で％ロード完了 → 作品側はタイトル／カバー入場。
 */
export function setActiveWorkAndOpenPortal(caseId: string, playUrl?: string | null) {
  if (typeof window === "undefined") return
  const id = (caseId || "").trim()
  if (!id) return
  window.localStorage.setItem(LS_ACCOUNT.CASE_ID, id)
  const entrance = entranceMetaForCase(id)
  const url = resolveWorkPlayUrl(id, playUrl)
  if (url) {
    navigateWithOfficialLeaveLoader(url, { entrance })
    return
  }
  navigateWithOfficialLeaveLoader("/works/" + encodeURIComponent(id), { entrance })
}

/** 続きから等: case_id は既に保存済みのとき */
export function openPlayEntry(caseId: string, playUrl?: string | null) {
  if (typeof window === "undefined") return
  const id = (caseId || "").trim()
  if (!id) return
  const entrance = entranceMetaForCase(id)
  const url = resolveWorkPlayUrl(id, playUrl)
  if (url) {
    navigateWithOfficialLeaveLoader(url, { entrance })
    return
  }
  navigateWithOfficialLeaveLoader("/works/" + encodeURIComponent(id), { entrance })
}
