import newsData from "@/data/official/news.json"

export type NewsItem = {
  id: string
  /** YYYY-MM-DD */
  date: string
  category: string
  title: string
  body: string
  /** false のとき公開サイトに出さない（運営下書き） */
  published?: boolean
}

export type NewsCatalog = {
  items: NewsItem[]
  updatedAt?: string
}

function normalizeNewsItem(raw: unknown): NewsItem | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const id = typeof o.id === "string" ? o.id.trim() : ""
  const date = typeof o.date === "string" ? o.date.trim() : ""
  const category = typeof o.category === "string" ? o.category.trim() : ""
  const title = typeof o.title === "string" ? o.title.trim() : ""
  const body = typeof o.body === "string" ? o.body : ""
  if (!id || !date || !title) return null
  const item: NewsItem = {
    id,
    date,
    category: category || "お知らせ",
    title,
    body,
  }
  if (typeof o.published === "boolean") item.published = o.published
  return item
}

export function normalizeNewsCatalog(raw: unknown): NewsCatalog {
  if (!raw || typeof raw !== "object") return { items: [] }
  const o = raw as Record<string, unknown>
  const itemsRaw = Array.isArray(o.items) ? o.items : []
  const items = itemsRaw.map(normalizeNewsItem).filter((x): x is NewsItem => x != null)
  const updatedAt = typeof o.updatedAt === "string" ? o.updatedAt : undefined
  return { items, updatedAt }
}

/** data/official/news.json のフォールバック */
export function getStaticNewsCatalog(): NewsCatalog {
  return normalizeNewsCatalog(newsData)
}

/** 公開サイト用: published !== false のみ、日付降順 */
export function getPublishedNewsItems(catalog: NewsCatalog): NewsItem[] {
  return [...catalog.items]
    .filter((n) => n.published !== false)
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** @deprecated 互換: 静的 JSON のみ（サーバ初期描画用） */
export function getNewsItems(): NewsItem[] {
  return getPublishedNewsItems(getStaticNewsCatalog())
}

export function formatNewsDate(date: string): string {
  const [y, m, d] = date.split("-")
  if (!y || !m || !d) return date
  return `${y}.${m}.${d}`
}

export function newNewsId(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  const r = Math.random().toString(36).slice(2, 7)
  return `${y}-${m}-${d}-${r}`
}
