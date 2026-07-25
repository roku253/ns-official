/**
 * 5×2 グリッドの AI スプライトシート → 横8コマ (2240×360) に並べ替え
 */
import path from "path"
import { fileURLToPath } from "url"
import sharp from "sharp"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")

const srcPath =
  process.argv[2] ??
  "C:/Users/roku5/.cursor/projects/d/assets/c__Users_roku5_AppData_Roaming_Cursor_User_workspaceStorage_df2fd4844f8a9201897c7ef15be6b4e3_images_Sprite_sheet_of_a_chibi_202605161944_transparent-7b4e2b8d-ee38-4973-a9e0-b0006e40fa6d.png"
const outPath = path.join(root, "games/signal-trace/static/kn-haruto-sprite.png")

const COLS = 5
const ROWS = 2
const OUT_W = 280
const OUT_H = 360
const OUT_COUNT = 9

/** [row, col] 0-based */
const FRAME_MAP = [
  [0, 0],
  [0, 1],
  [0, 2],
  [1, 0], // 直立→お辞儀へ
  [1, 1], // 浅いお辞儀
  [1, 1],
  [1, 2], // 深いお辞儀
  [1, 2], // hold
  [1, 3], // 消滅
]

const meta = await sharp(srcPath).metadata()
const sheetW = meta.width
const sheetH = meta.height
const cellW = sheetW / COLS
const cellH = sheetH / ROWS

function cropCell(row, col) {
  const left = Math.round(col * cellW)
  const top = Math.round(row * cellH)
  const width = Math.round((col + 1) * cellW) - left
  const height = Math.round((row + 1) * cellH) - top
  return sharp(srcPath).extract({ left, top, width, height }).resize(OUT_W, OUT_H, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 1 },
  })
}

const frames = await Promise.all(
  FRAME_MAP.map(([row, col]) => cropCell(row, col).png().toBuffer())
)

const composites = frames.map((input, i) => ({
  input,
  left: i * OUT_W,
  top: 0,
}))

await sharp({
  create: {
    width: OUT_W * OUT_COUNT,
    height: OUT_H,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 1 },
  },
})
  .composite(composites)
  .png()
  .toFile(outPath)

console.log("wrote", outPath, `${OUT_W * OUT_COUNT}x${OUT_H} from ${sheetW}x${sheetH}`)
