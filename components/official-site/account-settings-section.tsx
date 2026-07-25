"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Shield,
  Mail,
  Lock,
  AtSign,
  Pencil,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { LS_ACCOUNT, LS_AUTH, LS_SESSION } from "@/lib/storage-keys"
import { clearGateEmail } from "@/lib/gate-email"
import { postGas } from "@/lib/gas"
import type { PortalPreferences } from "@/lib/types"
import { mergePortalPreferences, DEFAULT_PORTAL_PREFERENCES } from "@/games/signal-trace/portal-engine/portal-preferences"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export interface AccountSettingsSectionProps {
  registeredEmail: string
  loginId: string
  caseId: string
  portalPreferences: PortalPreferences
  onPortalPreferencesChange: React.Dispatch<React.SetStateAction<PortalPreferences>>
  onLoginIdChanged: (nextLoginId: string) => void
  onEmailChanged: (email: string) => void
}

export function AccountSettingsSection({
  registeredEmail,
  loginId,
  caseId,
  portalPreferences,
  onPortalPreferencesChange,
  onLoginIdChanged,
  onEmailChanged,
}: AccountSettingsSectionProps) {
  const router = useRouter()
  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const [sheetRegistered, setSheetRegistered] = useState(false)
  const [sessionHasPw, setSessionHasPw] = useState(false)
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  const [nameOpen, setNameOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState("")

  const [idOpen, setIdOpen] = useState(false)
  const [idNew, setIdNew] = useState("")
  const [idPassword, setIdPassword] = useState("")

  const [emailOpen, setEmailOpen] = useState(false)
  const [emailNew, setEmailNew] = useState("")
  const [emailPassword, setEmailPassword] = useState("")

  const [pwOpen, setPwOpen] = useState(false)
  const [pwCurrent, setPwCurrent] = useState("")
  const [pwNew, setPwNew] = useState("")
  const [pwNew2, setPwNew2] = useState("")

  const refreshAccountFlags = useCallback(() => {
    setSheetRegistered(window.localStorage.getItem(LS_ACCOUNT.SHEET_REGISTERED) === "true")
    setSessionHasPw(
      !!window.sessionStorage.getItem(LS_SESSION.PASSWORD) || !!window.localStorage.getItem(LS_ACCOUNT.PASSWORD)
    )
  }, [])

  useEffect(() => {
    refreshAccountFlags()
  }, [refreshAccountFlags, loginId, registeredEmail])

  const logout = () => {
    window.localStorage.removeItem(LS_AUTH.STARTED)
    window.localStorage.removeItem(LS_AUTH.PORTAL_STARTED_ONCE)
    window.localStorage.removeItem(LS_AUTH.EMAIL)
    window.localStorage.removeItem(LS_AUTH.LAST_LOGIN_AT)
    window.localStorage.removeItem(LS_ACCOUNT.LOGIN_ID)
    window.localStorage.removeItem(LS_ACCOUNT.SHEET_REGISTERED)
    try {
      window.localStorage.removeItem(LS_ACCOUNT.PASSWORD)
    } catch {
      /* ignore */
    }
    window.sessionStorage.removeItem(LS_SESSION.PASSWORD)
    window.sessionStorage.removeItem(LS_SESSION.SETUP_CODE)
    clearGateEmail()
    router.replace("/login")
  }

  function patchPrefs(p: Partial<PortalPreferences>) {
    onPortalPreferencesChange((prev) => mergePortalPreferences({ ...prev, ...p }))
  }

  async function handleAvatarPicked(file: File | null) {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setBanner({ type: "err", text: "画像ファイル（png/jpg/webp など）を選択してください。" })
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setBanner({ type: "err", text: "画像サイズは 3MB 以下にしてください。" })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : ""
      if (!dataUrl.startsWith("data:image/")) {
        setBanner({ type: "err", text: "画像の読み込みに失敗しました。" })
        return
      }
      patchPrefs({ avatarImageDataUrl: dataUrl })
      setBanner({ type: "ok", text: "プロフィールアイコンを更新しました。" })
    }
    reader.onerror = () => {
      setBanner({ type: "err", text: "画像の読み込みに失敗しました。" })
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-5 md:space-y-7">
      {banner ? (
        <div
          className={cn(
            "border px-3 py-2 text-sm",
            banner.type === "ok"
              ? "border-[#c9a227]/40 bg-[#c9a227]/[0.06] text-[#e8d89a]"
              : "border-red-600/40 bg-red-950/20 text-red-300"
          )}
        >
          {banner.text}
        </div>
      ) : null}

      <div>
        <p className="font-official-serif-latin text-[10px] uppercase tracking-[0.4em] text-[#7f9cb8]/85">// ACCOUNT</p>
        <h2 className="mt-3 font-official-display text-xl tracking-[0.14em] text-[#e8d89a] md:text-2xl">アカウント</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          ログイン情報・プロフィール（作品ポータルでも同じ表示が使われます）
        </p>
        {caseId ? (
          <p className="mt-1 font-mono text-[10px] text-zinc-500 md:text-xs">登録案件 ID: {caseId}</p>
        ) : null}
      </div>

      <div className="border border-[#c9a227]/30 bg-[#0a0c10]/95 p-5 shadow-[0_0_0_1px_rgba(127,156,184,0.06)] md:p-7">
        <div className="mb-5 flex flex-col items-center gap-4 border-b border-[#c9a227]/15 pb-5 sm:flex-row sm:items-start md:mb-7 md:pb-7">
          <div className="relative">
            <button
              type="button"
              onClick={() => setAvatarOpen(true)}
              className="h-16 w-16 overflow-hidden rounded-full border-2 border-[#c9a227]/40 bg-[#06080c] transition hover:border-[#c9a227]/70 md:h-20 md:w-20"
              title="アイコン設定"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={portalPreferences.avatarImageDataUrl || "/placeholder-user.jpg"}
                alt="プロフィールアイコン"
                className="h-full w-full object-cover object-center"
              />
            </button>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="mb-1 flex items-center justify-center gap-2 sm:justify-start">
              <h3 className="font-official-display text-base tracking-[0.08em] text-[#e8d89a] md:text-lg">{portalPreferences.displayName}</h3>
              <button
                type="button"
                className="p-1 text-[#7f9cb8]/60 transition-colors hover:text-[#c9a227]"
                onClick={() => {
                  setNameDraft(portalPreferences.displayName)
                  setNameOpen(true)
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="font-mono text-xs text-zinc-500 md:text-sm">{loginId || "（未登録）"}</p>
            <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-[#c9a227]/80 md:text-xs sm:justify-start">
              <Shield className="h-3 w-3" />
              <span>NS 会員アカウント</span>
            </div>
          </div>
        </div>

        <div className="space-y-4 md:space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 md:gap-5">
            <div>
              <label className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.35em] text-[#7f9cb8]/85">
                <AtSign className="h-3 w-3" />
                LOGIN ID
              </label>
              <div className="flex flex-wrap gap-2">
                <input value={loginId} readOnly className="flex-1 border border-[#c9a227]/20 bg-[#06080c] px-3 py-2 font-mono text-xs text-zinc-300 md:text-sm" />
                <button
                  type="button"
                  disabled={!sheetRegistered || !sessionHasPw}
                  onClick={() => {
                    setIdNew("")
                    setIdPassword("")
                    setIdOpen(true)
                  }}
                  className="border border-[#7f9cb8]/30 bg-transparent px-3 py-2 font-official-serif-latin text-[10px] uppercase tracking-[0.18em] text-[#7f9cb8]/85 transition-colors hover:border-[#c9a227]/50 hover:text-[#c9a227] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  変更
                </button>
              </div>
            </div>
            <div>
              <label className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.35em] text-[#7f9cb8]/85">
                <Mail className="h-3 w-3" />
                EMAIL
              </label>
              <div className="flex flex-wrap gap-2">
                <input value={registeredEmail} readOnly className="flex-1 border border-[#c9a227]/20 bg-[#06080c] px-3 py-2 font-mono text-xs text-zinc-300 opacity-90 md:text-sm" />
                <button
                  type="button"
                  disabled={!sheetRegistered || !sessionHasPw}
                  onClick={() => {
                    setEmailNew("")
                    setEmailPassword("")
                    setEmailOpen(true)
                  }}
                  className="border border-[#7f9cb8]/30 bg-transparent px-3 py-2 font-official-serif-latin text-[10px] uppercase tracking-[0.18em] text-[#7f9cb8]/85 transition-colors hover:border-[#c9a227]/50 hover:text-[#c9a227] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  変更
                </button>
              </div>
              <p className="mt-1 text-[10px] text-zinc-500">変更後は案件の許可リストにあるメールのみ登録できます。</p>
            </div>
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.35em] text-[#7f9cb8]/85">
              <Lock className="h-3 w-3" />
              PASSWORD
            </label>
            {sheetRegistered || sessionHasPw ? (
              <p className="font-mono text-xs tracking-widest text-zinc-500">••••••••</p>
            ) : null}
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              {sheetRegistered
                ? sessionHasPw
                  ? "このブラウザに連携用パスワードを保持しています。"
                  : "再ログインするとクラウド同期が再開します。"
                : "/setup から ID とパスワードを登録してください。"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!sheetRegistered || !sessionHasPw}
                onClick={() => {
                  setPwCurrent("")
                  setPwNew("")
                  setPwNew2("")
                  setPwOpen(true)
                }}
                className="border border-[#7f9cb8]/30 bg-transparent px-3 py-2 font-official-serif-latin text-[10px] uppercase tracking-[0.18em] text-[#7f9cb8]/85 transition-colors hover:border-[#c9a227]/50 hover:text-[#c9a227] disabled:cursor-not-allowed disabled:opacity-35"
              >
                パスワード変更
              </button>
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.currentTarget.files?.[0] ?? null
                void handleAvatarPicked(f)
                e.currentTarget.value = ""
              }}
            />
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-3 border-t border-[#c9a227]/15 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-zinc-500">アカウント変更時は登録メールに運営から通知が送られる場合があります。</p>
          <button
            type="button"
            onClick={logout}
            className="border border-red-600/35 bg-transparent px-4 py-2.5 font-official-serif-latin text-[10px] uppercase tracking-[0.2em] text-red-400/90 transition-colors hover:border-red-500/55 hover:bg-red-950/20"
          >
            ログアウト
          </button>
        </div>
      </div>

      <Dialog open={avatarOpen} onOpenChange={setAvatarOpen}>
        <DialogContent className="border-[#c9a227]/30 bg-[#0a0c10] text-zinc-200 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-official-display tracking-[0.1em] text-[#e8d89a]">プロフィールアイコン</DialogTitle>
            <DialogDescription className="text-zinc-400">ここでアイコン画像の変更・初期化ができます。</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-full border border-[#c9a227]/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={portalPreferences.avatarImageDataUrl || "/placeholder-user.jpg"}
                alt="アイコンプレビュー"
                className="h-full w-full object-cover object-center"
              />
            </div>
            <div className="text-xs text-zinc-500">推奨: 正方形画像 / 3MB以下</div>
          </div>
          <DialogFooter className="gap-2">
            <button type="button" onClick={() => avatarInputRef.current?.click()} className="border border-[#c9a227]/55 bg-transparent px-4 py-2.5 text-[11px] uppercase tracking-[0.18em] text-[#e8d89a] transition-colors hover:bg-[#c9a227]/10">
              画像を選択
            </button>
            <button
              type="button"
              onClick={() => {
                patchPrefs({ avatarImageDataUrl: undefined })
                setAvatarOpen(false)
              }}
              className="border border-[#7f9cb8]/25 bg-transparent px-4 py-2.5 text-[11px] uppercase tracking-[0.18em] text-[#7f9cb8]/85 transition-colors hover:bg-[#7f9cb8]/5"
            >
              初期アイコンに戻す
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={nameOpen} onOpenChange={setNameOpen}>
        <DialogContent className="border-[#c9a227]/30 bg-[#0a0c10] text-zinc-200 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-official-display tracking-[0.1em] text-[#e8d89a]">ディスプレイネーム</DialogTitle>
            <DialogDescription className="text-zinc-400">作品ポータルのヘッダー等に表示される呼び名です。シートに保存されます。</DialogDescription>
          </DialogHeader>
          <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} maxLength={40} className="w-full border border-[#c9a227]/20 bg-[#06080c] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-[#c9a227]/45 focus:outline-none focus:ring-1 focus:ring-[#c9a227]/25" />
          <DialogFooter className="gap-2">
            <button type="button" onClick={() => setNameOpen(false)} className="border border-[#7f9cb8]/25 bg-transparent px-4 py-2.5 text-[11px] uppercase tracking-[0.18em] text-[#7f9cb8]/85 transition-colors hover:bg-[#7f9cb8]/5">
              キャンセル
            </button>
            <button
              type="button"
              onClick={() => {
                const t = nameDraft.trim()
                patchPrefs({ displayName: t || DEFAULT_PORTAL_PREFERENCES.displayName })
                setNameOpen(false)
              }}
              className="border border-[#c9a227]/55 bg-transparent px-4 py-2.5 text-[11px] uppercase tracking-[0.18em] text-[#e8d89a] transition-colors hover:bg-[#c9a227]/10"
            >
              保存
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={idOpen} onOpenChange={setIdOpen}>
        <DialogContent className="border-[#c9a227]/30 bg-[#0a0c10] text-zinc-200 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-official-display tracking-[0.1em] text-[#e8d89a]">ログインIDの変更</DialogTitle>
            <DialogDescription className="text-zinc-400">現在のパスワードを入力してください。変更後は登録メールに通知が送られます。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#7f9cb8]/85">新しいログインID（3文字以上）</label>
              <input value={idNew} onChange={(e) => setIdNew(e.target.value)} className="mt-1 w-full border border-[#c9a227]/20 bg-[#06080c] px-3 py-2.5 font-mono text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-[#c9a227]/45 focus:outline-none focus:ring-1 focus:ring-[#c9a227]/25" autoComplete="username" />
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#7f9cb8]/85">パスワード確認</label>
              <input
                type="password"
                value={idPassword}
                onChange={(e) => setIdPassword(e.target.value)}
                className="mt-1 w-full border border-[#c9a227]/20 bg-[#06080c] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-[#c9a227]/45 focus:outline-none focus:ring-1 focus:ring-[#c9a227]/25"
                autoComplete="current-password"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button type="button" onClick={() => setIdOpen(false)} className="border border-[#7f9cb8]/25 bg-transparent px-4 py-2.5 text-[11px] uppercase tracking-[0.18em] text-[#7f9cb8]/85 transition-colors hover:bg-[#7f9cb8]/5">
              キャンセル
            </button>
            <button
              type="button"
              onClick={async () => {
                setBanner(null)
                try {
                  const res = await postGas<{ success: boolean; message?: string; newLoginId?: string }>({
                    action: "changeLoginId",
                    loginId,
                    password: idPassword,
                    newLoginId: idNew.trim(),
                  })
                  if (!res.success) {
                    setBanner({ type: "err", text: res.message || "変更に失敗しました。" })
                    return
                  }
                  const nid = res.newLoginId || idNew.trim()
                  window.localStorage.setItem(LS_ACCOUNT.LOGIN_ID, nid)
                  onLoginIdChanged(nid)
                  setIdOpen(false)
                  setBanner({ type: "ok", text: "ログインIDを変更しました。確認メールをご確認ください。" })
                } catch {
                  setBanner({ type: "err", text: "通信に失敗しました。" })
                }
              }}
              className="border border-[#c9a227]/55 bg-transparent px-4 py-2.5 text-[11px] uppercase tracking-[0.18em] text-[#e8d89a] transition-colors hover:bg-[#c9a227]/10"
            >
              変更する
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="border-[#c9a227]/30 bg-[#0a0c10] text-zinc-200 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-official-display tracking-[0.1em] text-[#e8d89a]">登録メールの変更</DialogTitle>
            <DialogDescription className="text-zinc-400">
              案件に許可されたメールのみ登録できます。旧アドレスと新アドレスの両方に通知が送られます。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#7f9cb8]/85">新しいメールアドレス</label>
              <input
                type="email"
                value={emailNew}
                onChange={(e) => setEmailNew(e.target.value)}
                className="mt-1 w-full border border-[#c9a227]/20 bg-[#06080c] px-3 py-2.5 font-mono text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-[#c9a227]/45 focus:outline-none focus:ring-1 focus:ring-[#c9a227]/25"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#7f9cb8]/85">パスワード確認</label>
              <input
                type="password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                className="mt-1 w-full border border-[#c9a227]/20 bg-[#06080c] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-[#c9a227]/45 focus:outline-none focus:ring-1 focus:ring-[#c9a227]/25"
                autoComplete="current-password"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button type="button" onClick={() => setEmailOpen(false)} className="border border-[#7f9cb8]/25 bg-transparent px-4 py-2.5 text-[11px] uppercase tracking-[0.18em] text-[#7f9cb8]/85 transition-colors hover:bg-[#7f9cb8]/5">
              キャンセル
            </button>
            <button
              type="button"
              onClick={async () => {
                setBanner(null)
                try {
                  const res = await postGas<{ success: boolean; message?: string; newEmail?: string }>({
                    action: "changeAccountEmail",
                    loginId,
                    password: emailPassword,
                    newEmail: emailNew.trim().toLowerCase(),
                  })
                  if (!res.success) {
                    setBanner({ type: "err", text: res.message || "変更に失敗しました。" })
                    return
                  }
                  const em = res.newEmail || emailNew.trim().toLowerCase()
                  window.localStorage.setItem(LS_AUTH.EMAIL, em)
                  onEmailChanged(em)
                  setEmailOpen(false)
                  setBanner({ type: "ok", text: "メールアドレスを変更しました。両方の受信箱を確認してください。" })
                } catch {
                  setBanner({ type: "err", text: "通信に失敗しました。" })
                }
              }}
              className="border border-[#c9a227]/55 bg-transparent px-4 py-2.5 text-[11px] uppercase tracking-[0.18em] text-[#e8d89a] transition-colors hover:bg-[#c9a227]/10"
            >
              変更する
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="border-[#c9a227]/30 bg-[#0a0c10] text-zinc-200 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-official-display tracking-[0.1em] text-[#e8d89a]">パスワードの変更</DialogTitle>
            <DialogDescription className="text-zinc-400">現在のパスワードが一致した場合のみ変更できます。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#7f9cb8]/85">現在のパスワード</label>
              <input
                type="password"
                value={pwCurrent}
                onChange={(e) => setPwCurrent(e.target.value)}
                className="mt-1 w-full border border-[#c9a227]/20 bg-[#06080c] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-[#c9a227]/45 focus:outline-none focus:ring-1 focus:ring-[#c9a227]/25"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#7f9cb8]/85">新しいパスワード（8文字以上）</label>
              <input
                type="password"
                value={pwNew}
                onChange={(e) => setPwNew(e.target.value)}
                className="mt-1 w-full border border-[#c9a227]/20 bg-[#06080c] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-[#c9a227]/45 focus:outline-none focus:ring-1 focus:ring-[#c9a227]/25"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#7f9cb8]/85">新しいパスワード（確認）</label>
              <input
                type="password"
                value={pwNew2}
                onChange={(e) => setPwNew2(e.target.value)}
                className="mt-1 w-full border border-[#c9a227]/20 bg-[#06080c] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-[#c9a227]/45 focus:outline-none focus:ring-1 focus:ring-[#c9a227]/25"
                autoComplete="new-password"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button type="button" onClick={() => setPwOpen(false)} className="border border-[#7f9cb8]/25 bg-transparent px-4 py-2.5 text-[11px] uppercase tracking-[0.18em] text-[#7f9cb8]/85 transition-colors hover:bg-[#7f9cb8]/5">
              キャンセル
            </button>
            <button
              type="button"
              onClick={async () => {
                setBanner(null)
                if (pwNew !== pwNew2) {
                  setBanner({ type: "err", text: "新しいパスワードが一致しません。" })
                  return
                }
                try {
                  const res = await postGas<{ success: boolean; message?: string }>({
                    action: "changeAccountPassword",
                    loginId,
                    password: pwCurrent,
                    newPassword: pwNew,
                  })
                  if (!res.success) {
                    setBanner({ type: "err", text: res.message || "変更に失敗しました。" })
                    return
                  }
                  window.sessionStorage.setItem(LS_SESSION.PASSWORD, pwNew)
                  window.localStorage.setItem(LS_ACCOUNT.PASSWORD, pwNew)
                  setPwOpen(false)
                  setBanner({ type: "ok", text: "パスワードを変更しました。確認メールをご確認ください。" })
                } catch {
                  setBanner({ type: "err", text: "通信に失敗しました。" })
                }
              }}
              className="border border-[#c9a227]/55 bg-transparent px-4 py-2.5 text-[11px] uppercase tracking-[0.18em] text-[#e8d89a] transition-colors hover:bg-[#c9a227]/10"
            >
              変更する
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
