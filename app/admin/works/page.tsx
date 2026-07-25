"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AdminConsoleShell } from "@/components/admin/admin-console-shell"
import stories from "@/data/official/stories.json"
import type {
  GasStoryEntry,
  GasWorksCatalog,
  WorkDetailRecord,
  WorkStoryRecord,
} from "@/lib/official/works-catalog"
import {
  hydrateWorksCatalogFromSources,
  serializeWorksCatalogForGas,
  workKeyFromStoryRecord,
} from "@/lib/official/works-catalog"
import { cn } from "@/lib/utils"

type StoryRow = WorkStoryRecord

function emptyDetail(): WorkDetailRecord {
  return {
    estimatedPlayMinutesMin: undefined,
    estimatedPlayMinutesMax: undefined,
    genres: [],
    longDescription: [],
    screenshots: [],
  }
}

function storyEntryOrDefaults(catalog: GasWorksCatalog, story: StoryRow): GasStoryEntry {
  const wk = workKeyFromStoryRecord(story)
  const st = catalog.works?.[wk]?.stories?.[story.id] || {}
  return {
    published: st.published !== false,
    title: st.title ?? story.title,
    tagline: st.tagline ?? story.tagline ?? "",
    subtitle: st.subtitle ?? story.subtitle ?? "",
    status: st.status ?? story.status,
    coverImage: st.coverImage ?? story.coverImage ?? "",
    detail: {
      ...emptyDetail(),
      ...(story.detail || {}),
      ...(st.detail || {}),
    },
  }
}

