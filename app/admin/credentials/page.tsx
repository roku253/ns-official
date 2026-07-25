"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AdminConsoleShell, adminBtnClass } from "@/components/admin/admin-console-shell"

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

const fieldClass =
  "rounded-sm border-[#30363d] bg-[#0e1116] text-[#e6edf3] placeholder:text-[#8b949e] focus-visible:border-[#1f6feb] focus-visible:ring-[#1f6feb]/30"

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
    <AdminConsoleShell
      title="資格情報"
      description="メモ・外部ID"
      actions={
        <button type="button" onClick={() => void load()} disabled={loading} className={adminBtnClass()}>
          再読込
        </button>
      }
    >
      <div className="mx-auto max-w-4xl space-y-4">
        <p className="text-[12px] text-[#8b949e]">
          スプレッドシート <code className="rounded-sm bg-[#21262d] px-1 text-[#c9d1d9]">NSOfficialCredentials</code>{" "}
          と同期。外部サイト用のほか、サポート用のポータルID控えなど運営メモに使えます。{" "}
          <code className="rounded-sm bg-[#21262d] px-1 text-[#c9d1d9]">resource_key</code> で種別を分けてください（例:{" "}
          <code className="rounded-sm bg-[#21262d] px-1 text-[#c9d1d9]">urban-board</code>、
          <code className="rounded-sm bg-[#21262d] px-1 text-[#c9d1d9]">portal-memo</code>）。
        </p>

        <section className="space-y-3 border border-[#30363d] bg-[#161b22] p-4">
          <div>
            <h2 className="text-[14px] font-semibold text-[#f0f6fc]">追加・更新</h2>
            <p className="mt-0.5 text-[11px] text-[#8b949e]">同一 loginId + resourceKey は上書きされます。</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-[11px] text-[#8b949e]">loginId</Label>
              <Input
                className={`font-mono text-sm ${fieldClass}`}
                value={form.loginId}
                onChange={(e) => setForm((f) => ({ ...f, loginId: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-[#8b949e]">resource_key</Label>
              <Input
                className={`font-mono text-sm ${fieldClass}`}
                value={form.resourceKey}
                onChange={(e) => setForm((f) => ({ ...f, resourceKey: e.target.value }))}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-[11px] text-[#8b949e]">表示ラベル</Label>
              <Input
                className={fieldClass}
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-[11px] text-[#8b949e]">URL（任意）</Label>
              <Input
                className={fieldClass}
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-[#8b949e]">ユーザー名・ID</Label>
              <Input
                className={`font-mono text-sm ${fieldClass}`}
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-[#8b949e]">パスワード</Label>
              <Input
                type={showSecrets ? "text" : "password"}
                className={`font-mono text-sm ${fieldClass}`}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-[11px] text-[#8b949e]">メモ</Label>
              <Input
                className={fieldClass}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 md:col-span-2">
              <button type="button" onClick={() => void saveUpsert()} disabled={saving} className={adminBtnClass("primary")}>
                {saving ? "保存中…" : "保存"}
              </button>
              <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[#8b949e]">
                <input type="checkbox" checked={showSecrets} onChange={(e) => setShowSecrets(e.target.checked)} />
                パスワードを表示
              </label>
            </div>
          </div>
        </section>

        <section className="space-y-3 border border-[#30363d] bg-[#161b22] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[14px] font-semibold text-[#f0f6fc]">一覧</h2>
            <Input
              placeholder="loginId で絞り込み"
              className={`max-w-xs font-mono text-sm ${fieldClass}`}
              value={filterLogin}
              onChange={(e) => setFilterLogin(e.target.value)}
            />
          </div>
          {loading ? (
            <p className="text-[13px] text-[#8b949e]">読み込み中…</p>
          ) : (
            <div className="overflow-x-auto rounded-sm border border-[#30363d]">
              <table className="w-full text-left text-[13px]">
                <thead
                  className="bg-[#0e1116] text-[11px] text-[#8b949e]"
                  style={{ fontFamily: 'var(--font-admin-mono), "IBM Plex Mono", monospace' }}
                >
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
                    <tr key={`${r.loginId}-${r.resourceKey}`} className="border-t border-[#30363d]">
                      <td className="p-2 font-mono text-[12px] text-[#c9d1d9]">{r.loginId}</td>
                      <td className="p-2 font-mono text-[12px] text-[#c9d1d9]">{r.resourceKey}</td>
                      <td className="p-2 text-[12px] text-[#c9d1d9]">{r.label}</td>
                      <td className="p-2 font-mono text-[12px] text-[#c9d1d9]">
                        {showSecrets ? r.username : r.username ? "•••" : "—"}
                      </td>
                      <td className="p-2 font-mono text-[12px] text-[#c9d1d9]">
                        {showSecrets ? r.password : r.password ? "•••" : "—"}
                      </td>
                      <td className="p-2 text-[10px] text-[#8b949e]">{r.updatedAt || "—"}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          <button type="button" onClick={() => startEdit(r)} className={adminBtnClass()}>
                            編集
                          </button>
                          <button
                            type="button"
                            className={adminBtnClass("danger")}
                            onClick={() => void removeRow(r.loginId, r.resourceKey)}
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {message ? <p className="text-[13px] text-[#79b8ff]">{message}</p> : null}
          {error ? <p className="text-[13px] text-[#f85149]">{error}</p> : null}
        </section>
      </div>
    </AdminConsoleShell>
  )
}
