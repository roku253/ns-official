import type { CaseTaskStructure, InitialHqBriefingDef } from "@/games/signal-trace/portal-engine/types"
import initialHqBriefing from "./initial-hq-briefing.json"

export const SIGNAL_DRILL_CASE_STRUCTURE: CaseTaskStructure = {
  caseId: "signal-drill",
  caseTitle: "シグナル訓練（デモ）",
  initialHqBriefing: initialHqBriefing as InitialHqBriefingDef,
  groups: [
    {
      id: "sd-g1",
      title: "【デモ】訓練タスク",
      tasks: [
        {
          id: "sd-01-keyword",
          title: "応答コード",
          description: "検証用。「drill」と入力。",
          priority: "low",
          completionType: "keyword",
          keywordConfig: { inputPlaceholder: "drill", operatorNote: "demo" },
        },
      ],
    },
  ],
}
