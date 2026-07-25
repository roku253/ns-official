import type { AutoCommunicationDef, ReportGrade, ReportTaskRules } from "./types"

export interface ReportGradeResult {
  grade: ReportGrade
  completeTask: boolean
  hqReply?: AutoCommunicationDef
}

function hasAll(tags: string[], required: string[]): boolean {
  const set = new Set(tags)
  return required.every((t) => set.has(t))
}

function countOverlap(tags: string[], pool: string[]): number {
  const set = new Set(tags)
  return pool.filter((t) => set.has(t)).length
}

export interface GradeReportOptions {
  /** 今回の報告が報告書形式として十分か。false ならタグが揃っても hot にしない */
  shapeOk?: boolean
}

/**
 * 提出タグ集合を採点。hot は required 充足かつ shapeOk のときのみ。
 */
export function gradeReportSubmission(
  submitted: string[],
  rules: ReportTaskRules,
  options?: GradeReportOptions
): ReportGradeResult {
  const shapeOk = options?.shapeOk !== false
  const tags = [...new Set(submitted.map((t) => t.trim()).filter(Boolean))]
  const wrong = rules.wrongTags ?? []
  const spoilerOnly = rules.spoilerEarlyIfOnly ?? []

  if (wrong.length && countOverlap(tags, wrong) > 0) {
    return {
      grade: "wrong",
      completeTask: false,
      hqReply: rules.gradeReplies.wrong,
    }
  }

  const requiredMet = hasAll(tags, rules.requiredTags)
  const extraNeeded = rules.optionalMinExtra ?? 0
  const optionalPool = tags.filter((t) => !rules.requiredTags.includes(t))
  const extraCount = optionalPool.length

  if (spoilerOnly.length) {
    const onlySpoiler =
      tags.length > 0 &&
      tags.every((t) => spoilerOnly.includes(t)) &&
      !requiredMet
    if (onlySpoiler) {
      return {
        grade: "spoiler_early",
        completeTask: false,
        hqReply: rules.gradeReplies.spoiler_early,
      }
    }
  }

  if (requiredMet && extraCount >= extraNeeded) {
    if (shapeOk) {
      return {
        grade: "hot",
        completeTask: true,
        hqReply: rules.gradeReplies.hot,
      }
    }
    return {
      grade: "warm",
      completeTask: false,
      hqReply: rules.gradeReplies.warm,
    }
  }

  const warmOverlap =
    countOverlap(tags, rules.requiredTags) > 0 ||
    (rules.requiredTags.length === 0 && tags.length > 0)

  if (warmOverlap) {
    return {
      grade: "warm",
      completeTask: false,
      hqReply: rules.gradeReplies.warm,
    }
  }

  return {
    grade: "cold",
    completeTask: false,
    hqReply: rules.gradeReplies.cold,
  }
}
