import type { CaseTaskSecrets } from "@/games/signal-trace/portal-engine/types"

export const MOONLIT_SCRIPT_TASK_SECRETS: Record<string, CaseTaskSecrets> = {
  "ms-letter-blank-1": {
    acceptedAnswers: ["土曜", "土曜日", "どようび", "ドヨウビ"],
  },
  "ms-letter-blank-2": {
    acceptedAnswers: ["公園", "こうえん", "コウエン", "こうえんち"],
  },
  "ms-letter-blank-3": {
    acceptedAnswers: ["指輪", "ゆびわ", "ユビワ"],
  },
  "ms-letter-blank-4": {
    acceptedAnswers: ["198", "１９８", "一九八"],
  },
  "ms-letter-blank-5": {
    acceptedAnswers: ["トンネル", "とんねる", "隧道", "ずいどう"],
  },
  "ms-letter-blank-6": {
    acceptedAnswers: ["風鈴", "ふうりん", "フウリン", "風鈴りん", "ふーりん"],
  },
  "ms-letter-blank-7": {
    acceptedAnswers: ["80", "８０", "八〇", "はちじゅう", "ハチジュウ"],
  },
  "ms-letter-final": {
    acceptedAnswers: ["あずさ", "アズサ", "あづさ", "アヅサ", "梓", "杏沙"],
  },
}
