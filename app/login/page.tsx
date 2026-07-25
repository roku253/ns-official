"use client"

import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react"
import gsap from "gsap"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { LS_ACCOUNT, LS_AUTH, LS_SESSION } from "@/lib/storage-keys"
import { postGas } from "@/lib/gas"
import {
  clearGateEmail,
  clearStep2Direct,
  readGateEmail,
  readStep2Direct,
  setStep2Direct,
  writeGateEmailAfterStep1,
} from "@/lib/gate-email"
import { getDeviceLabelForAlert, getOrCreateDeviceId } from "@/lib/device-id"
import { DEFAULT_CASE_ID } from "@/lib/platform/game-routing.generated"
const REL_LOGIN_WINDOW_MS = 1000 * 60 * 60 * 24 * 30

type FlowStep = "terms" | "gate" | "id"

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [flowStep, setFlowStep] = useState<FlowStep>("terms")
  const [hydrated, setHydrated] = useState(false)
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [code, setCode] = useState("")
  const [email, setEmail] = useState("")
  const [loginId, setLoginId] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [fromRegistration, setFromRegistration] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [gateEmailDisplay, setGateEmailDisplay] = useState("")
  const authSurfaceRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!hydrated) return
    const el = authSurfaceRef.current
    if (!el) return
    if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    gsap.set(el, { autoAlpha: 0, y: 12 })
  }, [hydrated])

  useEffect(() => {
    if (!hydrated) return
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
  }, [hydrated])

  useEffect(() => {
    if (searchParams.get("registered") === "1") {
      setFromRegistration(true)
    }
  }, [searchParams])

  useEffect(() => {
    const started = window.localStorage.getItem(LS_AUTH.STARTED) === "true"
    const loginIdSaved = (window.localStorage.getItem(LS_ACCOUNT.LOGIN_ID) || "").trim()
    const sessionPw = (window.sessionStorage.getItem(LS_SESSION.PASSWORD) || "").trim()
    const storedPw = (window.localStorage.getItem(LS_ACCOUNT.PASSWORD) || "").trim()
    const hasReusablePassword = Boolean(sessionPw || storedPw)
    const lastLoginAt = Number(window.localStorage.getItem(LS_AUTH.LAST_LOGIN_AT) || "0")
    const stillFresh = Number.isFinite(lastLoginAt) && Date.now() - lastLoginAt <= REL_LOGIN_WINDOW_MS
    if (started && loginIdSaved && stillFresh && hasReusablePassword) {
      router.replace("/")
      return
    }

    const termsOk = window.localStorage.getItem(LS_AUTH.TERMS_ACCEPTED) === "1"
    const pending = readGateEmail()
    const step2Only = readStep2Direct()
    if (!termsOk) {
      setFlowStep("terms")
    } else if (pending) {
      setGateEmailDisplay(pending)
      setFlowStep("id")
    } else if (step2Only) {
      setGateEmailDisplay("")
      setFlowStep("id")
    } else {
      setFlowStep("gate")
    }
    setHydrated(true)
  }, [router])

  const acceptTerms = () => {
    if (!termsAgreed) {
      setMessage("利用規約に同意するには、チェックボックスにチェックを入れてください。")
      return
    }
    window.localStorage.setItem(LS_AUTH.TERMS_ACCEPTED, "1")
    setMessage("")
    const pending = readGateEmail()
    if (pending) {
      setGateEmailDisplay(pending)
      setFlowStep("id")
    } else if (readStep2Direct()) {
      setGateEmailDisplay("")
      setFlowStep("id")
    } else {
      setFlowStep("gate")
    }
  }

  const submitGate = async () => {
    if (!code.trim()) {
      setMessage("合言葉を入力してください。")
      return
    }
    if (!email.trim() || !email.includes("@")) {
      setMessage("有効なメールアドレスを入力してください。")
      return
    }
    setIsBusy(true)
    setMessage("認証中… メールを送信します。")
    try {
      const res = await postGas<{ success: boolean; message?: string }>({
        action: "auth",
        caseId: DEFAULT_CASE_ID,
        code: code.trim(),
        email: email.trim(),
      })
      if (res.success) {
        const normalized = email.trim().toLowerCase()
        window.sessionStorage.setItem(LS_SESSION.SETUP_CODE, code.trim())
        writeGateEmailAfterStep1(normalized)
        setGateEmailDisplay(normalized)
        setMessage(
          "認証しました。運営からのメールを確認し、未登録の方はメール内のURLから調査員IDを設定してください。設定後、この画面で調査員IDとパスワードを入力し、ログインしてください。"
        )
        setFlowStep("id")
      } else {
        setMessage(res.message || "認証に失敗しました。")
      }
    } catch (_e) {
      setMessage("通信に失敗しました。")
    } finally {
      setIsBusy(false)
    }
  }

  const submitIdLogin = async () => {
    const id = loginId.trim()
    if (!id || password.length < 8) {
      setMessage("ログインIDとパスワード（8文字以上）を入力してください。")
      return
    }
    const gated = readGateEmail()
    if (!gated && !readStep2Direct()) {
      setMessage("初参加の方は STEP 1 で合言葉とメールを認証してください。")
      setFlowStep("gate")
      return
    }
    setIsBusy(true)
    setMessage("照会中…")
    try {
      const existingCase = window.localStorage.getItem(LS_ACCOUNT.CASE_ID)?.trim()
      const res = await postGas<{
        success: boolean
        message?: string
        email?: string
        caseId?: string
        masterToken?: string
        progress?: unknown
      }>({
        action: "loginAccount",
        loginContext: "explicit",
        loginId: id,
        password,
        ...(existingCase ? { caseId: existingCase } : {}),
        deviceId: getOrCreateDeviceId(),
        deviceLabel: getDeviceLabelForAlert(),
      })
      if (res.success) {
        clearGateEmail()
        clearStep2Direct()
        window.sessionStorage.removeItem(LS_SESSION.SETUP_CODE)
        window.localStorage.setItem(LS_AUTH.STARTED, "true")
        if (res.email) window.localStorage.setItem(LS_AUTH.EMAIL, res.email.toLowerCase())
        if (res.caseId) window.localStorage.setItem(LS_ACCOUNT.CASE_ID, res.caseId)
        window.localStorage.setItem(LS_ACCOUNT.LOGIN_ID, id)
        window.localStorage.setItem(LS_ACCOUNT.SHEET_REGISTERED, "true")
        window.localStorage.setItem(LS_AUTH.LAST_LOGIN_AT, String(Date.now()))
        window.sessionStorage.setItem(LS_SESSION.PASSWORD, password)
        window.localStorage.setItem(LS_ACCOUNT.PASSWORD, password)
        if (typeof res.masterToken === "string" && res.masterToken.trim()) {
          window.localStorage.setItem(LS_ACCOUNT.MASTER_TOKEN, res.masterToken.trim())
        }
        setMessage("入場許可。公式サイトへ移動します。")
        setTimeout(() => router.replace("/"), 500)
      } else {
        setMessage(
          res.message ||
            "ログインに失敗しました。運営メール内のURLから調査員IDの設定が済んでいるか確認してください。"
        )
      }
    } catch (_e) {
      setMessage("通信に失敗しました。")
    } finally {
      setIsBusy(false)
    }
  }

  const backToGate = () => {
    setFlowStep("gate")
    setLoginId("")
    setPassword("")
    setMessage("")
    clearGateEmail()
    clearStep2Direct()
    window.sessionStorage.removeItem(LS_SESSION.SETUP_CODE)
  }

  const goToStep2Only = () => {
    setMessage("")
    setGateEmailDisplay("")
    setStep2Direct()
    setFlowStep("id")
  }

  if (!hydrated) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-[#050607] font-official-sans-jp text-sm text-[#7f9cb8]/85">
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          aria-hidden
          style={{
            backgroundImage: `
              radial-gradient(ellipse at 50% 30%, rgba(127,156,184,0.08) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 100%, rgba(201,162,39,0.05) 0%, transparent 45%)
            `,
          }}
        />
        <p className="relative font-mono text-[10px] uppercase tracking-[0.4em] text-[#c9a227]/70">読み込み中…</p>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-[#050607] font-official-sans-jp text-zinc-200">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.82]"
        aria-hidden
        style={{
          backgroundImage: `
            linear-gradient(152deg, rgba(10, 12, 16, 0.45) 0%, transparent 48%),
            linear-gradient(118deg, rgba(127, 156, 184, 0.06) 0%, transparent 42%),
            radial-gradient(ellipse at 12% 18%, rgba(127,156,184,0.07) 0%, transparent 44%),
            radial-gradient(ellipse at 88% 82%, rgba(201,162,39,0.06) 0%, transparent 42%)
          `,
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-[#06080c]" aria-hidden />

      <header className="relative z-10 border-b border-[#c9a227]/25 bg-black/55 backdrop-blur-md">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3 md:px-6">
          <Link
            href="/"
            className="font-official-serif-latin text-[11px] uppercase tracking-[0.28em] text-[#7f9cb8]/85 transition-colors hover:text-[#c9a227] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c9a227]/50"
          >
            ← NS 公式サイト
          </Link>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center p-4 md:p-8">
        <div
          ref={authSurfaceRef}
          className="w-full max-w-xl space-y-5 border border-[#c9a227]/30 bg-[#0a0c10]/95 p-6 shadow-[0_0_0_1px_rgba(127,156,184,0.06)] md:p-8"
        >
          {flowStep === "terms" ? (
            <>
              <div>
                <p className="font-official-serif-latin text-[10px] uppercase tracking-[0.4em] text-[#7f9cb8]/85">// MEMBER ACCESS</p>
                <h1 className="mt-3 font-official-display text-xl tracking-[0.14em] text-[#e8d89a] md:text-2xl">会員ログイン</h1>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  NS 公式プラットフォームへようこそ。作品の進行管理はログイン後に「作品ポータル」からお開きください。まずは利用規約をご確認ください。
                </p>
              </div>
              <div className="max-h-48 space-y-2 overflow-y-auto border border-[#c9a227]/15 bg-[#06080c]/80 p-3 text-xs leading-relaxed text-zinc-500 md:max-h-56">
                <p className="font-official-display text-sm text-zinc-300">利用規約（例・要カスタマイズ）</p>
                <p>
                  1. 本サービスは趣味目的の謎解き体験を提供するものであり、特定の結果や真実の保証を行うものではありません。
                </p>
                <p>2. 取得した合言葉・URL・ヒントを、無断で公開・再配布しないでください。</p>
                <p>3. 他者の迷惑となる行為、システムへの不正アクセス、過度な自動アクセスを禁止します。</p>
                <p>4. 運営は、必要に応じてサービス内容を変更・中断できるものとします。</p>
                <p>5. お問い合わせは運営が別途指定する方法に従ってください。</p>
              </div>
              <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  className="mt-1 size-4 rounded-none border border-[#c9a227]/40 bg-[#06080c] accent-[#c9a227]"
                />
                <span>上記の利用規約の内容を理解し、同意します。</span>
              </label>
              <button
                type="button"
                onClick={acceptTerms}
                className="w-full border border-[#c9a227]/55 bg-transparent py-3 font-official-serif-latin text-[11px] uppercase tracking-[0.22em] text-[#e8d89a] transition-colors hover:border-[#c9a227]/80 hover:bg-[#c9a227]/10"
              >
                同意して次へ
              </button>
              {message ? <p className="text-sm text-[#7f9cb8]/90">{message}</p> : null}
            </>
          ) : null}

          {flowStep !== "terms" ? (
            <>
              <div>
                <div className="mb-4">
                  <Image
                    src="/placeholder-logo.png"
                    alt="NS"
                    width={320}
                    height={96}
                    className="mx-auto h-auto w-full max-w-[280px] opacity-95"
                    priority
                  />
                </div>
                <p className="font-official-serif-latin text-[10px] uppercase tracking-[0.4em] text-[#c9a227]/85">// AUTHENTICATION</p>
                <h1 className="mt-3 font-official-display text-lg tracking-[0.12em] text-[#e8d89a] md:text-xl">認証</h1>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  初めての方は合言葉とメール、登録済みの方は調査員IDでログインします。
                </p>
              </div>

              {fromRegistration ? (
                <div className="border border-[#c9a227]/30 bg-[#c9a227]/[0.06] px-3 py-2 text-xs leading-relaxed text-zinc-300">
                  ID・パスワードの登録が完了した場合は、下の手順どおりに<strong className="text-[#e8d89a]">ログイン</strong>
                  してください（登録画面とは別です）。
                </div>
              ) : null}

              {flowStep === "gate" ? (
                <>
                  <div className="border border-[#c9a227]/20 bg-[#06080c]/90 p-3 text-xs leading-relaxed text-zinc-400 md:text-sm">
                    <span className="font-official-serif-latin text-[10px] uppercase tracking-[0.28em] text-[#c9a227]/90">STEP 1 / 2</span>{" "}
                    — 合言葉とメールを認証します。成功すると<strong className="text-zinc-200">運営から</strong>
                    登録手続きのメールが届きます（物語・任務の連絡は作品ポータル「連絡」に届きます）。
                  </div>
                  <div className="space-y-2">
                    <label className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#7f9cb8]/85">合言葉</label>
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && void submitGate()}
                      placeholder="合言葉"
                      className="w-full border border-[#c9a227]/20 bg-[#06080c] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-[#c9a227]/45 focus:outline-none focus:ring-1 focus:ring-[#c9a227]/25"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#7f9cb8]/85">メールアドレス</label>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && void submitGate()}
                      placeholder="メールアドレス"
                      className="w-full border border-[#c9a227]/20 bg-[#06080c] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-[#c9a227]/45 focus:outline-none focus:ring-1 focus:ring-[#c9a227]/25"
                      autoComplete="email"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void submitGate()}
                    disabled={isBusy}
                    className="w-full border border-[#c9a227]/55 bg-transparent py-3 font-official-serif-latin text-[11px] uppercase tracking-[0.2em] text-[#e8d89a] transition-colors hover:border-[#c9a227]/80 hover:bg-[#c9a227]/10 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    認証する（メール送信）
                  </button>
                  <p className="pt-1 text-center">
                    <button
                      type="button"
                      onClick={goToStep2Only}
                      disabled={isBusy}
                      className="text-[10px] text-[#7f9cb8]/90 underline-offset-4 transition-colors hover:text-[#c9a227] hover:underline disabled:opacity-40 md:text-[11px]"
                    >
                      すでに調査員IDを登録済みの方 → STEP 2 へ（別端末・再入場）
                    </button>
                  </p>
                </>
              ) : (
                <>
                  <div className="space-y-1 border border-[#c9a227]/20 bg-[#06080c]/90 p-3 text-xs leading-relaxed text-zinc-400 md:text-sm">
                    <div>
                      <span className="font-official-serif-latin text-[10px] uppercase tracking-[0.28em] text-[#c9a227]/90">STEP 2 / 2</span>{" "}
                      — 登録済みの調査員IDとパスワードでログインします。
                    </div>
                    {gateEmailDisplay ? (
                      <p className="mt-1 break-all font-mono text-[10px] text-zinc-300">STEP 1 認証メール: {gateEmailDisplay}</p>
                    ) : readStep2Direct() ? (
                      <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">
                        STEP 1 を省略しています（このブラウザでは合言葉不要）。ID・パスワードは登録時のものを入力してください。
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <label className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#7f9cb8]/85">ログインID</label>
                    <input
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && void submitIdLogin()}
                      placeholder="ログインID"
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
                      onKeyDown={(e) => e.key === "Enter" && void submitIdLogin()}
                      placeholder="パスワード"
                      className="w-full border border-[#c9a227]/20 bg-[#06080c] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-[#c9a227]/45 focus:outline-none focus:ring-1 focus:ring-[#c9a227]/25"
                      autoComplete="current-password"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void submitIdLogin()}
                    disabled={isBusy}
                    className="w-full border border-[#c9a227]/55 bg-transparent py-3 font-official-serif-latin text-[11px] uppercase tracking-[0.2em] text-[#e8d89a] transition-colors hover:border-[#c9a227]/80 hover:bg-[#c9a227]/10 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    ログイン
                  </button>
                  <button
                    type="button"
                    onClick={backToGate}
                    disabled={isBusy}
                    className="w-full border border-[#7f9cb8]/25 bg-transparent py-3 font-official-serif-latin text-[11px] uppercase tracking-[0.18em] text-[#7f9cb8]/90 transition-colors hover:border-[#7f9cb8]/45 hover:bg-[#7f9cb8]/5 disabled:opacity-45"
                  >
                    STEP 1 に戻る
                  </button>
                </>
              )}

              <p className="min-h-5 text-sm text-[#7f9cb8]/90">{message}</p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="relative flex min-h-screen items-center justify-center bg-[#050607] font-official-sans-jp text-sm text-[#7f9cb8]/85">
          <div
            className="pointer-events-none absolute inset-0 opacity-80"
            aria-hidden
            style={{
              backgroundImage: `
                radial-gradient(ellipse at 50% 30%, rgba(127,156,184,0.08) 0%, transparent 50%)
              `,
            }}
          />
          <p className="relative font-mono text-[10px] uppercase tracking-[0.4em] text-[#c9a227]/70">読み込み中…</p>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