export default function AdminWorksCmsPage() {
  const staticStories = stories as StoryRow[]
  const [catalog, setCatalog] = useState<GasWorksCatalog>({})
  const [selectedId, setSelectedId] = useState(staticStories[0]?.id ?? "")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selected = useMemo(
    () => staticStories.find((s) => s.id === selectedId) ?? staticStories[0] ?? null,
    [staticStories, selectedId]
  )

  const draft = useMemo(
    () => (selected ? storyEntryOrDefaults(catalog, selected) : null),
    [catalog, selected]
  )

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/admin/platform-catalog", { cache: "no-store" })
      const data = (await res.json()) as { success?: boolean; catalog?: GasWorksCatalog; message?: string }
      if (!res.ok || !data.success) {
        setError(data.message || "取得に失敗しました。")
        return
      }
      const raw = data.catalog && typeof data.catalog === "object" ? data.catalog : {}
      setCatalog(hydrateWorksCatalogFromSources(staticStories, raw))
    } catch {
      setError("通信に失敗しました。")
    } finally {
      setLoading(false)
    }
  }, [staticStories])

  useEffect(() => {
    void load()
  }, [load])

  function patchSelectedStory(patch: Partial<GasStoryEntry>) {
    if (!selected) return
    const wk = workKeyFromStoryRecord(selected)
    setCatalog((c) => {
      const works = { ...(c.works || {}) }
      const prevW = { ...(works[wk] || {}), stories: { ...(works[wk]?.stories || {}) } }
      const prevS = { ...(prevW.stories![selected.id] || {}) }
      const nextS: GasStoryEntry = { ...prevS, ...patch }
      if (patch.detail) {
        nextS.detail = { ...(prevS.detail || {}), ...patch.detail }
      }
      prevW.stories![selected.id] = nextS
      if (typeof patch.published === "boolean" && staticStories.filter((s) => workKeyFromStoryRecord(s) === wk).length === 1) {
        prevW.published = patch.published
      }
      works[wk] = prevW
      return { ...c, works }
    })
  }

  function setFeatured(storyId: string) {
    setCatalog((c) => {
      const works: GasWorksCatalog["works"] = { ...(c.works || {}) }
      for (const s of staticStories) {
        const wk = workKeyFromStoryRecord(s)
        const prev = works![wk] || { published: true, featuredId: null, stories: {} }
        works![wk] = {
          ...prev,
          stories: { ...(prev.stories || {}) },
          featuredId: s.id === storyId ? storyId : null,
        }
      }
      return { ...c, works, featuredId: storyId }
    })
  }

  async function save() {
    setMessage(null)
    setError(null)
    setSaving(true)
    try {
      const payload = serializeWorksCatalogForGas(staticStories, catalog)
      const res = await fetch("/api/admin/platform-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catalog: payload }),
      })
      const data = (await res.json()) as { success?: boolean; message?: string }
      if (!res.ok || !data.success) {
        setError(data.message || "保存に失敗しました。")
        return
      }
      setCatalog(hydrateWorksCatalogFromSources(staticStories, payload))
      setMessage(data.message || "保存しました。公式サイトは再デプロイなしで反映されます（数秒〜再読込）。")
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

  const detail = draft?.detail || emptyDetail()
  const genresText = (detail.genres || []).join(", ")
  const longText = (detail.longDescription || []).join("\n\n")
  const shotsText = (detail.screenshots || [])
    .map((s) => (s.alt ? `${s.src} | ${s.alt}` : s.src))
    .join("\n")

  return (
    <AdminConsoleShell
      title="作品CMS"
      description="公開・おすすめ・詳細文面をスプレッドシート（NSPlatform）に保存します。紐づけ（case↔エンジン↔rewrite）はコード側のままです。"
      onLogout={() => void logout()}
      actions={
        <div className="flex flex-wrap gap-2">
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
      {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-zinc-500">読み込み中…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
          <aside className="space-y-2 border border-[#c9a227]/20 bg-[#06080c] p-3">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">作品一覧</p>
            <ul className="space-y-1">
              {staticStories.map((s) => {
                const wk = workKeyFromStoryRecord(s)
                const on = catalog.works?.[wk]?.stories?.[s.id]?.published !== false
                const active = selected?.id === s.id
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(s.id)}
                      className={cn(
                        "flex w-full flex-col items-start gap-0.5 rounded-none border px-2.5 py-2 text-left text-sm transition-colors",
                        active
                          ? "border-[#c9a227]/50 bg-[#c9a227]/10 text-[#f5ecd4]"
                          : "border-transparent text-zinc-300 hover:border-[#c9a227]/25 hover:bg-[#0a0c10]"
                      )}
                    >
                      <span className="font-medium">{s.title}</span>
                      <span className="font-mono text-[10px] text-zinc-500">{s.id}</span>
                      <span className={cn("text-[10px]", on ? "text-emerald-400/80" : "text-zinc-600")}>
                        {on ? "公開" : "非公開"}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </aside>

          {selected && draft ? (
            <section className="space-y-6 border border-[#c9a227]/20 bg-[#06080c] p-4 md:p-6">
              <div className="flex flex-wrap items-center gap-4 border-b border-[#c9a227]/15 pb-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.published !== false}
                    onChange={(e) => patchSelectedStory({ published: e.target.checked })}
                    className="rounded-none border-[#c9a227]/50 text-[#c9a227]"
                  />
                  公式サイトに公開
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-400">
                  <input
                    type="radio"
                    name="featured"
                    checked={(catalog.featuredId ?? "") === selected.id}
                    onChange={() => setFeatured(selected.id)}
                    className="rounded-none border-[#c9a227]/50 text-[#c9a227]"
                  />
                  トップおすすめ
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-zinc-500">タイトル</Label>
                  <Input
                    value={draft.title || ""}
                    onChange={(e) => patchSelectedStory({ title: e.target.value })}
                    className="rounded-none border-[#c9a227]/30 bg-[#050607]"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-zinc-500">タグライン</Label>
                  <Input
                    value={draft.tagline || ""}
                    onChange={(e) => patchSelectedStory({ tagline: e.target.value })}
                    className="rounded-none border-[#c9a227]/30 bg-[#050607]"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-zinc-500">サブタイトル</Label>
                  <Input
                    value={draft.subtitle || ""}
                    onChange={(e) => patchSelectedStory({ subtitle: e.target.value })}
                    className="rounded-none border-[#c9a227]/30 bg-[#050607]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-500">ステータス</Label>
                  <Input
                    value={draft.status || ""}
                    onChange={(e) => patchSelectedStory({ status: e.target.value })}
                    placeholder="active / preview"
                    className="rounded-none border-[#c9a227]/30 bg-[#050607]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-500">カバー画像 URL</Label>
                  <Input
                    value={draft.coverImage || ""}
                    onChange={(e) => patchSelectedStory({ coverImage: e.target.value })}
                    placeholder="/games/signal-trace/cover-….webp"
                    className="rounded-none border-[#c9a227]/30 bg-[#050607] font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-500">プレイ時間 min（分）</Label>
                  <Input
                    type="number"
                    value={detail.estimatedPlayMinutesMin ?? ""}
                    onChange={(e) => {
                      const n = e.target.value === "" ? undefined : Number(e.target.value)
                      patchSelectedStory({
                        detail: { ...detail, estimatedPlayMinutesMin: Number.isFinite(n) ? n : undefined },
                      })
                    }}
                    className="rounded-none border-[#c9a227]/30 bg-[#050607]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-500">プレイ時間 max（分）</Label>
                  <Input
                    type="number"
                    value={detail.estimatedPlayMinutesMax ?? ""}
                    onChange={(e) => {
                      const n = e.target.value === "" ? undefined : Number(e.target.value)
                      patchSelectedStory({
                        detail: { ...detail, estimatedPlayMinutesMax: Number.isFinite(n) ? n : undefined },
                      })
                    }}
                    className="rounded-none border-[#c9a227]/30 bg-[#050607]"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-zinc-500">ジャンル（カンマ区切り）</Label>
                  <Input
                    value={genresText}
                    onChange={(e) =>
                      patchSelectedStory({
                        detail: {
                          ...detail,
                          genres: e.target.value
                            .split(",")
                            .map((x) => x.trim())
                            .filter(Boolean),
                        },
                      })
                    }
                    className="rounded-none border-[#c9a227]/30 bg-[#050607]"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-zinc-500">詳細説明（空行で段落分け）</Label>
                  <Textarea
                    value={longText}
                    rows={8}
                    onChange={(e) =>
                      patchSelectedStory({
                        detail: {
                          ...detail,
                          longDescription: e.target.value
                            .split(/\n\s*\n/)
                            .map((p) => p.trim())
                            .filter(Boolean),
                        },
                      })
                    }
                    className="rounded-none border-[#c9a227]/30 bg-[#050607] text-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-zinc-500">
                    スクリーンショット（1行1枚: URL または URL | alt）
                  </Label>
                  <Textarea
                    value={shotsText}
                    rows={5}
                    onChange={(e) => {
                      const screenshots = e.target.value
                        .split("\n")
                        .map((line) => line.trim())
                        .filter(Boolean)
                        .map((line) => {
                          const [srcPart, ...altParts] = line.split("|")
                          const src = (srcPart || "").trim()
                          const alt = altParts.join("|").trim()
                          return alt ? { src, alt } : { src }
                        })
                        .filter((s) => s.src)
                      patchSelectedStory({ detail: { ...detail, screenshots } })
                    }}
                    className="rounded-none border-[#c9a227]/30 bg-[#050607] font-mono text-xs"
                  />
                </div>
              </div>
            </section>
          ) : (
            <p className="text-sm text-zinc-500">編集できる作品がありません。</p>
          )}
        </div>
      )}
    </AdminConsoleShell>
  )
}
