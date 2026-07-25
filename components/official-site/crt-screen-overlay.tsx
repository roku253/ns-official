"use client"

import { usePathname } from "next/navigation"
import { useMemo } from "react"
import { GlitchCanvas } from "@/components/official-site/glitch-canvas"

/* ──────────────────────────────────────────────────────────
 * CRT Screen Overlay
 *
 * ブラウン管テレビを再現する固定オーバーレイ。
 *
 *  ─ aperture grille  : 縦 RGB サブピクセルストライプ
 *  ─ shadow mask      : RGB 点配列（ドットトライアド）
 *  ─ vignette         : 画面端の暗落ち
 *  ─ flicker          : 微かなちらつきアニメーション
 *  ─ chromatic fringe : 画面端のにじみ
 *  ─ GlitchCanvas     : データダスト・RGBスプリット（immersive のみ）
 *
 * 強度: immersive (ホーム) / subtle (他公式) / off (play等)
 * ────────────────────────────────────────────────────────── */

const HIDE_PREFIXES = [
  "/play",
  "/games",
  "/admin",
  "/login",
  "/setup",
  "/register",
  "/account",
  "/test",
  "/dev",
]

type Intensity = "immersive" | "subtle" | "off"

function useIntensity(): Intensity {
  const pathname = usePathname() ?? "/"
  return useMemo(() => {
    if (HIDE_PREFIXES.some((p) => pathname.startsWith(p))) return "off"
    if (pathname.startsWith("/works/")) return "off"
    if (pathname === "/") return "immersive"
    return "subtle"
  }, [pathname])
}

export function CrtScreenOverlay() {
  const intensity = useIntensity()
  if (intensity === "off") return null

  const isImmersive = intensity === "immersive"

  const phosphorOpacity = isImmersive ? 0.08 : 0.03
  const vignetteOpacity = isImmersive ? 0.7 : 0.35
  const flickerIntensity = isImmersive ? "crt-flicker-strong" : "crt-flicker-subtle"

  return (
    <>
      <style>{`
        @keyframes crt-flicker-strong {
          0%   { opacity: 0.975; }
          3%   { opacity: 0.96; }
          6%   { opacity: 0.985; }
          8%   { opacity: 0.955; }
          11%  { opacity: 0.98; }
          15%  { opacity: 0.97; }
          20%  { opacity: 0.975; }
          100% { opacity: 0.975; }
        }
        @keyframes crt-flicker-subtle {
          0%   { opacity: 0.99; }
          5%   { opacity: 0.985; }
          10%  { opacity: 0.992; }
          100% { opacity: 0.99; }
        }
        .crt-flicker-strong { animation: crt-flicker-strong 0.15s infinite; }
        .crt-flicker-subtle { animation: crt-flicker-subtle 4s ease-in-out infinite; }
      `}</style>

      <div
        aria-hidden
        className={`pointer-events-none fixed inset-0 z-[35] ${flickerIntensity}`}
      >
        {/* Aperture grille — 縦 RGB サブピクセルストライプ */}
        <div
          className="absolute inset-0"
          style={{
            opacity: phosphorOpacity,
            backgroundImage: `repeating-linear-gradient(
              90deg,
              rgba(255, 60, 60, 0.45) 0px,
              rgba(60, 255, 60, 0.40) 1px,
              rgba(60, 60, 255, 0.45) 2px,
              transparent 3px
            )`,
            backgroundSize: "3px 100%",
          }}
        />

        {/* Shadow mask — ドットトライアド（ホームのみ） */}
        {isImmersive ? (
          <div
            className="absolute inset-0"
            style={{
              opacity: 0.04,
              backgroundImage: `radial-gradient(
                circle at center,
                rgba(255, 255, 255, 0.5) 0px,
                rgba(255, 255, 255, 0.5) 0.5px,
                transparent 0.5px
              )`,
              backgroundSize: "4px 4px",
            }}
          />
        ) : null}

        {/* Vignette — 画面端の暗落ち */}
        <div
          className="absolute inset-0"
          style={{
            opacity: vignetteOpacity,
            background: `radial-gradient(
              ellipse 85% 80% at 50% 50%,
              transparent 50%,
              rgba(0, 0, 0, 0.5) 80%,
              rgba(0, 0, 0, 0.85) 100%
            )`,
          }}
        />

        {/* Screen edge glow */}
        {isImmersive ? (
          <div
            className="absolute inset-0"
            style={{
              opacity: 0.15,
              boxShadow: `
                inset 0 0 80px 20px rgba(127, 156, 184, 0.05),
                inset 0 0 200px 60px rgba(0, 0, 0, 0.4)
              `,
            }}
          />
        ) : null}

        {/* Chromatic aberration on edges */}
        {isImmersive ? (
          <div
            className="absolute inset-0"
            style={{
              opacity: 0.025,
              background: `
                linear-gradient(90deg,  rgba(255,0,0,0.15) 0%, transparent 3%, transparent 97%, rgba(0,0,255,0.15) 100%),
                linear-gradient(180deg, rgba(255,0,0,0.08) 0%, transparent 2%, transparent 98%, rgba(0,0,255,0.08) 100%)
              `,
            }}
          />
        ) : null}

        {/* GlitchCanvas — データダスト・RGBスプリット（immersive のみ） */}
        {isImmersive ? (
          <GlitchCanvas intensity="ambient" />
        ) : null}
      </div>
    </>
  )
}

/**
 * CRT barrel distortion wrapper.
 * ブラウン管の膨らみを border-radius + 強い box-shadow inset で再現。
 */
export function CrtBarrelWrapper({
  active,
  children,
}: {
  active: boolean
  children: React.ReactNode
}) {
  if (!active) return <>{children}</>

  return (
    <div
      className="crt-barrel-frame relative"
      style={{
        borderRadius: "24px / 18px",
        overflow: "hidden",
        boxShadow: `
          inset 0 0 100px 30px rgba(0, 0, 0, 0.4),
          inset 0 0 40px 10px rgba(0, 0, 0, 0.3),
          0 0 60px 12px rgba(0, 0, 0, 0.5),
          0 0 3px 1px rgba(127, 156, 184, 0.1)
        `,
      }}
    >
      {children}
    </div>
  )
}
