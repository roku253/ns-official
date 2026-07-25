"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { requestOfficialLoader } from "@/lib/official/official-loader-intent"

type ReturnToOfficialLinkProps = {
  href?: string
  className?: string
  children: ReactNode
}

/**
 * 作品プレイ画面から公式へ戻るリンク。
 * クリック時にローダー再表示フラグを立てる（公式タブ切替では立てない）。
 */
export function ReturnToOfficialLink({ href = "/", className, children }: ReturnToOfficialLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => requestOfficialLoader("return-from-play")}
    >
      {children}
    </Link>
  )
}
