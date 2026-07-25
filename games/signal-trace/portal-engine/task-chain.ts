import type { Task } from "@/lib/types"

/** 1タスク完了後、次の locked を active にする */
export function activateNextAfterComplete(tasks: Task[], completedId: string): Task[] {
  let completedDone = false
  let activatedNext = false

  return tasks.map((t) => {
    if (t.id === completedId) {
      completedDone = true
      return {
        ...t,
        status: "completed" as const,
        completedAt: new Date(),
      }
    }
    if (completedDone && t.status === "locked" && !activatedNext) {
      activatedNext = true
      return { ...t, status: "active" as const }
    }
    return t
  })
}
