"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import stories from "@/data/official/stories.json"
import type { GasWorksCatalog, GasWorkEntry, WorkStoryRecord } from "@/lib/official/works-catalog"
import {
  hydrateWorksCatalogFromSources,
  serializeWorksCatalogForGas,
  workKeyFromStoryRecord,
} from "@/lib/official/works-catalog"
import { cn } from "@/lib/utils"

type StoryRow = WorkStoryRecord

function groupStoriesByWork(staticStories: StoryRow[]): { workKey: string; stories: StoryRow[] }[] {
  const map = new Map<string, StoryRow[]>()
  for (const s of staticStories) {
    const wk = workKeyFromStoryRecord(s)
    if (!map.has(wk)) map.set(wk, [])
    map.get(wk)!.push(s)
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))
  }
  const keys = Array.from(map.keys()).sort((a, b) => {
    const minA = Math.min(...(map.get(a) || []).map((x) => x.sortOrder ?? 999))
    const minB = Math.min(...(map.get(b) || []).map((x) => x.sortOrder ?? 999))
    return minA - minB
  })
  return keys.map((workKey) => ({ workKey, stories: map.get(workKey)! }))
}

export default function AdminPlatformCatalogPage() {
  const staticStories = stories as StoryRow[]
  const workGroups = useMemo(() => groupStoriesByWork(staticStories), [staticStories])

  const [catalog, setCatalog] = useState<GasWorksCatalog>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  const globalFeaturedId = (catalog.featuredId ?? "").trim()

  function setWorkPublished(workKey: string, on: boolean) {
    setCatalog((c) => {
      const works = { ...(c.works || {}) }
      const prev: GasWorkEntry = { ...(works[workKey] || {}), stories: { ...(works[workKey]?.stories || {}) } }
      const group = workGroups.find((g) => g.workKey === workKey)
      const nextStories = { ...prev.stories }
      if (group && group.stories.length === 1) {
        const sid = group.stories[0]!.id
        nextStories[sid] = { ...(nextStories[sid] || {}), published: on }
      }
      works[workKey] = { ...prev, published: on, stories: nextStories }
      return { ...c, works }
    })
  }

  function setStoryPublished(workKey: string, storyId: string, on: boolean) {
    setCatalog((c) => {
      const works = { ...(c.works || {}) }
      const prevW: GasWorkEntry = { ...(works[workKey] || {}), stories: { ...(works[workKey]?.stories || {}) } }
      const prevS = { ...(prevW.stories![storyId] || {}) }
      prevW.stories![storyId] = { ...prevS, published: on }
      works[workKey] = prevW
      return { ...c, works }
    })
  }

  function setWorkFeatured(workKey: string, storyId: string) {
    setCatalog((c) => {
      const works: Record<string, GasWorkEntry> = { ...(c.works || {}) }
      for (const { workKey: wk } of workGroups) {
        const prev = works[wk] || { published: true, featuredId: null, stories: {} }
        const entry: GasWorkEntry = { ...prev, stories: { ...(prev.stories || {}) } }
        entry.featuredId = wk === workKey ? storyId : null
        works[wk] = entry
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
      setMessage(
        data.message ||
          "保存しました。スプレッドシートは v2 形式（works 階層）に更新されています。GAS を再デプロイ済みの URL を参照しているか確認してください。"
      )
    } catch {
      setError("通信に失敗しました。")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 bg-[#050607] p-4 text-zinc-200 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#c9a227]/25 pb-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[#e8d89a]">作品公開（NSPlatform）</h1>
          <p className="mt-1 text-xs text-zinc-500">
            スプレッドシートの <code className="border border-[#c9a227]/30 bg-[#06080c] px-1 font-mono text-[#c9a227]/90">NSPlatform</code>{" "}
            に保存。プレイヤー側は <code className="border border-[#c9a227]/30 bg-[#06080c] px-1 font-mono text-[#c9a227]/90">publicGetWorksCatalog</code>{" "}
            で取得。一覧に出すには<strong className="text-zinc-400"> 作品（親）と各ストーリーの両方</strong>を公開にしてください。
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          asChild
          className="rounded-none border-[#c9a227]/45 bg-transparent text-[#c9a227] hover:bg-[#c9a227]/10"
        >
          <Link href="/admin">← 運営コンソール</Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">読み込み中…</p>
      ) : (
        <div className="space-y-6 border border-[#c9a227]/25 bg-[#06080c] p-4 md:p-6">
          <div>
            <h2 className="text-base font-medium text-[#e8d89a]">公開する作品（エンジン単位）</h2>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              旧データ（フラットな <code className="font-mono text-zinc-400">published[]</code> のみ）も読み込み時にこの画面用に正規化します。保存すると v2 形式（
              <code className="font-mono text-zinc-400">works</code>）で書き戻されます。
            </p>
          </div>

          <ul className="space-y-3">
            {workGroups.map(({ workKey, stories: groupStories }) => {
              const workEntry = catalog.works?.[workKey]
              const workOn = workEntry?.published !== false
              const multi = groupStories.length > 1
              const isOpen = expanded[workKey] ?? false
              const parentTitle = groupStories[0]?.title ?? workKey

              return (
                <li
                  key={workKey}
                  className="border border-[#c9a227]/20 bg-[#050607] shadow-none"
                >
                  <div className="flex flex-wrap items-center gap-3 px-3 py-3 md:px-4">
                    {multi ? (
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => setExpanded((e) => ({ ...e, [workKey]: !isOpen }))}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none border border-[#c9a227]/35 text-[#c9a227] transition-colors hover:bg-[#c9a227]/10"
                      >
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                      </button>
                    ) : (
                      <span className="inline-block w-9 shrink-0" aria-hidden />
                    )}

                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={workOn}
                        onChange={(e) => setWorkPublished(workKey, e.target.checked)}
                        className="rounded-none border-[#c9a227]/50 text-[#c9a227] focus:ring-[#c9a227]/40"
                      />
                      <span className="font-medium text-zinc-100">{parentTitle}</span>
                      <span className="font-mono text-[10px] text-[#7f9cb8]/80">{workKey}</span>
                    </label>
                  </div>

                  {multi ? (
                    <div
                      className={cn(
                        "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
                        isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      )}
                    >
                      <div className="overflow-hidden border-t border-[#c9a227]/15">
                        <ul className="space-y-0 divide-y divide-[#c9a227]/10 px-3 py-1 md:px-4 md:pl-[4.25rem]">
                          {groupStories.map((s) => {
                            const st = workEntry?.stories?.[s.id]
                            const storyOn = st?.published !== false
                            return (
                              <li key={s.id} className="flex flex-wrap items-center gap-3 py-2.5">
                                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={storyOn}
                                    onChange={(e) => setStoryPublished(workKey, s.id, e.target.checked)}
                                    className="rounded-none border-[#c9a227]/50 text-[#c9a227] focus:ring-[#c9a227]/40"
                                  />
                                  <span className="text-zinc-200">{s.title}</span>
                                  <span className="font-mono text-[10px] text-zinc-500">{s.id}</span>
                                  {s.status === "preview" ? (
                                    <span className="text-[10px] uppercase tracking-wider text-[#7f9cb8]/70">preview</span>
                                  ) : null}
                                </label>
                                <label className="flex shrink-0 items-center gap-2 text-[11px] text-zinc-500">
                                  <input
                                    type="radio"
                                    name="featured-global"
                                    checked={globalFeaturedId === s.id}
                                    onChange={() => setWorkFeatured(workKey, s.id)}
                                    className="rounded-none border-[#c9a227]/50 text-[#c9a227]"
                                  />
                                  トップおすすめ
                                </label>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-[#c9a227]/15 px-3 py-2 md:px-4 md:pl-[4.25rem]">
                      {groupStories.map((s) => (
                        <div key={s.id} className="flex flex-wrap items-center gap-3">
                          <span className="min-w-0 flex-1 font-mono text-[10px] text-zinc-500">{s.id}</span>
                          <label className="flex shrink-0 items-center gap-2 text-[11px] text-zinc-500">
                            <input
                              type="radio"
                              name="featured-global"
                              checked={globalFeaturedId === s.id}
                              onChange={() => setWorkFeatured(workKey, s.id)}
                              className="rounded-none border-[#c9a227]/50 text-[#c9a227]"
                            />
                            トップおすすめ
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          <div className="space-y-2 border-t border-[#c9a227]/20 pt-4">
            <Label className="text-xs text-zinc-500">featuredId（手動上書き・任意）</Label>
            <Input
              value={catalog.featuredId ?? ""}
              onChange={(e) => setCatalog((c) => ({ ...c, featuredId: e.target.value || null }))}
              placeholder={staticStories.find((x) => x.featured)?.id ?? staticStories[0]?.id ?? ""}
              className="rounded-none border-[#c9a227]/30 bg-[#050607] font-mono text-sm text-zinc-200 placeholder:text-zinc-600"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="rounded-none border border-[#c9a227]/55 bg-[#c9a227]/15 text-[#f5ecd4] hover:bg-[#c9a227]/25"
            >
              {saving ? "保存中…" : "スプレッドシートに反映"}
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
          {message ? <p className="text-sm text-[#c9a227]">{message}</p> : null}
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </div>
      )}
    </div>
  )
}
