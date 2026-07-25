import "server-only"
import fs from "node:fs"
import path from "node:path"
import {
  isReportStyleLabel,
  REPORT_STYLE_LABELS,
  type ReportStyleLabel,
} from "@/games/signal-trace/cases/koko-ni-iru/report-style-labels"
import { normalizeKeywordAnswer } from "@/games/signal-trace/portal-engine/normalize-keyword"

export interface ReportStyleClassification {
  label: ReportStyleLabel
  confidence: number
  scores: Partial<Record<ReportStyleLabel, number>>
  source: "model" | "rules"
}

type ClassifierMeta = {
  version: number
  caseId: string
  labels: string[]
  vocabulary: string[]
  idf: number[]
  intercept: number[]
  sparseFile?: string
}

type CachedModel = {
  caseId: string
  labels: string[]
  vocabIndex: Map<string, number>
  idf: number[]
  intercept: number[]
  sparseWeights: number[][][]
}

let cachedModel: CachedModel | null = null
let loadFailed = false

function caseDir(caseId: string): string {
  return path.join(process.cwd(), "games", "signal-trace", "cases", caseId)
}

/** 巨大文字列の String.split を避けて行単位に走査 */
function* iterateLines(content: string): Generator<string> {
  let start = 0
  for (let i = 0; i < content.length; i++) {
    if (content[i] === "\n") {
      if (i > start) yield content.slice(start, i)
      start = i + 1
    }
  }
  if (start < content.length) yield content.slice(start)
}

function loadSparseWeights(sparsePath: string, labelCount: number): number[][][] {
  const sparseWeights: number[][][] = Array.from({ length: labelCount }, () => [])
  const content = fs.readFileSync(sparsePath, "utf8")
  let headerSkipped = false
  for (const line of iterateLines(content)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (!headerSkipped && trimmed.startsWith("labelIndex")) {
      headerSkipped = true
      continue
    }
    const parts = trimmed.split("\t")
    if (parts.length < 3) continue
    const li = Number(parts[0])
    const fi = Number(parts[1])
    const v = Number(parts[2])
    if (!Number.isFinite(li) || !Number.isFinite(fi) || !Number.isFinite(v)) continue
    if (li < 0 || li >= labelCount) continue
    sparseWeights[li].push([fi, v])
  }
  return sparseWeights
}

function loadClassifierModel(caseId: string): CachedModel | null {
  if (loadFailed) return null
  if (cachedModel?.caseId === caseId) return cachedModel

  const dir = caseDir(caseId)
  const metaPath = path.join(dir, "report-style-classifier-meta.json")
  const legacyPath = path.join(dir, "report-style-classifier.json")

  try {
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as ClassifierMeta
      if (meta.version !== 2) {
        throw new Error("meta version must be 2")
      }
      const sparseName = meta.sparseFile ?? "report-style-classifier-sparse.tsv"
      const sparsePath = path.join(dir, sparseName)
      if (!fs.existsSync(sparsePath)) {
        throw new Error(`sparse file missing: ${sparseName}`)
      }
      const sparseWeights = loadSparseWeights(sparsePath, meta.labels.length)
      const vocabIndex = new Map(meta.vocabulary.map((t, i) => [t, i]))
      cachedModel = {
        caseId,
        labels: meta.labels,
        vocabIndex,
        idf: meta.idf,
        intercept: meta.intercept,
        sparseWeights,
      }
      return cachedModel
    }

    // レガシー単一 JSON（非推奨・パースで落ちることがある）
    if (fs.existsSync(legacyPath)) {
      console.warn(
        "[report-style-classifier] legacy monolithic JSON detected; run npm run train:kn-report-style"
      )
      loadFailed = true
      return null
    }

    loadFailed = true
    return null
  } catch (err) {
    console.error("[report-style-classifier] load failed:", err)
    loadFailed = true
    return null
  }
}

function charNgrams(text: string, minN: number, maxN: number): Map<string, number> {
  const norm = normalizeKeywordAnswer(text)
  const counts = new Map<string, number>()
  if (!norm) return counts
  for (let n = minN; n <= maxN; n++) {
    for (let i = 0; i <= norm.length - n; i++) {
      const gram = norm.slice(i, i + n)
      counts.set(gram, (counts.get(gram) ?? 0) + 1)
    }
  }
  return counts
}

function buildFeatureTfidf(
  grams: Map<string, number>,
  model: CachedModel
): Map<number, number> {
  const featureTfidf = new Map<number, number>()
  for (const [gram, tf] of grams) {
    const idx = model.vocabIndex.get(gram)
    if (idx === undefined) continue
    featureTfidf.set(idx, (1 + Math.log(tf)) * model.idf[idx])
  }
  return featureTfidf
}

function softmax(logits: number[]): number[] {
  if (logits.length === 0) return []
  let max = logits[0]
  for (let i = 1; i < logits.length; i++) {
    if (logits[i] > max) max = logits[i]
  }
  const exps = logits.map((x) => Math.exp(x - max))
  let sum = 0
  for (const e of exps) sum += e
  return exps.map((e) => e / sum)
}

function classifyWithModel(text: string, model: CachedModel): ReportStyleClassification | null {
  const grams = charNgrams(text, 2, 4)
  if (grams.size === 0) return null

  const featureTfidf = buildFeatureTfidf(grams, model)
  if (featureTfidf.size === 0) return null

  const logits = model.sparseWeights.map((weights, li) => {
    let s = model.intercept[li] ?? 0
    for (const pair of weights) {
      const fi = pair[0]
      const coef = pair[1]
      const tfidf = featureTfidf.get(fi)
      if (tfidf !== undefined) s += coef * tfidf
    }
    return s
  })

  const probs = softmax(logits)
  let bestIdx = 0
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > probs[bestIdx]) bestIdx = i
  }
  const labelRaw = model.labels[bestIdx]
  if (!isReportStyleLabel(labelRaw)) return null

  const scores: Partial<Record<ReportStyleLabel, number>> = {}
  model.labels.forEach((lb, i) => {
    if (isReportStyleLabel(lb)) scores[lb] = probs[i]
  })

  return {
    label: labelRaw,
    confidence: probs[bestIdx],
    scores,
    source: "model",
  }
}

