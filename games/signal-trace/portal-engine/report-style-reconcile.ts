import type { ReportStyleLabel } from "@/games/signal-trace/cases/koko-ni-iru/report-style-labels"
import type { ReportShapeResult } from "./validate-report-shape"

const BAD_STYLES = new Set<ReportStyleLabel>([
  "chitchat",
  "meta_lost",
  "off_topic",
  "keyword_stuffing",
])

/** 明示的な「助けて／手順／ヒント」系（事実報告と区別） */
function isExplicitHelpRequest(text: string): boolean {
  const t = text.trim()
  if (
    /(何を調べ|わからなく|教えて|ヒント|クリア条件|どこを見れば|手順|操作がわから|進め方|助けて|ガイド|正解|答えを教|迷子|困って)/.test(
      t
    ) &&
    !/(掲示板|板|スレ|ログ).{0,30}(確認|読|見|書|投稿)/.test(t)
  ) {
    return true
  }
  return /^(おはよう|こんにちは|こんばんは|お疲れ|ありがとう|了解|テスト|雑談)/.test(t.slice(0, 20))
}

/** 本件調査に関係しうる事実記述（雑談・本部への質問は含めない） */
function hasCaseInvestigationContent(text: string): boolean {
  if (isSideChannelMessage(text)) return false
  return /(霞ノ杜|霞の杜|杜町|神隠し|伝承|言い伝え|伝説|掲示板|板|スレ|すれ|ログ|投稿|書き込|小学校|名前|なまえ|呼び名|ソラ|青空|あおぞら|転校|削除|規制|保護者|名簿|タイムカプセル|2016|2019|2020|2021|2030|登山|事故|優|ゆう|三人|二人|戻|見られる|時間|断定|youtube|yootube|url)/i.test(
    text
  )
}

/** 調査報告ではなく本部への雑談・質問・技術連絡 */
export function isSideChannelMessage(text: string): boolean {
  const t = text.trim()
  return (
    /^(おはよう|こんにちは|こんばんは|おやすみ|晩御飯|ああおはよう|ねむい|眠い|わかりました|了解)/.test(
      t
    ) ||
    /(別案件|別の謎|消えた少年.*(正体|誰)|少年.*(正体|誰)|サイト.*(重|遅)|ページ.*(重|遅)|ちょっと聞き|聞きたいこと|送信テスト|テスト送信|届いて|動いて|何食べ|晩御飯|つらい|しんどい|www|笑)/.test(
      t
    )
  )
}

/**
 * 学習分類器の誤判定を補正する。
 * 事実報告が meta_lost / off_topic になると案内テンプレに落ちるため、ここで戻す。
 */
export function reconcileReportStyle(
  text: string,
  classified: ReportStyleLabel,
  tagsThisTurn: string[],
  shape: ReportShapeResult
): ReportStyleLabel {
  if (classified === "chitchat") return classified
  if (isSideChannelMessage(text) && classified !== "keyword_stuffing") {
    return "chitchat"
  }
  if (!BAD_STYLES.has(classified)) return classified
  if (isExplicitHelpRequest(text)) return classified

  if (tagsThisTurn.length > 0) {
    if (shape.hasReason && (shape.hasBoardMention || shape.sentenceCount >= 2)) {
      return "report_substantive"
    }
    return "report_vague"
  }

  if (hasCaseInvestigationContent(text)) {
    if (classified === "keyword_stuffing" && shape.isKeywordStuffing) return classified
    return "report_vague"
  }

  return classified
}
