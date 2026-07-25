/**
 * 謎ごとのタスク定義（編集は各 case フォルダの task-templates.ts を主に触る）
 */

export type TaskCompletionType =
  | "keyword"
  | "manual"
  | "photo"
  | "location"
  | "document"
  | "item"
  | "report"

export type ReportGrade = "cold" | "warm" | "hot" | "wrong" | "spoiler_early"

/** 調査報告タスクの採点ルール（task-secrets の reportRules） */
export interface ReportTaskRules {
  /** 必須タグ（すべて含むと hot 候補） */
  requiredTags: string[]
  /** hot 判定時に追加で必要なタグ数（required 以外から） */
  optionalMinExtra?: number
  /** 含むと wrong */
  wrongTags?: string[]
  /** 単独または早計な組み合わせで spoiler_early */
  spoilerEarlyIfOnly?: string[]
  maxAttempts: number
  /** 採点結果ごとの HQ 返信（即時 comm） */
  gradeReplies: Partial<Record<ReportGrade, AutoCommunicationDef>>
}

export interface ReportTaskConfig {
  maxAttempts?: number
  /** UI 用タグ選択肢（未指定時は case 定数から） */
  availableTagIds?: string[]
}

export type AchievementRarity = "common" | "rare" | "epic" | "legendary"

export interface InitialHqBriefingDef {
  subject: string
  senderName: string
  storyLines: string[]
  requestLetter?: { fileName: string; lines: string[] }
}

export interface AutoCommunicationDef {
  /** 同じ ID は二重発行しない */
  id: string
  caseId?: string
  threadType?: "main" | "sub"
  from: string
  fromRole: string
  subject: string
  content: string
  priority: "urgent" | "normal" | "low"
  attachments?: { name: string; type: string; content?: string }[]
}

export type GroupUnlockTrigger =
  | { type: "auto" }
  | { type: "afterCommunicationRead"; communicationId: string }
  | { type: "afterDelayMsFromTaskComplete"; taskId: string; delayMs: number }

/** 実績の1件分（テンプレ側。プレイヤー獲得時に unlockedAt が付く） */
export interface AchievementUnlockDef {
  id: string
  title: string
  description: string
  /** AchievementsPanel は文字列をそのまま表示（絵文字可） */
  icon: string
  rarity: AchievementRarity
}

/**
 * タスククリア時にアーカイブへ自動追加するメモ。
 * descriptionTemplate で全文を指定可能。プレースホルダ: {keyword} {filename} {note}
 */
export interface ArchiveAutoEntryDef {
  descriptionTemplate?: string
  note?: string
}

export interface KeywordTaskConfig {
  /**
   * 正解とみなす文字列。クライアントに載せない場合は各 case の `task-secrets.ts` のみに定義し、
   * テンプレート側では省略する（照合は API）。
   */
  acceptedAnswers?: string[]
  inputPlaceholder?: string
  /**
   * 設定時はテキスト入力の代わりにボタンから値を送信（値は task-secrets の accepted と一致させる）
   */
  choiceButtons?: { value: string; label: string }[]
  /** 制作用メモ（プレイヤーには見せない。リポジトリに載せる場合はネタバレに注意） */
  operatorNote?: string
}

/**
 * 提出画像と参照画像のピクセル比較（縮小後の平均誤差で「似ている」判定）。
 * 複数枚ある場合は **いずれか1枚** に閾値以内で近ければ合格（花・現地の複数アングル向け）。
 *
 * 知覚ハッシュ（pHash）やベクトル類似度（CLIP 等）は未使用。ブラウザ完結の軽量判定のみ。
 *
 * 参照画像をバンドルに載せない運用では `referenceImageSrc*` を省略し、`task-secrets` のパスでサーバー照合する。
 */
export interface PhotoCompareConfig {
  /** 単一参照（後方互換・public URL）。運用で非推奨なら省略 */
  referenceImageSrc?: string
  /** 複数参照（public URL）。運用で非推奨なら省略 */
  referenceImageSrcs?: string[]
  /** 平均絶対誤差の上限（0-255、大きいほど緩い）。未指定時 48 */
  maxMeanAbsoluteError?: number
  /** 比較前に両方を正方形に伸ばす辺ピクセル。未指定時 96 */
  maxCompareSize?: number
  /**
   * プレイヤー向けの撮影ヒント（参照画像は出さない運用向け）。
   * 未設定のときはタスクの description をそのまま使う UI でもよい。
   */
  playerHint?: string
}

