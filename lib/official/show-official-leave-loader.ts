"use client"

import { createElement } from "react"
import { createRoot } from "react-dom/client"
import { OfficialLoadingScreen } from "@/components/official-site/official-loading-screen"
import { requestOfficialLoader } from "@/lib/official/official-loader-intent"

const HOST_ID = "ns-official-leave-loader"

/**
 * 作品起動前に CRT ローダーを重ねてからハード遷移する。
 * （遷移先のフルロードで公式 JS は破棄される）
 */
export function navigateWithOfficialLeaveLoader(url: string, statusLine = "作品を起動しています…") {
  if (typeof window === "undefined") return

  requestOfficialLoader("return-from-play")

  let host = document.getElementById(HOST_ID)
  if (!host) {
    host = document.createElement("div")
    host.id = HOST_ID
    host.style.cssText = "position:fixed;inset:0;z-index:2147483647"
    document.body.appendChild(host)
  }

  const root = createRoot(host)
  let progress = 10
  root.render(createElement(OfficialLoadingScreen, { progress, statusLine }))

  const tick = window.setInterval(() => {
    progress = Math.min(88, progress + 14)
    root.render(createElement(OfficialLoadingScreen, { progress, statusLine }))
  }, 70)

  window.setTimeout(() => {
    window.clearInterval(tick)
    root.render(createElement(OfficialLoadingScreen, { progress: 100, statusLine }))
    window.location.assign(url)
  }, 420)
}
