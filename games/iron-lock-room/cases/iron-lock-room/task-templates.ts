import type { CaseTaskStructure, InitialHqBriefingDef } from "@/games/signal-trace/portal-engine/types"
import initialHqBriefing from "./initial-hq-briefing.json"

export const IRON_LOCK_ROOM_CASE_STRUCTURE: CaseTaskStructure = {
  caseId: "iron-lock-room",
  caseTitle: "鉄扉の閲覧室（デモ）",
  initialHqBriefing: initialHqBriefing as InitialHqBriefingDef,
  groups: [
    {
      id: "ilr-g1",
      title: "【デモ】閉鎖エリア",
      tasks: [
        {
          id: "ilr-01-keyword",
          title: "解錠コード",
          description: "検証用。「iron」と入力。",
          priority: "medium",
          completionType: "keyword",
          keywordConfig: { inputPlaceholder: "iron", operatorNote: "demo" },
        },
      ],
    },
  ],
}
