import type {
  Achievement,
  ArchiveItem,
  Communication,
  Memo,
  ProgressState,
  Task,
  TabType,
} from "@/lib/types"
import { portalPreferencesFromProgressJson } from "@/lib/platform/portal-preferences"

function reviveTask(raw: Record<string, unknown>): Task {
  const st = raw.status
  const status: Task["status"] =
    st === "locked" || st === "active" || st === "completed" ? st : "active"

  const ct = raw.completionType
  const completionType: Task["completionType"] | undefined =
    ct === "keyword" ||
    ct === "manual" ||
    ct === "photo" ||
    ct === "location" ||
    ct === "document" ||
    ct === "item" ||
    ct === "report"
      ? ct
      : undefined

  return {
    id: String(raw.id),
    title: String(raw.title),
    description: String(raw.description),
    priority: raw.priority as Task["priority"],
    status,
    completedAt: raw.completedAt ? new Date(String(raw.completedAt)) : undefined,
    createdAt: new Date(String(raw.createdAt)),
    templateId: raw.templateId != null ? String(raw.templateId) : undefined,
    completionType,
    keywordInputPlaceholder:
      raw.keywordInputPlaceholder != null ? String(raw.keywordInputPlaceholder) : undefined,
    groupId: raw.groupId != null ? String(raw.groupId) : undefined,
    groupTitle: raw.groupTitle != null ? String(raw.groupTitle) : undefined,
    caseTitle: raw.caseTitle != null ? String(raw.caseTitle) : undefined,
    photoReferenceSrc:
      raw.photoReferenceSrc != null ? String(raw.photoReferenceSrc) : undefined,
    photoReferenceSrcs: Array.isArray(raw.photoReferenceSrcs)
      ? (raw.photoReferenceSrcs as unknown[]).map((x) => String(x))
      : undefined,
    photoMaxMeanAbsoluteError:
      raw.photoMaxMeanAbsoluteError != null ? Number(raw.photoMaxMeanAbsoluteError) : undefined,
    photoMaxCompareSize:
      raw.photoMaxCompareSize != null ? Number(raw.photoMaxCompareSize) : undefined,
    photoSubmissionHint:
      raw.photoSubmissionHint != null ? String(raw.photoSubmissionHint) : undefined,
    reportAttempts: raw.reportAttempts != null ? Number(raw.reportAttempts) : undefined,
    reportWarnLevel: raw.reportWarnLevel != null ? Number(raw.reportWarnLevel) : undefined,
    reportTagsCollected: Array.isArray(raw.reportTagsCollected)
      ? (raw.reportTagsCollected as unknown[]).map((x) => String(x))
      : undefined,
    reportAvailableTagIds: Array.isArray(raw.reportAvailableTagIds)
      ? (raw.reportAvailableTagIds as unknown[]).map((x) => String(x))
      : undefined,
    reportMaxAttempts:
      raw.reportMaxAttempts != null ? Number(raw.reportMaxAttempts) : undefined,
  }
}

function reviveAchievement(raw: Record<string, unknown>): Achievement {
  return {
    id: String(raw.id),
    title: String(raw.title),
    description: String(raw.description),
    unlockedAt: new Date(String(raw.unlockedAt)),
    icon: String(raw.icon),
    rarity: raw.rarity as Achievement["rarity"],
    caseId: raw.caseId != null ? String(raw.caseId) : undefined,
    caseTitle: raw.caseTitle != null ? String(raw.caseTitle) : undefined,
  }
}

function reviveMemo(raw: Record<string, unknown>): Memo {
  return {
    id: String(raw.id),
    title: String(raw.title),
    content: String(raw.content),
    createdAt: new Date(String(raw.createdAt)),
    updatedAt: new Date(String(raw.updatedAt)),
  }
}

function reviveArchive(raw: Record<string, unknown>): ArchiveItem {
  return {
    id: String(raw.id),
    type: raw.type as ArchiveItem["type"],
    title: String(raw.title),
    description: String(raw.description),
    thumbnail: raw.thumbnail != null ? String(raw.thumbnail) : undefined,
    createdAt: new Date(String(raw.createdAt)),
    caseId: raw.caseId != null ? String(raw.caseId) : undefined,
    caseTitle: raw.caseTitle != null ? String(raw.caseTitle) : undefined,
  }
}

