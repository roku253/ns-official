// games 配下の各 cases/<caseId>/manifest.json を走査し、公式カタログ・ルーティング・
// 管理コンソール・各パッケージの case/secrets レジストリを生成する。
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")

function kebabToScreamingPrefix(caseId) {
  return caseId
    .split("-")
    .map((p) => p.toUpperCase())
    .join("_")
}

function walkCaseManifests() {
  const gamesRoot = path.join(root, "games")
  const out = []
  if (!fs.existsSync(gamesRoot)) return out
  for (const pkg of fs.readdirSync(gamesRoot, { withFileTypes: true })) {
    if (!pkg.isDirectory() || pkg.name.startsWith(".")) continue
    const casesDir = path.join(gamesRoot, pkg.name, "cases")
    if (!fs.existsSync(casesDir)) continue
    for (const c of fs.readdirSync(casesDir, { withFileTypes: true })) {
      if (!c.isDirectory() || c.name.startsWith(".")) continue
      const mf = path.join(casesDir, c.name, "manifest.json")
      if (!fs.existsSync(mf)) continue
      const raw = fs.readFileSync(mf, "utf8")
      let data
      try {
        data = JSON.parse(raw)
      } catch (e) {
        throw new Error(`generate-game-artifacts: JSON parse failed: ${mf}: ${e.message}`)
      }
      const caseId = String(data.caseId || "").trim()
      const enginePackage = String(data.enginePackage || "").trim()
      if (!caseId || !enginePackage) {
        throw new Error(`generate-game-artifacts: caseId / enginePackage required: ${mf}`)
      }
      if (enginePackage !== pkg.name) {
        throw new Error(
          `generate-game-artifacts: enginePackage "${enginePackage}" !== folder games/${pkg.name}: ${mf}`
        )
      }
      if (caseId !== c.name) {
        throw new Error(`generate-game-artifacts: caseId "${caseId}" !== folder cases/${c.name}: ${mf}`)
      }
      out.push({ packageDir: pkg.name, caseId, manifestPath: mf, data })
    }
  }
  return out
}

function sortManifests(rows) {
  return [...rows].sort((a, b) => {
    const sa = a.data.catalog?.sortOrder ?? 999
    const sb = b.data.catalog?.sortOrder ?? 999
    if (sa !== sb) return sa - sb
    return a.caseId.localeCompare(b.caseId)
  })
}

/** `games/<engine>/static/cover-<caseId>.<ext>`（先勝ち）→ 公開 URL */
const COVER_EXTENSIONS = [".webp", ".svg", ".png", ".jpg", ".jpeg", ".gif", ".avif"]

/** `games/<engine>/static/playview-<caseId>-<番号>.<ext>` を番号順で列挙 */
const PLAYVIEW_EXTENSIONS = [".webp", ".svg", ".png", ".jpg", ".jpeg", ".gif", ".avif"]

function resolveConventionalCoverUrl(root, packageDir, caseId) {
  const staticDir = path.join(root, "games", packageDir, "static")
  if (!fs.existsSync(staticDir)) return null
  const base = `cover-${caseId}`
  for (const ext of COVER_EXTENSIONS) {
    const rel = base + ext
    if (fs.existsSync(path.join(staticDir, rel))) {
      return `/games/${packageDir}/${rel}`
    }
  }
  return null
}

function resolveConventionalPlayviews(root, packageDir, caseId, labelForAlt) {
  const staticDir = path.join(root, "games", packageDir, "static")
  if (!fs.existsSync(staticDir)) return []
  const prefix = `playview-${caseId}-`
  const hits = []
  for (const ent of fs.readdirSync(staticDir, { withFileTypes: true })) {
    if (!ent.isFile()) continue
    const name = ent.name
    const lower = name.toLowerCase()
    if (!lower.startsWith(prefix.toLowerCase())) continue
    const ext = PLAYVIEW_EXTENSIONS.find((e) => lower.endsWith(e))
    if (!ext) continue
    const stem = name.slice(0, -ext.length)
    const suffix = stem.slice(prefix.length)
    const numeric = /^\d+$/.test(suffix) ? parseInt(suffix, 10) : Number.MAX_SAFE_INTEGER
    hits.push({ numeric, name, tie: suffix })
  }
  hits.sort((a, b) => (a.numeric !== b.numeric ? a.numeric - b.numeric : a.tie.localeCompare(b.tie)))
  const altBase = (labelForAlt != null && String(labelForAlt).trim()) || caseId
  return hits.map((h, i) => ({
    src: `/games/${packageDir}/${h.name}`,
    alt: `${altBase} プレビュー ${String(i + 1).padStart(2, "0")}`,
  }))
}

/**
 * manifest の catalog をベースに、未指定なら `games/<engine>/static/` の命名規約で
 * coverImage / detail.screenshots を補完する（manifest 明示は常に優先）。
 */
