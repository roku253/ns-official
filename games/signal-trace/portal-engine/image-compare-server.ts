import sharp from "sharp"
import fs from "fs/promises"

export interface ServerImageCompareOptions {
  maxCompareSize?: number
  maxMeanAbsoluteError?: number
}

export interface ServerImageCompareResult {
  ok: boolean
  meanError: number
  error?: string
}

function meanAbsoluteErrorRgb(a: Buffer, b: Buffer): number {
  if (a.length !== b.length) return Number.POSITIVE_INFINITY
  const n = a.length
  let sum = 0
  for (let i = 0; i < n; i += 4) {
    sum += Math.abs(a[i]! - b[i]!)
    sum += Math.abs(a[i + 1]! - b[i + 1]!)
    sum += Math.abs(a[i + 2]! - b[i + 2]!)
  }
  return sum / (n * 0.75)
}

function bufferLooksLikeSvg(buf: Buffer): boolean {
  const head = buf.subarray(0, Math.min(400, buf.length)).toString("utf8")
  return /<svg[\s>/]/i.test(head)
}

async function toSquareRgba(buf: Buffer, size: number): Promise<Buffer> {
  const svg = bufferLooksLikeSvg(buf)
  const pipeline = svg
    ? sharp(buf, { density: 192, failOn: "none" })
    : sharp(buf, { failOn: "none" })
  const { data, info } = await pipeline
    .resize(size, size, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  if (info.channels !== 4) throw new Error("expected rgba")
  return data
}

function decodeErrorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (/input|unsupported|format|corrupt|invalid/i.test(msg)) {
    return "画像を読み込めませんでした。JPEG・PNG・WebP、SVG など一般的な形式を試してください。"
  }
  return msg || "画像の読み込みに失敗しました。"
}

/**
 * アップロードバッファと参照ファイル（絶対パス）をブラウザ版と同様に縮小・平均誤差で比較する。
 */
export async function compareImageBufferToReferenceFiles(
  uploadBuffer: Buffer,
  referenceAbsolutePaths: string[],
  options?: ServerImageCompareOptions
): Promise<ServerImageCompareResult> {
  const size = options?.maxCompareSize ?? 96
  const maxErr = options?.maxMeanAbsoluteError ?? 48

  if (referenceAbsolutePaths.length === 0) {
    return {
      ok: false,
      meanError: Number.POSITIVE_INFINITY,
      error: "参照画像が設定されていません。",
    }
  }

  let userData: Buffer
  try {
    userData = await toSquareRgba(uploadBuffer, size)
  } catch (e) {
    return {
      ok: false,
      meanError: Number.POSITIVE_INFINITY,
      error: decodeErrorMessage(e),
    }
  }

  let bestError = Number.POSITIVE_INFINITY
  let lastRefIssue: string | undefined

  for (const absPath of referenceAbsolutePaths) {
    try {
      const refBuf = await fs.readFile(absPath)
      const refData = await toSquareRgba(refBuf, size)
      const meanError = meanAbsoluteErrorRgb(userData, refData)
      if (meanError < bestError) bestError = meanError
      if (meanError <= maxErr) {
        return { ok: true, meanError }
      }
    } catch (e) {
      lastRefIssue = decodeErrorMessage(e)
    }
  }

  return {
    ok: false,
    meanError: bestError,
    error: lastRefIssue,
  }
}
