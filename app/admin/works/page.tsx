"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AdminConsoleShell, adminBtnClass } from "@/components/admin/admin-console-shell"
import { ADMIN_CACHE_KEYS, adminCacheRead, adminCacheWrite } from "@/lib/admin/admin-cache"
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

const fieldClass =
  "rounded-sm border-[#30363d] bg-[#0e1116] text-[#e6edf3] placeholder:text-[#8b949e] focus-visible:border-[#1f6feb] focus-visible:ring-[#1f6feb]/30"

export default function AdminWorksCmsPage() {
  const staticStories = stories as StoryRow[]
  const [catalog, setCatalog] = useState<GasWorksCatalog>({})
  const [selectedId, setSelectedId] = useState(staticStories[0]?.id ?? "")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasCache, setHasCache] = useState(false)

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
      const next = hydrateWorksCatalogFromSources(staticStories, raw)
      setCatalog(next)
      adminCacheWrite(ADMIN_CACHE_KEYS.worksCatalog, next)
      setHasCache(true)
    } catch {
      setError("通信に失敗しました。")
    } finally {
      setLoading(false)
    }
  }, [staticStories])

  useEffect(() => {
    const cached = adminCacheRead<GasWorksCatalog>(ADMIN_CACHE_KEYS.worksCatalog)
    if (cached) {
      setCatalog(cached)
      setHasCache(true)
      setLoading(false)
    }
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
      const next = hydrateWorksCatalogFromSources(staticStories, payload)
      setCatalog(next)
      adminCacheWrite(ADMIN_CACHE_KEYS.worksCatalog, next)
      setMessage(data.message || "保存しました。公式サイトは再デプロイなしで反映されます（数秒〜再読込）。")
    } catch {
      setError("通信に失敗しました。")
    } finally {
      setSaving(false)
    }
  }

  const detail = draft?.detail || emptyDetail()
  const genresText = (detail.genres || []).join(", ")
  const longText = (detail.longDescription || []).join("\n\n")
  const shotsText = (detail.screenshots || [])
    .map((s) => (s.alt ? `${s.src} | ${s.alt}` : s.src))
    .join("\n")

  const showSkeleton = loading && !hasCache

  return (
    <AdminConsoleShell
      title="作品"
      description="公開・詳細CMS"
      toolbar={
        loading && hasCache ? (
          <span className="text-[11px] text-[#8b949e]">更新中…</span>
        ) : null
      }
      actions={
        <div className="flex flex-wrap gap-2">
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
      {error ? <p className="mb-3 text-[13px] text-[#f85149]">{error}</p> : null}

      {showSkeleton ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
          <div className="h-64 animate-pulse rounded-sm border border-[#30363d] bg-[#161b22]" />
          <div className="h-96 animate-pulse rounded-sm border border-[#30363d] bg-[#161b22]" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
          <aside className="space-y-2 border border-[#30363d] bg-[#161b22] p-3">
            <p
              className="text-[10px] uppercase tracking-wider text-[#8b949e]"
              style={{ fontFamily: 'var(--font-admin-mono), "IBM Plex Mono", monospace' }}
            >
              作品一覧
            </p>
            <ul className="space-y-0.5">
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
                        "flex w-full flex-col items-start gap-0.5 rounded-sm border px-2.5 py-2 text-left text-[13px] transition-colors",
                        active
                          ? "border-[#1f6feb]/50 bg-[#1f6feb]/15 text-[#79b8ff]"
                          : "border-transparent text-[#c9d1d9] hover:border-[#30363d] hover:bg-[#21262d]"
                      )}
                    >
                      <span className="font-medium">{s.title}</span>
                      <span
                        className="text-[10px] text-[#8b949e]"
                        style={{ fontFamily: 'var(--font-admin-mono), "IBM Plex Mono", monospace' }}
                      >
                        {s.id}
                      </span>
                      <span className={cn("text-[10px]", on ? "text-[#3fb950]" : "text-[#8b949e]")}>
                        {on ? "公開" : "非公開"}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </aside>

          {selected && draft ? (
            <section className="space-y-5 border border-[#30363d] bg-[#161b22] p-4 md:p-5">
              <div className="flex flex-wrap items-center gap-4 border-b border-[#30363d] pb-3">
                <label className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={draft.published !== false}
                    onChange={(e) => patchSelectedStory({ published: e.target.checked })}
                    className="rounded-sm border-[#30363d] text-[#1f6feb]"
                  />
                  公式サイトに公開
                </label>
                <label className="flex items-center gap-2 text-[13px] text-[#8b949e]">
                  <input
                    type="radio"
                    name="featured"
                    checked={(catalog.featuredId ?? "") === selected.id}
                    onChange={() => setFeatured(selected.id)}
                    className="border-[#30363d] text-[#1f6feb]"
                  />
                  トップおすすめ
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-[11px] text-[#8b949e]">タイトル</Label>
                  <Input
                    value={draft.title || ""}
                    onChange={(e) => patchSelectedStory({ title: e.target.value })}
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-[11px] text-[#8b949e]">タグライン</Label>
                  <Input
                    value={draft.tagline || ""}
                    onChange={(e) => patchSelectedStory({ tagline: e.target.value })}
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-[11px] text-[#8b949e]">サブタイトル</Label>
                  <Input
                    value={draft.subtitle || ""}
                    onChange={(e) => patchSelectedStory({ subtitle: e.target.value })}
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-[#8b949e]">ステータス</Label>
                  <Input
                    value={draft.status || ""}
                    onChange={(e) => patchSelectedStory({ status: e.target.value })}
                    placeholder="active / preview"
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-[#8b949e]">カバー画像 URL</Label>
                  <Input
                    value={draft.coverImage || ""}
                    onChange={(e) => patchSelectedStory({ coverImage: e.target.value })}
                    placeholder="/games/signal-trace/cover-….webp"
                    className={cn(fieldClass, "font-mono text-xs")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-[#8b949e]">プレイ時間 min（分）</Label>
                  <Input
                    type="number"
                    value={detail.estimatedPlayMinutesMin ?? ""}
                    onChange={(e) => {
                      const n = e.target.value === "" ? undefined : Number(e.target.value)
                      patchSelectedStory({
                        detail: { ...detail, estimatedPlayMinutesMin: Number.isFinite(n) ? n : undefined },
                      })
                    }}
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-[#8b949e]">プレイ時間 max（分）</Label>
                  <Input
                    type="number"
                    value={detail.estimatedPlayMinutesMax ?? ""}
                    onChange={(e) => {
                      const n = e.target.value === "" ? undefined : Number(e.target.value)
                      patchSelectedStory({
                        detail: { ...detail, estimatedPlayMinutesMax: Number.isFinite(n) ? n : undefined },
                      })
                    }}
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-[11px] text-[#8b949e]">ジャンル（カンマ区切り）</Label>
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
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-[11px] text-[#8b949e]">詳細説明（空行で段落分け）</Label>
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
                    className={cn(fieldClass, "text-sm")}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-[11px] text-[#8b949e]">
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
                    className={cn(fieldClass, "font-mono text-xs")}
                  />
                </div>
              </div>
            </section>
          ) : (
            <p className="text-[13px] text-[#8b949e]">編集できる作品がありません。</p>
          )}
        </div>
      )}
    </AdminConsoleShell>
  )
}
