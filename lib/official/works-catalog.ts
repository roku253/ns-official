/** 詳細ページ用の追加メタ。manifest `catalog.detail` から流入 */
export interface WorkDetailRecord {
  /** 想定プレイ時間（分）。範囲指定したいときは min/max を併用 */
  estimatedPlayMinutes?: number
  estimatedPlayMinutesMin?: number
  estimatedPlayMinutesMax?: number
  /** gameKind ラベルに加えて表示する任意のタグ（世界観・要素ジャンルなど） */
  genres?: string[]
  /** プレイ画面の参考スクリーンショット */
  screenshots?: { src: string; alt?: string }[]
  /** 詳細説明（段落配列）。長文は配列で渡すと段落毎にレイアウト */
  longDescription?: string[]
}

/** 公式カタログの1件分。正本は各 games パッケージの cases 配下 manifest から生成された stories.json */
export interface WorkStoryRecord {
  id: string
  title: string
  status: string
  theme: string
  /** UI フィルター用（manifest `catalog.gameKind`）。未設定は一覧では「種類なし」扱い */
  gameKind?: string
  published?: boolean
  featured?: boolean
  sortOrder?: number
  tagline?: string
  subtitle?: string
  coverImage?: string
  /** Tailwind グラデ用クラス接尾（カード背景） */
  accent?: string
  /** 同じエンジン（ゲームパッケージ）配下にある別 case の関連付けに使う */
  enginePackage?: string
  /** 公式「プレイ」で外部 URL を開くときのベース URL（トークンは別途付与） */
  externalUrl?: string
  /** issueAccessToken の resource_key と対応 */
  tokenResource?: string
  /** 詳細ページ用の追加情報（任意） */
  detail?: WorkDetailRecord
}

/**
 * GAS / NSPlatform `works_catalog` JSON（v2）
 *
 * ```json
 * {
 *   "featuredId": "kieta-shounen",
 *   "overrides": { "kieta-shounen": { "title": "…" } },
 *   "works": {
 *     "signal-trace": {
 *       "published": true,
 *       "featuredId": "kieta-shounen",
 *       "stories": {
 *         "kieta-shounen": { "published": true },
 *         "kioku-no-tokashikata": { "published": false }
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * レガシー（v1）: `published: string[]` のみ。配列があるとき ID ホワイトリストで絞る。
 * アダプタは `hydrateWorksCatalogFromSources` / `isStoryVisibleOnPublicSite` が読み取り時に統合する。
 */
export type GasStoryEntry = {
  published?: boolean
  title?: string
  tagline?: string
  subtitle?: string
  status?: string
  coverImage?: string
  detail?: WorkDetailRecord
}

export type GasWorkEntry = {
  published?: boolean
  featuredId?: string | null
  stories?: Record<string, GasStoryEntry>
}

export type GasWorksCatalog = {
  works?: Record<string, GasWorkEntry> | null
  /** レガシー: 公開する story id のフラット配列（空配列＝全非表示） */
  published?: string[] | null
  /** トップ「おすすめ」枠に使う story id（グローバル） */
  featuredId?: string | null
  /** レガシー: story id ごとの表示名上書き（詳細は works.stories 側を正） */
  overrides?: Record<
    string,
    { title?: string; tagline?: string; subtitle?: string; status?: string; coverImage?: string; detail?: WorkDetailRecord }
  > | null
}

export type MergedWorkItem = WorkStoryRecord & {
  displayTitle: string
  displayTagline: string
  displaySubtitle?: string
}

/** 静的レコードの「作品」キー（一覧の親行）。enginePackage が無い単体作品は id をキーにする */
export function workKeyFromStoryRecord(s: Pick<WorkStoryRecord, "id" | "enginePackage">): string {
  const eng = (s.enginePackage || "").trim()
  return eng || s.id
}

export function gasCatalogUsesNestedWorks(catalog: GasWorksCatalog | null | undefined): boolean {
  const w = catalog?.works
  return Boolean(w && typeof w === "object" && !Array.isArray(w) && Object.keys(w).length > 0)
}

