"use client"

import { useCallback, useRef, useState } from "react"
import { ImagePlus, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  workId: string
  kind: "cover" | "screenshot"
  label?: string
  /** 単一（カバー） */
  value?: string
  onChange?: (url: string) => void
  /** 複数（スクショ） */
  values?: { src: string; alt?: string }[]
  onChangeMany?: (items: { src: string; alt?: string }[]) => void
  className?: string
}

async function uploadFile(
  file: File,
  workId: string,
  kind: string
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const body = new FormData()
  body.set("file", file)
  body.set("workId", workId)
  body.set("kind", kind)
  const res = await fetch("/api/admin/upload-image", { method: "POST", body })
  const data = (await res.json()) as { success?: boolean; url?: string; message?: string }
  if (!res.ok || !data.success || !data.url) {
    return { ok: false, message: data.message || "アップロードに失敗しました。" }
  }
  return { ok: true, url: data.url }
}

export function AdminImageDropzone({
  workId,
  kind,
  label,
  value,
  onChange,
  values,
  onChangeMany,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const multi = kind === "screenshot"

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith("image/"))
      if (list.length === 0) {
        setError("画像ファイルを選んでください。")
        return
      }
      setError(null)
      setBusy(true)
      try {
        if (!multi) {
          const r = await uploadFile(list[0]!, workId, kind)
          if (!r.ok) {
            setError(r.message)
            return
          }
          onChange?.(r.url)
          return
        }
        const next = [...(values || [])]
        for (const file of list) {
          const r = await uploadFile(file, workId, kind)
          if (!r.ok) {
            setError(r.message)
            break
          }
          next.push({ src: r.url })
        }
        onChangeMany?.(next)
      } finally {
        setBusy(false)
      }
    },
    [kind, multi, onChange, onChangeMany, values, workId]
  )

  return (
    <div className={cn("space-y-2", className)}>
      {label ? <p className="text-[11px] text-[#8b949e]">{label}</p> : null}

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onClick={() => !busy && inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragging(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragging(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragging(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragging(false)
          if (busy) return
          void handleFiles(e.dataTransfer.files)
        }}
        className={cn(
          "flex min-h-[7.5rem] cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border border-dashed px-3 py-5 text-center transition-colors",
          dragging
            ? "border-[#1f6feb] bg-[#1f6feb]/10"
            : "border-[#30363d] bg-[#0e1116] hover:border-[#8b949e]/60 hover:bg-[#161b22]",
          busy && "pointer-events-none opacity-70"
        )}
      >
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin text-[#79b8ff]" aria-hidden />
        ) : (
          <ImagePlus className="h-5 w-5 text-[#8b949e]" aria-hidden />
        )}
        <p className="text-[13px] text-[#c9d1d9]">
          {busy ? "アップロード中…" : "画像をドロップ、またはクリックして選択"}
        </p>
        <p className="text-[11px] text-[#8b949e]">
          {multi ? "複数可 · " : ""}
          WebP に変換して保存（最大辺 1600px）
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple={multi}
          className="hidden"
          onChange={(e) => {
            const files = e.target.files
            if (files?.length) void handleFiles(files)
            e.target.value = ""
          }}
        />
      </div>

      {error ? <p className="text-[12px] text-[#f85149]">{error}</p> : null}

      {!multi && value ? (
        <div className="relative inline-block max-w-full overflow-hidden rounded-sm border border-[#30363d] bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="max-h-40 max-w-full object-contain" />
          <button
            type="button"
            className="absolute right-1 top-1 rounded-sm bg-black/70 p-1 text-[#e6edf3] hover:bg-black"
            onClick={(e) => {
              e.stopPropagation()
              onChange?.("")
            }}
            aria-label="カバーをクリア"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {multi && (values?.length || 0) > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {(values || []).map((shot, i) => (
            <li
              key={`${shot.src}-${i}`}
              className="relative overflow-hidden rounded-sm border border-[#30363d] bg-black"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shot.src} alt={shot.alt || ""} className="h-28 w-full object-cover" />
              <button
                type="button"
                className="absolute right-1 top-1 rounded-sm bg-black/70 p-1 text-[#e6edf3] hover:bg-black"
                onClick={() => onChangeMany?.((values || []).filter((_, j) => j !== i))}
                aria-label="削除"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
