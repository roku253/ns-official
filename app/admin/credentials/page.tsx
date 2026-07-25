"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type CredentialRow = {
  loginId: string
  resourceKey: string
  label: string
  url: string
  username: string
  password: string
  notes: string
  updatedAt: string
}

export default function AdminOfficialCredentialsPage() {
  const [rows, setRows] = useState<CredentialRow[]>([])
  const [filterLogin, setFilterLogin] = useState("")
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showSecrets, setShowSecrets] = useState(false)
  const [form, setForm] = useState({
    loginId: "",
    resourceKey: "",
    label: "",
    url: "",
    username: "",
    password: "",
    notes: "",
  })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/admin/official-credentials", { cache: "no-store" })
      const data = (await res.json()) as { success?: boolean; credentials?: CredentialRow[]; message?: string }
      if (!res.ok || !data.success) {
        setError(data.message || "取得に失敗しました。")
        setRows([])
        return
      }
      setRows(Array.isArray(data.credentials) ? data.credentials : [])
    } catch {
      setError("通信に失敗しました。")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = filterLogin.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => r.loginId.toLowerCase().includes(q))
  }, [rows, filterLogin])

  async function saveUpsert() {
    setMessage(null)
    setError(null)
    if (!form.loginId.trim() || !form.resourceKey.trim()) {
      setError("loginId と resourceKey は必須です。")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/admin/official-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "upsert",
          loginId: form.loginId.trim(),
          resourceKey: form.resourceKey.trim(),
          label: form.label,
          url: form.url,
          username: form.username,
          password: form.password,
          notes: form.notes,
        }),
      })
      const data = (await res.json()) as { success?: boolean; message?: string }
      if (!res.ok || !data.success) {
        setError(data.message || "保存に失敗しました。")
        return
      }
      setMessage(data.message || "保存しました。")
      await load()
    } catch {
      setError("通信に失敗しました。")
    } finally {
      setSaving(false)
    }
  }

  async function removeRow(loginId: string, resourceKey: string) {
    if (!window.confirm(`${loginId} / ${resourceKey} を削除しますか？`)) return
    setError(null)
    try {
      const res = await fetch("/api/admin/official-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "delete", loginId, resourceKey }),
      })
      const data = (await res.json()) as { success?: boolean; message?: string }
      if (!res.ok || !data.success) {
        setError(data.message || "削除に失敗しました。")
        return
      }
      await load()
    } catch {
      setError("通信に失敗しました。")
    }
  }

  function startEdit(r: CredentialRow) {
    setForm({
      loginId: r.loginId,
      resourceKey: r.resourceKey,
      label: r.label,
      url: r.url,
      username: r.username,
      password: r.password,
      notes: r.notes,
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">運営メモ · ID / パスワード（ユーザー別）</h1>
          <p className="text-muted-foreground text-xs">
            スプレッドシート <code className="rounded bg-muted px-1">NSOfficialCredentials</code> と同期。外部サイト用のほか、サポート用のポータルID控えなど運営が必要なメモに使えます。{" "}
            <code className="rounded bg-muted px-1">resource_key</code> で種別を分けてください（例:{" "}
            <code className="rounded bg-muted px-1">urban-board</code>、<code className="rounded bg-muted px-1">portal-memo</code>）。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin">運営コンソール</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">追加・更新</CardTitle>
          <CardDescription>同一 loginId + resourceKey は上書きされます。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">loginId</Label>
            <Input
              className="font-mono text-sm"
              value={form.loginId}
              onChange={(e) => setForm((f) => ({ ...f, loginId: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">resource_key</Label>
            <Input
              className="font-mono text-sm"
              value={form.resourceKey}
              onChange={(e) => setForm((f) => ({ ...f, resourceKey: e.target.value }))}
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs">表示ラベル</Label>
            <Input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs">URL（任意）</Label>
            <Input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">ユーザー名・ID</Label>
            <Input
              className="font-mono text-sm"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">パスワード</Label>
            <Input
              type={showSecrets ? "text" : "password"}
              className="font-mono text-sm"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs">メモ</Label>
            <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex flex-wrap items-center gap-3 md:col-span-2">
            <Button type="button" onClick={() => void saveUpsert()} disabled={saving}>
              {saving ? "保存中…" : "保存"}
            </Button>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={showSecrets} onChange={(e) => setShowSecrets(e.target.checked)} />
              パスワードを表示
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">一覧</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="loginId で絞り込み"
              className="max-w-xs font-mono text-sm"
              value={filterLogin}
              onChange={(e) => setFilterLogin(e.target.value)}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              再読込
            </Button>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">読み込み中…</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="p-2 font-medium">loginId</th>
                    <th className="p-2 font-medium">key</th>
                    <th className="p-2 font-medium">label</th>
                    <th className="p-2 font-medium">username</th>
                    <th className="p-2 font-medium">password</th>
                    <th className="p-2 font-medium">更新</th>
                    <th className="p-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={`${r.loginId}-${r.resourceKey}`} className="border-t border-border/60">
                      <td className="p-2 font-mono text-xs">{r.loginId}</td>
                      <td className="p-2 font-mono text-xs">{r.resourceKey}</td>
                      <td className="p-2 text-xs">{r.label}</td>
                      <td className="p-2 font-mono text-xs">{showSecrets ? r.username : r.username ? "•••" : "—"}</td>
                      <td className="p-2 font-mono text-xs">{showSecrets ? r.password : r.password ? "•••" : "—"}</td>
                      <td className="p-2 text-[10px] text-muted-foreground">{r.updatedAt || "—"}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          <Button type="button" variant="outline" size="sm" onClick={() => startEdit(r)}>
                            編集
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => void removeRow(r.loginId, r.resourceKey)}
                          >
                            削除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {message ? <p className="mt-3 text-sm text-primary">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
    </div>
  )
}
