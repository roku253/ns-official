import type { Achievement, ArchiveItem, Communication, Task } from "@/lib/types"
import type { TaskTemplate } from "./types"
import {
  findTaskGroupForTaskAll,
  findTaskTemplateAll,
  getCaseTaskStructureAll,
} from "@/lib/platform/case-task-lookup"
import { activateNextAfterComplete } from "./task-chain"

export interface CompletionPayload {
  reportedKeyword?: string
  photoFileName?: string
  /** photo / item タスクでアーカイブに残す提出画像（JPEG Data URL・縮小済み） */
  archiveImageDataUrl?: string
  /** document タスクでアーカイブ本文に保存する .txt の中身 */
  documentText?: string
  /** report タスクで提出した調査所見（全文） */
  reportText?: string
  /** true のとき完了連絡（emitCommunicationOnComplete 等）を出さない */
  skipEmitCommunications?: boolean
}

function achievementExists(list: Achievement[], id: string): boolean {
  return list.some((a) => a.id === id)
}

function pushAchievementFromDef(
  list: Achievement[],
  def: TaskTemplate["achievementUnlock"],
  caseId: string,
  caseTitle: string
): Achievement[] {
  if (!def || achievementExists(list, def.id)) return list
  return [
    ...list,
    {
      id: def.id,
      title: def.title,
      description: def.description,
      icon: def.icon,
      rarity: def.rarity,
      unlockedAt: new Date(),
      caseId,
      caseTitle,
    },
  ]
}

function archiveEntryType(tpl: TaskTemplate): ArchiveItem["type"] {
  switch (tpl.completionType) {
    case "keyword":
      return "memo"
    case "photo":
      return "photo"
    case "document":
      return "document"
    case "item":
      return "item"
    case "report":
      return "memo"
    default:
      return "memo"
  }
}

function buildArchiveDescription(tpl: TaskTemplate, payload: CompletionPayload): string {
  const def = tpl.archiveAutoEntry
  const keyword = (payload.reportedKeyword ?? "").trim() || "—"
  const filename = (payload.photoFileName ?? "").trim() || "—"
  const note = (def?.note ?? "").trim()

  if (def?.descriptionTemplate) {
    return def.descriptionTemplate
      .replace(/\{keyword\}/g, keyword)
      .replace(/\{filename\}/g, filename)
      .replace(/\{note\}/g, note)
      .replace(/\{document\}/g, (payload.documentText ?? "").trim() || "—")
  }

  if (tpl.completionType === "keyword") {
    const base = `報告キーワード: ${keyword}`
    return note ? `${base}\n\n${note}` : base
  }

  if (tpl.completionType === "photo" || tpl.completionType === "item") {
    const base = `提出ファイル: ${filename}`
    return note ? `${base}\n\n${note}` : base
  }

  if (tpl.completionType === "document") {
    const max = tpl.documentConfig?.maxChars ?? 80_000
    const raw = (payload.documentText ?? "").trim() || "—"
    const body = raw.length > max ? `${raw.slice(0, max)}\n\n…(以降省略)` : raw
    const header = note ? `${note}\n\n` : ""
    return `${header}${body}`
  }

  if (tpl.completionType === "report") {
    const raw = (payload.reportText ?? "").trim() || "—"
    const max = 4000
    const body = raw.length > max ? `${raw.slice(0, max)}\n\n…(以降省略)` : raw
    const header = note ? `${note}\n\n` : ""
    return `${header}${body}`
  }

  return note || "記録を更新しました。"
}

function shouldAppendArchive(tpl: TaskTemplate): boolean {
  if (tpl.archiveAutoEntry) return true
  return (
    tpl.completionType === "keyword" ||
    tpl.completionType === "photo" ||
    tpl.completionType === "item" ||
    tpl.completionType === "document" ||
    tpl.completionType === "report"
  )
}

