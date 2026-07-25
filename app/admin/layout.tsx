import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "運営コンソール",
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-console min-h-screen bg-[#0e1116] text-[#e6edf3]">
      <p className="border-b border-[#30363d] bg-[#161b22] px-3 py-1.5 text-center text-[10px] leading-snug text-[#8b949e]">
        運営専用。ポータルパスワードはシート上ハッシュのみで復元不可。資格情報メモは平文のため共有範囲・端末管理に注意。
      </p>
      {children}
    </div>
  )
}
