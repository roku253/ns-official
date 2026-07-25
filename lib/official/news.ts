import newsData from "@/data/official/news.json"

export type NewsItem = {
  id: string
  /** YYYY-MM-DD */
  date: string
  category: string
  title: string
  body: string
}

/** data/official/news.json の項目を日付降順で返す */
export function getNewsItems(): NewsItem[] {
  const items = Array.isArray(newsData.items) ? (newsData.items as NewsItem[]) : []
  return [...items].sort((a, b) => b.date.localeCompare(a.date))
}

export function formatNewsDate(date: string): string {
  const [y, m, d] = date.split("-")
  if (!y || !m || !d) return date
  return `${y}.${m}.${d}`
}
