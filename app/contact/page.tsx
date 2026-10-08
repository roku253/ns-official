"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { OfficialLoadingScreen } from "@/components/official-site/official-loading-screen"
import { OfficialSiteHeader } from "@/components/official-site/official-site-header"
import { OfficialSitePortalFooter } from "@/components/official-site/official-site-portal-footer"
import { useOfficialBootstrap } from "@/lib/official/use-official-bootstrap"
import { isImeConfirmEnter } from "@/lib/ime-confirm-enter"

const fieldClass =
  "mt-2 w-full border border-[#c9a227]/35 bg-[#06080c]/80 px-3 py-2.5 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus-visible:border-[#c9a227]/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a227]/40"

function ContactMain() {
  const [kind, setKind] = useState<"inquiry" | "withdrawal">("inquiry")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const [error, setError] = useState("")

  async function submit() {
    setStatus("sending")
    setError("")
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, email, message }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        setStatus("error")
        setError(data.error || "送信できませんでした。")
        return
      }
      setStatus("sent")
      setMessage("")
    } catch {
      setStatus("error")
      setError("送信できませんでした。")
    }
  }

  return (
    <>
      <main className="flex-1 font-official-sans-jp">
        <div className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
          <p className="font-official-serif-latin text-[10px] uppercase tracking-[0.4em] text-[#7f9cb8]/85">Contact</p>
          <h1 className="mt-4 font-official-display text-3xl tracking-[0.15em] text-[#e8d89a] md:text-4xl">お問い合わせ</h1>

          <p className="mt-10 text-sm leading-[2] text-zinc-400">
            作品の質問と、退会の連絡はこちらで受け付けます。メールアドレスと本文は、返信とアカウント削除のために運営の表へ保存します。
          </p>

          {status === "sent" ? (
            <p className="mt-10 border border-[#c9a227]/40 px-4 py-4 text-sm leading-[1.9] text-[#e8d89a]" role="status">
              受け付けました。内容を確認して、必要なときにこのメールアドレスへ返します。
            </p>
          ) : (
            <form
              className="mt-10 space-y-6"
              onSubmit={(e) => {
                e.preventDefault()
                void submit()
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isImeConfirmEnter(e)) e.preventDefault()
              }}
            >
              <fieldset>
                <legend className="font-official-serif-latin text-[11px] uppercase tracking-[0.22em] text-[#7f9cb8]">
                  種別
                </legend>
                <div className="mt-3 flex flex-wrap gap-3">
                  {(
                    [
                      ["inquiry", "問い合わせ"],
                      ["withdrawal", "退会"],
                    ] as const
                  ).map(([value, label]) => (
                    <label
                      key={value}
                      className={`cursor-pointer border px-4 py-2 text-sm ${
                        kind === value
                          ? "border-[#c9a227] text-[#e8d89a]"
                          : "border-[#c9a227]/30 text-zinc-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name="kind"
                        value={value}
                        checked={kind === value}
                        onChange={() => setKind(value)}
                        className="sr-only"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="block text-sm text-zinc-300">
                メールアドレス
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={fieldClass}
                />
              </label>

              <label className="block text-sm text-zinc-300">
                本文
                <textarea
                  required
                  rows={7}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className={fieldClass}
                />
              </label>

              {error ? (
                <p className="text-sm text-[#e8b4a0]" role="alert">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={status === "sending"}
                className="inline-flex border border-[#c9a227]/50 px-5 py-2.5 font-official-serif-latin text-[11px] uppercase tracking-[0.22em] text-[#e8d89a] transition-colors hover:border-[#c9a227] hover:bg-[#c9a227]/10 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c9a227]/50"
              >
                {status === "sending" ? "送信中" : "送信する"}
              </button>
            </form>
          )}

          <section className="mt-16 border-t border-[#c9a227]/20 pt-10">
            <h2 className="font-official-serif-latin text-[11px] uppercase tracking-[0.3em] text-zinc-500">Social</h2>
            <ul className="mt-4 space-y-2 text-sm text-zinc-600">
              <li>
                <span className="cursor-not-allowed no-underline opacity-60" aria-disabled="true">
                  Fediverse（準備中）
                </span>
              </li>
              <li>
                <span className="cursor-not-allowed opacity-60" aria-disabled="true">
                  動画チャネル（準備中）
                </span>
              </li>
            </ul>
          </section>

          <p className="mt-14">
            <Link
              href="/"
              className="font-official-serif-latin text-[11px] uppercase tracking-[0.25em] text-[#7f9cb8] transition-colors hover:text-[#c9a227] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c9a227]/50"
            >
              ← Home
            </Link>
          </p>
        </div>
      </main>
      <OfficialSitePortalFooter className="bg-[#050607]" />
    </>
  )
}

export default function ContactPage() {
  const { ready, loadingProgress, sessionOk, mergedWorks } = useOfficialBootstrap()

  if (!ready) {
    return <OfficialLoadingScreen progress={loadingProgress} />
  }

  return (
    <div className="official-portal-surface flex min-h-screen flex-col bg-[#0a0c10] text-zinc-200 antialiased">
      <OfficialSiteHeader sessionOk={sessionOk} mergedWorks={mergedWorks} />
      <Suspense
        fallback={
          <main className="px-4 py-16 text-sm text-zinc-500 md:px-6">読み込み中…</main>
        }
      >
        <ContactMain />
      </Suspense>
    </div>
  )
}
