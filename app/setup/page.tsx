"use client"

import { useEffect, useLayoutEffect, useRef, useState, Suspense } from "react"
import gsap from "gsap"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { postGas } from "@/lib/gas"
import { writeGateEmailAfterSetup } from "@/lib/gate-email"
import { LS_ACCOUNT } from "@/lib/storage-keys"
import { DEFAULT_CASE_ID } from "@/lib/platform/game-routing.generated"

const MIN_ID_LEN = 3
const MIN_PASSWORD_LEN = 8

function SetupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const caseId = (searchParams.get("case")?.trim() || DEFAULT_CASE_ID) as string
  const emailFromUrl = searchParams.get("email")?.trim() || ""

  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [loginId, setLoginId] = useState("")
  const [password, setPassword] = useState("")
  const [password2, setPassword2] = useState("")
  const [message, setMessage] = useState("")
  const [isBusy, setIsBusy] = useState(false)
  const authSurfaceRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = authSurfaceRef.current
    if (!el) return
    if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    gsap.set(el, { autoAlpha: 0, y: 12 })
  }, [])

  useEffect(() => {
    const el = authSurfaceRef.current
    if (!el) return
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(el, { autoAlpha: 1, y: 0 })
      return
    }
    const ctx = gsap.context(() => {
      gsap.to(el, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" })
    }, el)
    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (!emailFromUrl) return
    try {
      setEmail(decodeURIComponent(emailFromUrl).toLowerCase())
    } catch {
      setEmail(emailFromUrl.toLowerCase())
    }
  }, [emailFromUrl])

  const submit = async () => {
    setMessage("")
    const em = email.trim().toLowerCase()
    if (!em || !em.includes("@")) {
      setMessage("メールアドレスを入力してください。")
      return
    }
    const cd = code.trim()
    if (!cd) {
      setMessage("合言葉を入力してください。")
      return
    }
    const id = loginId.trim()
    if (id.length < MIN_ID_LEN) {
      setMessage(`ログインIDは ${MIN_ID_LEN} 文字以上にしてください。`)
      return
    }
    if (password.length < MIN_PASSWORD_LEN) {
      setMessage(`パスワードは ${MIN_PASSWORD_LEN} 文字以上にしてください。`)
      return
    }
    if (password !== password2) {
      setMessage("パスワードが一致しません。")
      return
    }

    setIsBusy(true)
    try {
      const res = await postGas<{ success: boolean; message?: string; masterToken?: string }>({
        action: "setupAccount",
        caseId,
        email: em,
        code: cd,
        loginId: id,
        password,
      })
      if (res.success) {
        writeGateEmailAfterSetup(em)
        try {
          window.localStorage.setItem(LS_ACCOUNT.CASE_ID, caseId)
          if (typeof res.masterToken === "string" && res.masterToken.trim()) {
            window.localStorage.setItem(LS_ACCOUNT.MASTER_TOKEN, res.masterToken.trim())
          }
        } catch {
          /* ignore */
        }
        setMessage("スプレッドシートに登録しました。調査ポータルに戻り、合言葉認証のあと調査員IDで入場してください（手続きメールは運営文面です）。")
        setTimeout(() => router.replace("/login?registered=1"), 1200)
      } else {
        setMessage(res.message || "登録に失敗しました。")
      }
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e)
      setMessage(
        [
          "通信に失敗しました。詳細:",
          detail,
          "",
          "【よくある原因】",
          "・スマホでメールの localhost リンクは開けません（PC 上の開発サーバを指さない）。GAS の accountSetupUrl を http://(PCのIPv4):3000/setup?case=... に変更し直す。",
          "・.env.local に NEXT_PUBLIC_GAS_URL=（自分の GAS Webアプリの /exec）を入れ、dev を再起動したか（通信は /api/gas 経由）。",
          "・npm run dev を再起動（0.0.0.0 待受）。Windows ファイアウォールでポート 3000 を許可。",
        ].join("\n")
      )
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="relative z-10 flex min-h-[calc(100vh-52px)] items-center justify-center p-4">
      <div
        ref={authSurfaceRef}
        className="w-full max-w-lg space-y-5 border border-[#c9a227]/30 bg-[#0a0c10]/95 p-6 shadow-[0_0_0_1px_rgba(127,156,184,0.06)] md:p-8"
      >
        <div>
          <Image
            src="/placeholder-logo.png"
            alt="NS"
            width={320}
            height={96}
            className="mx-auto mb-4 h-auto w-full max-w-[260px] opacity-95"
            priority
          />
          <p className="mb-2 font-official-serif-latin text-[10px] uppercase tracking-[0.4em] text-[#7f9cb8]/85">認証メール記載の URL 用</p>
          <h1 className="font-official-display text-lg tracking-[0.12em] text-[#e8d89a] md:text-xl">調査員 ID・パスワードの設定</h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            この画面は<strong className="text-zinc-200">メール内のリンク</strong>
            （例: <span className="font-mono text-[11px] text-[#7f9cb8]/90">/setup?case=…</span> または{" "}
            <span className="font-mono text-[11px] text-[#7f9cb8]/90">/register?case=…</span>
            ）から開いたときの<strong className="text-zinc-200">登録専用</strong>です。ここで決めた ID／パスワードがスプレッドシートに保存されます。
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            登録後は <strong className="text-[#c9a227]/90">会員ログイン</strong>（<span className="font-mono text-xs text-zinc-400">/login</span>
            ）へ戻り、合言葉・メール認証 → 調査員IDでログインしてください。
          </p>
          <p className="mt-3 font-mono text-xs text-[#c9a227]/85">CASE: {caseId}</p>
        </div>

        <div className="space-y-2">
          <label className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#7f9cb8]/85">メールアドレス</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="認証に使用したアドレス"
            className="w-full border border-[#c9a227]/20 bg-[#06080c] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-[#c9a227]/45 focus:outline-none focus:ring-1 focus:ring-[#c9a227]/25"
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <label className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#7f9cb8]/85">合言葉</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="認証時と同じ合言葉"
            className="w-full border border-[#c9a227]/20 bg-[#06080c] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-[#c9a227]/45 focus:outline-none focus:ring-1 focus:ring-[#c9a227]/25"
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <label className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#7f9cb8]/85">ログイン ID</label>
          <input
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            placeholder="例: inv-7741"
            className="w-full border border-[#c9a227]/20 bg-[#06080c] px-3 py-2.5 font-mono text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-[#c9a227]/45 focus:outline-none focus:ring-1 focus:ring-[#c9a227]/25"
            autoComplete="username"
          />
        </div>

        <div className="space-y-2">
          <label className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#7f9cb8]/85">パスワード</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={`${MIN_PASSWORD_LEN} 文字以上`}
            className="w-full border border-[#c9a227]/20 bg-[#06080c] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-[#c9a227]/45 focus:outline-none focus:ring-1 focus:ring-[#c9a227]/25"
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-2">
          <label className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#7f9cb8]/85">パスワード（確認）</label>
          <input
            type="password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void submit()}
            className="w-full border border-[#c9a227]/20 bg-[#06080c] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-[#c9a227]/45 focus:outline-none focus:ring-1 focus:ring-[#c9a227]/25"
            autoComplete="new-password"
          />
        </div>

        <button
          type="button"
          onClick={() => void submit()}
          disabled={isBusy}
          className="w-full border border-[#c9a227]/55 bg-transparent py-3 font-official-serif-latin text-[11px] uppercase tracking-[0.2em] text-[#e8d89a] transition-colors hover:border-[#c9a227]/80 hover:bg-[#c9a227]/10 disabled:cursor-not-allowed disabled:opacity-45"
        >
          スプレッドシートに登録する
        </button>

        <p className="min-h-5 whitespace-pre-line break-words text-sm text-[#7f9cb8]/90">{message}</p>

        <p className="text-center text-xs">
          <Link
            href="/login"
            className="font-official-serif-latin text-[11px] uppercase tracking-[0.22em] text-[#7f9cb8]/85 underline-offset-4 transition-colors hover:text-[#c9a227] hover:underline"
          >
            会員ログインへ
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function SetupPage() {
  return (
    <Suspense
      fallback={
        <div className="relative z-10 flex min-h-[50vh] items-center justify-center font-official-sans-jp text-sm text-[#7f9cb8]/85">
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#c9a227]/70">読み込み中…</p>
        </div>
      }
    >
      <SetupForm />
    </Suspense>
  )
}
