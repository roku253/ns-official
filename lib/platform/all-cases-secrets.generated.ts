/* eslint-disable */
/** AUTO-GENERATED — do not edit. Regenerate: npm run generate:games */
import "server-only"
import type { CaseTaskSecrets } from "@/games/signal-trace/portal-engine/types"
import { MOONLIT_SCRIPT_TASK_SECRETS } from "@/games/moonlit-script/cases/moonlit-script/task-secrets"
import { IRON_LOCK_ROOM_TASK_SECRETS } from "@/games/iron-lock-room/cases/iron-lock-room/task-secrets"
import { SIGNAL_DRILL_TASK_SECRETS } from "@/games/signal-drill/cases/signal-drill/task-secrets"
import { VAULT_PROTOTYPE_TASK_SECRETS } from "@/games/vault-prototype/cases/vault-prototype/task-secrets"

export const SECRETS_BY_CASE_ALL: Record<string, Record<string, CaseTaskSecrets>> = {
  "moonlit-script": MOONLIT_SCRIPT_TASK_SECRETS,
  "iron-lock-room": IRON_LOCK_ROOM_TASK_SECRETS,
  "signal-drill": SIGNAL_DRILL_TASK_SECRETS,
  "vault-prototype": VAULT_PROTOTYPE_TASK_SECRETS,
}
