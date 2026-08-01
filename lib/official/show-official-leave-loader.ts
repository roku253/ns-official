"use client"

import { createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { OfficialLoadingScreen } from "@/components/official-site/official-loading-screen"
import { writePlayLoadHandoff, type PlayEntranceMeta } from "@/lib/official/play-load-handoff"

const HOST_ID = "ns-official-leave-loader"

/** /play/<id> → /play/<id>/portal（リダイレクト二重遷移を避ける） */
function resolvePortalUrl(url: string): string {
  try {
    const u = new URL(url, window.location.origin)
    const m = u.pathname.match(/^(\/play\/[^/]+)\/?$/)
    if (m) {
      u.pathname = `${m[1]}/portal`
    }
    return u.toString()
  } catch {
    return url
  }
}

function absoluteUrl(url: string): string {
  try {
    return new URL(url, window.location.origin).toString()
  } catch {
    return url
  }
}

/** 遷移先 HTML を実バイト進捗つきで取得 */
async function prefetchDestination(
  url: string,
  onProgress: (n: number) => void
): Promise<void> {
  onProgress(8)
  let res: Response
  try {
    res = await fetch(url, {
      method: "GET",
      credentials: "same-origin",
      cache: "force-cache",
      headers: { Accept: "text/html,*/*" },
    })
  } catch {
    onProgress(35)
    return
  }
  onProgress(28)
  if (!res.ok) {
    onProgress(40)
    return
  }

  const total = Number(res.headers.get("content-length") || "0")
  const reader = res.body?.getReader()
  if (!reader) {
    try {
      await res.arrayBuffer()
    } catch {
      /* ignore */
    }
    onProgress(88)
    return
  }

  let received = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      received += value?.byteLength || 0
      if (total > 0) {
        onProgress(28 + Math.round((received / total) * 60))
      } else {
        onProgress(Math.min(86, 28 + Math.floor(received / 28_000)))
      }
    }
  } catch {
    /* partial ok */
  }
  onProgress(90)
}

export type LeaveLoaderOptions = {
  statusLine?: string
  entrance?: PlayEntranceMeta
}

/**
 * 公式側で実ロードを完了させてから作品へ遷移する。
 * 作品側は％ではなくタイトル／カバーの入場画面を出す。
 */
export function navigateWithOfficialLeaveLoader(
  url: string,
  statusLineOrOpts: string | LeaveLoaderOptions = "作品を起動しています…"
) {
  if (typeof window === "undefined") return

  const opts: LeaveLoaderOptions =
    typeof statusLineOrOpts === "string"
      ? { statusLine: statusLineOrOpts }
      : statusLineOrOpts || {}
  const statusLine = opts.statusLine || "作品を起動しています…"
  const entrance: PlayEntranceMeta = {
    title: opts.entrance?.title || "作品",
    tagline: opts.entrance?.tagline,
    coverImage: opts.entrance?.coverImage,
  }

  let host = document.getElementById(HOST_ID)
  if (!host) {
    host = document.createElement("div")
    host.id = HOST_ID
    host.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:#020303"
    document.body.appendChild(host)
  }

  const root: Root = createRoot(host)
  let progress = 4
  let navigated = false

  const paint = (n: number, line = statusLine) => {
    progress = Math.max(progress, Math.min(100, Math.round(n)))
    root.render(
      createElement(OfficialLoadingScreen, {
        progress,
        statusLine: line,
        skipBootAnimation: true,
      })
    )
  }

  paint(4)

  const target = resolvePortalUrl(absoluteUrl(url))

  void (async () => {
    await prefetchDestination(target, (n) => paint(n, statusLine))
    paint(100, "入場します…")
    writePlayLoadHandoff(entrance)
    await new Promise((r) => window.setTimeout(r, 280))
    if (navigated) return
    navigated = true
    window.location.assign(target)
  })()
}
