"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { setActiveWorkAndOpenPortal } from "@/lib/official/play-work-navigation"
import { resolveWorkPlayUrl } from "@/lib/official/work-play-urls"
import { navigateWithOfficialLeaveLoader } from "@/lib/official/show-official-leave-loader"
import { LS_ACCOUNT, LS_SESSION } from "@/lib/storage-keys"
import { cn } from "@/lib/utils"

type PlayThisWorkButtonProps = {
  workId: string
  sessionOk: boolean
  className?: string
  /** 未ログイン時の遷移先（既定: /login） */
  loginHref?: string
  /** ボタンラベル（未指定: 「この作品をプレイ」/未ログイン時は「ログインしてプレイ」） */
  children?: ReactNode
  /** 設定時はトークン付きで外部 URL を開く（公式ポータルは開かない） */
  externalUrl?: string
  /** issueAccessToken の resource_key */
  tokenResource?: string
}

async function openExternalWithToken(
  workId: string,
  externalUrl: string,
  tokenResource: string
): Promise<{ ok: boolean; message?: string }> {
  if (typeof window === "undefined") return { ok: false, message: "ブラウザでのみ実行できます。" }
  const loginId = window.localStorage.getItem(LS_ACCOUNT.LOGIN_ID)?.trim() || ""
  const password =
    window.sessionStorage.getItem(LS_SESSION.PASSWORD)?.trim() ||
    window.localStorage.getItem(LS_ACCOUNT.PASSWORD)?.trim() ||
    ""
  if (!loginId || !password) {
    return { ok: false, message: "セッションにパスワードがありません。再ログインしてください。" }
  }
  const res = await fetch("/api/platform/issue-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      loginId,
      password,
      caseId: workId,
      resourceKey: tokenResource,
      maxUses: 50,
    }),
  })
  const data = (await res.json()) as { success?: boolean; token?: string; message?: string }
  if (!data.success || !data.token) {
    return { ok: false, message: data.message || "トークン発行に失敗しました。" }
  }
  const base = externalUrl.trim()
  const sep = base.includes("?") ? "&" : "?"
  navigateWithOfficialLeaveLoader(`${base}${sep}token=${encodeURIComponent(data.token)}`)
  return { ok: true }
}

/**
 * 公式サイト用: この作品の case_id を保存してからポータルを開く。
 * 未ログイン時はログインページへ。
 * externalUrl + tokenResource があればトークン付きで外部へ。
 */
export function PlayThisWorkButton({
  workId,
  sessionOk,
  className,
  loginHref = "/login",
  children,
  externalUrl,
  tokenResource,
}: PlayThisWorkButtonProps) {
  if (!sessionOk) {
    return (
      <Link
        href={loginHref}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-95",
          className
        )}
      >
        {children ?? "ログインしてプレイ"}
        <ArrowRight className="h-4 w-4" />
      </Link>
    )
  }

  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-95",
        className
      )}
      onClick={async () => {
        const ext = resolveWorkPlayUrl(workId, externalUrl)
        const resKey = (tokenResource || "").trim()
        if (ext && resKey) {
          const r = await openExternalWithToken(workId, ext, resKey)
          if (!r.ok) {
            window.alert(r.message || "エラー")
          }
          return
        }
        setActiveWorkAndOpenPortal(workId, ext)
      }}
    >
      {children ?? "この作品をプレイ"}
      <ArrowRight className="h-4 w-4" />
    </button>
  )
}

/** テキストリンク版（カード内など） */
export function PlayThisWorkTextLink({
  workId,
  sessionOk,
  className,
  loginHref = "/login",
  children,
  externalUrl,
  tokenResource,
}: PlayThisWorkButtonProps & { children?: ReactNode }) {
  if (!sessionOk) {
    return (
      <Link href={loginHref} className={cn("text-sm font-medium text-primary hover:underline", className)}>
        {children ?? "ログインしてプレイ →"}
      </Link>
    )
  }
  return (
    <button
      type="button"
      className={cn("text-left text-sm font-medium text-primary hover:underline", className)}
      onClick={async () => {
        const ext = resolveWorkPlayUrl(workId, externalUrl)
        const resKey = (tokenResource || "").trim()
        if (ext && resKey) {
          const r = await openExternalWithToken(workId, ext, resKey)
          if (!r.ok) window.alert(r.message || "エラー")
          return
        }
        setActiveWorkAndOpenPortal(workId, ext)
      }}
    >
      {children ?? "この作品をプレイ →"}
    </button>
  )
}
