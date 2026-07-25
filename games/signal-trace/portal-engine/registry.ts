import type { CaseTaskStructure, TaskGroupTemplate, TaskTemplate } from "./types"
import { DEFAULT_CASE_ID, STRUCTURE_BY_CASE } from "./case-structure-registry.generated"

export { DEFAULT_CASE_ID }

export function getCaseTaskStructure(caseId: string): CaseTaskStructure | undefined {
  const id = (caseId || "").trim() || DEFAULT_CASE_ID
  return STRUCTURE_BY_CASE[id] ?? STRUCTURE_BY_CASE[DEFAULT_CASE_ID]
}

export function getTaskTemplatesForCase(caseId: string): TaskTemplate[] {
  const s = getCaseTaskStructure(caseId)
  if (!s) return []
  return s.groups.flatMap((g) => g.tasks)
}

export function findTaskTemplate(caseId: string, templateId: string): TaskTemplate | undefined {
  return getTaskTemplatesForCase(caseId).find((t) => t.id === templateId)
}

export function findTaskGroupForTask(caseId: string, taskTemplateId: string): TaskGroupTemplate | undefined {
  const s = getCaseTaskStructure(caseId)
  if (!s) return undefined
  return s.groups.find((g) => g.tasks.some((t) => t.id === taskTemplateId))
}
