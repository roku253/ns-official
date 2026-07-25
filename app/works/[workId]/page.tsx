"use client"

import { Suspense, use, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Clock, Tag } from "lucide-react"
import { OfficialLoadingScreen } from "@/components/official-site/official-loading-screen"
import { OfficialSiteHeader } from "@/components/official-site/official-site-header"
import { OfficialSitePortalFooter } from "@/components/official-site/official-site-portal-footer"
import { WorkScreenshotsCarousel } from "@/components/official-site/work-screenshots-carousel"
import { PlayThisWorkButton } from "@/components/official-site/play-this-work-button"
import { useOfficialBootstrap } from "@/lib/official/use-official-bootstrap"
import storiesJson from "@/data/official/stories.json"
import {
  caseMarkCodeForWorkId,
  engineStoriesForWorkDetail,
  findMergedWorkByIdOrStatic,
  formatEstimatedPlay,
  type MergedWorkItem,
  type WorkStoryRecord,
} from "@/lib/official/works-catalog"
import { labelForGameKind } from "@/lib/official/game-kinds"
import { cn } from "@/lib/utils"

function NotFoundView() {
  return (
    <>
      <main className="flex-1 font-official-sans-jp">
        <div className="mx-auto max-w-2xl px-4 py-24 text-center md:px-6">
          <p className="font-official-serif-latin text-[10px] uppercase tracking-[0.4em] text-[#7f9cb8]/85">
            Not in archive
          </p>
          <h1 className="mt-4 font-official-display text-2xl tracking-[0.15em] text-[#e8d89a] md:text-3xl">
            作品が見つかりません
          </h1>
          <p className="mt-6 text-sm leading-[2] text-zinc-500">
            指定された作品はアーカイブに登録されていません。一覧から再度お選びください。
          </p>
          <p className="mt-10">
            <Link
              href="/works"
              className="font-official-serif-latin text-[11px] uppercase tracking-[0.25em] text-[#7f9cb8] transition-colors hover:text-[#c9a227] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c9a227]/50"
            >
              ← Works index
            </Link>
          </p>
        </div>
      </main>
      <OfficialSitePortalFooter className="bg-[#050607]" />
    </>
  )
}

/**
 * 作品詳細ページ。仕様（ユーザー要件）：
 *   1. 一番上に作品カバー画像を画面の横幅いっぱいに表示
 *   2. その下にタイトル
 *   3. その下に簡潔な作品説明
 *   4. その下にプレイボタン
 *   5. 間にデジタル文字アニメーションは挟まない
 *   6. 「Play view」見出し + 下線 + 3 枚程度のスクリーンショットを
 *      スワイプ／ドット両脇の半透明矢印で操作できるカルーセル
   *   7. Stories 欄：同一 engine のストーリーのうち、公式サイトの公開条件を満たすものを 3 列グリッドで掲示。
   *      各カードに「詳細」「このストーリーを始める」の 2 ボタン。
 */
