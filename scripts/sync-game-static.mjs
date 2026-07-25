/**
 * games/<slug>/static/ の内容を public/games/<slug>/ にコピーする。
 * Next.js は public/ だけを静的 URL として配信するため、編集の正本は games/ 側に置く。
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const gamesRoot = path.join(root, "games")
const publicGames = path.join(root, "public", "games")

function rmrf(dir) {
  if (!fs.existsSync(dir)) return
  fs.rmSync(dir, { recursive: true, force: true })
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    if (ent.isFile() && ent.name.toLowerCase().endsWith(".md")) continue
    const s = path.join(src, ent.name)
    const d = path.join(dest, ent.name)
    if (ent.isDirectory()) copyDir(s, d)
    else fs.copyFileSync(s, d)
  }
}

if (!fs.existsSync(gamesRoot)) {
  console.warn("sync-game-static: games/ がありません")
  process.exit(0)
}

fs.mkdirSync(publicGames, { recursive: true })

const entries = fs.readdirSync(gamesRoot, { withFileTypes: true })
for (const ent of entries) {
  if (!ent.isDirectory() || ent.name.startsWith(".")) continue
  const slug = ent.name
  const staticDir = path.join(gamesRoot, slug, "static")
  if (!fs.existsSync(staticDir)) continue
  const dest = path.join(publicGames, slug)
  rmrf(dest)
  copyDir(staticDir, dest)
  console.log(`sync-game-static: ${slug} -> public/games/${slug}/`)
}
