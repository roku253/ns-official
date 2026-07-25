/**
 * GAS の `progress_json`（およびそれを扱う公式／会計／管理 API）の**共通の形**。
 * タスク文言・正解・開放ルールなどゲーム固有の定義は `games/signal-trace/` 側。
 * ここは「セーブデータのスキーマ」をプラットフォーム層に固定し、ST 以外のゲームを足しても
 * 同じ保存形式を共有できるようにするため `lib/` に置く。
 */
export type TabType = "tasks" | "progress" | "memo" | "communications" | "achievements" | "archive" | "settings"

/** locked: 未解放（直前タスク未完了） / active: 進行中 / completed */
export type TaskStatus = "locked" | "active" | "completed"

/** keyword=入力照合（設定は games/signal-trace/portal-engine 側） / manual=手動完了ボタン / 将来 photo・location */
export type TaskCompletionType =
  | "keyword"
  | "manual"
  | "photo"
  | "location"
  | "document"
  | "item"
  | "report"

export interface Task {
  id: string
  title: string
  description: string
  priority: "critical" | "high" | "medium" | "low"
  status: TaskStatus
  completedAt?: Date
  createdAt: Date
  /** cases の task-templates.ts の id と対応（キーワード照合・追跡用） */
  templateId?: string
  completionType?: TaskCompletionType
  /** keyword タスクの入力欄プレースホルダ（テンプレから複製） */
  keywordInputPlaceholder?: string
  /** keyword タスク: テキスト入力の代わりにボタンで値を送る */
  keywordChoiceButtons?: { value: string; label: string }[]
  /** 中くらいのまとまり（グループ） */
  groupId?: string
  groupTitle?: string
  /** 案件タイトル（大本） */
  caseTitle?: string
  /** photo タスク: 参照の先頭 URL（UI 互換・単一参照時） */
  photoReferenceSrc?: string
  /** 比較に使う参照 URL の一覧（複数ならいずれか一致で合格） */
  photoReferenceSrcs?: string[]
  photoMaxMeanAbsoluteError?: number
  photoMaxCompareSize?: number
  /** photo / item: プレイヤー向け撮影ヒント（参照画像は出さない） */
  photoSubmissionHint?: string
  /** report タスク: 提出回数 */
  reportAttempts?: number
  /** report タスク: 無関係送信などの警告段階 */
  reportWarnLevel?: number
  /** report タスク: 会話を通じて拾えた採点タグ（累積） */
  reportTagsCollected?: string[]
  /** report タスク: 選択可能タグ ID */
  reportAvailableTagIds?: string[]
  /** report タスク: 最大提出回数（未使用時は実質無制限） */
  reportMaxAttempts?: number
}

export interface Achievement {
  id: string
  title: string
  description: string
  unlockedAt: Date
  icon: string
  rarity: "common" | "rare" | "epic" | "legendary"
  caseId?: string
  caseTitle?: string
}

export interface Memo {
  id: string
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
}

export interface ArchiveItem {
  id: string
  type: "photo" | "document" | "item" | "memo"
  title: string
  description: string
  thumbnail?: string
  createdAt: Date
  caseId?: string
  caseTitle?: string
}

export interface Communication {
  id: string
  caseId?: string
  threadType?: "main" | "sub"
  from: string
  fromRole: string
  subject: string
  content: string
  priority: "urgent" | "normal" | "low"
  isRead: boolean
  createdAt: Date
  attachments?: CommunicationAttachment[]
}

/** 連絡メッセージの添付（link=外部URL / document=本文テキスト） */
export interface CommunicationAttachment {
  name: string
  type: string
  content?: string
}

/** ポータル設定（progress_json に保存・端末間で同期） */
export interface PortalPreferences {
  displayName: string
  /** ユーザーが設定したプロフィールアイコン（data URL） */
  avatarImageDataUrl?: string
  /** ダーク=現行の緑系ターミナル風 / ライト=明るい配色 */
  theme: "dark" | "light"
  /** スクロール時もタブナビを画面上部に固定 */
  stickyTabBar: boolean
  /** 走査ビーム（上下に動く水平の光の線。タブ固定とは別） */
  scanlineEnabled: boolean
  crtEnabled: boolean
  soundEffectsEnabled: boolean
  notificationSoundEnabled: boolean
  /** ブラウザのデスクトップ通知（タブ非表示時など） */
  browserNotifyEnabled: boolean
  /** 意図フラグ（実際の許可はブラウザ・OS 側） */
  consentAutoSync: boolean
  consentLocation: boolean
  consentCamera: boolean
  consentNotifications: boolean
}

/** スプレッドシートに保存するダッシュボード状態 */
export interface ProgressState {
  tasks: Task[]
  achievements: Achievement[]
  memos: Memo[]
  archiveItems: ArchiveItem[]
  communications: Communication[]
  activeTab?: TabType
  portalPreferences?: Partial<PortalPreferences>
  /** koko-ni-iru: ストーリークリア確定日時（ISO） */
  storyClearedAt?: string
  /** koko-ni-iru 有志ポータル: 班長 intel unlock id 一覧 */
  knLeaderUnlockedIds?: string[]
  /** koko-ni-iru 有志ポータル: 班長への送信回数 */
  knChatCount?: number
  /** koko-ni-iru: ゲーム無関係な雑談が連続した回数（次の送信前の値） */
  knConsecutiveOffTopicChitchat?: number
}