function displayOverridesForStory(
  gasCatalog: GasWorksCatalog | null | undefined,
  s: WorkStoryRecord
): {
  title?: string
  tagline?: string
  subtitle?: string
  status?: string
  coverImage?: string
  detail?: WorkDetailRecord
} {
  const top = gasCatalog?.overrides?.[s.id] || {}
  const wk = workKeyFromStoryRecord(s)
  const nest = gasCatalog?.works?.[wk]?.stories?.[s.id]
  const fromNest = {
    title: nest?.title,
    tagline: nest?.tagline,
    subtitle: nest?.subtitle,
    status: nest?.status,
    coverImage: nest?.coverImage,
    detail: nest?.detail,
  }
  const strings = Object.fromEntries(
    Object.entries({
      title: fromNest.title ?? top.title,
      tagline: fromNest.tagline ?? top.tagline,
      subtitle: fromNest.subtitle ?? top.subtitle,
      status: fromNest.status ?? top.status,
      coverImage: fromNest.coverImage ?? top.coverImage,
    }).filter(([, v]) => typeof v === "string" && v.trim().length > 0)
  ) as {
    title?: string
    tagline?: string
    subtitle?: string
    status?: string
    coverImage?: string
  }
  const detail = mergeWorkDetail(s.detail, fromNest.detail ?? top.detail)
  return { ...strings, detail }
}

/** GAS 上書きを静的 detail に重ねる。配列・数値は上書き側が定義されていれば置換 */
export function mergeWorkDetail(
  base: WorkDetailRecord | undefined,
  override: WorkDetailRecord | undefined | null
): WorkDetailRecord | undefined {
  if (!override || typeof override !== "object") return base
  const next: WorkDetailRecord = { ...(base || {}) }
  if (typeof override.estimatedPlayMinutes === "number") {
    next.estimatedPlayMinutes = override.estimatedPlayMinutes
  }
  if (typeof override.estimatedPlayMinutesMin === "number") {
    next.estimatedPlayMinutesMin = override.estimatedPlayMinutesMin
  }
  if (typeof override.estimatedPlayMinutesMax === "number") {
    next.estimatedPlayMinutesMax = override.estimatedPlayMinutesMax
  }
  if (Array.isArray(override.genres)) {
    next.genres = override.genres.map((g) => String(g)).filter((g) => g.trim().length > 0)
  }
  if (Array.isArray(override.longDescription)) {
    next.longDescription = override.longDescription.map((p) => String(p)).filter((p) => p.trim().length > 0)
  }
  if (Array.isArray(override.screenshots)) {
    next.screenshots = override.screenshots
      .map((shot) => {
        if (!shot || typeof shot !== "object") return null
        const src = typeof shot.src === "string" ? shot.src.trim() : ""
        if (!src) return null
        const alt = typeof shot.alt === "string" ? shot.alt.trim() : undefined
        return alt ? { src, alt } : { src }
      })
      .filter((x): x is { src: string; alt?: string } => x != null)
  }
  return next
}

function applyStoryOverridesToRecord(
  s: WorkStoryRecord,
  gasCatalog: GasWorksCatalog | null | undefined
): MergedWorkItem {
  const o = displayOverridesForStory(gasCatalog, s)
  return {
    ...s,
    title: o.title ?? s.title,
    tagline: o.tagline ?? s.tagline,
    subtitle: o.subtitle ?? s.subtitle,
    status: o.status ?? s.status,
    coverImage: o.coverImage ?? s.coverImage,
    detail: o.detail ?? s.detail,
    displayTitle: o.title ?? s.title,
    displayTagline: o.tagline ?? s.tagline ?? "",
    displaySubtitle: o.subtitle ?? s.subtitle,
  }
}

/**
 * 公式サイト（プレイヤー向け）で story が一覧・検索・おすすめ候補に載るか。
 * v2: 親 work の published と story の published の両方が偽でないこと。static `published: false` は GAS で story を true にしたときのみ載せる。
 * v1: static published と任意の `published[]` ホワイトリスト。
 */
export function isStoryVisibleOnPublicSite(
  s: WorkStoryRecord,
  gasCatalog: GasWorksCatalog | null | undefined
): boolean {
  if (gasCatalogUsesNestedWorks(gasCatalog)) {
    const wk = workKeyFromStoryRecord(s)
    const we = gasCatalog!.works![wk]
    if (!we) {
      return s.published !== false
    }
    const workOn = we.published !== false
    const st = we.stories?.[s.id]
    const sp = st?.published
    if (s.published === false) {
      return workOn && sp === true
    }
    if (sp === false) return false
    if (sp === true) return workOn
    // sp === undefined => not explicitly set in GAS; fall back to static flag
    return workOn
  }

  if (s.published === false) return false
  if (gasCatalog != null && Array.isArray(gasCatalog.published)) {
    return gasCatalog.published.includes(s.id)
  }
  return true
}

