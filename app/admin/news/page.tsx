"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AdminConsoleShell } from "@/components/admin/admin-console-shell"
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

export default function AdminNewsPage() {
  const [catalog, setCatalog] = useState<NewsCatalog>(getStaticNewsCatalog())
  const [selectedId, setSelectedId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
        // GAS 未対応時は静的フォールバックで編集開始
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
      if (data.news) setCatalog(normalizeNewsCatalog(data.news))
      else setCatalog(payload)
      setMessage(data.message || "保存しました。公式 /news は再デプロイなしで反映されます。")
    } catch {
      setError("通信に失敗しました。")
    } finally {
      setSaving(false)
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" })
    window.location.href = "/admin/login"
  }

  return (
    <AdminConsoleShell
      title="お知らせCMS"
      description="トップ NEWS と /news に載せる項目を編集します。保存先は GAS（docs/gas-cms.md）。"
      onLogout={() => void logout()}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={addItem}
            variant="outline"
            className="rounded-none border-[#c9a227]/40 bg-transparent text-[#c9a227] hover:bg-[#c9a227]/10"
          >
            新規追加
          </Button>
          <Button
            type="button"
            onClick={() => void save()}
            disabled={saving || loading}
            className="rounded-none border border-[#c9a227]/55 bg-[#c9a227]/15 text-[#f5ecd4] hover:bg-[#c9a227]/25"
          >
            {saving ? "保存中…" : "保存"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-none border-[#c9a227]/40 bg-transparent text-[#c9a227] hover:bg-[#c9a227]/10"
          >
            再読込
          </Button>
        </div>
      }
    >
      {message ? <p className="mb-4 text-sm text-[#c9a227]">{message}</p> : null}
      {error ? <p className="mb-4 text-sm text-amber-400/90">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-zinc-500">読み込み中…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
          <aside className="space-y-2 border border-[#c9a227]/20 bg-[#06080c] p-3">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">一覧（{sorted.length}）</p>
            <ul className="max-h-[70vh] space-y-1 overflow-auto">
              {sorted.map((n) => {
                const active = n.id === selectedId
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(n.id)}
                      className={cn(
                        "flex w-full flex-col items-start gap-0.5 rounded-none border px-2.5 py-2 text-left text-sm",
                        active
                          ? "border-[#c9a227]/50 bg-[#c9a227]/10 text-[#f5ecd4]"
                          : "border-transparent text-zinc-300 hover:border-[#c9a227]/25"
                      )}
                    >
                      <span className="line-clamp-2 font-medium">{n.title || "（無題）"}</span>
                      <span className="text-[10px] text-zinc-500">
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
            <section className="space-y-4 border border-[#c9a227]/20 bg-[#06080c] p-4 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.published !== false}
                    onChange={(e) => updateSelected({ published: e.target.checked })}
                    className="rounded-none border-[#c9a227]/50 text-[#c9a227]"
                  />
                  公開する
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={deleteSelected}
                  className="rounded-none border-red-500/40 text-red-300 hover:bg-red-500/10"
                >
                  削除
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-500">日付 (YYYY-MM-DD)</Label>
                  <Input
                    value={selected.date}
                    onChange={(e) => updateSelected({ date: e.target.value })}
                    className="rounded-none border-[#c9a227]/30 bg-[#050607] font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-500">カテゴリ</Label>
                  <Input
                    value={selected.category}
                    onChange={(e) => updateSelected({ category: e.target.value })}
                    className="rounded-none border-[#c9a227]/30 bg-[#050607]"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-zinc-500">ID</Label>
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
                    className="rounded-none border-[#c9a227]/30 bg-[#050607] font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-zinc-500">タイトル</Label>
                  <Input
                    value={selected.title}
                    onChange={(e) => updateSelected({ title: e.target.value })}
                    className="rounded-none border-[#c9a227]/30 bg-[#050607]"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-zinc-500">本文</Label>
                  <Textarea
                    value={selected.body}
                    rows={10}
                    onChange={(e) => updateSelected({ body: e.target.value })}
                    className="rounded-none border-[#c9a227]/30 bg-[#050607] text-sm"
                  />
                </div>
              </div>
            </section>
          ) : (
            <p className="text-sm text-zinc-500">左の一覧から選ぶか、新規追加してください。</p>
          )}
        </div>
      )}
    </AdminConsoleShell>
  )
}
