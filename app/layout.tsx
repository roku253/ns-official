import type { Metadata, Viewport } from 'next'
import {
  DotGothic16,
  EB_Garamond,
  Geist,
  Geist_Mono,
  Hachi_Maru_Pop,
  Klee_One,
  Noto_Sans_JP,
  Shippori_Mincho_B1,
  Yomogi,
} from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { CrtScreenOverlay } from '@/components/official-site/crt-screen-overlay'
import './globals.css'

const geistSans = Geist({ 
  subsets: ["latin"],
  variable: '--font-geist-sans'
})

const geistMono = Geist_Mono({ 
  subsets: ["latin"],
  variable: '--font-geist-mono'
})

/** 公式ポータル英字見出し用（全体 html はライトのまま、ポータル枠で指定） */
const officialDisplayJa = Shippori_Mincho_B1({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-official-display",
})

const officialSerifLatin = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-official-serif-latin",
})

const officialSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-official-sans-jp",
})

const dotGothic16 = DotGothic16({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-dot-gothic",
})

/** Vault 手記 UI など（手書き系） */
const vaultKleeOne = Klee_One({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-klee-one",
})

const vaultYomogi = Yomogi({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-yomogi",
})

const vaultHachiPop = Hachi_Maru_Pop({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-hachi-maru-pop",
})

export const metadata: Metadata = {
  title: 'NS | 公式ポータル',
  description: '謎解き体験の会員向け公式ポータル（NS）です。',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#f4f1ea',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className="min-h-screen">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${officialDisplayJa.variable} ${officialSerifLatin.variable} ${officialSansJp.variable} ${dotGothic16.variable} ${vaultKleeOne.variable} ${vaultYomogi.variable} ${vaultHachiPop.variable} antialiased min-h-screen`}
      >
        {children}
        {/**
         * CRT ブラウン管テレビ風オーバーレイ。
         * ホーム: immersive（フルCRT） / 他公式ページ: subtle / play 等: off
         */}
        <CrtScreenOverlay />
        <Analytics />
      </body>
    </html>
  )
}
