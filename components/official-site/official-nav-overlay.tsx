"use client"

import { Suspense, useEffect, useId, useRef, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { usePathname } from "next/navigation"
import gsap from "gsap"
import { ArrowRight } from "lucide-react"
import { ACCOUNT_SETTINGS_PATH, WORKS_CATALOG_PATH } from "@/lib/routes"
import { openPlayEntry } from "@/lib/official/play-work-navigation"
import { LS_ACCOUNT, LS_AUTH } from "@/lib/storage-keys"
import type { MergedWorkItem } from "@/lib/official/works-catalog"
import { workDisplayTitleForCaseId } from "@/lib/official/works-catalog"
import { OfficialCatalogToolbar } from "@/components/official-site/official-catalog-toolbar"
import { GlitchCanvas } from "@/components/official-site/glitch-canvas"
import { cn } from "@/lib/utils"

/* ──────────────────────────────────────────────────────────
 * OfficialNavOverlay — D4KK + GSAP 参照のフルスクリーンメニュー
 *
 * 設計（添付の HTML/CSS/JS-menu.txt を踏襲）：
 *
 *  - 単一 GSAP timeline（paused）+ .addPause() で ENTER / EXIT を分離。
 *  - ENTER：
 *      ・bg がフェード
 *      ・top パネル（ナビ本体）が左から x:-101% → 0%（back.out）
 *      ・bottom パネル（検索 + ログイン）が右から x: 101% → 0%
 *      ・nav-item が個別に opacity / x のスタガー入場
 *      ・SVG bar-top / bar-bot が交差して X に変形
 *  - EXIT：
 *      ・X → bar に戻る
 *      ・両パネルが y:110vh で random rotation を伴って下へ落下
 *  - 中断：開閉中の再クリックは reverse で戻る、フルオープン後はそのまま EXIT へ。
 *  - パネル背景に GlitchCanvas（"panel" 強度）を仕込んで「デジタル粒子 + RGB
 *    スプリット」のテクスチャ感を出す。SVG のグリッチ風タイトルは clip-path
 *    で 2 重描画して横シフトすることで再現。
 *
 *  - ヘッダー（backdrop-blur で stacking context を作る）の中に置けないため、
 *    createPortal で document.body 直下に出している。
 * ────────────────────────────────────────────────────────── */

type NavLink = {
  href: string
  label: string
  caption: string
}

const PORTAL_NAV: NavLink[] = [
  { href: "/", label: "Home", caption: "玄関 / トップ" },
  { href: WORKS_CATALOG_PATH, label: "Works", caption: "作品一覧 / Case Archive" },
  { href: "/news", label: "News", caption: "更新と告知" },
  { href: "/about", label: "About", caption: "NS について" },
  { href: "/contact", label: "Contact", caption: "問い合わせ窓口" },
]

const toolbarOnDark =
  "[&_input]:border-[#c9a227]/30 [&_input]:bg-[#0a0c10]/80 [&_input]:text-zinc-200 [&_input]:placeholder:text-zinc-500 [&_input]:ring-offset-[#050607] [&_input]:focus-visible:border-[#c9a227]/55 [&_input]:focus-visible:ring-[#c9a227]/30 [&_select]:border-[#c9a227]/30 [&_select]:bg-[#0a0c10]/80 [&_select]:text-zinc-200 [&_select]:ring-offset-[#050607] [&_select]:focus-visible:border-[#c9a227]/55 [&_select]:focus-visible:ring-[#c9a227]/30 [&_label_.text-muted-foreground]:text-zinc-500"

const portalActionBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-sm border border-[#c9a227]/55 bg-transparent px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-[#e8d89a] transition-colors hover:border-[#c9a227] hover:bg-[#c9a227]/10 hover:text-[#f5ecd4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a227]/55"

type OfficialNavOverlayProps = {
  sessionOk: boolean
  mergedWorks: MergedWorkItem[]
  className?: string
}

export function OfficialNavOverlay({
  sessionOk,
  mergedWorks,
  className,
}: OfficialNavOverlayProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const overlayId = useId()

  const [continueCaseId, setContinueCaseId] = useState("")
  const [continueTitle, setContinueTitle] = useState("")
  const showContinue = sessionOk && Boolean(continueCaseId)

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  /* 「続きから」用の状態を sessionOk に追従して再計算 */
  useEffect(() => {
    if (!sessionOk) {
      setContinueCaseId("")
      setContinueTitle("")
      return
    }
    const once = window.localStorage.getItem(LS_AUTH.PORTAL_STARTED_ONCE) === "true"
    const caseId = window.localStorage.getItem(LS_ACCOUNT.CASE_ID)?.trim() ?? ""
    if (!once || !caseId) {
      setContinueCaseId("")
      setContinueTitle("")
      return
    }
    setContinueCaseId(caseId)
    setContinueTitle(workDisplayTitleForCaseId(mergedWorks, caseId))
  }, [sessionOk, mergedWorks])

  /* --- GSAP timeline 構築（mount 時 1 回 + open 切替時に restart 制御） --- */
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const enterEndRef = useRef<number>(0)

  useEffect(() => {
    if (!mounted) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    /** 既存 timeline を破棄して再構築（reduceMotion 切替対応） */
    tlRef.current?.kill()

    const root = rootRef.current
    if (!root) return
    /** ハンバーガーの SVG bar はオーバーレイ root の外（button 内）にあるので、別 ref から拾う */
    const btn = buttonRef.current

    /** ヘルパ：要素配列を生成して空配列なら警告を抑える */
    const q = (sel: string): Element[] => Array.from(root.querySelectorAll(sel))
    const bq = (sel: string): Element[] =>
      btn ? Array.from(btn.querySelectorAll(sel)) : []

    /** 初期スタイル：パネル両方とも画面外、bg 透明、login 行は引っ込めておく */
    gsap.set(root, { autoAlpha: 0, visibility: "hidden", pointerEvents: "none" })
    gsap.set(q(".js-nav-bg"), { opacity: 0 })
    gsap.set(q(".js-nav-top"), { x: "-101%", y: 0, rotation: 0 })
    gsap.set(q(".js-nav-bottom"), { x: "101%", y: 0, rotation: 0 })
    gsap.set(q(".js-nav-item"), { opacity: 0, x: -20 })
    gsap.set(q(".js-nav-bottom-row"), { opacity: 0, y: 12 })
    /** ボタン SVG は通常状態に戻す（HMR で残った X を戻すため） */
    gsap.set(bq(".js-bar-top"), { attr: { x1: 3, y1: 7, x2: 17, y2: 7 } })
    gsap.set(bq(".js-bar-bot"), { attr: { x1: 3, y1: 13, x2: 17, y2: 13 } })
    gsap.set(bq(".js-bar-mid"), { opacity: 1 })

    const tl = gsap.timeline({ paused: true })

    /* ─── ENTER ─── */
    tl.set(root, { autoAlpha: 1, visibility: "visible", pointerEvents: "auto" })
    if (q(".js-nav-bg").length) {
      tl.to(
        q(".js-nav-bg"),
        { opacity: 1, duration: reduce ? 0 : 0.4, ease: "power2.out" },
        0
      )
    }
    if (q(".js-nav-top").length) {
      tl.fromTo(
        q(".js-nav-top"),
        { x: "-101%", y: 0, rotation: 0 },
        { x: "0%", y: 0, duration: reduce ? 0 : 0.6, ease: "back.out(1.2)" },
        0
      )
    }
    if (q(".js-nav-bottom").length) {
      tl.fromTo(
        q(".js-nav-bottom"),
        { x: "101%", y: 0, rotation: 0 },
        { x: "0%", y: 0, duration: reduce ? 0 : 0.6, ease: "back.out(1.2)" },
        0.05
      )
    }
    if (q(".js-nav-item").length) {
      tl.fromTo(
        q(".js-nav-item"),
        { opacity: 0, x: -20 },
        {
          opacity: 1,
          x: 0,
          duration: reduce ? 0 : 1.0,
          ease: "expo.out",
          stagger: reduce ? 0 : 0.04,
        },
        0.12
      )
    }
    if (q(".js-nav-bottom-row").length) {
      tl.fromTo(
        q(".js-nav-bottom-row"),
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: reduce ? 0 : 0.45,
          ease: "power3.out",
          stagger: reduce ? 0 : 0.05,
        },
        0.3
      )
    }
    /* SVG ハンバーガー → X（要素はボタン内側にあるので bq を使う） */
    if (bq(".js-bar-top").length) {
      tl.to(
        bq(".js-bar-top"),
        {
          attr: { x1: 5, y1: 5, x2: 15, y2: 15 },
          duration: reduce ? 0 : 0.32,
          ease: "back.out(1.4)",
        },
        0.06
      )
    }
    if (bq(".js-bar-bot").length) {
      tl.to(
        bq(".js-bar-bot"),
        {
          attr: { x1: 15, y1: 5, x2: 5, y2: 15 },
          duration: reduce ? 0 : 0.32,
          ease: "back.out(1.4)",
        },
        0.06
      )
    }
    if (bq(".js-bar-mid").length) {
      tl.to(
        bq(".js-bar-mid"),
        { opacity: 0, duration: reduce ? 0 : 0.18, ease: "power2.out" },
        0
      )
    }

    tl.addPause()
    enterEndRef.current = tl.duration()

    /* ─── EXIT ─── */
    if (bq(".js-bar-top").length) {
      tl.to(bq(".js-bar-top"), {
        attr: { x1: 3, y1: 7, x2: 17, y2: 7 },
        duration: reduce ? 0 : 0.22,
        ease: "power3.in",
      })
    }
    if (bq(".js-bar-bot").length) {
      tl.to(
        bq(".js-bar-bot"),
        {
          attr: { x1: 3, y1: 13, x2: 17, y2: 13 },
          duration: reduce ? 0 : 0.22,
          ease: "power3.in",
        },
        "<"
      )
    }
    if (bq(".js-bar-mid").length) {
      tl.to(
        bq(".js-bar-mid"),
        { opacity: 1, duration: reduce ? 0 : 0.18, ease: "power2.out" },
        "<"
      )
    }
    /* パネル落下 */
    if (q(".js-nav-panel").length) {
      tl.to(
        q(".js-nav-panel"),
        {
          y: "110vh",
          rotation: () => gsap.utils.random(-22, 22),
          duration: reduce ? 0 : 0.85,
          ease: "power3.in",
          stagger: reduce ? 0 : { from: "end", each: 0.04 },
        },
        "<"
      )
    }
    if (q(".js-nav-bg").length) {
      tl.to(
        q(".js-nav-bg"),
        { opacity: 0, duration: reduce ? 0 : 0.32, ease: "power2.in" },
        "<0.15"
      )
    }
    tl.set(root, { autoAlpha: 0, visibility: "hidden", pointerEvents: "none" })

    tlRef.current = tl

    return () => {
      tl.kill()
    }
  }, [mounted])

  /* open フラグの変化に応じて GSAP timeline を制御 */
  useEffect(() => {
    const tl = tlRef.current
    if (!tl) return
    if (open) {
      if (tl.time() >= enterEndRef.current) {
        /** すでに EXIT が終わって最後に居る → restart で 0 から ENTER */
        tl.timeScale(1).restart()
      } else {
        tl.timeScale(1).play()
      }
    } else {
      if (tl.time() < enterEndRef.current) {
        /** ENTER 途中 → 反転して閉じる（速め） */
        tl.timeScale(1.6).reverse()
      } else {
        /** ENTER は完了している → 続きの EXIT を再生 */
        tl.timeScale(1).play()
      }
    }
  }, [open])

  /* 各種ハンドラ */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        setOpen(false)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  /* ルーティング遷移時には自動的に閉じる */
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  /* 開いた瞬間 / 閉じた直後にフォーカス管理 */
  useEffect(() => {
    if (!open) {
      buttonRef.current?.focus({ preventScroll: true })
      return
    }
    const t = window.setTimeout(() => {
      const focusable = rootRef.current?.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled])'
      )
      focusable?.focus({ preventScroll: true })
    }, 60)
    return () => window.clearTimeout(t)
  }, [open])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={overlayId}
        aria-label={open ? "メニューを閉じる" : "メニューを開く"}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "group relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-[#c9a227]/40 bg-black/35 text-[#e8d89a] transition-colors hover:border-[#c9a227] hover:bg-[#c9a227]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a227]/55",
          className
        )}
      >
        <span className="sr-only">{open ? "メニューを閉じる" : "メニューを開く"}</span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden
          className="block"
        >
          <line
            className="js-bar-top"
            x1={3}
            y1={7}
            x2={17}
            y2={7}
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          <line
            className="js-bar-mid"
            x1={3}
            y1={10}
            x2={17}
            y2={10}
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          <line
            className="js-bar-bot"
            x1={3}
            y1={13}
            x2={17}
            y2={13}
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </svg>
      </button>

      {mounted
        ? createPortal(
            <div
              id={overlayId}
              role="dialog"
              aria-modal="true"
              aria-label="メインメニュー"
              ref={rootRef}
              className="fixed inset-0 z-[1000] h-[100dvh] w-screen overflow-x-hidden overflow-y-auto font-official-serif-latin text-zinc-200"
              data-lenis-prevent
              style={{ visibility: "hidden", opacity: 0 }}
            >
              {/* 背景レイヤー（クリックで閉じる） */}
              <button
                type="button"
                tabIndex={-1}
                aria-hidden
                onClick={() => setOpen(false)}
                className="js-nav-bg absolute inset-0 cursor-default bg-[#050607]/82 backdrop-blur-sm"
              />

              {/* 共通グリッチ・粒子 */}
              <div aria-hidden className="pointer-events-none absolute inset-0 z-[1]">
                <GlitchCanvas intensity="ambient" />
              </div>

              {/* GlitchTitle 用のキーフレームを 1 度だけ注入 */}
              <GlitchTitleStyles />

              <div className="relative z-[2] mx-auto flex min-h-full w-full max-w-6xl flex-col gap-3 p-3 md:gap-4 md:p-5">
                {/* 上端のメタ情報 */}
                <div className="z-[3] flex items-center justify-between text-[10px] uppercase tracking-[0.4em] text-[#7f9cb8]/85">
                  <span>NS / Index</span>
                  <span className="hidden font-mono text-[10px] tracking-[0.25em] text-zinc-500 md:inline">
                    press esc to close
                  </span>
                </div>

                {/* ── Block 1 (TOP) : Home / Works / News / About / Contact ── */}
                <section
                  aria-label="メインナビゲーション"
                  className="js-nav-panel js-nav-top relative flex w-full shrink-0 flex-col overflow-hidden border border-[#c9a227]/35 bg-[#0a0c10]/85 p-7 backdrop-blur-md md:p-10"
                >
                  {/* パネル内部背景：粒子 + RGB スプリット帯 */}
                  <GlitchCanvas intensity="panel" className="opacity-90" />

                  {/* HUD 風の角マーク */}
                  <CornerHud />

                  <div className="relative z-[2] flex flex-col gap-1.5 text-[#7f9cb8]/85">
                    <span className="font-mono text-[10px] uppercase tracking-[0.45em]">
                      // 01 / Navigation
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                      Surface — Realm of stories
                    </span>
                  </div>

                  <ul className="relative z-[2] mt-6 flex flex-col gap-1 md:mt-8 md:gap-2">
                    {PORTAL_NAV.map((item, i) => (
                      <li key={item.href} className="js-nav-item overflow-hidden">
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className="group/nav relative flex items-baseline justify-between gap-6 border-b border-[#c9a227]/15 py-3 transition-colors hover:border-[#c9a227]/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c9a227]/55 md:py-4"
                        >
                          <span className="flex items-baseline gap-5">
                            <span className="font-mono text-[10px] tracking-[0.3em] text-[#7f9cb8]/70 tabular-nums md:text-[11px]">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <GlitchTitle text={item.label} />
                          </span>
                          <span className="hidden text-[11px] uppercase tracking-[0.32em] text-zinc-500 transition-colors group-hover/nav:text-[#c9a227] md:inline">
                            {item.caption}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* ── Block 2 (BOTTOM) : 作品検索 + ログイン ── */}
                <section
                  aria-label="検索とアカウント"
                  className="js-nav-panel js-nav-bottom relative flex w-full shrink-0 flex-col overflow-hidden border border-[#7f9cb8]/35 bg-[#080a0e]/90 p-6 backdrop-blur-md md:flex-row md:items-stretch md:gap-8 md:p-8"
                >
                  <GlitchCanvas intensity="panel" hue={{ r: 127, g: 156, b: 184 }} />
                  <CornerHud color="#7f9cb8" />

                  <div className="js-nav-bottom-row relative z-[2] flex flex-1 flex-col gap-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#7f9cb8]/85">
                      // 02 / Search
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                      Index the archive — タイトル・作者・タグで横断検索
                    </p>
                    <Suspense
                      fallback={
                        <div className="h-10 w-full max-w-2xl animate-pulse rounded-sm bg-zinc-800/40" aria-hidden />
                      }
                    >
                      <OfficialCatalogToolbar className={cn("max-w-3xl", toolbarOnDark)} />
                    </Suspense>
                  </div>

                  <div className="js-nav-bottom-row relative z-[2] mt-6 flex flex-col gap-3 border-t border-[#7f9cb8]/20 pt-6 md:ml-auto md:mt-0 md:min-w-[260px] md:max-w-[320px] md:border-l md:border-t-0 md:pl-8 md:pt-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#7f9cb8]/85">
                      // 03 / Account
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                      {!sessionOk ? (
                        <Link
                          href="/login"
                          onClick={() => setOpen(false)}
                          className={portalActionBtn}
                        >
                          Login
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      ) : (
                        <Link
                          href={ACCOUNT_SETTINGS_PATH}
                          onClick={() => setOpen(false)}
                          className={portalActionBtn}
                        >
                          Account
                        </Link>
                      )}
                    </div>

                    {showContinue ? (
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false)
                          openPlayEntry(continueCaseId)
                        }}
                        className={cn(
                          portalActionBtn,
                          "max-w-full flex-col items-start gap-0.5 text-start sm:flex-row sm:items-center sm:gap-2"
                        )}
                      >
                        <span className="text-[9px] font-normal normal-case tracking-normal text-zinc-400">
                          続きから
                        </span>
                        <span className="inline-flex min-w-0 items-center gap-1 text-[11px] font-medium normal-case tracking-normal">
                          <span className="truncate">{continueTitle}</span>
                          <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        </span>
                      </button>
                    ) : null}

                    <p className="mt-auto pt-4 font-mono text-[9px] uppercase tracking-[0.32em] text-zinc-500">
                      © NS — Official Portal
                    </p>
                  </div>
                </section>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  )
}

