import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "アカウント | NS",
  description: "会員向けアカウント設定です。",
}

export default function AccountLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children
}