export function mergeWorksCatalog(
  staticWorks: WorkStoryRecord[],
  gasCatalog: GasWorksCatalog | null | undefined
): MergedWorkItem[] {
  const list = staticWorks.filter((s) => isStoryVisibleOnPublicSite(s, gasCatalog))

  return list
    .map((s) => applyStoryOverridesToRecord(s, gasCatalog))
    .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))
}

/** ヒーロー枠: GAS の featured → 静的 featured フラグ → sort 先頭（＝最新扱い） */
export function pickFeaturedWithMeta(
  works: MergedWorkItem[],
  gasCatalog: GasWorksCatalog | null | undefined
): { featured: MergedWorkItem | null; badge: "pick" | "latest" } {
  const fid = gasCatalog?.featuredId?.trim()
  if (fid) {
    const hit = works.find((w) => w.id === fid)
    if (hit) return { featured: hit, badge: "pick" }
  }
  const flagged = works.find((w) => w.featured)
  if (flagged) return { featured: flagged, badge: "pick" }
  const first = works[0] ?? null
  return { featured: first, badge: "latest" }
}

export function worksExceptFeatured(all: MergedWorkItem[], featured: MergedWorkItem | null): MergedWorkItem[] {
  if (!featured) return all
  return all.filter((w) => w.id !== featured.id)
}

/** 公式 UI 用: case_id に対応する表示タイトル（GAS overrides の displayTitle） */
export function workDisplayTitleForCaseId(works: MergedWorkItem[], caseId: string): string {
  const id = (caseId || "").trim()
  if (!id) return ""
  return works.find((w) => w.id === id)?.displayTitle ?? id
}

/** カタログ並び（`mergeWorks` の sortOrder 昇順と同一）での 0 起算 index から作品コードを返す。 */
export function caseMarkCodeForIndex(index: number): string {
  const i = Number.isFinite(index) ? Math.floor(index) : 0
  const safe = i < 0 ? 0 : i
  const n = safe + 1
  return `CASE MARK.${String(n).padStart(3, "0")}`
}

/** 全件カタログ内での作品の 0 起算インデックス（見つからないときは 0）。 */
export function catalogIndexForWorkId(works: MergedWorkItem[], id: string): number {
  const idx = works.findIndex((w) => w.id === id)
  return idx < 0 ? 0 : idx
}

export function caseMarkCodeForWorkId(works: MergedWorkItem[], workId: string): string {
  return caseMarkCodeForIndex(catalogIndexForWorkId(works, workId))
}

/** ID で 1 件取得（見つからなければ null） */
export function findMergedWorkById(works: MergedWorkItem[], id: string): MergedWorkItem | null {
  const k = (id || "").trim()
  if (!k) return null
  return works.find((w) => w.id === k) ?? null
}

/** 静的 manifest 由来の 1 件に GAS overrides のみ適用した MergedWorkItem（published 絞りは行わない） */
export function mergedItemFromStaticRecord(
  s: WorkStoryRecord,
  gasCatalog: GasWorksCatalog | null | undefined
): MergedWorkItem {
  return applyStoryOverridesToRecord(s, gasCatalog)
}

/**
 * 一覧用 mergedWorks を優先する。公開されていない story は null（旧実装の静的フォールバックは
 * 未公開ストーリーが一覧外でも URL で参照できてしまう漏れの原因だったため廃止）。
 */
export function findMergedWorkByIdOrStatic(
  mergedWorks: MergedWorkItem[],
  _staticWorks: WorkStoryRecord[],
  _gasCatalog: GasWorksCatalog | null | undefined,
  id: string
): MergedWorkItem | null {
  void _staticWorks
  void _gasCatalog
  return findMergedWorkById(mergedWorks, id)
}

/**
 * 作品詳細の「Stories」欄: 同一 engine のストーリーを列挙。
 * 公開条件を満たす兄弟のみ（現在閲覧中のカードは merged に無いことは無いが、念のため current は常に含める）。
 */
