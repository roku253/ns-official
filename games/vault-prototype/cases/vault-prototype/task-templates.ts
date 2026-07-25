import type { CaseTaskStructure, InitialHqBriefingDef } from "@/games/signal-trace/portal-engine/types"
import initialHqBriefing from "./initial-hq-briefing.json"

export const VAULT_PROTOTYPE_CASE_STRUCTURE: CaseTaskStructure = {
  caseId: "vault-prototype",
  caseTitle: "Vault 草稿（非公開）",
  initialHqBriefing: initialHqBriefing as InitialHqBriefingDef,
  groups: [
    {
      id: "vp-g1",
      title: "【検証】草稿タスク",
      tasks: [
        {
          id: "vp-01-keyword",
          title: "アクセス語",
          description: "直接 URL で入場した場合の検証用。「vault」",
          priority: "low",
          completionType: "keyword",
          keywordConfig: { inputPlaceholder: "vault", operatorNote: "demo" },
        },
      ],
    },
  ],
}
