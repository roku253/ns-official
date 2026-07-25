/**
 * NS（大本）モノグラムからタブアイコン・ログイン用ロゴ・ロード背景などを生成する。
 * メイン画面内の「事件調査本部」はゲーム内組織として UI 側で表現する。
 * node scripts/render-hq-icons.mjs
 */
import sharp from "sharp"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pub = path.join(__dirname, "..", "public")

const nPath = "M4 25L4 7h2.5v9.5L13 7h3.5v18H14V15.5L7.5 25H4z"
const zPath = "M17 7h11v3h-6l6 11v4H17v-3h6L17 11V7z"

const DARK_BG = "#0a120a"
const DARK_FG = "#e8e4dc"
const LIGHT_BG = "#f8f6f1"
const LIGHT_FG = "#0a120a"

function svgIcon32(bg, fg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<rect width="32" height="32" rx="7" fill="${bg}"/>
<path fill="${fg}" d="${nPath}"/>
<path fill="${fg}" d="${zPath}"/>
</svg>`
}

function svgIcon180(bg, fg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="180" height="180">
<rect width="32" height="32" rx="7" fill="${bg}"/>
<path fill="${fg}" d="${nPath}"/>
<path fill="${fg}" d="${zPath}"/>
</svg>`
}

async function main() {
  await fs.promises.mkdir(pub, { recursive: true })

  await sharp(Buffer.from(svgIcon32(DARK_BG, DARK_FG)))
    .png()
    .toFile(path.join(pub, "icon-dark-32x32.png"))

  await sharp(Buffer.from(svgIcon32(LIGHT_BG, LIGHT_FG)))
    .png()
    .toFile(path.join(pub, "icon-light-32x32.png"))

  await sharp(Buffer.from(svgIcon180(DARK_BG, DARK_FG)))
    .resize(180, 180)
    .png()
    .toFile(path.join(pub, "apple-icon.png"))

  const logoWide = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 96" width="320" height="96">
<g transform="translate(18,18) scale(2)">
<path fill="#e8e4dc" d="${nPath}"/>
<path fill="#e8e4dc" d="${zPath}"/>
</g>
<text x="112" y="56" font-family="Segoe UI,system-ui,sans-serif" font-size="22" font-weight="700" fill="#e8e4dc" letter-spacing="0.14em">NS</text>
<text x="112" y="76" font-family="Segoe UI,system-ui,sans-serif" font-size="10" fill="#c4a574" opacity="0.9" letter-spacing="0.22em">OFFICIAL PORTAL</text>
</svg>`
  await sharp(Buffer.from(logoWide)).png().toFile(path.join(pub, "placeholder-logo.png"))

  const userAv = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
<defs>
<linearGradient id="avbg" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#0d1c14"/>
<stop offset="1" stop-color="#040907"/>
</linearGradient>
<radialGradient id="glow" cx="50%" cy="42%" r="58%">
<stop offset="0" stop-color="#c4a574" stop-opacity="0.24"/>
<stop offset="1" stop-color="#c4a574" stop-opacity="0"/>
</radialGradient>
</defs>
<rect width="256" height="256" fill="url(#avbg)"/>
<circle cx="128" cy="128" r="88" fill="url(#glow)"/>
<circle cx="128" cy="128" r="70" fill="none" stroke="#c4a574" stroke-opacity="0.75" stroke-width="2"/>
<circle cx="128" cy="128" r="52" fill="#0b1711" stroke="#c4a574" stroke-opacity="0.28" stroke-width="1.5"/>
<g transform="translate(96,96) scale(2)">
<path fill="#d2b585" d="${nPath}"/>
<path fill="#d2b585" d="${zPath}"/>
</g>
</svg>`
  await sharp(Buffer.from(userAv)).jpeg({ quality: 88 }).toFile(path.join(pub, "placeholder-user.jpg"))

  const ph = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
<defs>
<linearGradient id="hqbg" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#0f1a12"/>
<stop offset="1" stop-color="#050806"/>
</linearGradient>
</defs>
<rect width="800" height="450" fill="url(#hqbg)"/>
<rect x="36" y="36" width="728" height="378" rx="14" fill="none" stroke="#c4a574" stroke-opacity="0.38" stroke-width="2"/>
<g transform="translate(336,161) scale(4)" fill="#c4a574" opacity="0.92">
<path d="${nPath}"/>
<path d="${zPath}"/>
</g>
<text x="400" y="318" text-anchor="middle" font-family="Segoe UI,system-ui,sans-serif" font-size="13" fill="#7a756c" letter-spacing="0.22em">NS 公式ポータル</text>
<text x="400" y="338" text-anchor="middle" font-family="Segoe UI,system-ui,sans-serif" font-size="9" fill="#5c574e" letter-spacing="0.32em">OFFICIAL MEMBER ACCESS</text>
</svg>`
  const phBuf = Buffer.from(ph)
  await sharp(phBuf)
    .resize(1920, 1080, { fit: "cover" })
    .jpeg({ quality: 86 })
    .toFile(path.join(pub, "placeholder.jpg"))
  await sharp(phBuf)
    .resize(1920, 1080, { fit: "cover" })
    .webp({ quality: 84 })
    .toFile(path.join(pub, "placeholder.webp"))

  const archivePh = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
<defs>
<linearGradient id="abg" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#0c100d"/>
<stop offset="1" stop-color="#020403"/>
</linearGradient>
</defs>
<rect width="800" height="450" fill="url(#abg)"/>
<path d="M120 118h280v214H120z" fill="none" stroke="#c4a574" stroke-opacity="0.22" stroke-width="1.5" stroke-dasharray="6 5"/>
<path d="M148 96h224l28 28v232H148z" fill="#0a0e0b" stroke="#8b7355" stroke-opacity="0.35" stroke-width="1.2"/>
<path d="M372 96v28h28" fill="none" stroke="#8b7355" stroke-opacity="0.45" stroke-width="1.2"/>
<line x1="168" y1="156" x2="352" y2="156" stroke="#3d4a3e" stroke-width="1" stroke-opacity="0.5"/>
<line x1="168" y1="176" x2="320" y2="176" stroke="#3d4a3e" stroke-width="1" stroke-opacity="0.35"/>
<line x1="168" y1="196" x2="300" y2="196" stroke="#3d4a3e" stroke-width="1" stroke-opacity="0.25"/>
<circle cx="400" cy="248" r="42" fill="none" stroke="#c4a574" stroke-opacity="0.18" stroke-width="1.5"/>
<path d="M424 272l36 36" stroke="#c4a574" stroke-opacity="0.2" stroke-width="2" stroke-linecap="round"/>
<text x="400" y="332" text-anchor="middle" font-family="Segoe UI,system-ui,sans-serif" font-size="11" fill="#6b655a" letter-spacing="0.18em">資料画像 · 未設定</text>
<text x="400" y="352" text-anchor="middle" font-family="Segoe UI,system-ui,sans-serif" font-size="8" fill="#4a453d" letter-spacing="0.28em">CASE FILE PREVIEW</text>
<path d="M520 130 L680 130 L680 320 L520 320 Z" fill="none" stroke="#c4a574" stroke-opacity="0.12" stroke-width="1"/>
<path d="M532 142h136v160H532z" fill="#080b09" stroke="#5c574e" stroke-opacity="0.25" stroke-width="0.8"/>
<text x="600" y="232" text-anchor="middle" font-family="Segoe UI,system-ui,sans-serif" font-size="9" fill="#4d4840" letter-spacing="0.15em">EXHIBIT</text>
</svg>`
  const archiveBuf = Buffer.from(archivePh)
  await sharp(archiveBuf)
    .resize(960, 540, { fit: "cover" })
    .webp({ quality: 82 })
    .toFile(path.join(pub, "archive-placeholder.webp"))

  console.log("Wrote HQ icons to public/")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
