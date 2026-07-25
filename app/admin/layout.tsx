import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "運営コンソール",
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-console flex min-h-screen flex-col bg-background text-foreground antialiased">
      <p className="border-b border-border/80 bg-card/60 px-3 py-2 text-center text-[10px] leading-snug text-muted-foreground md:px-6">
        運営専用。ポータルのログインパスワードはシート上ハッシュのみで、この画面からは復元できません。「運営メモ・資格情報」はユーザー別の運営メモや外部サイト用のID・パスワード控え（プレイヤー画面からは参照されません）。メモ用シートの平文は共有範囲を最小にし、コンソール鍵・端末の取り扱いに注意してください。
      </p>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  )
}
