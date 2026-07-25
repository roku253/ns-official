import type { CaseTaskStructure, InitialHqBriefingDef } from "@/games/signal-trace/portal-engine/types"
import initialHqBriefing from "./initial-hq-briefing.json"

export const MOONLIT_SCRIPT_CASE_STRUCTURE: CaseTaskStructure = {
  caseId: "moonlit-script",
  caseTitle: "月下の手記",
  initialHqBriefing: initialHqBriefing as InitialHqBriefingDef,
  groups: [
    {
      id: "ms-letter",
      title: "便箋の空欄",
      tasks: [
        {
          id: "ms-letter-blank-1",
          title: "空欄①",
          description:
            "手記の冒頭付近を思い出して。人が少なかった日の、曜日の言い方（ひとことで）。",
          priority: "medium",
          completionType: "keyword",
          keywordConfig: { inputPlaceholder: "曜日を入力" },
        },
        {
          id: "ms-letter-blank-2",
          title: "空欄②",
          description:
            "手記でベンチに並んだページと、アルバムの白い花の写真を照らし合わせて。行った場所は。",
          priority: "medium",
          completionType: "keyword",
          keywordConfig: { inputPlaceholder: "場所を入力" },
        },
        {
          id: "ms-letter-blank-3",
          title: "空欄③",
          description:
            "手記で茎を結んで「忘れない」と書いたあたり。ふたりでつくった小さなもの。",
          priority: "medium",
          completionType: "keyword",
          keywordConfig: { inputPlaceholder: "名詞を入力" },
        },
        {
          id: "ms-letter-blank-4",
          title: "空欄④",
          description: "手記のスーパーの話。卵Mの値段は数字だけ。",
          priority: "medium",
          completionType: "keyword",
          keywordConfig: { inputPlaceholder: "数字" },
        },
        {
          id: "ms-letter-blank-5",
          title: "空欄⑤",
          description:
            "手記で夜がこわいとある近道。アルバムに入口の写真がある。",
          priority: "medium",
          completionType: "keyword",
          keywordConfig: { inputPlaceholder: "場所・名詞" },
        },
        {
          id: "ms-letter-blank-6",
          title: "空欄⑥",
          description:
            "手記のトンネルの段落と、アルバムの縁側のキャプション。遠くで聞こえた音。",
          priority: "medium",
          completionType: "keyword",
          keywordConfig: { inputPlaceholder: "名詞を入力" },
        },
        {
          id: "ms-letter-blank-7",
          title: "空欄⑦",
          description: "手記のパン屋の話。コッペの値段は数字だけ。",
          priority: "medium",
          completionType: "keyword",
          keywordConfig: { inputPlaceholder: "数字" },
        },
        {
          id: "ms-letter-final",
          title: "差出人の名",
          description: "手記の末尾。署名のあたりを、そのまま。",
          priority: "high",
          completionType: "keyword",
          keywordConfig: { inputPlaceholder: "名前を入力" },
        },
      ],
    },
  ],
}
