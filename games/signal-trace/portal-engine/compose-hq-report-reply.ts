import "server-only"
import type { AutoCommunicationDef, ReportGrade, ReportTaskRules } from "./types"
import {
  chapterFromTaskId,
  pickTemplateBody,
  warnSuffixForLevel,
} from "@/games/signal-trace/cases/koko-ni-iru/hq-report-templates"
import {
  composeChitchatReply,
  composeGenericRedirect,
} from "@/games/signal-trace/cases/koko-ni-iru/hq-chitchat-replies"
import {
  hqAckForTagMatch,
  hqAskForMoreTopics,
  HQ_NO_TAGS_THIS_TURN,
  hqFormatNudgeWhenTagsReady,
  hqShapeReminder,
  isShortFlavorFragment,
  resolveFlavorAck,
} from "@/games/signal-trace/cases/koko-ni-iru/hq-report-acks"
import type { ReportTagMatch } from "@/games/signal-trace/cases/koko-ni-iru/report-tag-phrases"
import {
  CLEARABLE_STYLE_LABELS,
  type ReportStyleLabel,
} from "@/games/signal-trace/cases/koko-ni-iru/report-style-labels"
import type { ReportShapeResult } from "./validate-report-shape"

const HQ = {
  from: "記録班・班長",
  fromRole: "班長",
} as const

const BAD_REPORT_STYLES = new Set<ReportStyleLabel>([
  "chitchat",
  "meta_lost",
  "off_topic",
  "keyword_stuffing",
])

const OPENINGS = ["お、来た。", "読んだ読んだ。", "うん、届いてる。"]

export interface ComposeHqReplyInput {
  caseId: string
  taskId: string
  taskTitle: string
  reportText: string
  styleLabel: ReportStyleLabel
  grade: ReportGrade
  tagsThisTurn: string[]
  tagsCollectedBefore: string[]
  tagsCollectedAfter: string[]
  newlyFoundTags: string[]
  matches: ReportTagMatch[]
  rules: ReportTaskRules
  shape: ReportShapeResult
  warnLevel: number
  submitCount: number
  isCompletingTask: boolean
  allRequiredTagsCollected: boolean
}

function pickQuote(matches: ReportTagMatch[], reportText: string): string {
  if (matches.length > 0) {
    return `「${matches[0].excerpt}」`
  }
  const t = reportText.trim()
  if (!t) return ""
  const excerpt = t.length <= 80 ? t : `${t.slice(0, 80)}…`
  return `「${excerpt}」`
}

function missingRequiredTags(collected: string[], rules: ReportTaskRules): string[] {
  const set = new Set(collected)
  return rules.requiredTags.filter((t) => !set.has(t))
}

function pickOpening(submitCount: number): string {
  return OPENINGS[(Math.max(submitCount, 1) - 1) % OPENINGS.length]
}

/** 同趣旨の文が重複しないよう結合 */
function joinReplyParts(parts: string[]): string {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of parts) {
    const p = raw.trim()
    if (!p || seen.has(p)) continue
    seen.add(p)
    out.push(p)
  }
  return out.join(" ").replace(/\s+/g, " ").trim()
}

function hasFlavorAck(input: ComposeHqReplyInput): boolean {
  const chapter = chapterFromTaskId(input.taskId)
  return resolveFlavorAck(input.reportText, chapter) !== null
}

function subjectForGrade(grade: ReportGrade, style: ReportStyleLabel, flavorAck: boolean): string {
  if (style === "chitchat" || style === "meta_lost") return "まずは板の話から"
  if (style === "off_topic" || style === "keyword_stuffing") return "今回はそれ、ちょい難しい"
  if (grade === "hot") return "お、いい線いってる"
  if (grade === "warm" || flavorAck) return "うん、なんとなくわかった"
  if (grade === "spoiler_early") return "結論はまだ先で"
  if (grade === "wrong") return "それは今回とズレてるかも"
  return "もうちょい文章ほしい"
}

