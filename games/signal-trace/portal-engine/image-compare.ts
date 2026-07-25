/**
 * ブラウザ上の画像デコード（アーカイブ用サムネイル等）。
 * タスクの正誤判定はサーバー（`image-compare-server.ts` + API）で行う。
 */

type LoadedDrawable = {
  source: CanvasImageSource
  w: number
  h: number
  dispose: () => void
}

function isProbablyHeic(file: File): boolean {
  const t = (file.type || "").toLowerCase()
  if (t === "image/heic" || t === "image/heif") return true
  const n = file.name.toLowerCase()
  return n.endsWith(".heic") || n.endsWith(".heif")
}

async function heicToJpegBlob(file: File): Promise<Blob> {
  const mod = await import("heic2any")
  const heic2any = mod.default as (opts: {
    blob: Blob
    toType: string
    quality?: number
  }) => Promise<Blob | Blob[]>
  const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 })
  return Array.isArray(out) ? out[0] : out
}

async function loadFileAsDrawable(file: File): Promise<LoadedDrawable> {
  const fromBlob = async (blob: Blob): Promise<LoadedDrawable> => {
    const bmp = await createImageBitmap(blob)
    return {
      source: bmp,
      w: bmp.width,
      h: bmp.height,
      dispose: () => bmp.close(),
    }
  }

  try {
    return await fromBlob(file)
  } catch {
    if (isProbablyHeic(file)) {
      try {
        const jpeg = await heicToJpegBlob(file)
        return await fromBlob(jpeg)
      } catch {
        /* fall through to Image + object URL */
      }
    }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.src = url
    try {
      await img.decode()
      return {
        source: img,
        w: img.naturalWidth,
        h: img.naturalHeight,
        dispose: () => URL.revokeObjectURL(url),
      }
    } catch (e) {
      URL.revokeObjectURL(url)
      throw e
    }
  }
}

/** アーカイブ保存用: 提出画像を JPEG の Data URL（長辺 maxEdge）に縮小 */
export async function fileToJpegDataUrlThumbnail(
  file: File,
  options?: { maxEdge?: number; quality?: number }
): Promise<string> {
  const maxEdge = options?.maxEdge ?? 640
  const quality = options?.quality ?? 0.82
  const d = await loadFileAsDrawable(file)
  try {
    const scale = Math.min(maxEdge / d.w, maxEdge / d.h, 1)
    const w = Math.max(1, Math.round(d.w * scale))
    const h = Math.max(1, Math.round(d.h * scale))
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("canvas unsupported")
    ctx.drawImage(d.source, 0, 0, w, h)
    return canvas.toDataURL("image/jpeg", quality)
  } finally {
    d.dispose()
  }
}
