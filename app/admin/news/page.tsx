"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AdminConsoleShell, adminBtnClass } from "@/components/admin/admin-console-shell"
import { ADMIN_CACHE_KEYS, adminCacheRead, adminCacheWrite } from "@/lib/admin/admin-cache"
import {
  getStaticNewsCatalog,
  newNewsId,
  normalizeNewsCatalog,
  type NewsCatalog,
  type NewsItem,
} from "@/lib/official/news"
import { cn } from "@/lib/utils"

function blankItem(): NewsItem {
  const today = new Date()
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, "0")
  const d = String(today.getDate()).padStart(2, "0")
  return {
    id: newNewsId(today),
    date: `${y}-${m}-${d}`,
    category: "お知らせ",
    title: "",
    body: "",
    published: true,
  }
}

const fieldClass =
  "rounded-sm border-[#30363d] bg-[#0e1116] text-[#e6edf3] placeholder:text-[#8b949e] focus-visible:border-[#1f6feb] focus-visible:ring-[#1f6feb]/30"

export default function AdminNewsPage() {
  const [catalog, setCatalog] = useState<NewsCatalog>({ items: [] })
  const [selectedId, setSelectedId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasCache, setHasCache] = useState(false)

  const sorted = useMemo(
    () => [...catalog.items].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)),
    [catalog.items]
  )

  const selected = useMemo(
    () => catalog.items.find((n) => n.id === selectedId) ?? null,
    [catalog.items, selectedId]
  )

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/admin/news", { cache: "no-store" })
      const data = (await res.json()) as { success?: boolean; news?: unknown; message?: string }
      if (!res.ok || !data.success) {
        const fallback = getStaticNewsCatalog()
        setCatalog(fallback)
        setSelectedId((prev) => prev || fallback.items[0]?.id || "")
        setError(
          data.message
            ? `${data.message}（静的 news.json を表示中。GAS に publicGetNews / adminSetNews を追加してください）`
            : "取得に失敗しました。静的 news.json を表示中です。"
        )
        return
      }
      const next = normalizeNewsCatalog(data.news)
      setCatalog(next)
      adminCacheWrite(ADMIN_CACHE_KEYS.news, next)
      setHasCache(true)
      setSelectedId((prev) => {
        if (prev && next.items.some((n) => n.id === prev)) return prev
        return next.items[0]?.id || ""
      })
      setError(null)
    } catch {
      const fallback = getStaticNewsCatalog()
      setCatalog(fallback)
      setSelectedId((prev) => prev || fallback.items[0]?.id || "")
      setError("通信に失敗しました。静的 news.json を表示中です。")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const cached = adminCacheRead<NewsCatalog>(ADMIN_CACHE_KEYS.news)
    if (cached) {
      setCatalog(cached)
      setSelectedId((prev) => prev || cached.items[0]?.id || "")
      setHasCache(true)
      setLoading(false)
    }
    void load()
  }, [load])

  function updateSelected(patch: Partial<NewsItem>) {
    if (!selectedId) return
    setCatalog((c) => ({
      ...c,
      items: c.items.map((n) => (n.id === selectedId ? { ...n, ...patch } : n)),
    }))
  }

  function addItem() {
    const item = blankItem()
    setCatalog((c) => ({ ...c, items: [item, ...c.items] }))
    setSelectedId(item.id)
  }

  function deleteSelected() {
    if (!selectedId) return
    if (!window.confirm("このお知らせを削除しますか？")) return
    setCatalog((c) => {
      const items = c.items.filter((n) => n.id !== selectedId)
      return { ...c, items }
    })
    setSelectedId("")
  }

  async function save() {
    setMessage(null)
    setError(null)
    setSaving(true)
    try {
      const payload: NewsCatalog = {
        items: catalog.items,
        updatedAt: new Date().toISOString(),
      }
      const res = await fetch("/api/admin/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ news: payload }),
      })
      const data = (await res.json()) as { success?: boolean; news?: unknown; message?: string }
      if (!res.ok || !data.success) {
        setError(data.message || "保存に失敗しました。GAS に adminSetNews が必要です。")
        return
      }
      const next = data.news ? normalizeNewsCatalog(data.news) : payload
      setCatalog(next)
      adminCacheWrite(ADMIN_CACHE_KEYS.news, next)
      setMessage(data.message || "保存しました。公式 /news は再デプロイなしで反映されます。")
    } catch {
      setError("通信に失敗しました。")
    } finally {
      setSaving(false)
    }
  }

  const showSkeleton = loading && !hasCache

  return (
    <AdminConsoleShell
      title="お知らせ"
      description="NEWS"
      toolbar={
        loading && hasCache ? (
          <span className="text-[11px] text-[#8b949e]">更新中…</span>
        ) : null
      }
      actions={
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={addItem} className={adminBtnClass()}>
            新規追加
          </button>
          <button type="button" onClick={() => void save()} disabled={saving || loading} className={adminBtnClass("primary")}>
            {saving ? "保存中…" : "保存"}
          </button>
          <button type="button" onClick={() => void load()} disabled={loading} className={adminBtnClass()}>
            再読込
          </button>
        </div>
      }
    >
      {message ? <p className="mb-3 text-[13px] text-[#79b8ff]">{message}</p> : null}
      {error ? <p className="mb-3 text-[13px] text-[#d29922]">{error}</p> : null}

      {showSkeleton ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
          <div className="h-64 animate-pulse rounded-sm border border-[#30363d] bg-[#161b22]" />
          <div className="h-96 animate-pulse rounded-sm border border-[#30363d] bg-[#161b22]" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
          <aside className="space-y-2 border border-[#30363d] bg-[#161b22] p-3">
            <p
              className="text-[10px] uppercase tracking-wider text-[#8b949e]"
              style={{ fontFamily: 'var(--font-admin-mono), "IBM Plex Mono", monospace' }}
            >
              一覧（{sorted.length}）
            </p>
            <ul className="max-h-[70vh] space-y-0.5 overflow-auto">
              {sorted.map((n) => {
                const active = n.id === selectedId
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(n.id)}
                      className={cn(
                        "flex w-full flex-col items-start gap-0.5 rounded-sm border px-2.5 py-2 text-left text-[13px]",
                        active
                          ? "border-[#1f6feb]/50 bg-[#1f6feb]/15 text-[#79b8ff]"
                          : "border-transparent text-[#c9d1d9] hover:border-[#30363d] hover:bg-[#21262d]"
                      )}
                    >
                      <span className="line-clamp-2 font-medium">{n.title || "（無題）"}</span>
                      <span className="text-[10px] text-[#8b949e]">
                        {n.date} · {n.category}
                        {n.published === false ? " · 下書き" : ""}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </aside>

          {selected ? (
            <section className="space-y-4 border border-[#30363d] bg-[#161b22] p-4 md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={selected.published !== false}
                    onChange={(e) => updateSelected({ published: e.target.checked })}
                    className="rounded-sm border-[#30363d] text-[#1f6feb]"
                  />
                  公開する
                </label>
                <button type="button" onClick={deleteSelected} className={adminBtnClass("danger")}>
                  削除
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-[#8b949e]">日付 (YYYY-MM-DD)</Label>
                  <Input
                    value={selected.date}
                    onChange={(e) => updateSelected({ date: e.target.value })}
                    className={cn(fieldClass, "font-mono")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-[#8b949e]">カテゴリ</Label>
                  <Input
                    value={selected.category}
                    onChange={(e) => updateSelected({ category: e.target.value })}
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-[11px] text-[#8b949e]">ID</Label>
                  <Input
                    value={selected.id}
                    onChange={(e) => {
                      const nextId = e.target.value.trim()
                      if (!nextId) return
                      setCatalog((c) => ({
                        ...c,
                        items: c.items.map((n) => (n.id === selectedId ? { ...n, id: nextId } : n)),
                      }))
                      setSelectedId(nextId)
                    }}
                    className={cn(fieldClass, "font-mono text-xs")}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-[11px] text-[#8b949e]">タイトル</Label>
                  <Input
                    value={selected.title}
                    onChange={(e) => updateSelected({ title: e.target.value })}
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-[11px] text-[#8b949e]">本文</Label>
                  <Textarea
                    value={selected.body}
                    rows={10}
                    onChange={(e) => updateSelected({ body: e.target.value })}
                    className={cn(fieldClass, "text-sm")}
                  />
                </div>
              </div>
            </section>
          ) : (
            <p className="text-[13px] text-[#8b949e]">左の一覧から選ぶか、新規追加してください。</p>
          )}
        </div>
      )}
    </AdminConsoleShell>
  )
}