function appendArchive(
  items: ArchiveItem[],
  tpl: TaskTemplate,
  completedTaskId: string,
  payload: CompletionPayload,
  caseId: string,
  caseTitle: string
): ArchiveItem[] {
  if (!shouldAppendArchive(tpl)) return items

  const type = archiveEntryType(tpl)
  const thumb =
    (tpl.completionType === "photo" || tpl.completionType === "item") && payload.archiveImageDataUrl
      ? payload.archiveImageDataUrl
      : undefined

  const entry: ArchiveItem = {
    id: `arch-auto-${completedTaskId}-${Date.now()}`,
    type,
    title: `報告: ${tpl.title}`,
    description: buildArchiveDescription(tpl, payload),
    thumbnail: thumb,
    createdAt: new Date(),
    caseId,
    caseTitle,
  }
  return [entry, ...items]
}

function appendCommunication(
  list: Communication[],
  def: TaskTemplate["emitCommunicationOnComplete"] | undefined,
  caseId: string
): Communication[] {
  if (!def) return list
  if (list.some((c) => c.id === def.id)) return list
  return [
    {
      id: def.id,
      caseId: def.caseId ?? caseId,
      threadType: def.threadType ?? "main",
      from: def.from,
      fromRole: def.fromRole,
      subject: def.subject,
      content: def.content,
      priority: def.priority,
      attachments: def.attachments,
      isRead: false,
      createdAt: new Date(),
    },
    ...list,
  ]
}

function appendCommunicationChain(
  list: Communication[],
  tpl: TaskTemplate,
  caseId: string
): Communication[] {
  let next = list
  const chain: NonNullable<TaskTemplate["emitCommunicationOnComplete"]>[] = []
  if (tpl.emitCommunicationOnComplete) chain.push(tpl.emitCommunicationOnComplete)
  if (tpl.emitCommunicationsOnCompleteChain?.length) {
    chain.push(...tpl.emitCommunicationsOnCompleteChain)
  }
  for (const def of chain) {
    next = appendCommunication(next, def, caseId)
  }
  return next
}

function appendCommunicationByAnswer(
  list: Communication[],
  tpl: TaskTemplate,
  payload: CompletionPayload,
  caseId: string
): Communication[] {
  const raw = (payload.reportedKeyword ?? "").trim().toLowerCase()
  if (!raw || !tpl.emitCommunicationsByAnswer) return list
  const def = tpl.emitCommunicationsByAnswer[raw]
  if (!def) return list
  return appendCommunication(list, def, caseId)
}

/** タスク1件完了に伴うチェーン解放・実績・アーカイブをまとめて適用 */
export function applyTaskCompletion(
  caseId: string,
  tasks: Task[],
  achievements: Achievement[],
  archiveItems: ArchiveItem[],
  communications: Communication[],
  completedTaskId: string,
  payload: CompletionPayload
): { tasks: Task[]; achievements: Achievement[]; archiveItems: ArchiveItem[]; communications: Communication[] } {
  const tpl = findTaskTemplateAll(caseId, completedTaskId)
  const caseTitle = getCaseTaskStructureAll(caseId)?.caseTitle ?? caseId
  const nextTasks = activateNextAfterComplete(tasks, completedTaskId)

  let nextAchievements = achievements
  let nextArchive = archiveItems
  let nextCommunications = communications

  if (tpl) {
    nextAchievements = pushAchievementFromDef(nextAchievements, tpl.achievementUnlock, caseId, caseTitle)
    if (!payload.skipEmitCommunications) {
      nextCommunications = appendCommunicationChain(nextCommunications, tpl, caseId)
      nextCommunications = appendCommunicationByAnswer(nextCommunications, tpl, payload, caseId)
    }

    const group = findTaskGroupForTaskAll(caseId, completedTaskId)
    if (group?.achievementUnlock) {
      const allGroupDone = group.tasks.every((t) => {
        const row = nextTasks.find((x) => x.id === t.id)
        return row?.status === "completed"
      })
      if (allGroupDone) {
        nextAchievements = pushAchievementFromDef(nextAchievements, group.achievementUnlock, caseId, caseTitle)
        nextCommunications = appendCommunication(nextCommunications, group.emitCommunicationOnComplete, caseId)
      }
    }

    nextArchive = appendArchive(nextArchive, tpl, completedTaskId, payload, caseId, caseTitle)
  }

  return {
    tasks: nextTasks,
    achievements: nextAchievements,
    archiveItems: nextArchive,
    communications: nextCommunications,
  }
}
