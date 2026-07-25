/** httpOnly Cookie 名（プレイヤー用 localStorage とは無関係） */
export const ADMIN_SESSION_COOKIE = "admin_portal_session_v1"

/** HMAC に食わせる固定メッセージ（Node / Edge で同一にする） */
export const ADMIN_SESSION_HMAC_MESSAGE = "admin-portal-session-v1"