function WorkDetailMain({
  work,
  stories,
  mergedWorks,
  sessionOk,
}: {
  work: MergedWorkItem
  stories: MergedWorkItem[]
  mergedWorks: MergedWorkItem[]
  sessionOk: boolean
}) {
  const caseMark = caseMarkCodeForWorkId(mergedWorks, work.id)
  const playLabel = formatEstimatedPlay(work.detail)

  const genres = useMemo(() => {
    const g: string[] = []
    if (work.gameKind) g.push(labelForGameKind(work.gameKind))
    if (work.detail?.genres) {
      g.push(...work.detail.genres.filter((s) => s && s.length > 0))
    }
    return Array.from(new Set(g))
  }, [work.gameKind, work.detail?.genres])

  /** 表示するスクリーンショット候補。manifest detail を最優先にしつつ、
   *  3 枚未満ならプール内をサイクルしてパディング。
   *  仮のデモ運用で「1 枚しか manifest に無い → 1 枚しか出ない」を回避。 */
  const screenshots = useMemo(() => {
    const supplied = work.detail?.screenshots ?? []
    const pool: { src: string; alt?: string }[] =
      supplied.length > 0
        ? supplied
        : work.coverImage
          ? [{ src: work.coverImage, alt: work.displayTitle }]
          : []
    if (pool.length === 0) return []
    if (pool.length >= 3) return pool
    const padded = [...pool]
    let idx = 0
    while (padded.length < 3) {
      padded.push(pool[idx % pool.length])
      idx++
    }
    return padded
  }, [work.detail?.screenshots, work.coverImage, work.displayTitle])

  const longBlocks = work.detail?.longDescription ?? []

  const playButtonClass =
    "inline-flex items-center gap-2 rounded-sm border border-[#c9a227]/55 bg-[#c9a227]/12 px-8 py-3.5 text-xs font-medium uppercase tracking-[0.22em] text-[#f5ecd4] shadow-none transition-colors hover:bg-[#c9a227]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a227]/55"

  /** Stories カード下部 2 列グリッド用：詳細（枠線のみ） */
  const storyDetailButtonClass =
    "inline-flex w-full items-center justify-center rounded-sm border border-[#7f9cb8]/45 bg-transparent px-3 py-2.5 text-[11px] font-medium tracking-wide text-[#b8c9d9] transition-colors hover:border-[#c9a227]/45 hover:bg-[#0a0c10]/80 hover:text-[#e8d89a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a227]/55"

  /** Stories カード内「このストーリーを始める」 */
  const storyStartButtonClass =
    "inline-flex w-full items-center justify-center gap-2 rounded-sm border border-[#c9a227]/45 bg-[#c9a227]/10 px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-[#f5ecd4] transition-colors hover:bg-[#c9a227]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a227]/55"

  return (
    <>
    <main className="flex-1 font-official-sans-jp">
      {/**
       * HERO
       * カバーは画面横幅いっぱい（max-width 制限なし）。
       * 直下にタイトル → サブタイトル(任意) → 簡潔な説明 → プレイボタン
       * の中央寄せ縦積み。デジタルカーテンは一切挟まない。
       */}
      <section className="relative w-full bg-[#050607] text-zinc-200">
        <div className="relative w-full overflow-hidden bg-[#070809]">
          <div className="relative w-full" style={{ aspectRatio: "21 / 9" }}>
            {work.coverImage ? (
              <Image
                src={work.coverImage}
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />
            ) : (
              <div
                className={cn(
                  "h-full w-full bg-gradient-to-br",
                  work.accent || "from-slate-900 to-black"
                )}
              />
            )}
            {/** 下端の地色フェード：タイトル領域へ自然につなぐ */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#050607] via-[#050607]/65 to-transparent" />
            {/** 走査線テクスチャ */}
            <div
              className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.05)_3px)] opacity-50"
              aria-hidden
            />
          </div>
        </div>

        <div className="relative mx-auto max-w-3xl px-4 pb-14 pt-10 text-center md:px-6 md:pb-20 md:pt-14">
          <p className="font-official-serif-latin text-[10px] uppercase tracking-[0.45em] text-[#7f9cb8]/85 md:text-[11px]">
            {caseMark}
          </p>
          <h1 className="mt-4 font-official-display text-3xl leading-tight tracking-[0.05em] text-[#e8d89a] md:text-5xl">
            {work.displayTitle}
          </h1>
          {work.displaySubtitle ? (
            <p className="mt-4 text-sm text-[#7f9cb8]/90 md:text-base">
              {work.displaySubtitle}
            </p>
          ) : null}
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-[2] text-zinc-400 md:mt-7 md:text-base md:leading-[2.05]">
            {work.displayTagline}
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3 md:mt-11">
            <PlayThisWorkButton
              workId={work.id}
              sessionOk={sessionOk}
              className={playButtonClass}
              externalUrl={work.externalUrl}
              tokenResource={work.tokenResource}
            />
          </div>

          {/**
           * 推定プレイ時間 + ジャンルの薄いメタ情報行。
           * デジタル幕は使わず、罫線で軽く区切るだけのフラットな情報帯。
           */}
          {(playLabel || genres.length > 0) ? (
            <dl className="mx-auto mt-10 flex w-full max-w-2xl flex-col items-stretch gap-0 divide-y divide-[#c9a227]/15 border-y border-[#c9a227]/15 py-2 text-sm md:mt-12 md:flex-row md:items-center md:divide-x md:divide-y-0 md:py-0">
              {playLabel ? (
                <div className="flex items-center justify-center gap-3 px-3 py-3 md:flex-1 md:py-4">
                  <Clock className="h-3.5 w-3.5 text-[#7f9cb8]/70" aria-hidden />
                  <dt className="font-official-serif-latin text-[10px] uppercase tracking-[0.32em] text-[#7f9cb8]/80">
                    Play time
                  </dt>
                  <dd className="font-mono text-sm tracking-wide text-[#e8d89a] tabular-nums">
                    {playLabel}
                  </dd>
                </div>
              ) : null}

              {genres.length > 0 ? (
                <div className="flex flex-wrap items-center justify-center gap-3 px-3 py-3 md:flex-[1.4] md:py-4">
                  <Tag className="h-3.5 w-3.5 text-[#7f9cb8]/70" aria-hidden />
                  <dt className="font-official-serif-latin text-[10px] uppercase tracking-[0.32em] text-[#7f9cb8]/80">
                    Genre
                  </dt>
                  <dd className="flex flex-wrap items-center justify-center gap-1.5">
                    {genres.map((g) => (
                      <span
                        key={g}
                        className="inline-flex items-center border border-[#c9a227]/25 bg-[#0a0c10]/65 px-2 py-1 text-[11px] tracking-wide text-zinc-300"
                      >
                        {g}
                      </span>
                    ))}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
      </section>

      {/**
       * PLAY VIEW
       * 「Play view」だけを見出しに、その下に下線（`border-b`）。
       * その下にカルーセル（3 枚仮配置・スワイプ・ドット両脇に半透明矢印）。
       */}
      {screenshots.length > 0 ? (
        <section className="border-t border-[#c9a227]/15 bg-[#0a0c10] py-14 md:py-20">
          <div className="mx-auto max-w-3xl px-4 md:px-6">
            <div className="border-b border-[#c9a227]/35 pb-3">
              <h2 className="font-official-display text-xl tracking-[0.22em] text-[#e8d89a] md:text-2xl">
                Play view
              </h2>
            </div>
          </div>

          {/**
           * カルーセルだけ見出しよりも広く（画面端まで）配置する。
           * 端から数 % だけ隣の画像が覗く設計のため、ここでは max-w を取らずに
           * ビューポート幅をそのまま使う。
           */}
          <div className="mt-10 w-full">
            <WorkScreenshotsCarousel shots={screenshots} />
          </div>
        </section>
      ) : null}

      {/**
       * SYNOPSIS
       * 作品の長め説明（manifest.detail.longDescription）。
       * 段落配列を縦に流す。デジタル幕などの装飾は挟まずシンプルに区切る。
       */}
      {longBlocks.length > 0 ? (
        <section className="border-t border-[#c9a227]/15 bg-[#080a0e] py-14 md:py-20">
          <div className="mx-auto max-w-3xl px-4 md:px-6">
            <div className="border-b border-[#c9a227]/35 pb-3">
              <h2 className="font-official-display text-xl tracking-[0.22em] text-[#e8d89a] md:text-2xl">
                Synopsis
              </h2>
            </div>

            <div className="mt-8 space-y-6 text-sm leading-[2.05] text-zinc-400 md:mt-10 md:space-y-7 md:text-base md:leading-[2.1]">
              {longBlocks.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/**
       * STORIES
       * この作品（engine）に属する各ストーリーを 3 列グリッド × 必要数行で掲示する。
       *  - 複数ある場合：3xN で詰める
       *  - 1 件しかない場合：3 列グリッドの一番左セルだけが埋まる（残り 2 セルは空）
       *  - 各カード：カバー画像 + 簡潔な説明 + 「詳細」「始める」の 2 ボタン
       *  - 現在閲覧中のストーリーはバッジ表示。始めるは「もう一度開く」表記。
       */}
      {stories.length > 0 ? (
        <section className="border-t border-[#c9a227]/15 bg-[#080a0e] py-14 md:py-20">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <div className="border-b border-[#c9a227]/35 pb-3">
              <h2 className="font-official-display text-xl tracking-[0.22em] text-[#e8d89a] md:text-2xl">
                Stories
              </h2>
              <p className="mt-2 font-official-serif-latin text-[10px] uppercase tracking-[0.28em] text-[#7f9cb8]/85">
                {stories.length} {stories.length === 1 ? "Story" : "Stories"} in this work
              </p>
            </div>

            <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 md:gap-7">
              {stories.map((s) => {
                const isCurrent = s.id === work.id
                /** 短い説明はカタログの tagline を優先。なければ subtitle にフォールバック */
                const briefDesc = s.displayTagline || s.displaySubtitle || ""
                return (
                  <li key={s.id}>
                    <article
                      className={cn(
                        "group flex h-full flex-col overflow-hidden border bg-[#080a0e] transition-colors",
                        isCurrent
                          ? "border-[#c9a227]/55 ring-1 ring-[#c9a227]/25"
                          : "border-[#c9a227]/25 hover:border-[#c9a227]/55"
                      )}
                      aria-current={isCurrent ? "page" : undefined}
                    >
                      <div className="relative w-full overflow-hidden">
                        <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
                          {s.coverImage ? (
                            <Image
                              src={s.coverImage}
                              alt=""
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                            />
                          ) : (
                            <div
                              className={cn(
                                "h-full w-full bg-gradient-to-br",
                                s.accent || "from-slate-900 to-black"
                              )}
                            />
                          )}
                          <div
                            className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.05)_3px)] opacity-40"
                            aria-hidden
                          />
                          {isCurrent ? (
                            <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center border border-[#c9a227]/55 bg-[#0a0c10]/85 px-2 py-1 font-official-serif-latin text-[9px] uppercase tracking-[0.28em] text-[#e8d89a]">
                              現在のストーリー
                            </span>
                          ) : null}
                          {s.status === "preview" && !isCurrent ? (
                            <span className="pointer-events-none absolute right-3 top-3 inline-flex items-center border border-[#7f9cb8]/45 bg-[#0a0c10]/80 px-2 py-1 font-official-serif-latin text-[9px] uppercase tracking-[0.28em] text-[#7f9cb8]">
                              Preview
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col gap-4 p-4 md:p-5">
                        <h3 className="font-official-display text-base leading-tight tracking-wide text-zinc-100 md:text-lg">
                          <Link
                            href={`/works/${encodeURIComponent(s.id)}`}
                            className="transition-colors hover:text-[#e8d89a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a227]/50"
                          >
                            {s.displayTitle}
                          </Link>
                        </h3>

                        {briefDesc ? (
                          <p className="text-[12.5px] leading-[1.85] text-zinc-400 line-clamp-3">
                            {briefDesc}
                          </p>
                        ) : null}

                        <div className="mt-auto grid grid-cols-2 gap-2">
                          <Link
                            href={`/works/${encodeURIComponent(s.id)}`}
                            className={storyDetailButtonClass}
                          >
                            詳細
                          </Link>
                          <PlayThisWorkButton
                            workId={s.id}
                            sessionOk={sessionOk}
                            className={storyStartButtonClass}
                            externalUrl={s.externalUrl}
                            tokenResource={s.tokenResource}
                          >
                            {isCurrent ? "もう一度開く" : "始める"}
                          </PlayThisWorkButton>
                        </div>
                      </div>
                    </article>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      ) : null}

    </main>
      <OfficialSitePortalFooter className="bg-[#050607]" />
    </>
  )
}

export default function WorkDetailPage({
  params,
}: {
  params: Promise<{ workId: string }>
}) {
  const { workId: rawId } = use(params)
  const workId = decodeURIComponent(rawId || "")

  const { ready, loadingProgress, sessionOk, mergedWorks, gasCatalog } = useOfficialBootstrap()

  if (!ready) {
    return <OfficialLoadingScreen progress={loadingProgress} />
  }

  const staticStories = storiesJson as unknown as WorkStoryRecord[]
  const work = findMergedWorkByIdOrStatic(mergedWorks, staticStories, gasCatalog, workId)
  const stories = engineStoriesForWorkDetail(mergedWorks, staticStories, gasCatalog, work)

  return (
    <div className="official-portal-surface flex min-h-screen flex-col bg-[#0a0c10] text-zinc-200 antialiased">
      <OfficialSiteHeader
        sessionOk={sessionOk}
        mergedWorks={mergedWorks}
        leading={
          <div className="flex min-w-0 shrink items-center gap-2 font-official-sans-jp">
            <Link
              href="/works"
              className="inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-[#c9a227] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a227]/50"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              一覧へ
            </Link>
            <span className="text-zinc-700">|</span>
            <span className="text-sm font-medium text-zinc-300">作品詳細</span>
          </div>
        }
      />

      <Suspense
        fallback={
          <main className="mx-auto max-w-5xl px-4 py-16 text-sm text-zinc-500 md:px-6">
            作品情報を読み込み中…
          </main>
        }
      >
        {work ? (
          <WorkDetailMain
            work={work}
            stories={stories}
            mergedWorks={mergedWorks}
            sessionOk={sessionOk}
          />
        ) : (
          <NotFoundView />
        )}
      </Suspense>
    </div>
  )
}