export function classifyReportStyleRules(text: string): ReportStyleClassification {
  const t = text.trim()
  const norm = normalizeKeywordAnswer(t)

  const chitchat = /^(おはよう|こんにちは|こんばんは|お疲れ|ありがとう|了解|テスト|雑談|送信テスト)/.test(
    norm.slice(0, 30)
  )
  if (chitchat || (t.length < 40 && /^(おはよう|こんにちは|了解)/.test(t))) {
    return ruleResult("chitchat", 0.9)
  }

  const meta =
    /(何を調べ|わからなく|教えて|ヒント|進め方|任務|クリア条件|どこを見|手順|操作)/.test(t) &&
    !/(掲示板|板|スレ|ログ).{0,20}(確認|読|見)/.test(t)
  if (meta) return ruleResult("meta_lost", 0.85)

  const offTopic = /(秋山|大倉|座標|赤い鍵|パスワード忘|ログインでき|サッカー|アニメ)/.test(t)
  if (offTopic && !/(霞ノ杜|霞の杜|すれ|スレ|板|ログ|掲示板)/.test(t)) {
    return ruleResult("off_topic", 0.85)
  }

  const parts = t.split(/[、,\s]+/).filter((p) => p.length >= 1)
  if (parts.length >= 4 && parts.every((p) => p.length <= 10) && t.length < 100) {
    return ruleResult("keyword_stuffing", 0.8)
  }

  const hasReason = /(ので|から|ため|理由|と思|と考)/.test(t)
  const hasBoard = /(掲示板|板|スレ|すれ|ログ|投稿|書き込|スレッド)/.test(t)
  const hasCasePlace = /(霞ノ杜|霞の杜|杜町)/.test(t)
  const tentative = /(たぶん|かも|おそらく|きっと)/.test(t)

  if (hasReason && hasBoard && t.length >= 50) return ruleResult("report_substantive", 0.75)
  if (tentative && hasBoard) return ruleResult("report_tentative", 0.7)
  if (/、|，/.test(t) && t.split(/[、，]/).length >= 3 && !hasReason) {
    return ruleResult("report_list", 0.7)
  }
  if (hasBoard && t.length >= 25) return ruleResult("report_vague", 0.65)
  if ((hasBoard || hasCasePlace) && t.length >= 8) return ruleResult("report_vague", 0.62)
  if (!hasBoard && !hasCasePlace && t.length >= 20) return ruleResult("off_topic", 0.6)

  return ruleResult("report_vague", 0.5)
}

function ruleResult(label: ReportStyleLabel, confidence: number): ReportStyleClassification {
  const scores: Partial<Record<ReportStyleLabel, number>> = {}
  for (const lb of REPORT_STYLE_LABELS) {
    scores[lb] = lb === label ? confidence : 0
  }
  return { label, confidence, scores, source: "rules" }
}

export function classifyReportStyleRulesStrong(text: string): ReportStyleClassification | null {
  const t = text.trim()
  const norm = normalizeKeywordAnswer(t)

  if (t.length <= 35 && /^(おはよう|こんにちは|こんばんは|お疲れ|ありがとう|了解|テスト|雑談|送信テスト|晩御飯|おやすみ)/.test(t)) {
    return ruleResult("chitchat", 0.95)
  }
  if (
    /(別案件|別の謎|消えた少年.*正体|サイト.*重|ちょっと聞きたい|送信テスト)/.test(t) &&
    !/(掲示板|板|スレ|ログ).{0,20}(確認|読|見)/.test(t)
  ) {
    return ruleResult("chitchat", 0.9)
  }
  if (
    /(何を調べ|わからなくな|教えてください|ヒント|クリア条件|どこを見れば|手順|操作がわから|進め方)/.test(
      t
    ) &&
    !/(掲示板|板|スレ|ログ).{0,30}(確認|読|見た)/.test(t)
  ) {
    return ruleResult("meta_lost", 0.92)
  }
  if (/(秋山|大倉|座標|赤い鍵|カレー|サッカー|アニメ|料理)/.test(t) && !/(掲示板|霞ノ)/.test(t)) {
    return ruleResult("off_topic", 0.9)
  }

  const parts = t.split(/[、,\s]+/).filter((p) => p.length >= 1)
  if (
    parts.length >= 4 &&
    parts.every((p) => p.length <= 12) &&
    t.length < 120 &&
    !/(ので|から|ため|と思|掲示板を|板を|スレを)/.test(t)
  ) {
    return ruleResult("keyword_stuffing", 0.9)
  }

  if (norm.length < 30 && /^(おはよう|こんにちは)/.test(norm)) {
    return ruleResult("chitchat", 0.95)
  }

  return null
}

export function classifyReportStyle(text: string, caseId: string): ReportStyleClassification {
  const strong = classifyReportStyleRulesStrong(text)
  if (strong) return strong

  if (caseId === "koko-ni-iru") {
    const model = loadClassifierModel(caseId)
    if (model) {
      const result = classifyWithModel(text, model)
      if (result && result.confidence >= 0.5) return result
    }
  }
  return classifyReportStyleRules(text)
}