function usesConversationalComposer(style: ReportStyleLabel, grade: ReportGrade): boolean {
  if (BAD_REPORT_STYLES.has(style)) return false
  if (grade === "wrong" || grade === "spoiler_early") return false
  return true
}

function needsShapeReminder(input: ComposeHqReplyInput, missing: string[]): boolean {
  if (input.shape.ok) return false
  if (!CLEARABLE_STYLE_LABELS.has(input.styleLabel)) return false

  const chapter = chapterFromTaskId(input.taskId)
  const flavorOnly =
    input.tagsThisTurn.length === 0 &&
    resolveFlavorAck(input.reportText, chapter) !== null &&
    isShortFlavorFragment(input.reportText)

  if (flavorOnly && !input.allRequiredTagsCollected) return false

  if (input.tagsThisTurn.length > 0 && missing.length > 0) return true
  if (input.tagsCollectedAfter.length === 0 && input.tagsThisTurn.length === 0 && !flavorOnly) {
    return true
  }
  if (input.allRequiredTagsCollected && !flavorOnly) return true
  return false
}

function buildClosingContent(input: ComposeHqReplyInput): string {
  const hot = input.rules.gradeReplies.hot
  const quote = pickQuote(input.matches, input.reportText)
  if (!hot?.content?.trim()) {
    return "うん、ここまでバッチリ。次は地図とか学校の公開記録も見てみて。気づいたことあったらまた送って。"
  }
  const base = hot.content.trim()
  if (quote && input.newlyFoundTags.length > 0) {
    return `いいね。${quote} ここまでメモした。${base}`
  }
  return base
}

function buildChitchatOrRedirectContent(input: ComposeHqReplyInput): string {
  const chitchat = composeChitchatReply(input.reportText, input.taskTitle, input.submitCount)
  if (chitchat) return chitchat

  const chapter = chapterFromTaskId(input.taskId)
  const flavor = resolveFlavorAck(input.reportText, chapter)
  if (flavor && input.styleLabel === "off_topic") {
    const opening = pickOpening(input.submitCount)
    return `${opening} ${flavor} ${composeGenericRedirect(input.taskTitle, input.submitCount + 3)}`
      .replace(/\s+/g, " ")
      .trim()
  }

  if (input.styleLabel === "meta_lost") {
    return buildTemplateContent(input)
  }

  return composeGenericRedirect(input.taskTitle, input.submitCount)
}

function buildConversationalContent(input: ComposeHqReplyInput): string {
  if (input.isCompletingTask) {
    return buildClosingContent(input)
  }

  const chapter = chapterFromTaskId(input.taskId)
  const missing = missingRequiredTags(input.tagsCollectedAfter, input.rules)
  const quote = pickQuote(input.matches, input.reportText)
  const opening = pickOpening(input.submitCount)
  const flavor = resolveFlavorAck(input.reportText, chapter)

  if (input.allRequiredTagsCollected && !input.shape.ok) {
    if (flavor && input.tagsThisTurn.length === 0) {
      return `${opening} ${flavor} ${hqFormatNudgeWhenTagsReady()}`.replace(/\s+/g, " ").trim()
    }
    const parts = [
      "内容はだいたい掴めた。あとは「どの投稿を見たか」と「なんで気になったか」をセットで書いてくれると助かる。",
    ]
    if (quote) {
      parts.push(`${quote} このあたり、もう一段だけ具体的に送って。`)
    } else {
      parts.push(hqShapeReminder(input.submitCount))
    }
    return joinReplyParts(parts)
  }

  const parts: string[] = []

  if (input.newlyFoundTags.length > 0) {
    parts.push(opening)
    for (const tagId of input.newlyFoundTags) {
      const match = input.matches.find((m) => m.tagId === tagId)
      parts.push(
        hqAckForTagMatch(tagId, match?.excerpt ?? input.reportText, input.reportText)
      )
    }
  } else if (input.tagsThisTurn.length > 0) {
    parts.push(opening)
    for (const tagId of input.tagsThisTurn) {
      const match = input.matches.find((m) => m.tagId === tagId)
      parts.push(
        hqAckForTagMatch(tagId, match?.excerpt ?? input.reportText, input.reportText)
      )
    }
  } else if (flavor) {
    parts.push(`${opening} ${flavor}`)
  } else if (input.tagsCollectedAfter.length > 0) {
    parts.push(`${opening} 今回の文面だと、新しい論点はあんま拾えなかったかな。`)
  } else {
    parts.push(`${opening} ${HQ_NO_TAGS_THIS_TURN}`)
  }

  if (needsShapeReminder(input, missing)) {
    parts.push(hqShapeReminder(input.submitCount))
  }

  if (missing.length > 0) {
    const ask = hqAskForMoreTopics(missing.length)
    if (ask) parts.push(ask)
  }

  if (BAD_REPORT_STYLES.has(input.styleLabel) && input.warnLevel > 0) {
    const warn = warnSuffixForLevel(input.warnLevel)
    if (warn) parts.push(warn)
  }

  return joinReplyParts(parts)
}

