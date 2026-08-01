/** 公式→作品のローダー進捗引き継ぎ（同一オリジン sessionStorage） */

export const SS_PLAY_LOAD_HANDOFF = "ns_play_load_handoff"

export type PlayLoadHandoff = {
  progress: number
  statusLine?: string
  /** エポック ms。古い値は無視 */
  at: number
}

const MAX_AGE_MS = 60_000

function parseHandoff(raw: string | null): PlayLoadHandoff | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as PlayLoadHandoff
    if (!parsed || typeof parsed.progress !== "number") return null
    if (!Number.isFinite(parsed.at) || Date.now() - parsed.at > MAX_AGE_MS) return null
    return {
      progress: Math.min(90, Math.max(0, Math.round(parsed.progress))),
      statusLine: typeof parsed.statusLine === "string" ? parsed.statusLine : undefined,
      at: parsed.at,
    }
  } catch {
    return null
  }
}

export function writePlayLoadHandoff(progress: number, statusLine?: string) {
  if (typeof window === "undefined") return
  const payload: PlayLoadHandoff = {
    progress: Math.min(90, Math.max(0, Math.round(progress))),
    statusLine,
    at: Date.now(),
  }
  try {
    window.sessionStorage.setItem(SS_PLAY_LOAD_HANDOFF, JSON.stringify(payload))
  } catch {
    /* private mode 等 */
  }
}

/** 消費せず読む（初回描画のチラつき防止） */
export function peekPlayLoadHandoff(): PlayLoadHandoff | null {
  if (typeof window === "undefined") return null
  try {
    return parseHandoff(window.sessionStorage.getItem(SS_PLAY_LOAD_HANDOFF))
  } catch {
    return null
  }
}

export function consumePlayLoadHandoff(): PlayLoadHandoff | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(SS_PLAY_LOAD_HANDOFF)
    window.sessionStorage.removeItem(SS_PLAY_LOAD_HANDOFF)
    return parseHandoff(raw)
  } catch {
    return null
  }
}