export function engineStoriesForWorkDetail(
  mergedWorks: MergedWorkItem[],
  staticWorks: WorkStoryRecord[],
  gasCatalog: GasWorksCatalog | null | undefined,
  current: MergedWorkItem | null
): MergedWorkItem[] {
  if (!current) return []
  const eng = (current.enginePackage || "").trim()
  if (!eng) return [current]

  const roster = staticWorks
    .filter((s) => (s.enginePackage || "").trim() === eng)
    .filter((s) => s.id === current.id || isStoryVisibleOnPublicSite(s, gasCatalog))
    .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))

  const byId = new Map(mergedWorks.map((w) => [w.id, w]))
  return roster.map((s) => byId.get(s.id) ?? mergedItemFromStaticRecord(s, gasCatalog))
}

/**
 * 同一 enginePackage 配下の別 case を関連コンテンツとして列挙。
 */
export function relatedWorksForEngine(works: MergedWorkItem[], current: MergedWorkItem | null): MergedWorkItem[] {
  if (!current) return []
  const eng = (current.enginePackage || "").trim()
  if (!eng) return []
  return works.filter((w) => w.enginePackage === eng && w.id !== current.id)
}

/**
 * 同一 enginePackage に属する全ストーリー（現在閲覧中の case を含む）を、
 * カタログ並び（sortOrder 昇順）で返す。
 */
export function engineStoriesForWork(works: MergedWorkItem[], current: MergedWorkItem | null): MergedWorkItem[] {
  if (!current) return []
  const eng = (current.enginePackage || "").trim()
  if (!eng) return [current]
  return works.filter((w) => w.enginePackage === eng)
}

/** 想定プレイ時間の表示文字列。"30 分" / "20-30 分" / "" を返す */
export function formatEstimatedPlay(detail: WorkDetailRecord | undefined | null): string {
  if (!detail) return ""
  const single = Number.isFinite(detail.estimatedPlayMinutes)
    ? Math.max(0, Math.floor(detail.estimatedPlayMinutes as number))
    : 0
  const min = Number.isFinite(detail.estimatedPlayMinutesMin)
    ? Math.max(0, Math.floor(detail.estimatedPlayMinutesMin as number))
    : 0
  const max = Number.isFinite(detail.estimatedPlayMinutesMax)
    ? Math.max(0, Math.floor(detail.estimatedPlayMinutesMax as number))
    : 0
  if (min > 0 && max > 0 && max > min) return `${min}–${max} 分`
  if (single > 0) return `${single} 分`
  if (min > 0) return `${min} 分〜`
  if (max > 0) return `〜${max} 分`
  return ""
}

export function filterMergedWorksByCatalog(
  works: MergedWorkItem[],
  query: string,
  gameKind: string | null | undefined
): MergedWorkItem[] {
  const q = query.trim().toLowerCase()
  const kind = (gameKind || "all").trim()

  return works.filter((w) => {
    if (kind && kind !== "all") {
      const wk = (w.gameKind || "").trim()
      if (wk !== kind) return false
    }
    if (!q) return true
    const haystack = [
      w.displayTitle,
      w.displaySubtitle,
      w.displayTagline,
      w.title,
      w.subtitle,
      w.tagline,
      w.id,
    ]
      .filter((s): s is string => typeof s === "string" && s.length > 0)
      .join("\u0000")
      .toLowerCase()
    return haystack.includes(q)
  })
}

function groupStaticStoriesByWorkKey(staticWorks: WorkStoryRecord[]): Map<string, WorkStoryRecord[]> {
  const groups = new Map<string, WorkStoryRecord[]>()
  for (const s of staticWorks) {
    const wk = workKeyFromStoryRecord(s)
    if (!groups.has(wk)) groups.set(wk, [])
    groups.get(wk)!.push(s)
  }
  for (const arr of groups.values()) {
    arr.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))
  }
  return groups
}

/** 1 story のみの work は、作品トグルと story トグルを同一値に揃える（UI は親チェックのみ） */
function syncSingleStoryWorkEntries(
  catalog: GasWorksCatalog,
  groups: Map<string, WorkStoryRecord[]>
): void {
  const works = catalog.works
  if (!works) return
  for (const [wk, items] of groups) {
    if (items.length !== 1) continue
    const sid = items[0]!.id
    const we = works[wk]
    if (!we?.stories?.[sid]) continue
    const wp = we.published !== false
    const sp = we.stories[sid].published !== false
    const combined = wp && sp
    works[wk] = {
      ...we,
      published: combined,
      stories: { ...we.stories, [sid]: { ...we.stories[sid], published: combined } },
    }
  }
}

