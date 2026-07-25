/**
 * 分類器の簡易検証（node scripts/verify-kn-report-classifier.mjs）
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const caseDir = path.join(root, "games/signal-trace/cases/koko-ni-iru")

const samples = [
  ["おはようございます。", "chitchat"],
  ["何を調べればいいですか。", "meta_lost"],
  ["伝承、削除、矛盾、転校", "keyword_stuffing"],
  [
    "掲示板を確認した。伝承の記述と投稿の言い回しが食い違うので記録した。",
    "report_substantive",
  ],
]

function* iterateLines(content) {
  let start = 0
  for (let i = 0; i < content.length; i++) {
    if (content[i] === "\n") {
      if (i > start) yield content.slice(start, i)
      start = i + 1
    }
  }
  if (start < content.length) yield content.slice(start)
}

function loadSparse(sparsePath, labelCount) {
  const sparseWeights = Array.from({ length: labelCount }, () => [])
  const content = fs.readFileSync(sparsePath, "utf8")
  let headerSkipped = false
  for (const line of iterateLines(content)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (!headerSkipped && trimmed.startsWith("labelIndex")) {
      headerSkipped = true
      continue
    }
    const [li, fi, v] = trimmed.split("\t").map(Number)
    if (!Number.isFinite(li) || li < 0 || li >= labelCount) continue
    sparseWeights[li].push([fi, v])
  }
  return sparseWeights
}

const metaPath = path.join(caseDir, "report-style-classifier-meta.json")
const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"))
const sparsePath = path.join(caseDir, meta.sparseFile ?? "report-style-classifier-sparse.tsv")
const sparseWeights = loadSparse(sparsePath, meta.labels.length)
console.log(
  `Meta v${meta.version}: ${meta.labels.length} labels, ${meta.vocabulary.length} features, ` +
    `${meta.nonzeroCoefficients} nonzero`
)
console.log(
  `Files: meta ${(fs.statSync(metaPath).size / 1024).toFixed(1)} KB, sparse ${(fs.statSync(sparsePath).size / 1024).toFixed(1)} KB`
)

function rulesStrong(text) {
  const t = text.trim()
  if (t.length <= 35 && /^(おはよう|こんにちは|こんばんは|お疲れ|ありがとう|了解|テスト|雑談)/.test(t)) {
    return "chitchat"
  }
  if (
    /(何を調べ|わからなくな|教えてください|ヒント|クリア条件)/.test(t) &&
    !/(掲示板|板|スレ|ログ).{0,30}(確認|読|見た)/.test(t)
  ) {
    return "meta_lost"
  }
  const parts = t.split(/[、,\s]+/).filter(Boolean)
  if (
    parts.length >= 4 &&
    parts.every((p) => p.length <= 12) &&
    t.length < 120 &&
    !/(ので|から|ため|と思|掲示板を)/.test(t)
  ) {
    return "keyword_stuffing"
  }
  return null
}

function classifySparse(text, meta, sparseWeights) {
  const norm = text.normalize("NFKC").toLowerCase()
  const grams = new Map()
  for (let n = 2; n <= 4; n++) {
    for (let i = 0; i <= norm.length - n; i++) {
      const g = norm.slice(i, i + n)
      grams.set(g, (grams.get(g) ?? 0) + 1)
    }
  }
  const vocabIndex = new Map(meta.vocabulary.map((t, i) => [t, i]))
  const featureTfidf = new Map()
  for (const [gram, tf] of grams) {
    const idx = vocabIndex.get(gram)
    if (idx === undefined) continue
    featureTfidf.set(idx, (1 + Math.log(tf)) * meta.idf[idx])
  }
  const logits = sparseWeights.map((weights, li) => {
    let s = meta.intercept[li]
    for (const [fi, coef] of weights) {
      const tfidf = featureTfidf.get(fi)
      if (tfidf !== undefined) s += coef * tfidf
    }
    return s
  })
  let max = logits[0]
  for (let i = 1; i < logits.length; i++) if (logits[i] > max) max = logits[i]
  const exps = logits.map((x) => Math.exp(x - max))
  const sum = exps.reduce((a, b) => a + b, 0)
  const probs = exps.map((e) => e / sum)
  let best = 0
  for (let i = 1; i < probs.length; i++) if (probs[i] > probs[best]) best = i
  return meta.labels[best]
}

/**
 * 本番の reconcileReportStyle 相当の補正（portal-engine/report-style-reconcile.ts と同思想）。
 * 理由付き・複数文・板への言及がある事実報告は BAD ラベルから戻す。
 */
function reconcileLite(text, got) {
  const bad = ["chitchat", "meta_lost", "off_topic", "keyword_stuffing"]
  if (!bad.includes(got)) return got
  const hasReason = /(ので|から|ため|と思)/.test(text)
  const sentences = text.split(/[。！？!?]/).filter((s) => s.trim().length > 0).length
  const boardMention = /(掲示板|板|スレ|ログ)/.test(text)
  if (hasReason && (boardMention || sentences >= 2)) return "report_substantive"
  return got
}

let ok = true
for (const [text, expected] of samples) {
  const ruleLabel = rulesStrong(text)
  if (ruleLabel) {
    const pass = ruleLabel === expected
    if (!pass) ok = false
    console.log(`${pass ? "OK" : "FAIL"} [rules] expected=${expected} got=${ruleLabel}`)
    continue
  }
  const raw = classifySparse(text, meta, sparseWeights)
  const got = reconcileLite(text, raw)
  const pass = got === expected
  if (!pass) ok = false
  console.log(
    `${pass ? "OK" : "FAIL"} [model${raw === got ? "" : "+reconcile"}] expected=${expected} got=${got} (raw=${raw}) :: ${text.slice(0, 40)}`
  )
}
process.exit(ok ? 0 : 1)
