import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import sharp from "sharp"
import { verifyAdminSession } from "@/lib/admin-auth"

export const runtime = "nodejs"

const MAX_INPUT_BYTES = 12 * 1024 * 1024
const MAX_EDGE = 1600

function slugPart(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
}

export async function POST(req: NextRequest) {
  if (!verifyAdminSession(req)) {
    return NextResponse.json({ success: false, message: "認証が必要です。" }, { status: 401 })
  }

  const token = (process.env.BLOB_READ_WRITE_TOKEN || "").trim()
  if (!token) {
    return NextResponse.json(
      {
        success: false,
        message:
          "BLOB_READ_WRITE_TOKEN が未設定です。Vercel の Storage → Blob を有効化し、トークンを環境変数に追加してください。",
      },
      { status: 503 }
    )
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ success: false, message: "multipart の解析に失敗しました。" }, { status: 400 })
  }

  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, message: "file がありません。" }, { status: 400 })
  }
  if (file.size <= 0 || file.size > MAX_INPUT_BYTES) {
    return NextResponse.json(
      { success: false, message: `画像は ${Math.floor(MAX_INPUT_BYTES / (1024 * 1024))}MB 以下にしてください。` },
      { status: 400 }
    )
  }

  const kind = String(form.get("kind") || "image").trim() || "image"
  const workId = slugPart(String(form.get("workId") || "work")) || "work"
  const buf = Buffer.from(await file.arrayBuffer())

  let webp: Buffer
  try {
    webp = await sharp(buf, { failOn: "none" })
      .rotate()
      .resize({
        width: MAX_EDGE,
        height: MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer()
  } catch {
    return NextResponse.json(
      { success: false, message: "画像の変換に失敗しました。別形式で試してください。" },
      { status: 400 }
    )
  }

  const pathname = `official-works/${workId}/${kind}-${Date.now()}.webp`
  try {
    const blob = await put(pathname, webp, {
      access: "public",
      contentType: "image/webp",
      token,
      addRandomSuffix: true,
    })
    return NextResponse.json({ success: true, url: blob.url })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ success: false, message: `アップロード失敗: ${msg}` }, { status: 502 })
  }
}