function reviveCommunication(raw: Record<string, unknown>): Communication {
  return {
    id: String(raw.id),
    caseId: raw.caseId != null ? String(raw.caseId) : undefined,
    threadType: raw.threadType === "sub" ? "sub" : "main",
    from: String(raw.from),
    fromRole: String(raw.fromRole),
    subject: String(raw.subject),
    content: String(raw.content),
    priority: raw.priority as Communication["priority"],
    isRead: Boolean(raw.isRead),
    createdAt: new Date(String(raw.createdAt)),
    attachments: Array.isArray(raw.attachments)
      ? (raw.attachments as Communication["attachments"])
      : undefined,
  }
}

export function emptyProgressState(): ProgressState {
  return {
    tasks: [],
    achievements: [],
    memos: [],
    archiveItems: [],
    communications: [],
  }
}

/** 旧仕様の連絡は読み込み時に除去 */
const STRIPPED_COMMUNICATION_IDS = new Set([
  "comm-sys-user-not-found",
  "comm-k05-diary-fragments-23-note",
  "comm-kn-unknown-data",
  "comm-kn-boy-interference",
  "comm-kn-delete-failed",
  "comm-hq-purge-delegate",
  "comm-haruto-plea",
  "comm-ending-delete",
  "comm-ending-keep",
])

export function deserializeProgress(raw: unknown): ProgressState {
  const empty = emptyProgressState()
  if (raw == null || typeof raw !== "object") return empty
  const d = raw as Record<string, unknown>
  const comms = Array.isArray(d.communications)
    ? d.communications
        .map((c) => reviveCommunication(c as Record<string, unknown>))
        .filter((c) => !STRIPPED_COMMUNICATION_IDS.has(c.id))
    : []
  return {
    tasks: Array.isArray(d.tasks) ? d.tasks.map((t) => reviveTask(t as Record<string, unknown>)) : [],
    achievements: Array.isArray(d.achievements)
      ? d.achievements.map((a) => reviveAchievement(a as Record<string, unknown>))
      : [],
    memos: Array.isArray(d.memos) ? d.memos.map((m) => reviveMemo(m as Record<string, unknown>)) : [],
    archiveItems: Array.isArray(d.archiveItems)
      ? d.archiveItems.map((x) => reviveArchive(x as Record<string, unknown>))
      : [],
    communications: comms,
    storyClearedAt: typeof d.storyClearedAt === "string" ? d.storyClearedAt : undefined,
    knLeaderUnlockedIds: Array.isArray(d.knLeaderUnlockedIds)
      ? [...new Set(d.knLeaderUnlockedIds.map((x) => String(x).trim()).filter(Boolean))]
      : undefined,
    knChatCount:
      typeof d.knChatCount === "number" && d.knChatCount >= 0 ? d.knChatCount : undefined,
    knConsecutiveOffTopicChitchat:
      typeof d.knConsecutiveOffTopicChitchat === "number" &&
      d.knConsecutiveOffTopicChitchat >= 0
        ? d.knConsecutiveOffTopicChitchat
        : undefined,
    activeTab: (() => {
      const t = d.activeTab
      const valid: TabType[] = [
        "tasks",
        "progress",
        "memo",
        "communications",
        "achievements",
        "archive",
        "settings",
      ]
      return typeof t === "string" && valid.includes(t as TabType) ? (t as TabType) : undefined
    })(),
    portalPreferences: portalPreferencesFromProgressJson(d.portalPreferences),
  }
}

export function serializeProgressForGas(state: ProgressState): Record<string, unknown> {
  const json = JSON.stringify(state, (_, v) => (v instanceof Date ? v.toISOString() : v))
  return JSON.parse(json) as Record<string, unknown>
}

export function progressPayloadSignature(state: ProgressState): string {
  return JSON.stringify(serializeProgressForGas(state))
}
