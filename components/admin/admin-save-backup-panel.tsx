"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type SnapshotMeta = {
  snapshotId: string
  createdAt: string
  chunkTotal: number
  byteSize: number
  caseId?: string
}

function formatSnapshotLabel(s: SnapshotMeta): string {
  const d = s.createdAt
  const kb = s.byteSize >= 1024 ? `${Math.round(s.byteSize / 1024)} KB` : `${s.byteSize} B`
  const c = s.caseId ? ` · ${s.caseId}` : " · （主ゲーム想定）"
  return `${d} · ${kb} · ${s.chunkTotal}チャンク${c}`
}

type AdminSaveBackupPanelProps = {
  loginId: string
  /** いま表示・復元の対象にしているゲーム（case_id） */
  caseId: string
  /** Investigators の主案件（レガシースナップショットの case 推定用） */
  primaryCaseId: string
  onAfterRestore?: () => void
}

export function AdminSaveBackupPanel({ loginId, caseId, primaryCaseId, onAfterRestore }: AdminSaveBackupPanelProps) {
  const [backupAllowed, setBackupAllowed] = useState<boolean | null>(null)
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([])
  const [selectedSnapshotId, setSelectedSnapshotId] = useState("")
  const [snapshotsLoading, setSnapshotsLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const filteredSnapshots = useMemo(() => {
    const cid = caseId.trim()
    const primary = primaryCaseId.trim()
    return snapshots.filter((s) => {
      const sc = (s.caseId || "").trim()
      if (!sc) return cid === primary
      return sc === cid
    })
  }, [snapshots, caseId, primaryCaseId])

  const loadSnapshots = useCallback(async (uid: string) => {
    if (!uid) {
      setSnapshots([])
      setSelectedSnapshotId("")
      return
    }
    setSnapshotsLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/admin/progress-snapshots?loginId=${encodeURIComponent(uid)}&limit=80`,
        { cache: "no-store" }
      )
      const data = (await res.json()) as {
        success?: boolean
        snapshots?: SnapshotMeta[]
        message?: string
      }
      if (!res.ok || data.success !== true) {
        setSnapshots([])
        setSelectedSnapshotId("")
        if (res.status === 403) setBackupAllowed(false)
        else setError(data.message || "スナップショット一覧の取得に失敗しました。")
        return
      }
      const list = data.snapshots || []
      setSnapshots(list)
      setSelectedSnapshotId("")
    } catch {
      setSnapshots([])
      setSelectedSnapshotId("")
      setError("通信に失敗しました。")
    } finally {
      setSnapshotsLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/admin/dev-tools-status", { cache: "no-store" })
        const data = (await res.json()) as { backupAllowed?: boolean }
        if (!cancelled) setBackupAllowed(res.ok ? data.backupAllowed === true : false)
      } catch {
        if (!cancelled) setBackupAllowed(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!loginId) return
    void loadSnapshots(loginId)
  }, [loginId, loadSnapshots])

  useEffect(() => {
    const pool = filteredSnapshots
    setSelectedSnapshotId((prev) => {
      if (prev && pool.some((x) => x.snapshotId === prev)) return prev
      return pool[0]?.snapshotId ?? ""
    })
  }, [filteredSnapshots])

  async function restoreSelected() {
    if (!loginId || !selectedSnapshotId) return
    setBusy(true)
    setMessage(null)
    setError(null)
    try {
      const res = await fetch("/api/admin/restore-snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetLoginId: loginId, snapshotId: selectedSnapshotId }),
      })
      const data = (await res.json()) as { success?: boolean; message?: string }
      if (res.status === 403) {
        setBackupAllowed(false)
        setError(data.message || "本番では ENABLE_ADMIN_BACKUP_TOOLS が必要です。")
        return
      }
      if (!res.ok || !data.success) {
        setError(data.message || "復元に失敗しました。")
        return
      }
      setMessage(data.message || "復元しました。")
      await loadSnapshots(loginId)
      onAfterRestore?.()
    } catch {
      setError("通信に失敗しました。")
    } finally {
      setBusy(false)
    }
  }

  async function captureNow() {
    if (!loginId || !caseId.trim()) return
    setBusy(true)
    setMessage(null)
    setError(null)
    try {
      const res = await fetch("/api/admin/capture-snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetLoginId: loginId,
          targetCaseId: caseId.trim(),
        }),
      })
      const data = (await res.json()) as { success?: boolean; message?: string }
      if (res.status === 403) {
        setBackupAllowed(false)
        setError(data.message || "本番では ENABLE_ADMIN_BACKUP_TOOLS が必要です。")
        return
      }
      if (!res.ok || !data.success) {
        setError(data.message || "スナップショットの保存に失敗しました。")
        return
      }
      setMessage(data.message || "現在の状態を履歴に追加しました。")
      await loadSnapshots(loginId)
    } catch {
      setError("通信に失敗しました。")
    } finally {
      setBusy(false)
    }
  }

  if (backupAllowed === null) {
    return (
      <Card>
        <CardContent className="py-6 text-xs text-muted-foreground">
          バックアップ API の利用可否を確認しています…
        </CardContent>
      </Card>
    )
  }

  if (backupAllowed === false) {
    return (
      <Card className="border-amber-500/35">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">セーブのバックアップ・復元</CardTitle>
          <CardDescription className="text-xs">
            この環境ではスナップショット API が無効です。本番では{" "}
            <code className="rounded bg-muted px-1">ENABLE_ADMIN_BACKUP_TOOLS=true</code> を設定してください（{" "}
            <code className="rounded bg-muted px-1">npm run dev</code> では既定で有効）。
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">このゲームのセーブ · バックアップ / 復元</CardTitle>
        <CardDescription className="text-xs">
          対象: <span className="font-mono">{loginId}</span> /{" "}
          <span className="font-mono">{caseId || "—"}</span>。履歴は{" "}
          <code className="rounded bg-muted px-1">ProgressSnapshots</code> にあります（選択中のゲームに合うものだけ一覧）。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="space-y-2">
          <Label className="text-xs">復元するスナップショット</Label>
          <Select
            value={selectedSnapshotId || undefined}
            onValueChange={setSelectedSnapshotId}
            disabled={busy || filteredSnapshots.length === 0 || snapshotsLoading || backupAllowed !== true}
          >
            <SelectTrigger className="w-full max-w-xl font-mono text-xs">
              <SelectValue placeholder={snapshotsLoading ? "読み込み中…" : "該当履歴なし"} />
            </SelectTrigger>
            <SelectContent>
              {filteredSnapshots.map((s) => (
                <SelectItem key={s.snapshotId} value={s.snapshotId} className="font-mono text-xs">
                  {formatSnapshotLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={busy || !selectedSnapshotId || backupAllowed !== true}
            onClick={() => void restoreSelected()}
          >
            この履歴で復元
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy || !caseId.trim() || backupAllowed !== true}
            onClick={() => void captureNow()}
          >
            いまのセーブを履歴に追加
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy || snapshotsLoading || backupAllowed !== true}
            onClick={() => void loadSnapshots(loginId)}
          >
            一覧を再読込
          </Button>
        </div>
        {message ? <p className="text-sm text-primary">{message}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <p className="text-[10px] text-muted-foreground">
          進行のシミュレーション（チェックポイント操作）は{" "}
          <Link
            href={`/admin/dev?focus=${encodeURIComponent(loginId)}&caseId=${encodeURIComponent(caseId.trim())}`}
            className="text-primary underline underline-offset-2"
          >
            このゲーム向け開発ツール
          </Link>
          を開きます（上記と同じユーザー・<span className="font-mono">{caseId || "—"}</span> がプリセット）。
        </p>
      </CardContent>
    </Card>
  )
}