/** .txt 提出タスク（文書アーカイブに全文保存） */
export type DocumentMatchRule =
  | { type: "exact"; expectedText: string; ignoreCase?: boolean; normalizeWhitespace?: boolean }
  | { type: "containsTerm"; term: string; ignoreCase?: boolean }
  | { type: "containsPhrase"; phrase: string; ignoreCase?: boolean; normalizeWhitespace?: boolean }

/** サーバー専用の案件シークレット（各 case `task-secrets.ts`）。クライアントにバンドルしない */
export type CaseTaskSecrets = {
  acceptedAnswers?: string[]
  /** リポジトリルートからの相対パス（`games/...` 配下）。public 配下は使わない */
  photoReferenceAssetPaths?: string[]
  documentMatchRules?: DocumentMatchRule[]
  reportRules?: ReportTaskRules
}

export interface DocumentTaskConfig {
  /** 保存する最大文字数。超過分は省略 */
  maxChars?: number
  /** all=すべて満たす / any=どれか1つ満たす */
  matchMode?: "all" | "any"
  /** 文書照合ルール */
  matchRules?: DocumentMatchRule[]
}

/** テンプレ・実行時タスクから参照 URL 列を正規化 */
export function resolvePhotoReferenceUrls(cfg: PhotoCompareConfig | undefined): string[] {
  if (!cfg) return []
  const multi = cfg.referenceImageSrcs?.map((s) => String(s).trim()).filter(Boolean) ?? []
  if (multi.length > 0) return multi
  const one = cfg.referenceImageSrc?.trim()
  return one ? [one] : []
}

export interface TaskTemplate {
  /** 永続化キー。変えると進捗と紐づかなくなるので基本固定 */
  id: string
  title: string
  description: string
  priority: "critical" | "high" | "medium" | "low"
  completionType: TaskCompletionType
  keywordConfig?: KeywordTaskConfig
  photoConfig?: PhotoCompareConfig
  /** completionType === "document" のとき */
  documentConfig?: DocumentTaskConfig
  /** completionType === "report" のとき */
  reportConfig?: ReportTaskConfig
  /** このタスクを完了したときに付与（未獲得のときだけ） */
  achievementUnlock?: AchievementUnlockDef
  /** このタスク完了時のアーカイブ文言を上書きしたいとき。未指定でも keyword/photo は既定でアーカイブ化 */
  archiveAutoEntry?: ArchiveAutoEntryDef
  /** このタスク完了をきっかけに本部連絡を1件追加 */
  emitCommunicationOnComplete?: AutoCommunicationDef
  /** emitCommunicationOnComplete の直後に順に追加する本部連絡 */
  emitCommunicationsOnCompleteChain?: AutoCommunicationDef[]
  /**
   * keyword タスクで、サーバーが受理した報告文字列（正規化後）がキーと一致するときに発行する本部連絡。
   * キーは task-secrets の accepted と同一の小文字想定（例: delete / keep）。
   */
  emitCommunicationsByAnswer?: Record<string, AutoCommunicationDef>
  /** 制作用メモ（UI・プレイヤーには出さない想定） */
  operatorNote?: string
}

/** 中くらいのまとまり（掲示板、現地調査など） */
export interface TaskGroupTemplate {
  id: string
  title: string
  description?: string
  /** このブロック内の全タスクが完了したときに付与 */
  achievementUnlock?: AchievementUnlockDef
  /** グループ開放条件（未指定は前グループ完了時の自動開放） */
  unlockTrigger?: GroupUnlockTrigger
  /** このグループ完了時に本部連絡を1件追加 */
  emitCommunicationOnComplete?: AutoCommunicationDef
  tasks: TaskTemplate[]
}

/** 案件全体（大本のタイトル + グループ列） */
export interface CaseTaskStructure {
  caseId: string
  caseTitle: string
  /** 初回ログイン時に表示する本部連絡の文面（Apps Script と同期） */
  initialHqBriefing?: InitialHqBriefingDef
  groups: TaskGroupTemplate[]
}

export function flattenCaseTemplates(structure: CaseTaskStructure): TaskTemplate[] {
  return structure.groups.flatMap((g) => g.tasks)
}
