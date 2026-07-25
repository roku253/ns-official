/**
 * reference-mb03.svg を PNG に書き出す（照合参照は task-secrets で PNG を指す）。
 * SVG を編集したら: node scripts/rasterize-reference-mb03.mjs
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import sharp from "sharp"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const svgPath = path.join(root, "games/signal-trace/assets/koko-ni-iru/reference-mb03.svg")
const pngPath = path.join(root, "games/signal-trace/assets/koko-ni-iru/reference-mb03.png")

await sharp(fs.readFileSync(svgPath), { density: 192, failOn: "none" })
  .png()
  .toFile(pngPath)

console.log("wrote", path.relative(root, pngPath))
