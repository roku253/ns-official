import { applyTaskCompletion } from "@/games/signal-trace/portal-engine/task-completion"
import { getCaseTaskStructureAll } from "@/lib/platform/case-task-lookup"
import { mergeProgressTasksWithTemplates } from "@/games/signal-trace/portal-engine/bootstrap-tasks"
import { emptyProgressState } from "@/games/signal-trace/portal-engine/progress-json"
import type { Communication, Memo, ProgressState, TabType } from "@/lib/types"

export function flatOrderedTaskIds(caseId: string): string[] {
  const s = getCaseTaskStructureAll(caseId)
  if (!s) return []
  return s.groups.flatMap((g) => g.tasks.map((t) => t.id))
}

export function flatTasksForCheckpointLabels(caseId: string): {
  index: number
  id: string
  title: string
  groupTitle: string
}[] {
  const s = getCaseTaskStructureAll(caseId)
  if (!s) return []
  const out: { index: number; id: string; title: string; groupTitle: string }[] = []
  let idx = 0
  for (const g of s.groups) {
    for (const t of g.tasks) {
      out.push({ index: idx, id: t.id, title: t.title, groupTitle: g.title })
      idx += 1
    }
  }
  return out
}

export function countCompletedTasks(tasks: { status: string }[]): number {
  return tasks.filter((t) => t.status === "completed").length
}

/**
 * テンプレート順で先頭から N タスクを完了した状態をシミュレーション（実績・資料室も整合）
 * N=0: 未着手（先頭タスクが active）
 * N=全件: 全タスク完了
 */
export function simulateProgressToCheckpoint(
  caseId: string,
  completedTaskCount: number,
  preserve: {
    memos: Memo[]
    communications: Communication[]
    activeTab?: TabType
  }
): ProgressState {
  const flat = flatOrderedTaskIds(caseId)
  const n = Math.max(0, Math.min(flat.length, Math.floor(completedTaskCount)))

  let tasks = mergeProgressTasksWithTemplates([], caseId)
  const empty = emptyProgressState()
  let achievements = empty.achievements
  let archiveItems = empty.archiveItems
  let communications = preserve.communications

  for (let i = 0; i < n; i++) {
    const tid = flat[i]
    if (!tid) break
    const res = applyTaskCompletion(caseId, tasks, achievements, archiveItems, communications, tid, {})
    tasks = res.tasks
    achievements = res.achievements
    archiveItems = res.archiveItems
    communications = res.communications
  }

  tasks = mergeProgressTasksWithTemplates(tasks, caseId)

  return {
    tasks,
    achievements,
    archiveItems,
    memos: preserve.memos,
    communications,
    activeTab: preserve.activeTab,
  }
}
