import type { Task } from "@/lib/types"
import { getCaseTaskStructureAll } from "@/lib/platform/case-task-lookup"
import type { TaskGroupTemplate, TaskTemplate } from "./types"
import { resolvePhotoReferenceUrls } from "./types"

function templateToTask(
  tpl: TaskTemplate,
  status: Task["status"],
  group: TaskGroupTemplate,
  caseTitle: string,
  prev?: Task | null
): Task {
  const completedAt =
    status === "completed" ? (prev?.completedAt ?? new Date()) : undefined
  const photoRefs = resolvePhotoReferenceUrls(tpl.photoConfig)
  return {
    id: tpl.id,
    templateId: tpl.id,
    title: tpl.title,
    description: tpl.description,
    priority: tpl.priority,
    status,
    completionType: tpl.completionType,
    keywordInputPlaceholder: tpl.keywordConfig?.inputPlaceholder,
    keywordChoiceButtons: tpl.keywordConfig?.choiceButtons,
    groupId: group.id,
    groupTitle: group.title,
    caseTitle,
    photoReferenceSrc: photoRefs[0],
    photoReferenceSrcs: photoRefs.length ? photoRefs : undefined,
    photoMaxMeanAbsoluteError: tpl.photoConfig?.maxMeanAbsoluteError,
    photoMaxCompareSize: tpl.photoConfig?.maxCompareSize,
    photoSubmissionHint:
      tpl.completionType === "photo" || tpl.completionType === "item"
        ? tpl.photoConfig?.playerHint?.trim() || undefined
        : undefined,
    reportAttempts: prev?.reportAttempts ?? 0,
    reportWarnLevel: prev?.reportWarnLevel ?? 0,
    reportTagsCollected: prev?.reportTagsCollected ?? [],
    reportAvailableTagIds: tpl.reportConfig?.availableTagIds,
    reportMaxAttempts: tpl.reportConfig?.maxAttempts ?? 99,
    createdAt: prev?.createdAt ?? new Date(),
    completedAt,
  }
}

/** 保存済み tasks とテンプレートをマージ。順序は「グループ→タスク」のテンプレート順。解放状態を再計算 */
export function mergeProgressTasksWithTemplates(savedTasks: Task[], caseId: string): Task[] {
  const structure = getCaseTaskStructureAll(caseId)
  if (!structure) return savedTasks

  type Flat = { tpl: TaskTemplate; group: TaskGroupTemplate }
  const flat: Flat[] = structure.groups.flatMap((group) =>
    group.tasks.map((tpl) => ({ tpl, group }))
  )
  if (flat.length === 0) return savedTasks

  const savedById = new Map(savedTasks.map((t) => [t.id, t]))

  let firstIncompleteIndex = -1
  for (let i = 0; i < flat.length; i++) {
    const prev = savedById.get(flat[i].tpl.id)
    if (prev?.status !== "completed") {
      firstIncompleteIndex = i
      break
    }
  }

  return flat.map(({ tpl, group }, i) => {
    const prev = savedById.get(tpl.id)
    const wasCompleted = prev?.status === "completed"
    let status: Task["status"]
    if (wasCompleted) status = "completed"
    else if (i === firstIncompleteIndex) status = "active"
    else status = "locked"
    return templateToTask(tpl, status, group, structure.caseTitle, prev ?? null)
  })
}
