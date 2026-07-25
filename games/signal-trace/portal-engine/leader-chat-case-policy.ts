import type { LeaderChatResponseId } from "@/games/signal-trace/cases/koko-ni-iru/leader-chat-labels"
import {
  looksLikeGreeting,
  looksLikeInvestigationLost,
  looksLikeMetaConnectivityTest,
  looksLikeOffTopicDailyChitchat,
  looksLikeSleepy,
  looksLikeTadaimaReturn,
  looksLikeThanks,
} from "@/games/signal-trace/cases/koko-ni-iru/leader-chat-chitchat-intent"
import { messageHasCaseInvestigationAnchor } from "@/games/signal-trace/cases/koko-ni-iru/leader-chat-investigation-anchor"
import { applyClassifierLabelGuards } from "@/games/signal-trace/cases/koko-ni-iru/leader-chat-label-guards"
import { LEADER_RESPONSES } from "@/games/signal-trace/cases/koko-ni-iru/leader-chat-responses"

export type LeaderChatCasePolicy = {
  caseId: string
  /** false = 終了扱い（policy.inactive_case） */
  acceptingContact: boolean
  displayName: string
  /** この案件を示す語（含まれていれば case 文脈） */
  caseAnchorPatterns: RegExp[]
  /** シリーズ内の別案件名 */
  siblingCases: { caseId: string; label: string; patterns: RegExp[] }[]
  /**
   * 他案件では「案件固有」扱いの response_id を demote
   * universalFolklorePatterns にだけマッチ → policy.universal_folklore
   */
  universalFolklorePatterns: RegExp[]
}

const POLICIES: Record<string, LeaderChatCasePolicy> = {
  "koko-ni-iru": {
    caseId: "koko-ni-iru",
    acceptingContact: true,
    displayName: "ここにいる（霞ノ杜・2019）",
    caseAnchorPatterns: [
      /ここにいる|霞ノ杜|霞の杜|2019|依頼文|依頼分|板ミラー|記録班/,
      /青空の子|青空って|(?:^|[^ヨル])ソラ(?:[^ァ-ヶ]|$)|名簿|タイムカプセル|烏啼|霞の森/,
      /掲示板|板ミラー|都市伝説|神隠し|伝承|事件|現場/,
      /小学校|学校|町立|霞ノ杜町|霞の杜町/,
      /依頼人|依頼者|三人入って|転校/,
      /urban.*legend|掲示板.*ミラー/i,
    ],
    siblingCases: [
      {
        caseId: "other-missing-boy",
        label: "消えた少年",
        patterns: [/消えた少年|きえたしょうねん|missing.?boy/i],
      },
      {
        caseId: "other-signal",
        label: "別の信号跡",
        patterns: [/信号跡|シグナルトレース|別案件|別の謎/i],
      },
    ],
    universalFolklorePatterns: [
      /^神隠し(って|とは|とは何|是什么)/,
      /神隠し.*(とは|って何|意味)/,
      /言い伝え.*(とは|って何)/,
    ],
  },
}

export function getLeaderChatCasePolicy(caseId: string): LeaderChatCasePolicy | null {
  return POLICIES[caseId] ?? null
}

export { messageHasCaseInvestigationAnchor } from "@/games/signal-trace/cases/koko-ni-iru/leader-chat-investigation-anchor"

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text))
}

function isCaseSpecificResponseId(responseId: LeaderChatResponseId): boolean {
  const def = LEADER_RESPONSES[responseId]
  return def?.caseSpecific === true
}

/**
 * ML が選んだ response_id を案件ポリシーで上書き
 */
export function applyLeaderChatCasePolicy(input: {
  caseId: string
  messageText: string
  responseId: LeaderChatResponseId
}): LeaderChatResponseId {
  const policy = getLeaderChatCasePolicy(input.caseId)
  if (!policy) return input.responseId

  const t = input.messageText

  if (input.responseId === "quality.repeat" || input.responseId === "quality.repeat.chitchat") {
    return input.responseId
  }

  if (
    input.responseId.startsWith("chitchat.what_is.") ||
    input.responseId === "chitchat.answer_request" ||
    input.responseId === "chitchat.hint_refusal" ||
    input.responseId.startsWith("chitchat.streak.")
  ) {
    return input.responseId
  }

  if (!policy.acceptingContact) {
    return "policy.inactive_case"
  }

  for (const sib of policy.siblingCases) {
    if (matchesAny(t, sib.patterns)) {
      return "policy.sibling_case"
    }
  }

  const hasCaseAnchor = messageHasCaseInvestigationAnchor(input.caseId, t)
  const inThisCase = hasCaseAnchor

  if (
    !inThisCase &&
    matchesAny(t, policy.universalFolklorePatterns) &&
    isCaseSpecificResponseId(input.responseId)
  ) {
    return "policy.universal_folklore"
  }

  if (
    !inThisCase &&
    isCaseSpecificResponseId(input.responseId) &&
    /神隠し|伝承|言い伝え/.test(t) &&
    !/板|学校|名簿|依頼|2019|霞ノ杜|ソラ/.test(t)
  ) {
    return "policy.universal_folklore"
  }

  /** 調査キーワードなし → ゲーム関連ラベル禁止（雑談／Claude へ） */
  const demoted = applyClassifierLabelGuards({
    caseId: input.caseId,
    messageText: t,
    responseId: input.responseId,
  })
  if (demoted !== input.responseId) {
    return demoted
  }

  /** 調査キーワードなしの生活系短文が chitchat テンプレへ寄せる */
  if (!hasCaseAnchor) {
    if (looksLikeInvestigationLost(t)) {
      return "chitchat.lost"
    }
    if (looksLikeSleepy(t)) {
      return "chitchat.sleepy"
    }
    if (looksLikeOffTopicDailyChitchat(t)) {
      return "chitchat.generic.0"
    }
    if (input.responseId === "chitchat.tadaima" && !looksLikeTadaimaReturn(t)) {
      return "chitchat.generic.0"
    }
    if (input.responseId === "chitchat.greeting" && !looksLikeGreeting(t)) {
      return "chitchat.generic.0"
    }
    if (input.responseId === "chitchat.thanks" && !looksLikeThanks(t)) {
      return "chitchat.generic.0"
    }
    if (input.responseId.startsWith("meta_test.") && !looksLikeMetaConnectivityTest(t)) {
      return "chitchat.generic.0"
    }
    if (
      isCaseSpecificResponseId(input.responseId) &&
      /^(うん|そうだね|なるほど|了解|おつかれ|へー|ふむ)/.test(t)
    ) {
      return "chitchat.generic.1"
    }
  }

  if (looksLikeInvestigationLost(t)) {
    const misrouted =
      input.responseId === "chitchat.generic.0" ||
      input.responseId === "chitchat.generic.1" ||
      input.responseId === "procedure.0" ||
      input.responseId === "procedure.1" ||
      input.responseId === "procedure.2" ||
      input.responseId === "vague.0" ||
      input.responseId === "vague.1"
    if (misrouted) return "chitchat.lost"
  }

  return input.responseId
}
