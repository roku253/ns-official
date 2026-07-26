"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AdminConsoleShell, adminBtnClass } from "@/components/admin/admin-console-shell"
import { AdminImageDropzone } from "@/components/admin/admin-image-dropzone"
import { ADMIN_CACHE_KEYS, adminCacheRead, adminCacheWrite } from "@/lib/admin/admin-cache"
import stories from "@/data/official/stories.json"
import type {
  GasStoryEntry,
  GasWorksCatalog,
  WorkDetailRecord,
  WorkStoryRecord,
} from "@/lib/official/works-catalog"
import {
  combineStaticAndCmsStories,
  createBlankCmsStory,
  hydrateWorksCatalogFromSources,
  isCmsManagedStoryId,
  isValidWorkId,
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
    externalUrl: st.externalUrl ?? story.externalUrl ?? "",
    tokenResource: st.tokenResource ?? story.tokenResource ?? "",
    gameKind: st.gameKind ?? story.gameKind ?? "",
    sortOrder: st.sortOrder ?? story.sortOrder,
    theme: st.theme ?? story.theme ?? "",
    enginePackage: st.enginePackage ?? story.enginePackage ?? "",
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
  const [newIdDraft, setNewIdDraft] = useState("")

  const adminStories = useMemo(
    () => combineStaticAndCmsStories(staticStories, catalog),
    [staticStories, catalog]
  )

  const selected = useMemo(
    () => adminStories.find((s) => s.id === selectedId) ?? adminStories[0] ?? null,
    [adminStories, selectedId]
  )

  const selectedIsCms = selected ? isCmsManagedStoryId(staticStories, selected.id) : false

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
      const ids = combineStaticAndCmsStories(staticStories, next).map((s) => s.id)
      setSelectedId((prev) => (prev && ids.includes(prev) ? prev : ids[0] || ""))
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
      const ids = combineStaticAndCmsStories(staticStories, cached).map((s) => s.id)
      setSelectedId((prev) => (prev && ids.includes(prev) ? prev : ids[0] || ""))
    }
    void load()
  }, [load, staticStories])

  function patchSelectedStory(patch: Partial<GasStoryEntry>) {
    if (!selected) return
    const wk = workKeyFromStoryRecord({
      id: selected.id,
      enginePackage: patch.enginePackage ?? draft?.enginePackage ?? selected.enginePackage,
    })
    setCatalog((c) => {
      const works = { ...(c.works || {}) }
      const oldWk = workKeyFromStoryRecord(selected)
      if (oldWk !== wk && works[oldWk]?.stories?.[selected.id]) {
        const oldStories = { ...(works[oldWk].stories || {}) }
        delete oldStories[selected.id]
        works[oldWk] = { ...works[oldWk], stories: oldStories }
        if (Object.keys(oldStories).length === 0) delete works[oldWk]
      }
      const prevW = { ...(works[wk] || {}), stories: { ...(works[wk]?.stories || {}) } }
      const prevS = { ...(prevW.stories![selected.id] || {}) }
      const nextS: GasStoryEntry = { ...prevS, ...patch }
      if (patch.detail) {
        nextS.detail = { ...(prevS.detail || {}), ...patch.detail }
      }
      prevW.stories![selected.id] = nextS
      if (typeof patch.published === "boolean") {
        const siblings = Object.keys(prevW.stories || {}).length
        if (siblings <= 1) prevW.published = patch.published
      }
      works[wk] = prevW

      let cmsStories = { ...(c.cmsStories || {}) }
      if (isCmsManagedStoryId(staticStories, selected.id)) {
        const base = cmsStories[selected.id] || createBlankCmsStory(selected.id)
        cmsStories[selected.id] = {
          ...base,
          title: nextS.title ?? base.title,
          tagline: nextS.tagline ?? base.tagline,
          subtitle: nextS.subtitle ?? base.subtitle,
          status: nextS.status ?? base.status,
          coverImage: nextS.coverImage ?? base.coverImage,
          externalUrl: nextS.externalUrl ?? base.externalUrl,
          tokenResource: nextS.tokenResource ?? base.tokenResource,
          gameKind: nextS.gameKind ?? base.gameKind,
          sortOrder: nextS.sortOrder ?? base.sortOrder,
          theme: nextS.theme ?? base.theme,
          enginePackage: nextS.enginePackage ?? base.enginePackage,
          published: nextS.published !== false,
          detail: nextS.detail ?? base.detail,
        }
      }

      return { ...c, works, cmsStories: Object.keys(cmsStories).length ? cmsStories : undefined }
    })
  }

  function setFeatured(storyId: string) {
    setCatalog((c) => {
      const works: GasWorksCatalog["works"] = { ...(c.works || {}) }
      for (const s of combineStaticAndCmsStories(staticStories, c)) {
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

  function addWork() {
    setMessage(null)
    setError(null)
    const id = newIdDraft.trim().toLowerCase()
    if (!isValidWorkId(id)) {
      setError("作品 ID は英小文字・数字・ハイフンのみ（例: my-new-work）です。")
      return
    }
    if (adminStories.some((s) => s.id === id)) {
      setError("同じ ID の作品が既にあります。")
      return
    }
    const blank = createBlankCmsStory(id)
    setCatalog((c) => {
      const cmsStories = { ...(c.cmsStories || {}), [id]: blank }
      const next = hydrateWorksCatalogFromSources(staticStories, { ...c, cmsStories })
      return next
    })
    setSelectedId(id)
    setNewIdDraft("")
    setMessage(`「${id}」を追加しました。内容を編集して保存してください。`)
  }

  function removeSelectedCmsWork() {
    if (!selected || !selectedIsCms) return
    if (!window.confirm(`「${selected.title || selected.id}」を一覧から削除しますか？（保存するまで本番には反映されません）`)) {
      return
    }
    const removeId = selected.id
    setCatalog((c) => {
      const cmsStories = { ...(c.cmsStories || {}) }
      delete cmsStories[removeId]
      const works = { ...(c.works || {}) }
      for (const [wk, we] of Object.entries(works)) {
        if (!we.stories?.[removeId]) continue
        const stories = { ...we.stories }
        delete stories[removeId]
        if (Object.keys(stories).length === 0) delete works[wk]
        else works[wk] = { ...we, stories }
      }
      const overrides = { ...(c.overrides || {}) }
      delete overrides[removeId]
      return {
        ...c,
        cmsStories: Object.keys(cmsStories).length ? cmsStories : undefined,
        works,
        overrides: Object.keys(overrides).length ? overrides : undefined,
        featuredId: c.featuredId === removeId ? null : c.featuredId,
      }
    })
    setSelectedId((prev) => {
      const rest = adminStories.filter((s) => s.id !== removeId)
      return rest[0]?.id || ""
    })
    setMessage("削除を反映するには「保存」を押してください。")
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

  const showSkeleton = loading && !hasCache

  return (
    <AdminConsoleShell
      title="作品"
      description="追加・公開・詳細・プレイ先"
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
          <aside className="space-y-3 border border-[#30363d] bg-[#161b22] p-3">
            <p
              className="text-[10px] uppercase tracking-wider text-[#8b949e]"
              style={{ fontFamily: 'var(--font-admin-mono), "IBM Plex Mono", monospace' }}
            >
              作品一覧
            </p>
            <ul className="space-y-0.5">
              {adminStories.map((s) => {
                const wk = workKeyFromStoryRecord(s)
                const on = catalog.works?.[wk]?.stories?.[s.id]?.published !== false
                const active = selected?.id === s.id
                const cms = isCmsManagedStoryId(staticStories, s.id)
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
                      <span className="font-medium">{catalog.works?.[wk]?.stories?.[s.id]?.title || s.title}</span>
                      <span
                        className="text-[10px] text-[#8b949e]"
                        style={{ fontFamily: 'var(--font-admin-mono), "IBM Plex Mono", monospace' }}
                      >
                        {s.id}
                        {cms ? " · CMS" : ""}
                      </span>
                      <span className={cn("text-[10px]", on ? "text-[#3fb950]" : "text-[#8b949e]")}>
                        {on ? "公開" : "非公開"}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="space-y-2 border-t border-[#30363d] pt-3">
              <Label className="text-[11px] text-[#8b949e]">新規作品 ID</Label>
              <Input
                value={newIdDraft}
                onChange={(e) => setNewIdDraft(e.target.value)}
                placeholder="my-new-work"
                className={cn(fieldClass, "font-mono text-xs")}
              />
              <button type="button" onClick={addWork} className={cn(adminBtnClass(), "w-full")}>
                作品を追加
              </button>
              <p className="text-[11px] leading-relaxed text-[#8b949e]">
                ゲーム本体は別デプロイのまま、公式の一覧・詳細・プレイ先だけここで管理します。
              </p>
            </div>
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
                {selectedIsCms ? (
                  <button
                    type="button"
                    onClick={removeSelectedCmsWork}
                    className="ml-auto text-[12px] text-[#f85149] hover:underline"
                  >
                    この作品を削除
                  </button>
                ) : (
                  <span className="ml-auto text-[11px] text-[#8b949e]">リポジトリ同梱（削除不可）</span>
                )}
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
                  <Label className="text-[11px] text-[#8b949e]">種類 (gameKind)</Label>
                  <Input
                    value={draft.gameKind || ""}
                    onChange={(e) => patchSelectedStory({ gameKind: e.target.value })}
                    placeholder="investigation"
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-[#8b949e]">並び順 (小さいほど上)</Label>
                  <Input
                    type="number"
                    value={draft.sortOrder ?? ""}
                    onChange={(e) => {
                      const n = e.target.value === "" ? undefined : Number(e.target.value)
                      patchSelectedStory({
                        sortOrder: Number.isFinite(n as number) ? Math.floor(n as number) : undefined,
                      })
                    }}
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-[#8b949e]">enginePackage</Label>
                  <Input
                    value={draft.enginePackage || ""}
                    onChange={(e) => patchSelectedStory({ enginePackage: e.target.value.trim() })}
                    placeholder="signal-trace など"
                    className={cn(fieldClass, "font-mono text-xs")}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-[11px] text-[#8b949e]">
                    プレイ先 URL（作品アプリの本番 URL。空なら作品詳細へ）
                  </Label>
                  <Input
                    value={draft.externalUrl || ""}
                    onChange={(e) => patchSelectedStory({ externalUrl: e.target.value.trim() })}
                    placeholder="https://koko-ni-iru.vercel.app/play/koko-ni-iru"
                    className={cn(fieldClass, "font-mono text-xs")}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-[11px] text-[#8b949e]">
                    tokenResource（任意。設定時はプレイ時にアクセストークン付与）
                  </Label>
                  <Input
                    value={draft.tokenResource || ""}
                    onChange={(e) => patchSelectedStory({ tokenResource: e.target.value.trim() })}
                    placeholder="ext:…"
                    className={cn(fieldClass, "font-mono text-xs")}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-[11px] text-[#8b949e]">カバー画像</Label>
                  <AdminImageDropzone
                    workId={selected.id}
                    kind="cover"
                    value={draft.coverImage || ""}
                    onChange={(url) => patchSelectedStory({ coverImage: url })}
                  />
                  <Input
                    value={draft.coverImage || ""}
                    onChange={(e) => patchSelectedStory({ coverImage: e.target.value })}
                    placeholder="または URL を直接入力"
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
                  <Label className="text-[11px] text-[#8b949e]">スクリーンショット</Label>
                  <AdminImageDropzone
                    workId={selected.id}
                    kind="screenshot"
                    values={detail.screenshots || []}
                    onChangeMany={(screenshots) =>
                      patchSelectedStory({ detail: { ...detail, screenshots } })
                    }
                  />
                </div>
              </div>
            </section>
          ) : (
            <p className="text-[13px] text-[#8b949e]">編集できる作品がありません。左から追加してください。</p>
          )}
        </div>
      )}
    </AdminConsoleShell>
  )
}
