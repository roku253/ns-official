"use client"

import { createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { OfficialLoadingScreen } from "@/components/official-site/official-loading-screen"
import { writePlayLoadHandoff } from "@/lib/official/play-load-handoff"

const HOST_ID = "ns-official-leave-loader"

function resolvePrefetchUrl(url: string): string {
  try {
    const u = new URL(url, window.location.origin)
    // /play/<id> は /portal へリダイレクトされるので先にポータルを温める
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

/** 遷移先 HTML を実バイト進捗つきで取得（0–52% 相当を返す） */
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
      cache: "no-store",
      headers: { Accept: "text/html,*/*" },
    })
  } catch {
    onProgress(28)
    return
  }
  onProgress(22)
  if (!res.ok) {
    onProgress(30)
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
    onProgress(52)
    return
  }

  let received = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      received += value?.byteLength || 0
      if (total > 0) {
        onProgress(22 + Math.round((received / total) * 30))
      } else {
        onProgress(Math.min(50, 22 + Math.floor(received / 32_000)))
      }
    }
  } catch {
    /* partial ok */
  }
  onProgress(52)
}

/**
 * 作品起動前に CRT ローダーを重ね、遷移先を実プリフェッチしてからハード遷移する。
 * 進捗は sessionStorage handoff で作品側ローダーへ継続（二重ブート防止）。
 */
export function navigateWithOfficialLeaveLoader(url: string, statusLine = "作品を起動しています…") {
  if (typeof window === "undefined") return

  let host = document.getElementById(HOST_ID)
  if (!host) {
    host = document.createElement("div")
    host.id = HOST_ID
    host.style.cssText = "position:fixed;inset:0;z-index:2147483647"
    document.body.appendChild(host)
  }

  const root: Root = createRoot(host)
  let progress = 4
  let navigated = false

  const paint = (n: number, line = statusLine) => {
    progress = Math.max(progress, Math.min(92, Math.round(n)))
    root.render(
      createElement(OfficialLoadingScreen, {
        progress,
        statusLine: line,
        skipBootAnimation: true,
      })
    )
  }

  paint(4)

  const target = absoluteUrl(url)
  const prefetchTarget = resolvePrefetchUrl(url)

  void (async () => {
    await prefetchDestination(prefetchTarget, (n) => paint(n, statusLine))
    paint(Math.max(progress, 55), statusLine)
    writePlayLoadHandoff(progress, statusLine)
    if (navigated) return
    navigated = true
    window.location.assign(target)
  })()
}
