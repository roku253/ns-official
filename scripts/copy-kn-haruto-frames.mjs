/**
 * D:\謎解き\ezgif-split の連番 PNG を games/signal-trace/static/kn-haruto-frames/ へコピー
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const srcDir = process.argv[2] ?? "D:/謎解き/ezgif-split"
const destDir = path.join(root, "games/signal-trace/static/kn-haruto-frames")

if (!fs.existsSync(srcDir)) {
  console.error("copy-kn-haruto-frames: source not found", srcDir)
  process.exit(1)
}

fs.mkdirSync(destDir, { recursive: true })

let count = 0
for (let i = 0; i < 99; i++) {
  const tile = path.join(srcDir, `tile${String(i).padStart(3, "0")}.png`)
  if (!fs.existsSync(tile)) break
  const out = path.join(destDir, `frame-${String(i).padStart(2, "0")}.png`)
  fs.copyFileSync(tile, out)
  count++
}

console.log("copied", count, "frames ->", path.relative(root, destDir))
