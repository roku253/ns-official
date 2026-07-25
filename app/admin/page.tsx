"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
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

function statusBadgeClass(status: string) {
  if (status === "completed") return "border-sky-500/45 bg-sky-500/12 text-sky-200"
  if (status === "active") return "border-amber-500/50 bg-amber-500/15 text-amber-100"
  if (status === "locked") return "border-muted-foreground/40 bg-muted/30 text-muted-foreground"
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
        setRows([])
        setGameProgress([])
        return
      }
      setRows(data.investigators)
      setGameProgress(Array.isArray(data.gameProgress) ? data.gameProgress : [])
      setSelectedLogin((prev) => {
        if (prev && data.investigators!.some((r) => r.loginId === prev)) return prev
        return data.investigators![0]?.loginId ?? null
      })
    } catch {
      setLoadError("通信に失敗しました。")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

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

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" })
    window.location.href = "/admin/login"
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-6">
        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="text-lg font-semibold tracking-tight">運営コンソール</h1>
          <p className="text-muted-foreground text-xs">
            プレイヤー進行の確認・バックアップ。公式コンテンツ（お知らせ・作品詳細・公開）は{" "}
            <Link href="/admin/news" className="text-primary underline-offset-2 hover:underline">
              お知らせ
            </Link>
            {" / "}
            <Link href="/admin/works" className="text-primary underline-offset-2 hover:underline">
              作品CMS
            </Link>
            。進行データは <code className="rounded bg-muted px-1">Investigators</code> と{" "}
            <code className="rounded bg-muted px-1">GameProgress</code>（ユーザー×
            <code className="rounded bg-muted px-1">case_id</code>）です。紐づけ（case↔エンジン）はコード生成のままです。
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              タイトル（game）でユーザー一覧を絞り込み
            </span>
            <Select
              value={gameFilter || "__all__"}
              onValueChange={(v) => setGameFilter(v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="h-8 w-[min(100%,18rem)] text-xs">
                <SelectValue placeholder="すべてのゲーム" />
              </SelectTrigger>
              <SelectContent>
                {gameFilterOptions.map((opt) => (
                  <SelectItem
                    key={opt.id || "__all__"}
                    value={opt.id || "__all__"}
                    className={opt.id ? "text-xs" : "text-xs"}
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/works">作品CMS</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/news">お知らせ</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/credentials">運営メモ・資格情報</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              再読込
            </Button>
            <Button variant="secondary" size="sm" onClick={() => void logout()}>
              退室
            </Button>
          </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 md:flex-row md:gap-0 md:p-0">
        <aside className="flex w-full flex-col border-border md:w-[min(100%,24rem)] md:border-r">
          <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
            ユーザー ({visibleRows.length})
          </div>
          <ScrollArea className="h-[min(48vh,420px)] md:h-auto md:flex-1">
            <ul className="space-y-1 p-2">
              {visibleRows.map((r) => {
                const gameCount = new Set(
                  gameProgress.filter((g) => g.loginId === r.loginId).map((g) => g.caseId)
                ).size
                const active = r.loginId === selectedLogin
                return (
                  <li key={r.loginId}>
                    <button
                      type="button"
                      onClick={() => setSelectedLogin(r.loginId)}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        active
                          ? "border-primary/60 bg-primary/10"
                          : "border-transparent bg-muted/20 hover:bg-muted/40"
                      )}
                    >
                      <div className="font-mono font-medium leading-tight">{r.loginId || "(空ID)"}</div>
                      <div className="text-muted-foreground truncate text-xs">{r.email}</div>
                      <div className="mt-1.5 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                        <span className="rounded bg-muted/80 px-1.5 py-0.5 font-mono">
                          主ストーリー: {r.caseId || "—"}
                        </span>
                        {gameCount > 0 ? (
                          <span className="rounded bg-muted/50 px-1.5 py-0.5">セーブ枠 {gameCount} 件</span>
                        ) : null}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </ScrollArea>
        </aside>

        <main className="flex-1 overflow-hidden p-4 md:p-6">
          {loading ? (
            <p className="text-muted-foreground text-sm">読み込み中…</p>
          ) : loadError ? (
            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle className="text-destructive text-base">取得エラー</CardTitle>
                <CardDescription>{loadError}</CardDescription>
              </CardHeader>
            </Card>
          ) : !selected ? (
            <p className="text-muted-foreground text-sm">ユーザーがいません。</p>
          ) : (
            <div className="flex h-full flex-col gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">表示するタイトルとストーリー</CardTitle>
                  <CardDescription className="text-xs">
                    まず <strong>タイトル（game）</strong> を選び、ストーリーが複数ある場合のみ{" "}
                    <strong>ストーリー（case_id）</strong> を選びます。1 ストーリーだけのタイトルでは 2
                    段目は自動で固定されます。保存キーは常に <code className="rounded bg-muted px-1">case_id</code>{" "}
                    です。
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                  {slotsForSelectedUser.length === 0 ? (
                    <p className="text-muted-foreground text-xs">
                      まだセーブ枠がありません。下の「セーブ枠を追加」でストーリーを登録してください。
                    </p>
                  ) : (
                    <>
                      <div className="min-w-[12rem] flex-1 space-y-1">
                        <label className="text-[10px] text-muted-foreground">タイトル（game_id）</label>
                        <Select value={viewGameId} onValueChange={setViewGameId}>
                          <SelectTrigger className="w-full text-sm">
                            <SelectValue placeholder="タイトルを選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {[
                              ...new Map(
                                slotsForSelectedUser.map((s) => [s.gameId, s.gameTitle] as const)
                              ).entries(),
                            ].map(([gid, title]) => (
                              <SelectItem key={gid} value={gid} className="text-xs">
                                {title}{" "}
                                <span className="font-mono text-[10px] text-muted-foreground">({gid})</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {storiesInViewGame.length > 1 ? (
                        <div className="min-w-[12rem] flex-1 space-y-1">
                          <label className="text-[10px] text-muted-foreground">ストーリー（case_id）</label>
                          <Select value={viewCaseId} onValueChange={setViewCaseId}>
                            <SelectTrigger className="w-full text-sm">
                              <SelectValue placeholder="ストーリーを選択" />
                            </SelectTrigger>
                            <SelectContent>
                              {storiesInViewGame.map((s) => (
                                <SelectItem key={s.caseId} value={s.caseId} className="text-xs">
                                  {s.storyTitle}{" "}
                                  <span className="font-mono text-[10px] text-muted-foreground">
                                    ({s.caseId})
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : storiesInViewGame.length === 1 ? (
                        <p className="text-muted-foreground pb-2 text-xs">
                          ストーリー:{" "}
                          <strong>{storiesInViewGame[0]!.storyTitle}</strong>{" "}
                          <code className="rounded bg-muted px-1 font-mono text-[10px]">
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

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">別ストーリーのセーブ枠を追加</CardTitle>
                  <CardDescription className="text-xs">
                    カタログに載っているタイトルから選ぶと、対応する <code className="rounded bg-muted px-1">case_id</code>{" "}
                    で空行を作成します。カタログ未登録の ID が必要なときだけ下の手入力を使います。
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[10rem] flex-1 space-y-1">
                      <label className="text-[10px] text-muted-foreground">タイトル</label>
                      <Select value={newSlotGameId} onValueChange={setNewSlotGameId}>
                        <SelectTrigger className="w-full text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ADMIN_GAME_CATALOG.map((g) => (
                            <SelectItem key={g.id} value={g.id} className="text-xs">
                              {g.title}{" "}
                              <span className="font-mono text-[10px] text-muted-foreground">({g.id})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {newSlotGameDef && newSlotGameDef.stories.length > 1 ? (
                      <div className="min-w-[10rem] flex-1 space-y-1">
                        <label className="text-[10px] text-muted-foreground">ストーリー</label>
                        <Select value={newSlotStoryCaseId} onValueChange={setNewSlotStoryCaseId}>
                          <SelectTrigger className="w-full text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {newSlotGameDef.stories.map((s) => (
                              <SelectItem key={s.caseId} value={s.caseId} className="text-xs">
                                {s.title}{" "}
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  ({s.caseId})
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      disabled={
                        slotBusy ||
                        !newSlotStoryCaseId.trim() ||
                        !selected.loginId
                      }
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
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 border-t border-border/60 pt-3">
                    <div className="min-w-[12rem] flex-1 space-y-1">
                      <label className="text-[10px] text-muted-foreground">
                        上級: 任意の case_id（カタログ外）
                      </label>
                      <input
                        value={newCaseSlotManual}
                        onChange={(e) => setNewCaseSlotManual(e.target.value)}
                        placeholder="例: next-story-2035"
                        className="w-full rounded-md border border-input bg-background px-2 py-1.5 font-mono text-xs"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
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
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="font-mono text-base">{selected.loginId}</CardTitle>
                  <CardDescription className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <span>メール: {selected.email || "—"}</span>
                    <span>登録時の主ストーリー（case_id）: {selected.caseId || "—"}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                  <div>更新: {selected.updatedAt || "—"}</div>
                  <div>最終ログイン: {selected.lastLoginAt || "—"}</div>
                  <div className="md:col-span-2">端末ID: {selected.lastDeviceId || "—"}</div>
                  {detailSummary?.activeTab ? (
                    <div className="md:col-span-2">
                      最後のタブ: <Badge variant="outline">{detailSummary.activeTab}</Badge>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {!viewCaseId ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">進行のプレビュー</CardTitle>
                    <CardDescription className="text-xs">
                      上でゲームを選ぶと、このユーザー×そのゲームの任務・資料室などが表示されます。
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : !detailSummary ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">このゲームのセーブがまだありません</CardTitle>
                    <CardDescription className="text-xs">
                      プレイヤーに該当ゲームでログインしてもらうか、上のバックアップから復元してください。枠だけある場合は「ゲーム枠を追加」で作成済みか確認してください。
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : detailSummary.parseError ? (
                <Card className="border-amber-500/40">
                  <CardHeader>
                    <CardTitle className="text-base text-amber-200">progress_json の解析失敗</CardTitle>
                    <CardDescription className="font-mono text-xs whitespace-pre-wrap">
                      {detailSummary.rawPreview || ""}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : currentSlot?.adminProgressView === "minimal" ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">進捗サマリー（汎用）</CardTitle>
                    <CardDescription className="text-xs">
                      このタイトルは管理カタログで <code className="rounded bg-muted px-1">minimal</code>{" "}
                      表示に設定されています。中身は{" "}
                      <code className="rounded bg-muted px-1">ProgressState</code>{" "}
                      互換の JSON ですが、タスク一覧などは出しません。
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {detailSummary.counts ? (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(detailSummary.counts).map(([k, n]) => (
                          <Badge key={k} variant="secondary" className="font-mono text-[10px]">
                            {k}: {n}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    <ScrollArea className="h-[min(50vh,420px)] rounded-md border border-border">
                      <pre className="p-4 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all">
                        {JSON.stringify(detailSummary, null, 2)}
                      </pre>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ) : (
                <Tabs defaultValue="tasks" className="flex min-h-0 flex-1 flex-col">
                  <TabsList className="flex w-full flex-wrap justify-start gap-1">
                    <TabsTrigger value="tasks">タスク</TabsTrigger>
                    <TabsTrigger value="archive">コレクション</TabsTrigger>
                    <TabsTrigger value="memos">メモ</TabsTrigger>
                    <TabsTrigger value="achievements">実績</TabsTrigger>
                    <TabsTrigger value="communications">連絡</TabsTrigger>
                    <TabsTrigger value="raw">JSON</TabsTrigger>
                  </TabsList>

                  <TabsContent value="tasks" className="mt-3 min-h-0 flex-1 data-[state=inactive]:hidden">
                    <ScrollArea className="h-[min(60vh,480px)] rounded-md border border-border">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-muted/40 sticky top-0 text-xs text-muted-foreground">
                          <tr>
                            <th className="p-2 font-medium">状態</th>
                            <th className="p-2 font-medium">タイトル</th>
                            <th className="p-2 font-medium">種別</th>
                            <th className="p-2 font-medium hidden lg:table-cell">グループ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(detailSummary.tasks || []).map((t) => (
                            <tr key={t.id || t.templateId} className="border-t border-border/60">
                              <td className="p-2 align-top">
                                <Badge variant="outline" className={cn("text-[10px]", statusBadgeClass(t.status))}>
                                  {t.status || "—"}
                                </Badge>
                              </td>
                              <td className="p-2 align-top">
                                <div className="font-medium">{t.title || t.id}</div>
                                <div className="text-muted-foreground font-mono text-[10px]">
                                  {t.templateId ? `template: ${t.templateId}` : t.id}
                                </div>
                              </td>
                              <td className="p-2 align-top text-muted-foreground text-xs">{t.completionType || "—"}</td>
                              <td className="p-2 align-top text-xs text-muted-foreground hidden lg:table-cell">
                                {t.groupTitle || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="archive" className="mt-3 min-h-0 flex-1 data-[state=inactive]:hidden">
                    <ScrollArea className="h-[min(60vh,480px)] space-y-2 rounded-md border border-border p-3">
                      {(detailSummary.archiveItems || []).length === 0 ? (
                        <p className="text-muted-foreground text-sm">資料なし</p>
                      ) : (
                        <ul className="space-y-3">
                          {(detailSummary.archiveItems || []).map((a) => (
                            <li key={a.id} className="rounded-lg border border-border/80 bg-card/50 p-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary">{a.type}</Badge>
                                <span className="font-medium">{a.title}</span>
                              </div>
                              <p className="text-muted-foreground mt-1 text-xs whitespace-pre-wrap">
                                {a.descriptionPreview}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="memos" className="mt-3 min-h-0 flex-1 data-[state=inactive]:hidden">
                    <ScrollArea className="h-[min(60vh,480px)] space-y-2 rounded-md border border-border p-3">
                      {(detailSummary.memos || []).map((m) => (
                        <div key={m.id} className="rounded-lg border border-border/80 bg-card/50 p-3">
                          <div className="font-medium">{m.title}</div>
                          <p className="text-muted-foreground mt-1 text-xs whitespace-pre-wrap">{m.contentPreview}</p>
                        </div>
                      ))}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="achievements" className="mt-3 min-h-0 flex-1 data-[state=inactive]:hidden">
                    <ScrollArea className="h-[min(60vh,480px)] rounded-md border border-border p-3">
                      <ul className="space-y-2">
                        {(detailSummary.achievements || []).map((h) => (
                          <li key={h.id} className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2 text-sm">
                            <span>{h.title}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {h.rarity}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="communications" className="mt-3 min-h-0 flex-1 data-[state=inactive]:hidden">
                    <ScrollArea className="h-[min(60vh,480px)] rounded-md border border-border p-3">
                      <ul className="space-y-2">
                        {(detailSummary.communications || []).map((c) => (
                          <li
                            key={c.id}
                            className="flex flex-col gap-1 rounded-md border border-border/60 px-3 py-2 text-sm md:flex-row md:items-center md:justify-between"
                          >
                            <div>
                              <div className="font-medium">{c.subject}</div>
                              <div className="text-muted-foreground text-xs">{c.from}</div>
                            </div>
                            <Badge variant={c.isRead ? "secondary" : "default"} className="w-fit text-[10px]">
                              {c.isRead ? "既読" : "未読"}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="raw" className="mt-3 min-h-0 flex-1 data-[state=inactive]:hidden">
                    <ScrollArea className="h-[min(60vh,520px)] rounded-md border border-border">
                      <pre className="p-4 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all">
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
    </div>
  )
}
