"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { AdminConsoleShell, adminBtnClass } from "@/components/admin/admin-console-shell"
import { ADMIN_CACHE_KEYS, adminCacheRead, adminCacheWrite } from "@/lib/admin/admin-cache"
import { AdminSaveBackupPanel } from "@/components/admin/admin-save-backup-panel"
import {
  ADMIN_GAME_CATALOG,
  UNCATEGORIZED_GAME_ID,
  allStoryCaseIdsForGame,
  buildSaveSlotsForUser,
  getAdminGame,
  resolveStoryInCatalog,
  type AdminSaveSlot,
} from "@/lib/admin-game-catalog"

type ProgressSummary = {
  parseError?: boolean
  rawPreview?: string
  activeTab?: string
  counts?: {
    tasks: number
    archiveItems: number
    memos: number
    achievements: number
    communications: number
  }
  tasks?: Array<{
    id: string
    templateId: string
    title: string
    status: string
    groupTitle: string
    completionType: string
  }>
  archiveItems?: Array<{
    id: string
    type: string
    title: string
    descriptionPreview: string
    thumbnail?: unknown
  }>
  memos?: Array<{ id: string; title: string; contentPreview: string }>
  achievements?: Array<{ id: string; title: string; rarity: string }>
  communications?: Array<{ id: string; subject: string; from: string; isRead: boolean }>
}

type InvestigatorRow = {
  loginId: string
  email: string
  caseId: string
  updatedAt: string
  lastDeviceId: string
  lastLoginAt: string
  progressSummary: ProgressSummary
}

type GameProgressRow = {
  loginId: string
  email: string
  caseId: string
  updatedAt: string
  progressSummary: ProgressSummary
}

type ProgressCachePayload = {
  investigators: InvestigatorRow[]
  gameProgress: GameProgressRow[]
}

function statusBadgeClass(status: string) {
  if (status === "completed") return "border-sky-500/45 bg-sky-500/12 text-sky-200"
  if (status === "active") return "border-amber-500/50 bg-amber-500/15 text-amber-100"
  if (status === "locked") return "border-[#30363d] bg-[#21262d] text-[#8b949e]"
  return ""
}

function investigatorTouchesGame(
  loginId: string,
  inv: InvestigatorRow | undefined,
  gpRows: GameProgressRow[],
  gameFilterKey: string
): boolean {
  if (!gameFilterKey) return true
  const caseIds = new Set<string>()
  const add = (c: string) => {
    const x = (c || "").trim()
    if (x) caseIds.add(x)
  }
  if (inv && inv.loginId === loginId) add(inv.caseId)
  for (const g of gpRows) {
    if (g.loginId === loginId) add(g.caseId)
  }
  if (gameFilterKey === UNCATEGORIZED_GAME_ID) {
    for (const c of caseIds) {
      if (!resolveStoryInCatalog(c)) return true
    }
    return false
  }
  const allowed = new Set(allStoryCaseIdsForGame(gameFilterKey))
  for (const c of caseIds) {
    if (allowed.has(c)) return true
  }
  return false
}

const panelClass = "border-[#30363d] bg-[#161b22] text-[#e6edf3]"

