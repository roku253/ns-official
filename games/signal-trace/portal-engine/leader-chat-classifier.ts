import fs from "node:fs"
import path from "node:path"
import {
  fallbackLeaderResponseId,
  isLeaderChatResponseId,
  type LeaderChatResponseId,
} from "@/games/signal-trace/cases/koko-ni-iru/leader-chat-labels"
import { normalizeKeywordAnswer } from "@/games/signal-trace/portal-engine/normalize-keyword"

export type LeaderChatClassification = {
  responseId: LeaderChatResponseId
  confidence: number
  scores: Partial<Record<LeaderChatResponseId, number>>
  source: "model" | "fallback"
}

type ConvExport = {
  size: number
  weight: number[][]
  bias: number[]
}

type ClassifierMeta = {
  version: number
  modelType: "textcnn" | "char_lr"
  caseId: string
  labels: string[]
  minConfidence: number
  maxLen?: number
  embDim?: number
  numFilters?: number
  filterSizes?: number[]
  charToIndex?: Record<string, number>
  embedding?: number[][]
  convs?: ConvExport[]
  fcWeight?: number[][]
  fcBias?: number[]
  vocabulary?: string[]
  idf?: number[]
  intercept?: number[]
  sparseFile?: string
}

type CachedCnn = {
  caseId: string
  meta: ClassifierMeta
}

type CachedLr = {
  caseId: string
  labels: string[]
  vocabIndex: Map<string, number>
  idf: number[]
  intercept: number[]
  sparseWeights: number[][][]
  minConfidence: number
}

let cachedCnn: CachedCnn | null = null
let cachedLr: CachedLr | null = null
let loadFailed = false

const MIN_CONFIDENCE_DEFAULT = 0.28

function caseDir(caseId: string): string {
  return path.join(process.cwd(), "games", "signal-trace", "cases", caseId)
}

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

function loadMeta(caseId: string): ClassifierMeta | null {
  if (loadFailed) return null
  const metaPath = path.join(caseDir(caseId), "leader-chat-classifier-meta.json")
  try {
    if (!fs.existsSync(metaPath)) {
      loadFailed = true
      console.error("[leader-chat-classifier] meta missing:", metaPath)
      return null
    }
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as ClassifierMeta
    if (meta.version !== 3) throw new Error("meta version must be 3")
    return meta
  } catch (err) {
    loadFailed = true
    console.error("[leader-chat-classifier] load failed:", err)
    return null
  }
}

function loadLrModel(caseId: string): CachedLr | null {
  if (cachedLr?.caseId === caseId) return cachedLr
  const meta = loadMeta(caseId)
  if (!meta || meta.modelType !== "char_lr") return null

  const sparseName = meta.sparseFile ?? "leader-chat-classifier-sparse.tsv"
  const sparsePath = path.join(caseDir(caseId), sparseName)
  if (!fs.existsSync(sparsePath)) {
    loadFailed = true
    return null
  }

  const vocabulary = meta.vocabulary ?? []
  cachedLr = {
    caseId,
    labels: meta.labels,
    vocabIndex: new Map(vocabulary.map((t, i) => [t, i])),
    idf: meta.idf ?? [],
    intercept: meta.intercept ?? [],
    sparseWeights: loadSparseWeights(sparsePath, meta.labels.length),
    minConfidence: meta.minConfidence ?? MIN_CONFIDENCE_DEFAULT,
  }
  return cachedLr
}

