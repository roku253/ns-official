import type { Communication, Task } from "@/lib/types"
import type { GroupUnlockTrigger, TaskGroupTemplate } from "./types"

function isTriggerSatisfied(
  trigger: GroupUnlockTrigger | undefined,
  tasks: Task[],
  communications: Communication[],
  now: Date
): boolean {
  if (!trigger || trigger.type === "auto") return true
  if (trigger.type === "afterCommunicationRead") {
    return communications.some((c) => c.id === trigger.communicationId && c.isRead)
  }
  if (trigger.type === "afterDelayMsFromTaskComplete") {
    const task = tasks.find((t) => t.id === trigger.taskId)
    if (!task?.completedAt) return false
    return now.getTime() - new Date(task.completedAt).getTime() >= trigger.delayMs
  }
  return false
}

export function isGroupUnlocked(
  groups: TaskGroupTemplate[],
  groupIndex: number,
  tasks: Task[],
  communications: Communication[],
  now: Date
): boolean {
  const cur = groups[groupIndex]
  if (groupIndex > 0) {
    const prev = groups[groupIndex - 1]
    const prevDone = prev.tasks.every((tpl) => tasks.find((t) => t.id === tpl.id)?.status === "completed")
    if (!prevDone) return false
  }
  if (groupIndex === 0 && !cur.unlockTrigger) return true
  return isTriggerSatisfied(cur.unlockTrigger, tasks, communications, now)
}

export function findCurrentVisibleGroupIndex(
  groups: TaskGroupTemplate[],
  tasks: Task[],
  communications: Communication[],
  now: Date
): number {
  for (let i = 0; i < groups.length; i++) {
    if (!isGroupUnlocked(groups, i, tasks, communications, now)) return -1
    const g = groups[i]
    const allDone = g.tasks.every((tpl) => tasks.find((t) => t.id === tpl.id)?.status === "completed")
    if (!allDone) return i
  }
  return -1
}

/** 全タスクグループが解放済みかつ、各グループのタスクがすべて完了ならメインラインクリア */
export function isMainStorylineComplete(
  groups: TaskGroupTemplate[],
  tasks: Task[],
  communications: Communication[],
  now: Date
): boolean {
  if (groups.length === 0) return true
  for (let i = 0; i < groups.length; i++) {
    if (!isGroupUnlocked(groups, i, tasks, communications, now)) return false
    const g = groups[i]
    const allDone = g.tasks.every((tpl) => tasks.find((t) => t.id === tpl.id)?.status === "completed")
    if (!allDone) return false
  }
  return true
}
