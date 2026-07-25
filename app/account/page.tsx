"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AccountSettingsSection } from "@/components/official-site/account-settings-section"
import { LS_ACCOUNT, LS_AUTH, LS_SESSION } from "@/lib/storage-keys"
import { postGas } from "@/lib/gas"
import {
  deserializeProgress,
  progressPayloadSignature,
  serializeProgressForGas,
} from "@/lib/platform/progress-json"
import { mergeHqBriefingFromGas, type GasHqBriefing } from "@/lib/platform/hq-briefing"
import { DEFAULT_CASE_ID } from "@/lib/platform/game-routing.generated"
import type { ProgressState, PortalPreferences, Task, Achievement, Memo, ArchiveItem, Communication, TabType } from "@/lib/types"
import { mergePortalPreferences, DEFAULT_PORTAL_PREFERENCES } from "@/lib/platform/portal-preferences"
import { WORKS_CATALOG_PATH } from "@/lib/routes"
import { openPlayEntry } from "@/lib/official/play-work-navigation"

const REL_LOGIN_WINDOW_MS = 1000 * 60 * 60 * 24 * 30

export default function AccountPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [sessionEmail, setSessionEmail] = useState("")
  const [loginId, setLoginId] = useState("")
  const [caseId, setCaseId] = useState("")
  const [portalPreferences, setPortalPreferences] = useState<PortalPreferences>(DEFAULT_PORTAL_PREFERENCES)
  const progressBaseRef = useRef<{
    tasks: Task[]
    achievements: Achievement[]
    memos: Memo[]
    archiveItems: ArchiveItem[]
    communications: Communication[]
    activeTab?: TabType
  } | null>(null)
  const lastSavedSigRef = useRef<string | null>(null)

  const applyLoadedProgress = useCallback((p: ProgressState) => {
    const prefs = mergePortalPreferences(p.portalPreferences)
    progressBaseRef.current = {
      tasks: p.tasks,
      achievements: p.achievements,
      memos: p.memos,
      archiveItems: p.archiveItems,
      communications: p.communications,
      activeTab: p.activeTab,
    }
    setPortalPreferences(prefs)
    lastSavedSigRef.current = progressPayloadSignature({ ...progressBaseRef.current, portalPreferences: prefs })
  }, [])

  useEffect(() => {
    let cancelled = false
    async function init() {
      const started = window.localStorage.getItem(LS_AUTH.STARTED) === "true"
      const loginIdLocal = (window.localStorage.getItem(LS_ACCOUNT.LOGIN_ID) || "").trim()
      const lastLoginAt = Number(window.localStorage.getItem(LS_AUTH.LAST_LOGIN_AT) || "0")
      const loginFresh = Number.isFinite(lastLoginAt) && Date.now() - lastLoginAt <= REL_LOGIN_WINDOW_MS
      if (!started || !loginIdLocal || !loginFresh) {
        router.replace("/login")
        return
      }
      const pw =
        window.sessionStorage.getItem(LS_SESSION.PASSWORD) || window.localStorage.getItem(LS_ACCOUNT.PASSWORD) || ""
      if (!pw) {
        router.replace("/login")
        return
      }
      if (!window.sessionStorage.getItem(LS_SESSION.PASSWORD) && window.localStorage.getItem(LS_ACCOUNT.PASSWORD)) {
        window.sessionStorage.setItem(LS_SESSION.PASSWORD, window.localStorage.getItem(LS_ACCOUNT.PASSWORD)!)
      }

      const emailLocal = window.localStorage.getItem(LS_AUTH.EMAIL) || ""
      const cid = window.localStorage.getItem(LS_ACCOUNT.CASE_ID)?.trim() || DEFAULT_CASE_ID
      if (!cancelled) {
        setSessionEmail(emailLocal)
        setLoginId(loginIdLocal)
        setCaseId(cid)
      }

      try {
        const res = await postGas<{
          success: boolean
          email?: string
          progress?: unknown
          hqBriefing?: GasHqBriefing
        }>({
          action: "loginAccount",
          loginId: loginIdLocal,
          password: pw,
          caseId: cid,
        })
        if (cancelled) return
        if (!res.success) {
          router.replace("/login")
          return
        }
        if (res.email) {
          const em = res.email.toLowerCase()
          window.localStorage.setItem(LS_AUTH.EMAIL, em)
          setSessionEmail(em)
        }
        const merged = mergeHqBriefingFromGas(deserializeProgress(res.progress), res.hqBriefing, cid)
        applyLoadedProgress(merged)
      } catch {
        if (!cancelled) router.replace("/login")
        return
      }
      if (!cancelled) setReady(true)
    }
    void init()
    return () => {
      cancelled = true
    }
  }, [router, applyLoadedProgress])

  const SAVE_DEBOUNCE_MS = 450
  useEffect(() => {
    if (!ready) return
    const base = progressBaseRef.current
    if (!base) return
    const loginIdLocal = window.localStorage.getItem(LS_ACCOUNT.LOGIN_ID) || ""
    const pw =
      window.sessionStorage.getItem(LS_SESSION.PASSWORD) || window.localStorage.getItem(LS_ACCOUNT.PASSWORD) || ""
    if (!loginIdLocal || !pw) return

    const progress: ProgressState = { ...base, portalPreferences }
    const sig = progressPayloadSignature(progress)
    if (sig === lastSavedSigRef.current) return

    const handle = window.setTimeout(() => {
      const cid =
        typeof window !== "undefined"
          ? window.localStorage.getItem(LS_ACCOUNT.CASE_ID)?.trim() || DEFAULT_CASE_ID
          : DEFAULT_CASE_ID
      postGas({
        action: "saveProgress",
        loginId: loginIdLocal,
        password: pw,
        caseId: cid,
        progress: serializeProgressForGas(progress),
      })
        .then(() => {
          lastSavedSigRef.current = sig
        })
        .catch(() => {
          /* 次の編集で再試行 */
        })
    }, SAVE_DEBOUNCE_MS)

    return () => window.clearTimeout(handle)
  }, [portalPreferences, ready])

  if (!ready) {
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
    <div className="relative min-h-screen bg-[#050607] font-official-sans-jp text-zinc-200">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.82]"
        aria-hidden
        style={{
          backgroundImage: `
            linear-gradient(152deg, rgba(10,12,16,0.45) 0%, transparent 48%),
            linear-gradient(118deg, rgba(127,156,184,0.06) 0%, transparent 42%),
            radial-gradient(ellipse at 12% 18%, rgba(127,156,184,0.07) 0%, transparent 44%),
            radial-gradient(ellipse at 88% 82%, rgba(201,162,39,0.06) 0%, transparent 42%)
          `,
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-[#06080c]" aria-hidden />

      <header className="relative z-10 border-b border-[#c9a227]/25 bg-black/55 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 md:px-6">
          <Link
            href="/"
            className="font-official-serif-latin text-[11px] uppercase tracking-[0.28em] text-[#7f9cb8]/85 transition-colors hover:text-[#c9a227]"
          >
            ← NS 公式サイト
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href={WORKS_CATALOG_PATH}
              className="font-official-serif-latin text-[10px] uppercase tracking-[0.2em] text-[#7f9cb8]/70 transition-colors hover:text-[#c9a227]"
            >
              作品一覧
            </Link>
            <button
              type="button"
              onClick={() => openPlayEntry(caseId)}
              className="font-official-serif-latin text-[10px] uppercase tracking-[0.2em] text-[#7f9cb8]/70 transition-colors hover:text-[#c9a227]"
            >
              作品を続ける
            </button>
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-4 py-8 md:py-12">
        <AccountSettingsSection
          registeredEmail={sessionEmail}
          loginId={loginId}
          caseId={caseId}
          portalPreferences={portalPreferences}
          onPortalPreferencesChange={setPortalPreferences}
          onLoginIdChanged={setLoginId}
          onEmailChanged={setSessionEmail}
        />
      </main>
    </div>
  )
}
