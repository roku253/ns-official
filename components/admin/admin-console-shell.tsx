"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/admin", label: "プレイヤー", exact: true },
  { href: "/admin/works", label: "作品CMS" },
  { href: "/admin/news", label: "お知らせ" },
  { href: "/admin/credentials", label: "資格情報" },
] as const

export function AdminConsoleNav({
  onLogout,
}: {
  onLogout?: () => void
}) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap items-center gap-1.5">
      {NAV.map((item) => {
        const active =
          "exact" in item && item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/")
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-none border px-2.5 py-1.5 text-xs transition-colors",
              active
                ? "border-[#c9a227]/55 bg-[#c9a227]/15 text-[#f5ecd4]"
                : "border-[#c9a227]/25 bg-transparent text-[#c9a227]/90 hover:bg-[#c9a227]/10"
            )}
          >
            {item.label}
          </Link>
        )
      })}
      {onLogout ? (
        <button
          type="button"
          onClick={onLogout}
          className="rounded-none border border-zinc-600 px-2.5 py-1.5 text-xs text-zinc-400 hover:border-zinc-400 hover:text-zinc-200"
        >
          退室
        </button>
      ) : null}
    </nav>
  )
}

export function AdminConsoleShell({
  title,
  description,
  children,
  onLogout,
  actions,
}: {
  title: string
  description?: string
  children: ReactNode
  onLogout?: () => void
  actions?: ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#050607] text-zinc-200">
      <header className="border-b border-[#c9a227]/25 px-4 py-4 md:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] uppercase tracking-[0.35em] text-[#7f9cb8]/80">NS Admin</p>
            <h1 className="text-lg font-semibold tracking-tight text-[#e8d89a]">{title}</h1>
            {description ? <p className="max-w-2xl text-xs leading-relaxed text-zinc-500">{description}</p> : null}
          </div>
          <div className="flex flex-shrink-0 flex-col items-stretch gap-2 sm:items-end">
            <AdminConsoleNav onLogout={onLogout} />
            {actions}
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">{children}</div>
    </div>
  )
}