function buildTemplateContent(input: ComposeHqReplyInput): string {
  const chapter = chapterFromTaskId(input.taskId)
  const body = pickTemplateBody(
    input.styleLabel,
    input.grade,
    chapter,
    input.warnLevel,
    input.submitCount
  )
  const quote = pickQuote(input.matches, input.reportText)
  let out = body
  out = out.replace(/\{quote\}/g, quote || "記述")
  out = out.replace(/\{softHint\}/g, "")
  out = out.replace(/\{taskTitle\}/g, input.taskTitle)
  const warn =
    BAD_REPORT_STYLES.has(input.styleLabel) && input.warnLevel > 0
      ? warnSuffixForLevel(input.warnLevel)
      : ""
  out = out.replace(/\{warnSuffix\}/g, warn ? ` ${warn}` : "")
  return out.replace(/\s+/g, " ").trim()
}

export function canCompleteReportTask(
  grade: ReportGrade,
  styleLabel: ReportStyleLabel,
  shapeOk: boolean
): boolean {
  if (grade !== "hot") return false
  if (!shapeOk) return false
  if (!CLEARABLE_STYLE_LABELS.has(styleLabel)) return false
  return true
}

export function nextWarnLevel(styleLabel: ReportStyleLabel, current: number): number {
  if (BAD_REPORT_STYLES.has(styleLabel)) {
    return Math.min(current + 1, 2)
  }
  return current
}

export function effectiveWarnLevel(styleLabel: ReportStyleLabel, prev: number): number {
  if (BAD_REPORT_STYLES.has(styleLabel)) {
    return nextWarnLevel(styleLabel, prev)
  }
  return 0
}

export function composeHqReportReply(input: ComposeHqReplyInput): AutoCommunicationDef {
  if (input.grade === "spoiler_early" || input.grade === "wrong") {
    const fb = fallbackHqReply(input.rules, input.grade)
    if (fb) {
      return {
        ...fb,
        id: `comm-report-${input.taskId}-${input.grade}-${input.submitCount}`,
        caseId: input.caseId,
      }
    }
  }

  const flavorAck = hasFlavorAck(input)
  let content: string

  if (input.styleLabel === "chitchat") {
    content = buildChitchatOrRedirectContent(input)
  } else if (input.styleLabel === "off_topic" && !flavorAck) {
    content = buildChitchatOrRedirectContent(input)
  } else if (usesConversationalComposer(input.styleLabel, input.grade)) {
    content = buildConversationalContent(input)
  } else {
    content = buildTemplateContent(input)
  }

  const id = `comm-report-${input.taskId}-${input.grade}-${input.submitCount}`

  return {
    id,
    caseId: input.caseId,
    ...HQ,
    subject: subjectForGrade(input.grade, input.styleLabel, flavorAck),
    content,
    priority: input.grade === "hot" ? "normal" : "low",
  }
}

export function fallbackHqReply(
  rules: ReportTaskRules,
  grade: ReportGrade
): AutoCommunicationDef | undefined {
  return rules.gradeReplies[grade]
}
