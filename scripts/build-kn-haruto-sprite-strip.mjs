/**
 * kn-haruto-silhouette.png から仮8フレーム横長スプライトを生成する。
 * 本番アート差し替え時は static/kn-haruto-sprite.png を直接置き換えてよい。
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import sharp from "sharp"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const srcPath = path.join(root, "games/signal-trace/static/kn-haruto-silhouette.png")
const outPath = path.join(root, "games/signal-trace/static/kn-haruto-sprite.png")

const FRAME_COUNT = 8
const FRAME_W = 280
const FRAME_H = 360

if (!fs.existsSync(srcPath)) {
  console.warn("build-kn-haruto-sprite-strip: skip (no silhouette)", srcPath)
  process.exit(0)
}

if (fs.existsSync(outPath)) {
  const outMtime = fs.statSync(outPath).mtimeMs
  const srcMtime = fs.statSync(srcPath).mtimeMs
  if (outMtime >= srcMtime) {
    console.warn("build-kn-haruto-sprite-strip: skip (sprite newer than silhouette)")
    process.exit(0)
  }
}

const base = sharp(srcPath).resize(FRAME_W, FRAME_H, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
const { data, info } = await base.ensureAlpha().raw().toBuffer({ resolveWithObject: true })

function frameTransform(index) {
  let offsetY = 0
  let scale = 1
  let opacity = 1
  let rotateDeg = 0
  if (index <= 2) {
    scale = 0.88 + index * 0.06
    opacity = 0.45 + index * 0.25
    offsetY = 8 - index * 3
  } else if (index <= 6) {
    const bowT = (index - 3) / 3
    offsetY = Math.round(8 + bowT * 52)
    scale = 1 - bowT * 0.12
    rotateDeg = bowT * 14
    opacity = 0.92 + bowT * 0.08
  } else {
    offsetY = 62
    scale = 0.86
    rotateDeg = 16
    opacity = 1
  }
  return { offsetY, scale, opacity, rotateDeg }
}

const composites = []
for (let i = 0; i < FRAME_COUNT; i++) {
  const { offsetY, scale, opacity, rotateDeg } = frameTransform(i)
  let pipe = sharp(data, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .resize(Math.round(info.width * scale), Math.round(info.height * scale), {
      fit: "inside",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .modulate({ brightness: opacity })

  if (rotateDeg > 0.5) {
    pipe = pipe.rotate(rotateDeg, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
  }

  const frameBuf = await pipe
    .resize(FRAME_W, FRAME_H, { fit: "inside", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
  const meta = await sharp(frameBuf).metadata()
  const fw = meta.width || FRAME_W
  const fh = meta.height || FRAME_H
  const left = Math.max(0, Math.round((FRAME_W - fw) / 2))
  const top = Math.max(0, Math.min(FRAME_H - fh, offsetY))
  composites.push({
    input: frameBuf,
    left: i * FRAME_W + left,
    top,
  })
}

await sharp({
  create: {
    width: FRAME_W * FRAME_COUNT,
    height: FRAME_H,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(composites)
  .png()
  .toFile(outPath)

console.log("wrote", path.relative(root, outPath), `(${FRAME_COUNT} frames)`)