/**
 * 管理画面用: GAS から読んだ JSON を静的 stories と突き合わせ、編集用の完全な v2 `works` を生成する。
 * レガシー `published[]` だけのシートでもここで v2 に正規化して UI に載せる。
 */
export function hydrateWorksCatalogFromSources(
  staticWorks: WorkStoryRecord[],
  raw: GasWorksCatalog | null | undefined
): GasWorksCatalog {
  const gas = raw && typeof raw === "object" ? { ...raw } : {}
  const groups = groupStaticStoriesByWorkKey(staticWorks)

  if (gasCatalogUsesNestedWorks(gas)) {
    const works: Record<string, GasWorkEntry> = { ...(gas.works as Record<string, GasWorkEntry>) }
    for (const [wk, items] of groups) {
      const existing = works[wk] || {}
      const stories: Record<string, GasStoryEntry> = { ...(existing.stories || {}) }
      for (const s of items) {
        const prev = stories[s.id] || {}
        const published =
          typeof prev.published === "boolean" ? prev.published : s.published !== false
        stories[s.id] = {
          ...prev,
          published,
        }
      }
      works[wk] = {
        published: existing.published !== false,
        featuredId: existing.featuredId ?? null,
        stories,
      }
    }
    const merged: GasWorksCatalog = {
      ...gas,
      works,
      featuredId:
        gas.featuredId ??
        staticWorks.find((x) => x.featured)?.id ??
        staticWorks[0]?.id ??
        null,
    }
    syncSingleStoryWorkEntries(merged, groups)
    return merged
  }

  const legacyPublished = gas.published
  const hasArray = Array.isArray(legacyPublished)
  const works: Record<string, GasWorkEntry> = {}

  for (const [wk, items] of groups) {
    const stories: Record<string, GasStoryEntry> = {}
    for (const s of items) {
      const published = !hasArray ? s.published !== false : legacyPublished!.includes(s.id)
      const o = gas.overrides?.[s.id]
      stories[s.id] = {
        published,
        ...(o?.title ? { title: o.title } : {}),
        ...(o?.tagline ? { tagline: o.tagline } : {}),
        ...(o?.subtitle ? { subtitle: o.subtitle } : {}),
        ...(o?.status ? { status: o.status } : {}),
        ...(o?.coverImage ? { coverImage: o.coverImage } : {}),
        ...(o?.detail ? { detail: o.detail } : {}),
      }
    }
    const featuredInWork =
      (typeof gas.featuredId === "string" && gas.featuredId && items.some((x) => x.id === gas.featuredId)
        ? gas.featuredId
        : null) ||
      items.find((x) => x.featured)?.id ||
      null
    works[wk] = {
      published: true,
      featuredId: featuredInWork,
      stories,
    }
  }

  const out: GasWorksCatalog = {
    works,
    featuredId:
      gas.featuredId ?? staticWorks.find((x) => x.featured)?.id ?? staticWorks[0]?.id ?? null,
    overrides: gas.overrides ?? undefined,
  }

  syncSingleStoryWorkEntries(out, groups)
  return out
}

/** 管理画面保存用: 表示テキスト・詳細上書きをトップレベル overrides に寄せ、本体は v2 works を送る */
export function serializeWorksCatalogForGas(staticWorks: WorkStoryRecord[], ui: GasWorksCatalog): GasWorksCatalog {
  const hydrated = hydrateWorksCatalogFromSources(staticWorks, ui)
  const overrides: NonNullable<GasWorksCatalog["overrides"]> = { ...(hydrated.overrides || {}) }

  for (const s of staticWorks) {
    const wk = workKeyFromStoryRecord(s)
    const st = hydrated.works?.[wk]?.stories?.[s.id]
    if (!st) continue
    const text: NonNullable<GasWorksCatalog["overrides"]>[string] = {}
    if (st.title) text.title = st.title
    if (st.tagline) text.tagline = st.tagline
    if (st.subtitle) text.subtitle = st.subtitle
    if (st.status) text.status = st.status
    if (st.coverImage) text.coverImage = st.coverImage
    if (st.detail && typeof st.detail === "object") text.detail = st.detail
    if (Object.keys(text).length > 0) {
      overrides[s.id] = { ...(overrides[s.id] || {}), ...text }
    }
  }

  return {
    featuredId: hydrated.featuredId ?? null,
    overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
    works: hydrated.works,
  }
}
