/** 公式→作品の入場引き継ぎ（同一オリジン sessionStorage） */

export const SS_PLAY_LOAD_HANDOFF = "ns_play_load_handoff"

export type PlayEntranceMeta = {
  title: string
  tagline?: string
  /** basePath 無しのパス（例: /games/signal-trace/cover-….webp） */
  coverImage?: string
}

export type PlayLoadHandoff = PlayEntranceMeta & {
  phase: "enter-work"
  at: number
}

export function writePlayLoadHandoff(meta: PlayEntranceMeta) {
  if (typeof window === "undefined") return
  const payload: PlayLoadHandoff = {
    phase: "enter-work",
    title: (meta.title || "作品").trim() || "作品",
    tagline: meta.tagline?.trim() || undefined,
    coverImage: meta.coverImage?.trim() || undefined,
    at: Date.now(),
  }
  try {
    window.sessionStorage.setItem(SS_PLAY_LOAD_HANDOFF, JSON.stringify(payload))
  } catch {
    /* private mode 等 */
  }
}
