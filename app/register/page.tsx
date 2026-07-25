import { redirect } from "next/navigation"

type SearchParams = Record<string, string | string[] | undefined>

function first(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined
  return Array.isArray(v) ? v[0] : v
}

/**
 * メールの accountSetupUrl 用エイリアス。クエリを保ったまま /setup へ送る。
 * 例: /register?case=koko-ni-iru&email=user%40mail.com
 */
export default async function RegisterPage(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams
  const q = new URLSearchParams()
  const c = first(searchParams.case)
  const e = first(searchParams.email)
  if (c) q.set("case", c)
  if (e) q.set("email", e)
  const qs = q.toString()
  redirect(`/setup${qs ? `?${qs}` : ""}`)
}
