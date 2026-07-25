"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/admin", label: "プレイヤー", hint: "進行・バックアップ", exact: true },
  { href: "/admin/works", label: "作品", hint: "公開・詳細CMS" },
  { href: "/admin/news", label: "お知らせ", hint: "NEWS" },
  { href: "/admin/credentials", label: "資格情報", hint: "メモ・外部ID" },
] as const

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(href + "/")
}

export function AdminConsoleShell({
  title,
  description,
  children,
  actions,
  toolbar,
}: {
  title: string
  description?: string
  children: ReactNode
  actions?: ReactNode
  toolbar?: ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" })
    router.push("/admin/login")
  }

  return (
    <div
      className="admin-app flex min-h-screen bg-[#0e1116] text-[#e6edf3]"
      style={{
        fontFamily: 'var(--font-admin-sans), "IBM Plex Sans", "Segoe UI", sans-serif',
      }}
    >
      <aside className="flex w-[13.5rem] shrink-0 flex-col border-r border-[#30363d] bg-[#161b22]">
        <div className="border-b border-[#30363d] px-3 py-3">
          <p
            className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#8b949e]"
            style={{ fontFamily: 'var(--font-admin-mono), "IBM Plex Mono", monospace' }}
          >
            NS Console
          </p>
          <p className="mt-1 text-sm font-semibold text-[#f0f6fc]">運営</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href, "exact" in item ? item.exact : false)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-sm px-2.5 py-2 text-left transition-colors",
                  active
                    ? "bg-[#1f6feb]/20 text-[#79b8ff]"
                    : "text-[#c9d1d9] hover:bg-[#21262d] hover:text-[#f0f6fc]"
                )}
              >
                <span className="block text-[13px] font-medium leading-tight">{item.label}</span>
                <span className="mt-0.5 block text-[10px] text-[#8b949e]">{item.hint}</span>
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-[#30363d] p-2">
          <button
            type="button"
            onClick={() => void logout()}
            className="w-full rounded-sm border border-[#30363d] px-2 py-1.5 text-left text-[12px] text-[#8b949e] hover:border-[#8b949e] hover:text-[#c9d1d9]"
          >
            退室
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30363d] bg-[#161b22] px-4 py-2.5">
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-semibold text-[#f0f6fc]">{title}</h1>
            {description ? (
              <p className="mt-0.5 truncate text-[11px] text-[#8b949e]">{description}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {toolbar}
            {actions}
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-auto p-4">{children}</main>
      </div>
    </div>
  )
}

/** ボタン共通（コンソール用） */
export function adminBtnClass(variant: "primary" | "ghost" | "danger" = "ghost") {
  if (variant === "primary") {
    return "inline-flex items-center rounded-sm border border-[#1f6feb] bg-[#1f6feb] px-2.5 py-1.5 text-[12px] font-medium text-white hover:bg-[#388bfd] disabled:opacity-50"
  }
  if (variant === "danger") {
    return "inline-flex items-center rounded-sm border border-[#f85149]/50 bg-transparent px-2.5 py-1.5 text-[12px] text-[#f85149] hover:bg-[#f85149]/10 disabled:opacity-50"
  }
  return "inline-flex items-center rounded-sm border border-[#30363d] bg-[#21262d] px-2.5 py-1.5 text-[12px] text-[#c9d1d9] hover:border-[#8b949e] disabled:opacity-50"
}
