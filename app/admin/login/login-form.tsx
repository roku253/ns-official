"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AdminLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get("next") || "/admin"

  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      const data = (await res.json()) as { ok?: boolean; message?: string }
      if (!res.ok || !data.ok) {
        setError(data.message || "ログインに失敗しました。")
        return
      }
      router.replace(nextPath.startsWith("/admin") ? nextPath : "/admin")
      router.refresh()
    } catch {
      setError("通信エラーが発生しました。")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md border-destructive/30">
        <CardHeader>
          <CardTitle className="text-xl">運営コンソール</CardTitle>
          <CardDescription>
            このページはプレイヤー向けナビからリンクされていません。運営用の秘密キー（環境変数{" "}
            <code className="text-xs">ADMIN_PORTAL_KEY</code> と GAS の Script Properties の同一値）を入力してください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="admin-key">管理者キー</Label>
              <Input
                id="admin-key"
                type="password"
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ADMIN_PORTAL_KEY と同じ文字列"
                className="font-mono text-sm"
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={loading || !password.trim()}>
              {loading ? "確認中…" : "入室"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