function loadCnnModel(caseId: string): CachedCnn | null {
  if (cachedCnn?.caseId === caseId) return cachedCnn
  const meta = loadMeta(caseId)
  if (!meta || meta.modelType !== "textcnn") return null
  cachedCnn = { caseId, meta }
  return cachedCnn
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

function softmax(logits: number[]): number[] {
  const max = Math.max(...logits)
  const exps = logits.map((x) => Math.exp(x - max))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map((e) => e / sum)
}

function relu(x: number): number {
  return x > 0 ? x : 0
}

function encodeCnn(text: string, meta: ClassifierMeta): number[] {
  const indices: number[] = []
  const unk = meta.charToIndex?.["<UNK>"] ?? 1
  const pad = meta.charToIndex?.["<PAD>"] ?? 0
  const maxLen = meta.maxLen ?? 128
  for (const ch of text) {
    indices.push(meta.charToIndex?.[ch] ?? unk)
    if (indices.length >= maxLen) break
  }
  while (indices.length < maxLen) indices.push(pad)
  return indices
}

function convPool(
  emb: number[][],
  conv: ConvExport,
  embDim: number,
  numFilters: number
): number[] {
  const maxLen = emb.length
  const k = conv.size
  const out = new Array(numFilters).fill(Number.NEGATIVE_INFINITY)
  for (let i = 0; i <= maxLen - k; i++) {
    for (let f = 0; f < numFilters; f++) {
      let sum = conv.bias[f]
      let wi = 0
      for (let j = 0; j < k; j++) {
        for (let d = 0; d < embDim; d++) {
          sum += emb[i + j][d] * conv.weight[f][wi]
          wi++
        }
      }
      const v = relu(sum)
      if (v > out[f]) out[f] = v
    }
  }
  for (let f = 0; f < numFilters; f++) {
    if (!Number.isFinite(out[f])) out[f] = 0
  }
  return out
}

function forwardCnn(text: string, model: CachedCnn): number[] {
  const { meta } = model
  const embDim = meta.embDim ?? 48
  const numFilters = meta.numFilters ?? 48
  const indices = encodeCnn(text, meta)
  const embedding = meta.embedding ?? []
  const emb: number[][] = indices.map((idx) => embedding[idx] ?? embedding[0] ?? [])
  const pooled: number[] = []
  for (const conv of meta.convs ?? []) {
    pooled.push(...convPool(emb, conv, embDim, numFilters))
  }
  return softmax(
    (meta.fcBias ?? []).map((b, ci) => {
      let s = b
      for (let i = 0; i < pooled.length; i++) {
        s += pooled[i] * (meta.fcWeight?.[ci]?.[i] ?? 0)
      }
      return s
    })
  )
}

function forwardLr(text: string, model: CachedLr): number[] | null {
  const grams = charNgrams(text, 2, 4)
  if (grams.size === 0) return null
  const featureTfidf = new Map<number, number>()
  for (const [gram, tf] of grams) {
    const idx = model.vocabIndex.get(gram)
    if (idx === undefined) continue
    featureTfidf.set(idx, (1 + Math.log(tf)) * model.idf[idx])
  }
  if (featureTfidf.size === 0) return null
  const logits = model.sparseWeights.map((weights, li) => {
    let s = model.intercept[li] ?? 0
    for (const [fi, coef] of weights) {
      const tfidf = featureTfidf.get(fi)
      if (tfidf !== undefined) s += coef * tfidf
    }
    return s
  })
  return softmax(logits)
}

function pickBest(
  probs: number[],
  labels: string[],
  minConf: number
): LeaderChatClassification {
  const fallbackId = fallbackLeaderResponseId()
  let bestIdx = 0
  let bestProb = -1
  for (let i = 0; i < probs.length; i++) {
    if (probs[i] > bestProb) {
      bestProb = probs[i]
      bestIdx = i
    }
  }
  const scores: Partial<Record<LeaderChatResponseId, number>> = {}
  for (let i = 0; i < labels.length; i++) {
    const id = labels[i]
    if (isLeaderChatResponseId(id)) scores[id] = probs[i]
  }
  const rawId = labels[bestIdx] ?? fallbackId
  const responseId = isLeaderChatResponseId(rawId) ? rawId : fallbackId
  if (bestProb < minConf) {
    return { responseId: fallbackId, confidence: bestProb, scores, source: "fallback" }
  }
  return { responseId, confidence: bestProb, scores, source: "model" }
}

export function classifyLeaderChat(
  messageText: string,
  caseId: string
): LeaderChatClassification {
  const fallbackId = fallbackLeaderResponseId()
  const meta = loadMeta(caseId)
  if (!meta) {
    return { responseId: fallbackId, confidence: 0, scores: {}, source: "fallback" }
  }

  const minConf = meta.minConfidence ?? MIN_CONFIDENCE_DEFAULT

  if (meta.modelType === "textcnn") {
    const cnn = loadCnnModel(caseId)
    if (!cnn) {
      return { responseId: fallbackId, confidence: 0, scores: {}, source: "fallback" }
    }
    return pickBest(forwardCnn(messageText, cnn), meta.labels, minConf)
  }

  const lr = loadLrModel(caseId)
  if (!lr) {
    return { responseId: fallbackId, confidence: 0, scores: {}, source: "fallback" }
  }
  const probs = forwardLr(messageText, lr)
  if (!probs) {
    return { responseId: fallbackId, confidence: 0, scores: {}, source: "fallback" }
  }
  return pickBest(probs, lr.labels, lr.minConfidence)
}