function mergeCatalogWithStaticAssets(root, packageDir, caseId, catalogRaw) {
  const cat = catalogRaw && typeof catalogRaw === "object" ? { ...catalogRaw } : {}
  const explicitCover = cat.coverImage != null && String(cat.coverImage).trim()
  const autoCover = resolveConventionalCoverUrl(root, packageDir, caseId)
  if (explicitCover) {
    cat.coverImage = explicitCover
  } else if (autoCover) {
    cat.coverImage = autoCover
  } else {
    delete cat.coverImage
  }

  const detailSrc = cat.detail && typeof cat.detail === "object" ? { ...cat.detail } : {}
  const explicitShots = Array.isArray(detailSrc.screenshots)
    ? detailSrc.screenshots.filter((s) => s && String(s.src || "").trim())
    : []
  const detail = { ...detailSrc }
  if (explicitShots.length === 0) {
    const auto = resolveConventionalPlayviews(root, packageDir, caseId, cat.title)
    if (auto.length > 0) {
      detail.screenshots = auto
    } else {
      delete detail.screenshots
    }
  }
  const dk = Object.keys(detail).filter((k) => detail[k] !== undefined)
  if (dk.length > 0) {
    cat.detail = detail
  } else {
    delete cat.detail
  }
  return cat
}

function writeIfChanged(filePath, content) {
  const prev = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null
  if (prev === content) return
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content, "utf8")
  console.log(`generate-game-artifacts: wrote ${path.relative(root, filePath)}`)
}

