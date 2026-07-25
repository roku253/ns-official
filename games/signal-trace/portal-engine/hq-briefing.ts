import type { Communication, ProgressState } from "@/lib/types"

/** 旧実装の本部連絡 id（`hq-ingame-*` に移行済み）。残っていると2通になるため除去する */
const LEGACY_HQ_BRIEFING_PREFIX = "hq-welcome-"

function stripLegacyHqBriefings(state: ProgressState): ProgressState {
  return {
    ...state,
    communications: state.communications.filter((c) => !c.id.startsWith(LEGACY_HQ_BRIEFING_PREFIX)),
  }
}

/** GAS loginAccount 応答の hqBriefing（JSON 互換） */
export interface GasHqBriefing {
  id: string
  subject: string
  from: string
  fromRole: string
  content: string
  priority: "urgent" | "normal" | "low"
  isRead?: boolean
  createdAt: string
  attachments?: { name: string; type: string; content?: string }[]
}

export function mergeHqBriefingFromGas(
  state: ProgressState,
  briefing: GasHqBriefing | undefined,
  caseId?: string
): ProgressState {
  const cleaned = stripLegacyHqBriefings(state)

  if (!briefing || !briefing.id) return cleaned
  if (cleaned.communications.some((c) => c.id === briefing.id)) return cleaned

  const comm: Communication = {
    id: briefing.id,
    caseId,
    threadType: "main",
    from: briefing.from,
    fromRole: briefing.fromRole,
    subject: briefing.subject,
    content: briefing.content,
    priority: briefing.priority,
    isRead: briefing.isRead === true,
    createdAt: new Date(briefing.createdAt),
    attachments: briefing.attachments,
  }

  return {
    ...cleaned,
    communications: [comm, ...cleaned.communications],
  }
}