/* ──────────────────────────────────────────────────────────
 * GlitchTitle
 *
 * 文字を 3 重描画して、上下のレイヤーを微妙に横シフトすることで
 * RGB スプリット風の「グリッチ感」を加える。CSS のみで完結。
 * ────────────────────────────────────────────────────────── */
function GlitchTitle({ text }: { text: string }) {
  return (
    <span
      className="glitch-title relative inline-block text-3xl font-normal tracking-[0.1em] text-[#e8d89a] transition-transform duration-300 ease-out group-hover/nav:-translate-y-0.5 md:text-5xl lg:text-6xl"
      data-text={text}
    >
      <span aria-hidden className="glitch-title-layer glitch-title-layer-r">
        {text}
      </span>
      <span aria-hidden className="glitch-title-layer glitch-title-layer-c">
        {text}
      </span>
      <span className="relative">{text}</span>
    </span>
  )
}

/**
 * GlitchTitle 用のグローバル CSS をモジュール 1 回だけ注入する。
 * styled-jsx 経由ではなく、Turbopack でも安定する素朴な <style> を使用。
 */
const GLITCH_TITLE_CSS = `
.glitch-title { isolation: isolate; }
.glitch-title-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  mix-blend-mode: screen;
  opacity: 0.6;
  will-change: transform, clip-path;
}
.glitch-title-layer-r {
  color: rgba(255, 64, 96, 0.6);
  transform: translate3d(2px, 0, 0);
  animation: nsGlitchR 5s steps(20) infinite;
}
.glitch-title-layer-c {
  color: rgba(64, 224, 255, 0.55);
  transform: translate3d(-2px, 0, 0);
  animation: nsGlitchC 7s steps(20) infinite;
}
@keyframes nsGlitchR {
  0%, 92%, 100% { transform: translate3d(2px, 0, 0); clip-path: inset(0 0 0 0); }
  93% { transform: translate3d(6px, -1px, 0); clip-path: inset(20% 0 60% 0); }
  95% { transform: translate3d(-3px, 1px, 0); clip-path: inset(70% 0 5% 0); }
  97% { transform: translate3d(8px, 0, 0); clip-path: inset(40% 0 30% 0); }
}
@keyframes nsGlitchC {
  0%, 88%, 100% { transform: translate3d(-2px, 0, 0); clip-path: inset(0 0 0 0); }
  89% { transform: translate3d(-6px, 1px, 0); clip-path: inset(15% 0 65% 0); }
  92% { transform: translate3d(4px, -1px, 0); clip-path: inset(55% 0 15% 0); }
  94% { transform: translate3d(-9px, 0, 0); clip-path: inset(35% 0 40% 0); }
}
`

function GlitchTitleStyles() {
  return <style dangerouslySetInnerHTML={{ __html: GLITCH_TITLE_CSS }} />
}

/* ──────────────────────────────────────────────────────────
 * CornerHud
 * パネル四隅の HUD 風コーナーマーカー（細い L 字）
 * ────────────────────────────────────────────────────────── */
function CornerHud({ color = "#c9a227" }: { color?: string }) {
  const corner =
    "absolute h-3.5 w-3.5 border-current pointer-events-none"
  return (
    <div aria-hidden className="absolute inset-0 z-[1]" style={{ color }}>
      <span className={cn(corner, "left-2 top-2 border-l border-t opacity-65")} />
      <span className={cn(corner, "right-2 top-2 border-r border-t opacity-65")} />
      <span className={cn(corner, "bottom-2 left-2 border-b border-l opacity-65")} />
      <span className={cn(corner, "bottom-2 right-2 border-b border-r opacity-65")} />
    </div>
  )
}