function main() {
  const rows = sortManifests(walkCaseManifests())
  if (rows.length === 0) {
    console.warn("generate-game-artifacts: no games/*/cases/*/manifest.json found")
    return
  }

  const defaults = rows.filter((r) => r.data.isDefaultCase === true)
  if (defaults.length > 1) {
    throw new Error("generate-game-artifacts: isDefaultCase: true は1件だけにしてください")
  }
  const defaultCaseId = defaults[0]?.caseId ?? rows[0].caseId

  /** @type {Record<string, string>} */
  const publicMap = {}
  for (const r of rows) {
    const ids = Array.isArray(r.data.publicGameIds) ? r.data.publicGameIds : []
    for (const raw of ids) {
      const k = String(raw || "").trim().toLowerCase()
      if (!k) continue
      if (publicMap[k] && publicMap[k] !== r.caseId) {
        throw new Error(
          `generate-game-artifacts: publicGameIds conflict "${k}" -> ${publicMap[k]} vs ${r.caseId}`
        )
      }
      publicMap[k] = r.caseId
    }
  }

  const stories = rows.map((r) => {
    const catRaw = r.data.catalog && typeof r.data.catalog === "object" ? r.data.catalog : {}
    const cat = mergeCatalogWithStaticAssets(root, r.packageDir, r.caseId, catRaw)
    return { id: r.caseId, enginePackage: r.packageDir, ...cat }
  })

  const mapLines = Object.entries(publicMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
    .join("\n")

  const sortedAll = sortManifests(rows)

  const caseToEngineLines = sortedAll
    .map((r) => `  ${JSON.stringify(r.caseId)}: ${JSON.stringify(r.packageDir)},`)
    .join("\n")

  const signalRows = sortedAll.filter((r) => r.packageDir === "signal-trace")
  const signalCaseIdsJson = JSON.stringify(signalRows.map((r) => r.caseId))

  const routingTs = `/* eslint-disable */
/** AUTO-GENERATED — do not edit. Regenerate: npm run generate:games */
export const DEFAULT_CASE_ID = ${JSON.stringify(defaultCaseId)}

export const PUBLIC_GAME_ID_TO_CASE_ID: Record<string, string> = {
${mapLines}
}

export function resolveCaseIdForPublicGameId(gameId: string, caseIdOverride?: string): string {
  const o = (caseIdOverride || "").trim()
  if (o) return o
  const g = (gameId || "").trim().toLowerCase()
  return PUBLIC_GAME_ID_TO_CASE_ID[g] ?? DEFAULT_CASE_ID
}

/** manifest の case_id → games/<フォルダ>（静的配信・/play のスラッグ） */
export const CASE_ID_TO_ENGINE_PACKAGE: Record<string, string> = {
${caseToEngineLines}
}

/** signal-trace 系案件（任務ポータル作品。プレイ先は catalog.externalUrl） */
export const SIGNAL_TRACE_CASE_IDS = ${signalCaseIdsJson} as readonly string[]

export function usesMissionPortal(caseId: string): boolean {
  const id = (caseId || "").trim()
  return SIGNAL_TRACE_CASE_IDS.includes(id)
}

/** プレイ先未設定時のフォールバック（作品詳細）。本番プレイは externalUrl を使う */
export function playEntryPathForCase(caseId: string): string {
  const id = (caseId || "").trim()
  if (!id) return "/"
  return "/works/" + encodeURIComponent(id)
}
`
  writeIfChanged(path.join(root, "data", "official", "stories.json"), JSON.stringify(stories, null, 2) + "\n")
  writeIfChanged(path.join(root, "lib", "platform", "game-routing.generated.ts"), routingTs)

  /** @type {Map<string, { title: string, view: string, stories: { caseId: string, title: string }[] }>} */
  const adminByEngine = new Map()
  for (const r of rows) {
    const eid = String(r.data.enginePackage || "").trim()
    const engTitle = String(r.data.engineTitle || "").trim()
    const storyTitle = String(r.data.adminStoryTitle || "").trim()
    const view = r.data.adminProgressView === "minimal" ? "minimal" : "portal"
    if (!adminByEngine.has(eid)) {
      adminByEngine.set(eid, { title: engTitle || eid, view, stories: [] })
    }
    const g = adminByEngine.get(eid)
    if (g.title !== (engTitle || eid) && engTitle) g.title = engTitle
    g.stories.push({ caseId: r.caseId, title: storyTitle || r.caseId })
  }

  const adminCatalog = Array.from(adminByEngine.entries()).map(([id, v]) => ({
    id,
    title: v.title,
    adminProgressView: v.view,
    stories: v.stories,
  }))

  const adminTs = `/* eslint-disable */
/** AUTO-GENERATED — do not edit. Regenerate: npm run generate:games */
import type { AdminGameDefinition } from "./admin-catalog-types"

export const ADMIN_GAME_CATALOG_GENERATED: AdminGameDefinition[] = ${JSON.stringify(adminCatalog, null, 2)}
`
  writeIfChanged(path.join(root, "lib", "admin-game-catalog.generated.ts"), adminTs)

  const portalHub = path.join(root, "games", "signal-trace", "portal-engine")
  const platformDir = path.join(root, "lib", "platform")

  /** task-templates がある案件だけ構造・シークレットを生成（カタログ専用 manifest は除外） */
  function hasPlayableModules(r) {
    const base = path.join(root, "games", r.packageDir, "cases", r.caseId)
    return (
      fs.existsSync(path.join(base, "task-templates.ts")) ||
      fs.existsSync(path.join(base, "index.ts"))
    )
  }

  const playableAll = sortedAll.filter(hasPlayableModules)
  // 公式リポでは portal-engine を置かない（作品デプロイ側が正本）。存在する場合のみレガシー生成。
  if (fs.existsSync(portalHub)) {
    console.warn(
      "generate-game-artifacts: games/signal-trace/portal-engine が残っています（公式では不要。削除推奨）"
    )
  }

  const structImportsAll = playableAll
    .map((r) => {
      const p = kebabToScreamingPrefix(r.caseId)
      return `import { ${p}_CASE_STRUCTURE } from "@/games/${r.packageDir}/cases/${r.caseId}"`
    })
    .join("\n")
  const structEntriesAll = playableAll
    .map((r) => {
      const p = kebabToScreamingPrefix(r.caseId)
      return `  ${JSON.stringify(r.caseId)}: ${p}_CASE_STRUCTURE,`
    })
    .join("\n")
  const platformStructureTs = `/* eslint-disable */
/** AUTO-GENERATED — do not edit. Regenerate: npm run generate:games */
import type { CaseTaskStructure } from "@/lib/platform/case-types"
${structImportsAll}

export const STRUCTURE_BY_CASE_ALL: Record<string, CaseTaskStructure> = {
${structEntriesAll}
}
`
  writeIfChanged(path.join(platformDir, "all-cases-structure.generated.ts"), platformStructureTs)

  const secImportsAll = playableAll
    .map((r) => {
      const p = kebabToScreamingPrefix(r.caseId)
      return `import { ${p}_TASK_SECRETS } from "@/games/${r.packageDir}/cases/${r.caseId}/task-secrets"`
    })
    .join("\n")
  const secEntriesAll = playableAll
    .map((r) => {
      const p = kebabToScreamingPrefix(r.caseId)
      return `  ${JSON.stringify(r.caseId)}: ${p}_TASK_SECRETS,`
    })
    .join("\n")
  const platformSecretsTs = `/* eslint-disable */
/** AUTO-GENERATED — do not edit. Regenerate: npm run generate:games */
import "server-only"
import type { CaseTaskSecrets } from "@/lib/platform/case-types"
${secImportsAll}

export const SECRETS_BY_CASE_ALL: Record<string, Record<string, CaseTaskSecrets>> = {
${secEntriesAll}
}
`
  writeIfChanged(path.join(platformDir, "all-cases-secrets.generated.ts"), platformSecretsTs)

  console.log("generate-game-artifacts: done")
}

main()