export default function AdminDashboardPage() {
  const [rows, setRows] = useState<InvestigatorRow[]>([])
  const [gameProgress, setGameProgress] = useState<GameProgressRow[]>([])
  const [newSlotGameId, setNewSlotGameId] = useState<string>(ADMIN_GAME_CATALOG[0]?.id ?? "")
  const [newSlotStoryCaseId, setNewSlotStoryCaseId] = useState<string>("")
  const [newCaseSlotManual, setNewCaseSlotManual] = useState("")
  const [slotBusy, setSlotBusy] = useState(false)
  const [selectedLogin, setSelectedLogin] = useState<string | null>(null)
  const [gameFilter, setGameFilter] = useState<string>("")
  const [viewGameId, setViewGameId] = useState<string>("")
  const [viewCaseId, setViewCaseId] = useState<string>("")
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasCache, setHasCache] = useState(false)

  const applyProgressData = useCallback((investigators: InvestigatorRow[], gp: GameProgressRow[]) => {
    setRows(investigators)
    setGameProgress(gp)
    setSelectedLogin((prev) => {
      if (prev && investigators.some((r) => r.loginId === prev)) return prev
      return investigators[0]?.loginId ?? null
    })
  }, [])

  const load = useCallback(async () => {
    setLoadError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/admin/progress", { cache: "no-store" })
      const data = (await res.json()) as {
        success?: boolean
        message?: string
        investigators?: InvestigatorRow[]
        gameProgress?: GameProgressRow[]
      }
      if (!res.ok || !data.success || !data.investigators) {
        setLoadError(data.message || `取得に失敗しました（${res.status}）`)
        return
      }
      const gp = Array.isArray(data.gameProgress) ? data.gameProgress : []
      applyProgressData(data.investigators, gp)
      adminCacheWrite(ADMIN_CACHE_KEYS.progress, {
        investigators: data.investigators,
        gameProgress: gp,
      } satisfies ProgressCachePayload)
      setHasCache(true)
    } catch {
      setLoadError("通信に失敗しました。")
    } finally {
      setLoading(false)
    }
  }, [applyProgressData])

  useEffect(() => {
    const cached = adminCacheRead<ProgressCachePayload>(ADMIN_CACHE_KEYS.progress)
    if (cached?.investigators) {
      applyProgressData(cached.investigators, Array.isArray(cached.gameProgress) ? cached.gameProgress : [])
      setHasCache(true)
      setLoading(false)
    }
    void load()
  }, [applyProgressData, load])

  const selected = useMemo(
    () => rows.find((r) => r.loginId === selectedLogin) ?? null,
    [rows, selectedLogin]
  )

  const gameFilterOptions = useMemo(() => {
    const opts: { id: string; label: string }[] = [{ id: "", label: "すべてのゲーム" }]
    for (const g of ADMIN_GAME_CATALOG) {
      opts.push({ id: g.id, label: `${g.title}（${g.id}）` })
    }
    opts.push({ id: UNCATEGORIZED_GAME_ID, label: "カタログ外の case_id のみ" })
    return opts
  }, [])

  const visibleRows = useMemo(() => {
    const list = rows
      .filter((r) => investigatorTouchesGame(r.loginId, r, gameProgress, gameFilter))
      .sort((a, b) => a.loginId.localeCompare(b.loginId))
    return list
  }, [rows, gameProgress, gameFilter])

  useEffect(() => {
    if (visibleRows.length === 0) {
      setSelectedLogin(null)
      return
    }
    if (!selectedLogin || !visibleRows.some((r) => r.loginId === selectedLogin)) {
      setSelectedLogin(visibleRows[0]!.loginId)
    }
  }, [visibleRows, selectedLogin])

  const slotsForSelectedUser = useMemo((): AdminSaveSlot[] => {
    if (!selectedLogin) return []
    const inv = rows.find((r) => r.loginId === selectedLogin)
    const fromGp = gameProgress
      .filter((g) => g.loginId === selectedLogin)
      .map((g) => (g.caseId || "").trim())
      .filter(Boolean)
    return buildSaveSlotsForUser(selectedLogin, inv?.caseId || "", fromGp)
  }, [selectedLogin, rows, gameProgress])

  useEffect(() => {
    if (!selectedLogin || slotsForSelectedUser.length === 0) {
      setViewGameId("")
      setViewCaseId("")
      return
    }
    setViewGameId((gPrev) => {
      const ok = gPrev && slotsForSelectedUser.some((s) => s.gameId === gPrev)
      return ok ? gPrev : slotsForSelectedUser[0]!.gameId
    })
  }, [selectedLogin, slotsForSelectedUser])

  useEffect(() => {
    if (!viewGameId) {
      setViewCaseId("")
      return
    }
    const inGame = slotsForSelectedUser.filter((s) => s.gameId === viewGameId)
    if (inGame.length === 0) {
      setViewCaseId("")
      return
    }
    setViewCaseId((cPrev) => {
      const ok = cPrev && inGame.some((s) => s.caseId === cPrev)
      return ok ? cPrev : inGame[0]!.caseId
    })
  }, [viewGameId, slotsForSelectedUser])

  const storiesInViewGame = useMemo(() => {
    return slotsForSelectedUser.filter((s) => s.gameId === viewGameId)
  }, [slotsForSelectedUser, viewGameId])

  const currentSlot = useMemo(() => {
    return slotsForSelectedUser.find((s) => s.gameId === viewGameId && s.caseId === viewCaseId) ?? null
  }, [slotsForSelectedUser, viewGameId, viewCaseId])

  const newSlotGameDef = useMemo(() => getAdminGame(newSlotGameId), [newSlotGameId])

  useEffect(() => {
    const stories = newSlotGameDef?.stories ?? []
    if (stories.length === 0) {
      setNewSlotStoryCaseId("")
      return
    }
    setNewSlotStoryCaseId((prev) => (prev && stories.some((s) => s.caseId === prev) ? prev : stories[0]!.caseId))
  }, [newSlotGameDef])

  const detailSummary = useMemo((): ProgressSummary | null => {
    if (!selected || !viewCaseId) return null
    const gp = gameProgress.find((g) => g.loginId === selected.loginId && g.caseId === viewCaseId)
    if (gp) return gp.progressSummary
    if (viewCaseId === (selected.caseId || "").trim()) return selected.progressSummary
    return null
  }, [selected, viewCaseId, gameProgress])

  const showSkeleton = loading && !hasCache

  return (
    <AdminConsoleShell
      title="プレイヤー"
      description="進行・バックアップ"
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
          {loading && hasCache ? (
            <span className="text-[11px] text-[#8b949e]">更新中…</span>
          ) : null}
          <Select
            value={gameFilter || "__all__"}
            onValueChange={(v) => setGameFilter(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="h-8 w-[min(100%,16rem)] border-[#30363d] bg-[#21262d] text-[12px] text-[#c9d1d9]">
              <SelectValue placeholder="すべてのゲーム" />
            </SelectTrigger>
            <SelectContent className="border-[#30363d] bg-[#161b22] text-[#e6edf3]">
              {gameFilterOptions.map((opt) => (
                <SelectItem
                  key={opt.id || "__all__"}
                  value={opt.id || "__all__"}
                  className="text-xs focus:bg-[#21262d] focus:text-[#f0f6fc]"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
      actions={
        <button type="button" onClick={() => void load()} disabled={loading} className={adminBtnClass()}>
          再読込
        </button>
      }
    >
      <div className="flex flex-1 flex-col gap-4 md:flex-row md:gap-0">
        <aside className="flex w-full flex-col border border-[#30363d] bg-[#161b22] md:w-[min(100%,22rem)] md:border-r-0 md:rounded-none">
          <div
            className="border-b border-[#30363d] px-3 py-2 text-[11px] font-medium text-[#8b949e]"
            style={{ fontFamily: 'var(--font-admin-mono), "IBM Plex Mono", monospace' }}
          >
            ユーザー ({visibleRows.length})
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_5.5rem] gap-x-2 border-b border-[#30363d] px-3 py-1.5 text-[10px] text-[#8b949e]">
            <span>loginId</span>
            <span>email</span>
            <span className="text-right">updatedAt</span>
          </div>
          <ScrollArea className="h-[min(48vh,420px)] md:h-auto md:flex-1 md:min-h-[28rem]">
            <ul>
              {visibleRows.map((r) => {
                const active = r.loginId === selectedLogin
                return (
                  <li key={r.loginId}>
                    <button
                      type="button"
                      onClick={() => setSelectedLogin(r.loginId)}
                      className={cn(
                        "grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_5.5rem] gap-x-2 border-b border-[#30363d]/80 px-3 py-1.5 text-left text-[12px] transition-colors",
                        active
                          ? "bg-[#1f6feb]/15 text-[#79b8ff]"
                          : "text-[#c9d1d9] hover:bg-[#21262d]"
                      )}
                    >
                      <span
                        className="truncate font-medium"
                        style={{ fontFamily: 'var(--font-admin-mono), "IBM Plex Mono", monospace' }}
                      >
                        {r.loginId || "(空ID)"}
                      </span>
                      <span className="truncate text-[#8b949e]">{r.email || "—"}</span>
                      <span
                        className="truncate text-right text-[10px] text-[#8b949e]"
                        style={{ fontFamily: 'var(--font-admin-mono), "IBM Plex Mono", monospace' }}
                      >
                        {r.updatedAt ? r.updatedAt.slice(0, 16).replace("T", " ") : "—"}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </ScrollArea>
        </aside>

        <main className="min-w-0 flex-1 overflow-hidden md:border md:border-l-0 md:border-[#30363d] md:p-4">
          {showSkeleton ? (
            <div className="space-y-3">
              <div className="h-24 animate-pulse rounded-sm border border-[#30363d] bg-[#161b22]" />
              <div className="h-48 animate-pulse rounded-sm border border-[#30363d] bg-[#161b22]" />
            </div>
          ) : loadError && !hasCache ? (
            <Card className={cn(panelClass, "border-[#f85149]/40")}>
              <CardHeader>
                <CardTitle className="text-base text-[#f85149]">取得エラー</CardTitle>
                <CardDescription className="text-[#8b949e]">{loadError}</CardDescription>
              </CardHeader>
            </Card>
          ) : !selected ? (
            <p className="text-[13px] text-[#8b949e]">ユーザーがいません。</p>
          ) : (
            <div className="flex h-full flex-col gap-4">
              {loadError ? (
                <p className="text-[12px] text-[#d29922]">再取得エラー: {loadError}（キャッシュ表示中）</p>
              ) : null}

              <Card className={panelClass}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-[#f0f6fc]">表示するタイトルとストーリー</CardTitle>
                  <CardDescription className="text-xs text-[#8b949e]">
                    まず <strong className="text-[#c9d1d9]">タイトル（game）</strong> を選び、ストーリーが複数ある場合のみ{" "}
                    <strong className="text-[#c9d1d9]">ストーリー（case_id）</strong> を選びます。保存キーは常に{" "}
                    <code className="rounded-sm bg-[#21262d] px-1 text-[#c9d1d9]">case_id</code> です。
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                  {slotsForSelectedUser.length === 0 ? (
                    <p className="text-xs text-[#8b949e]">
                      まだセーブ枠がありません。下の「セーブ枠を追加」でストーリーを登録してください。
                    </p>
                  ) : (
                    <>
                      <div className="min-w-[12rem] flex-1 space-y-1">
                        <label className="text-[10px] text-[#8b949e]">タイトル（game_id）</label>
                        <Select value={viewGameId} onValueChange={setViewGameId}>
                          <SelectTrigger className="w-full border-[#30363d] bg-[#0e1116] text-sm text-[#e6edf3]">
                            <SelectValue placeholder="タイトルを選択" />
                          </SelectTrigger>
                          <SelectContent className="border-[#30363d] bg-[#161b22] text-[#e6edf3]">
                            {[
                              ...new Map(
                                slotsForSelectedUser.map((s) => [s.gameId, s.gameTitle] as const)
                              ).entries(),
                            ].map(([gid, title]) => (
                              <SelectItem key={gid} value={gid} className="text-xs focus:bg-[#21262d]">
                                {title}{" "}
                                <span className="font-mono text-[10px] text-[#8b949e]">({gid})</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {storiesInViewGame.length > 1 ? (
                        <div className="min-w-[12rem] flex-1 space-y-1">
                          <label className="text-[10px] text-[#8b949e]">ストーリー（case_id）</label>
                          <Select value={viewCaseId} onValueChange={setViewCaseId}>
                            <SelectTrigger className="w-full border-[#30363d] bg-[#0e1116] text-sm text-[#e6edf3]">
                              <SelectValue placeholder="ストーリーを選択" />
                            </SelectTrigger>
                            <SelectContent className="border-[#30363d] bg-[#161b22] text-[#e6edf3]">
                              {storiesInViewGame.map((s) => (
                                <SelectItem key={s.caseId} value={s.caseId} className="text-xs focus:bg-[#21262d]">
                                  {s.storyTitle}{" "}
                                  <span className="font-mono text-[10px] text-[#8b949e]">({s.caseId})</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : storiesInViewGame.length === 1 ? (
                        <p className="pb-2 text-xs text-[#8b949e]">
                          ストーリー: <strong className="text-[#c9d1d9]">{storiesInViewGame[0]!.storyTitle}</strong>{" "}
                          <code className="rounded-sm bg-[#21262d] px-1 font-mono text-[10px] text-[#c9d1d9]">
                            {storiesInViewGame[0]!.caseId}
                          </code>
                        </p>
                      ) : null}
                    </>
                  )}
                </CardContent>
              </Card>

              {selected && viewCaseId ? (
                <AdminSaveBackupPanel
                  loginId={selected.loginId}
                  caseId={viewCaseId}
                  primaryCaseId={selected.caseId || ""}
                  onAfterRestore={() => void load()}
                />
              ) : null}

              <Card className={panelClass}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-[#f0f6fc]">別ストーリーのセーブ枠を追加</CardTitle>
                  <CardDescription className="text-xs text-[#8b949e]">
                    カタログに載っているタイトルから選ぶと、対応する{" "}
                    <code className="rounded-sm bg-[#21262d] px-1 text-[#c9d1d9]">case_id</code>{" "}
                    で空行を作成します。カタログ未登録の ID が必要なときだけ下の手入力を使います。
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[10rem] flex-1 space-y-1">
                      <label className="text-[10px] text-[#8b949e]">タイトル</label>
                      <Select value={newSlotGameId} onValueChange={setNewSlotGameId}>
                        <SelectTrigger className="w-full border-[#30363d] bg-[#0e1116] text-xs text-[#e6edf3]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-[#30363d] bg-[#161b22] text-[#e6edf3]">
                          {ADMIN_GAME_CATALOG.map((g) => (
                            <SelectItem key={g.id} value={g.id} className="text-xs focus:bg-[#21262d]">
                              {g.title}{" "}
                              <span className="font-mono text-[10px] text-[#8b949e]">({g.id})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {newSlotGameDef && newSlotGameDef.stories.length > 1 ? (
                      <div className="min-w-[10rem] flex-1 space-y-1">
                        <label className="text-[10px] text-[#8b949e]">ストーリー</label>
                        <Select value={newSlotStoryCaseId} onValueChange={setNewSlotStoryCaseId}>
                          <SelectTrigger className="w-full border-[#30363d] bg-[#0e1116] text-xs text-[#e6edf3]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-[#30363d] bg-[#161b22] text-[#e6edf3]">
                            {newSlotGameDef.stories.map((s) => (
                              <SelectItem key={s.caseId} value={s.caseId} className="text-xs focus:bg-[#21262d]">
                                {s.title}{" "}
                                <span className="font-mono text-[10px] text-[#8b949e]">({s.caseId})</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                    <button
                      type="button"
                      className={adminBtnClass("primary")}
                      disabled={slotBusy || !newSlotStoryCaseId.trim() || !selected.loginId}
                      onClick={() => {
                        setSlotBusy(true)
                        void (async () => {
                          try {
                            const toAdd = newSlotStoryCaseId.trim()
                            const res = await fetch("/api/admin/ensure-game-slot", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                targetLoginId: selected.loginId,
                                caseId: toAdd,
                              }),
                            })
                            const data = (await res.json()) as { success?: boolean; message?: string }
                            if (res.ok && data.success) {
                              const hit = resolveStoryInCatalog(toAdd)
                              await load()
                              if (hit) {
                                setViewGameId(hit.game.id)
                                setViewCaseId(toAdd)
                              } else {
                                setViewGameId(UNCATEGORIZED_GAME_ID)
                                setViewCaseId(toAdd)
                              }
                            } else {
                              window.alert(data.message || "追加に失敗しました。")
                            }
                          } finally {
                            setSlotBusy(false)
                          }
                        })()
                      }}
                    >
                      {slotBusy ? "追加中…" : "セーブ枠を追加"}
                    </button>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 border-t border-[#30363d] pt-3">
                    <div className="min-w-[12rem] flex-1 space-y-1">
                      <label className="text-[10px] text-[#8b949e]">上級: 任意の case_id（カタログ外）</label>
                      <input
                        value={newCaseSlotManual}
                        onChange={(e) => setNewCaseSlotManual(e.target.value)}
                        placeholder="例: next-story-2035"
                        className="w-full rounded-sm border border-[#30363d] bg-[#0e1116] px-2 py-1.5 font-mono text-xs text-[#e6edf3]"
                      />
                    </div>
                    <button
                      type="button"
                      className={adminBtnClass()}
                      disabled={slotBusy || !newCaseSlotManual.trim() || !selected.loginId}
                      onClick={() => {
                        setSlotBusy(true)
                        void (async () => {
                          try {
                            const toAdd = newCaseSlotManual.trim()
                            const res = await fetch("/api/admin/ensure-game-slot", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                targetLoginId: selected.loginId,
                                caseId: toAdd,
                              }),
                            })
                            const data = (await res.json()) as { success?: boolean; message?: string }
                            if (res.ok && data.success) {
                              setNewCaseSlotManual("")
                              await load()
                              setViewGameId(UNCATEGORIZED_GAME_ID)
                              setViewCaseId(toAdd)
                            } else {
                              window.alert(data.message || "追加に失敗しました。")
                            }
                          } finally {
                            setSlotBusy(false)
                          }
                        })()
                      }}
                    >
                      手入力で追加
                    </button>
                  </div>
                </CardContent>
              </Card>

              <Card className={panelClass}>
                <CardHeader className="pb-2">
                  <CardTitle className="font-mono text-base text-[#f0f6fc]">{selected.loginId}</CardTitle>
                  <CardDescription className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#8b949e]">
                    <span>メール: {selected.email || "—"}</span>
                    <span>登録時の主ストーリー（case_id）: {selected.caseId || "—"}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 text-xs text-[#8b949e] md:grid-cols-2">
                  <div>更新: {selected.updatedAt || "—"}</div>
                  <div>最終ログイン: {selected.lastLoginAt || "—"}</div>
                  <div className="md:col-span-2">端末ID: {selected.lastDeviceId || "—"}</div>
                  {detailSummary?.activeTab ? (
                    <div className="md:col-span-2">
                      最後のタブ:{" "}
                      <Badge variant="outline" className="border-[#30363d] text-[#c9d1d9]">
                        {detailSummary.activeTab}
                      </Badge>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {!viewCaseId ? (
                <Card className={panelClass}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-[#f0f6fc]">進行のプレビュー</CardTitle>
                    <CardDescription className="text-xs text-[#8b949e]">
                      上でゲームを選ぶと、このユーザー×そのゲームの任務・資料室などが表示されます。
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : !detailSummary ? (
                <Card className={panelClass}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-[#f0f6fc]">このゲームのセーブがまだありません</CardTitle>
                    <CardDescription className="text-xs text-[#8b949e]">
                      プレイヤーに該当ゲームでログインしてもらうか、上のバックアップから復元してください。枠だけある場合は「ゲーム枠を追加」で作成済みか確認してください。
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : detailSummary.parseError ? (
                <Card className={cn(panelClass, "border-amber-500/40")}>
                  <CardHeader>
                    <CardTitle className="text-base text-amber-200">progress_json の解析失敗</CardTitle>
                    <CardDescription className="font-mono text-xs whitespace-pre-wrap text-[#8b949e]">
                      {detailSummary.rawPreview || ""}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : currentSlot?.adminProgressView === "minimal" ? (
                <Card className={panelClass}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-[#f0f6fc]">進捗サマリー（汎用）</CardTitle>
                    <CardDescription className="text-xs text-[#8b949e]">
                      このタイトルは管理カタログで <code className="rounded-sm bg-[#21262d] px-1">minimal</code>{" "}
                      表示に設定されています。中身は{" "}
                      <code className="rounded-sm bg-[#21262d] px-1">ProgressState</code>{" "}
                      互換の JSON ですが、タスク一覧などは出しません。
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {detailSummary.counts ? (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(detailSummary.counts).map(([k, n]) => (
                          <Badge key={k} variant="secondary" className="bg-[#21262d] font-mono text-[10px] text-[#c9d1d9]">
                            {k}: {n}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    <ScrollArea className="h-[min(50vh,420px)] rounded-sm border border-[#30363d]">
                      <pre className="p-4 font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap text-[#c9d1d9]">
                        {JSON.stringify(detailSummary, null, 2)}
                      </pre>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ) : (
                <Tabs defaultValue="tasks" className="flex min-h-0 flex-1 flex-col">
                  <TabsList className="flex w-full flex-wrap justify-start gap-1 border border-[#30363d] bg-[#161b22]">
                    <TabsTrigger value="tasks" className="data-[state=active]:bg-[#1f6feb]/20 data-[state=active]:text-[#79b8ff]">
                      タスク
                    </TabsTrigger>
                    <TabsTrigger value="archive" className="data-[state=active]:bg-[#1f6feb]/20 data-[state=active]:text-[#79b8ff]">
                      コレクション
                    </TabsTrigger>
                    <TabsTrigger value="memos" className="data-[state=active]:bg-[#1f6feb]/20 data-[state=active]:text-[#79b8ff]">
                      メモ
                    </TabsTrigger>
                    <TabsTrigger value="achievements" className="data-[state=active]:bg-[#1f6feb]/20 data-[state=active]:text-[#79b8ff]">
                      実績
                    </TabsTrigger>
                    <TabsTrigger value="communications" className="data-[state=active]:bg-[#1f6feb]/20 data-[state=active]:text-[#79b8ff]">
                      連絡
                    </TabsTrigger>
                    <TabsTrigger value="raw" className="data-[state=active]:bg-[#1f6feb]/20 data-[state=active]:text-[#79b8ff]">
                      JSON
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="tasks" className="mt-3 min-h-0 flex-1 data-[state=inactive]:hidden">
                    <ScrollArea className="h-[min(60vh,480px)] rounded-sm border border-[#30363d]">
                      <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 bg-[#0e1116] text-xs text-[#8b949e]">
                          <tr>
                            <th className="p-2 font-medium">状態</th>
                            <th className="p-2 font-medium">タイトル</th>
                            <th className="p-2 font-medium">種別</th>
                            <th className="hidden p-2 font-medium lg:table-cell">グループ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(detailSummary.tasks || []).map((t) => (
                            <tr key={t.id || t.templateId} className="border-t border-[#30363d]">
                              <td className="p-2 align-top">
                                <Badge variant="outline" className={cn("text-[10px]", statusBadgeClass(t.status))}>
                                  {t.status || "—"}
                                </Badge>
                              </td>
                              <td className="p-2 align-top">
                                <div className="font-medium text-[#e6edf3]">{t.title || t.id}</div>
                                <div className="font-mono text-[10px] text-[#8b949e]">
                                  {t.templateId ? `template: ${t.templateId}` : t.id}
                                </div>
                              </td>
                              <td className="p-2 align-top text-xs text-[#8b949e]">{t.completionType || "—"}</td>
                              <td className="hidden p-2 align-top text-xs text-[#8b949e] lg:table-cell">
                                {t.groupTitle || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="archive" className="mt-3 min-h-0 flex-1 data-[state=inactive]:hidden">
                    <ScrollArea className="h-[min(60vh,480px)] space-y-2 rounded-sm border border-[#30363d] p-3">
                      {(detailSummary.archiveItems || []).length === 0 ? (
                        <p className="text-sm text-[#8b949e]">資料なし</p>
                      ) : (
                        <ul className="space-y-3">
                          {(detailSummary.archiveItems || []).map((a) => (
                            <li key={a.id} className="rounded-sm border border-[#30363d] bg-[#0e1116] p-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary" className="bg-[#21262d] text-[#c9d1d9]">
                                  {a.type}
                                </Badge>
                                <span className="font-medium text-[#e6edf3]">{a.title}</span>
                              </div>
                              <p className="mt-1 text-xs whitespace-pre-wrap text-[#8b949e]">{a.descriptionPreview}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="memos" className="mt-3 min-h-0 flex-1 data-[state=inactive]:hidden">
                    <ScrollArea className="h-[min(60vh,480px)] space-y-2 rounded-sm border border-[#30363d] p-3">
                      {(detailSummary.memos || []).map((m) => (
                        <div key={m.id} className="rounded-sm border border-[#30363d] bg-[#0e1116] p-3">
                          <div className="font-medium text-[#e6edf3]">{m.title}</div>
                          <p className="mt-1 text-xs whitespace-pre-wrap text-[#8b949e]">{m.contentPreview}</p>
                        </div>
                      ))}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="achievements" className="mt-3 min-h-0 flex-1 data-[state=inactive]:hidden">
                    <ScrollArea className="h-[min(60vh,480px)] rounded-sm border border-[#30363d] p-3">
                      <ul className="space-y-2">
                        {(detailSummary.achievements || []).map((h) => (
                          <li
                            key={h.id}
                            className="flex items-center justify-between gap-2 rounded-sm border border-[#30363d] px-3 py-2 text-sm"
                          >
                            <span className="text-[#e6edf3]">{h.title}</span>
                            <Badge variant="outline" className="border-[#30363d] text-[10px] text-[#c9d1d9]">
                              {h.rarity}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="communications" className="mt-3 min-h-0 flex-1 data-[state=inactive]:hidden">
                    <ScrollArea className="h-[min(60vh,480px)] rounded-sm border border-[#30363d] p-3">
                      <ul className="space-y-2">
                        {(detailSummary.communications || []).map((c) => (
                          <li
                            key={c.id}
                            className="flex flex-col gap-1 rounded-sm border border-[#30363d] px-3 py-2 text-sm md:flex-row md:items-center md:justify-between"
                          >
                            <div>
                              <div className="font-medium text-[#e6edf3]">{c.subject}</div>
                              <div className="text-xs text-[#8b949e]">{c.from}</div>
                            </div>
                            <Badge
                              variant={c.isRead ? "secondary" : "default"}
                              className={cn(
                                "w-fit text-[10px]",
                                c.isRead ? "bg-[#21262d] text-[#c9d1d9]" : "bg-[#1f6feb] text-white"
                              )}
                            >
                              {c.isRead ? "既読" : "未読"}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="raw" className="mt-3 min-h-0 flex-1 data-[state=inactive]:hidden">
                    <ScrollArea className="h-[min(60vh,520px)] rounded-sm border border-[#30363d]">
                      <pre className="p-4 font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap text-[#c9d1d9]">
                        {JSON.stringify(detailSummary, null, 2)}
                      </pre>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          )}
        </main>
      </div>
    </AdminConsoleShell>
  )
}
