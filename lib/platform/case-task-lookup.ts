import type { CaseTaskStructure, TaskGroupTemplate, TaskTemplate } from "@/games/signal-trace/portal-engine/types"
import { STRUCTURE_BY_CASE_ALL } from "@/lib/platform/all-cases-structure.generated"

/** 全パッケージ案件のタスク構造（任務ポータル UI 外・API・進捗マージ用） */
export function getCaseTaskStructureAll(caseId: string): CaseTaskStructure | undefined {
  const id = (caseId || "").trim()
  if (!id) return undefined
  return STRUCTURE_BY_CASE_ALL[id]
}

export function findTaskTemplateAll(caseId: string, templateId: string): TaskTemplate | undefined {
  const s = getCaseTaskStructureAll(caseId)
  if (!s) return undefined
  return s.groups.flatMap((g) => g.tasks).find((t) => t.id === templateId)
}

export function findTaskGroupForTaskAll(caseId: string, taskTemplateId: string): TaskGroupTemplate | undefined {
  const s = getCaseTaskStructureAll(caseId)
  if (!s) return undefined
  return s.groups.find((g) => g.tasks.some((t) => t.id === taskTemplateId))
}
