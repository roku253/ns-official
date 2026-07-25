import "server-only"
import {
  inferTagsWithEvidence,
  KN_REPORT_TAG_PHRASES,
  type ReportTagMatch,
} from "@/games/signal-trace/cases/koko-ni-iru/report-tag-phrases"
import { findTaskTemplateAll } from "@/lib/platform/case-task-lookup"

export function inferReportTagsForTask(
  caseId: string,
  taskId: string,
  reportText: string
): string[] {
  return inferReportTagsWithEvidence(caseId, taskId, reportText).tagIds
}

export function inferReportTagsWithEvidence(
  caseId: string,
  taskId: string,
  reportText: string
): { tagIds: string[]; matches: ReportTagMatch[] } {
  const tpl = findTaskTemplateAll(caseId, taskId)
  const allowed = tpl?.reportConfig?.availableTagIds ?? Object.keys(KN_REPORT_TAG_PHRASES)
  return inferTagsWithEvidence(reportText, allowed)
}
