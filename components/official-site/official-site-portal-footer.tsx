import Link from "next/link"
import { WORKS_CATALOG_PATH } from "@/lib/routes"
import { cn } from "@/lib/utils"

const nav = [
  { href: "/", label: "HOME" },
  { href: "/about", label: "ABOUT" },
  { href: WORKS_CATALOG_PATH, label: "WORKS" },
  { href: "/news", label: "NEWS" },
  { href: "/contact", label: "CONTACT" },
] as const

export function OfficialSitePortalFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "mt-auto border-t border-[#c9a227]/25 bg-black/40 py-12 font-official-serif-latin text-[#e8d89a]/90",
        className
      )}
    >
      <nav
        className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 text-[11px] uppercase tracking-[0.28em] md:px-6"
        aria-label="フッターナビゲーション"
      >
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-[#a1a1aa] transition-colors hover:text-[#c9a227] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c9a227]/60"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <p className="mt-8 text-center font-official-sans-jp text-[11px] tracking-wide text-zinc-500">
        © NS — Official Portal
      </p>
    </footer>
  )
}
