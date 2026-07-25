/** localStorage keys shared by login + dashboard */
export const LS_AUTH = {
  STARTED: "investigation_started",
  EMAIL: "investigator_email",
  /** 最後に ID/パスワードで認証成功した時刻（epoch ms） */
  LAST_LOGIN_AT: "investigator_last_login_at",
  /** ポータル入口の利用規約同意（運営側フロー） */
  TERMS_ACCEPTED: "investigation_portal_terms_accepted_v1",
  /** 一度でも任務ポータルを開いた（公式ヘッダー「続きから」表示用） */
  PORTAL_STARTED_ONCE: "investigator_portal_started_once",
} as const

/** Set via `/setup` (メール内 URL)。パスワードは sessionStorage のみ */
export const LS_ACCOUNT = {
  LOGIN_ID: "investigator_login_id",
  /** @deprecated 互換のため残す。新規は SESSION.PASSWORD のみ */
  PASSWORD: "investigator_password",
  /** GAS に調査員行が登録済みか */
  SHEET_REGISTERED: "investigator_sheet_registered",
  /** loginAccount の caseId（タスク定義の切り替え用） */
  CASE_ID: "investigator_case_id",
  /** 外部サイト認証用のアカウント単位トークン（loginAccount/setupAccount で発行） */
  MASTER_TOKEN: "investigator_master_token",
} as const

/** タブを閉じるまで。GAS の saveProgress / loginAccount 用 */
export const LS_SESSION = {
  PASSWORD: "investigator_session_password",
  /** 初回セットアップで GAS に渡す合言葉（メール登録用・任意） */
  SETUP_CODE: "investigator_setup_code",
  /** ログイン Step1 通過後のメール（同一タブ用） */
  GATE_EMAIL: "investigator_gate_email",
  /** STEP1 を省略して ID のみで入場（別端末など）。タブ単位 */
  STEP2_DIRECT: "investigator_login_step2_direct",
} as const

/** メールの /setup 登録後も Step2 に進めるよう、タブをまたいで共有 */
export const LS_GATE = {
  PENDING_EMAIL: "investigator_gate_pending_email",
} as const
