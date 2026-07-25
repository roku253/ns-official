import "server-only"
import path from "path"
import { SECRETS_BY_CASE_ALL } from "@/lib/platform/all-cases-secrets.generated"
import { findTaskTemplateAll } from "@/lib/platform/case-task-lookup"
import { documentMatchesRules } from "../validate-document"
import type { ReportTaskRules } from "../types"

/** ゲームパッケージ `games/` 配下のファイルのみ解決（パストラバーサル防止） */
function resolveCaseAssetAbs(relFromRepoRoot: string): string | null {
  const cwd = process.cwd()
  const normalized = path.normalize(relFromRepoRoot.trim())
  if (path.isAbsolute(normalized) || normalized.split(path.sep).includes("..")) return null
  const abs = path.resolve(cwd, normalized)
  const gamesRoot = path.resolve(cwd, "games")
  const relativeToGames = path.relative(gamesRoot, abs)
  if (relativeToGames.startsWith("..") || path.isAbsolute(relativeToGames)) return null
  return abs
}

export function getKeywordAnswers(caseId: string, taskId: string): string[] | null {
  const tpl = findTaskTemplateAll(caseId, taskId)
  if (!tpl || tpl.completionType !== "keyword") return null
  const answers = SECRETS_BY_CASE_ALL[caseId]?.[taskId]?.acceptedAnswers
  if (!answers?.length) return null
  return answers
}

export function getPhotoValidation(caseId: string, taskId: string): {
  absolutePaths: string[]
  maxMeanAbsoluteError: number
  maxCompareSize: number
} | null {
  const tpl = findTaskTemplateAll(caseId, taskId)
  if (!tpl || (tpl.completionType !== "photo" && tpl.completionType !== "item")) return null
  const rels = SECRETS_BY_CASE_ALL[caseId]?.[taskId]?.photoReferenceAssetPaths
  if (!rels?.length) return null
  const absolutePaths: string[] = []
  for (const rel of rels) {
    const abs = resolveCaseAssetAbs(rel)
    if (!abs) return null
    absolutePaths.push(abs)
  }
  return {
    absolutePaths,
    maxMeanAbsoluteError: tpl.photoConfig?.maxMeanAbsoluteError ?? 48,
    maxCompareSize: tpl.photoConfig?.maxCompareSize ?? 96,
  }
}

export function getReportRules(caseId: string, taskId: string): ReportTaskRules | null {
  const tpl = findTaskTemplateAll(caseId, taskId)
  if (!tpl || tpl.completionType !== "report") return null
  const rules = SECRETS_BY_CASE_ALL[caseId]?.[taskId]?.reportRules
  if (!rules?.requiredTags) return null
  return rules
}

export function runDocumentValidation(
  caseId: string,
  taskId: string,
  content: string
): { ok: true } | { ok: false; reason: string } {
  const tpl = findTaskTemplateAll(caseId, taskId)
  if (!tpl || tpl.completionType !== "document") {
    return { ok: false, reason: "このタスクは文書照合の対象外です。" }
  }
  const mode = tpl.documentConfig?.matchMode ?? "all"
  const rules =
    SECRETS_BY_CASE_ALL[caseId]?.[taskId]?.documentMatchRules ?? tpl.documentConfig?.matchRules ?? []
  return documentMatchesRules(rules, mode, content)
}
