/**
 * _shared/token-gate.js と各作中サイトのコピーが一致するか確認する。
 *
 * 使い方（main-portal-next から）:
 *   node scripts/check-token-gate-sync.mjs
 *   node scripts/check-token-gate-sync.mjs --write   … 正本を各サイトへ上書きコピー
 */
import { createHash } from "node:crypto"
import { copyFileSync, existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_NAZO = resolve(__dirname, "../../..")
const CANONICAL = join(ROOT_NAZO, "_shared", "token-gate.js")

/** 現行ストーリーでゲートを使うサイト（廃止済み name-to-coord は対象外） */
const COPIES = [
  join(ROOT_NAZO, "動画サイト", "yootube", "token-gate.js"),
  join(ROOT_NAZO, "地図サイト", "gougle-map", "token-gate.js"),
  join(ROOT_NAZO, "小学校サイト", "kasuminomori-shougakkou", "token-gate.js"),
  join(ROOT_NAZO, "掲示板", "urban-legend-board", "token-gate.js"),
]

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex")
}

const write = process.argv.includes("--write")

if (!existsSync(CANONICAL)) {
  console.error(`正本が見つかりません: ${CANONICAL}`)
  process.exit(1)
}

const canonHash = sha256(CANONICAL)
let drift = 0
let missing = 0

for (const dest of COPIES) {
  if (!existsSync(dest)) {
    console.error(`MISSING  ${dest}`)
    missing += 1
    if (write) {
      copyFileSync(CANONICAL, dest)
      console.log(`WROTE    ${dest}`)
      missing -= 1
    }
    continue
  }
  const h = sha256(dest)
  if (h === canonHash) {
    console.log(`OK       ${dest}`)
  } else if (write) {
    copyFileSync(CANONICAL, dest)
    console.log(`SYNCED   ${dest}`)
  } else {
    console.error(`DRIFT    ${dest}`)
    drift += 1
  }
}

if (drift || missing) {
  console.error(
    `\n${drift + missing} 件不一致。正本は ${CANONICAL}\n` +
      `同期するには: node scripts/check-token-gate-sync.mjs --write`
  )
  process.exit(1)
}

console.log("\ntoken-gate.js: 全コピーが正本と一致")
