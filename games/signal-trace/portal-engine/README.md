# 任務ポータル・タスクエンジン（シグナル・トレース専用）

**ストーリー本文ではなく**、タスクの開放・完了連鎖・サーバー照合の枠組みです。  
任務ポータルは本作品でのみ使う前提のため、コードは `games/signal-trace/portal-engine/` に置いています（他タイトルで同 UI を使う場合はコピーまたは共通化を別途検討）。

| ファイル | 役割 |
|----------|------|
| `registry.ts` | `case_id` → 構造（実体は `../cases/missing-boy` など） |
| `bootstrap-tasks.ts` / `group-progression.ts` / `task-completion.ts` | 進行・クリア連動・連絡フラグ |
| `validate-*.ts` / `server/player-validation.ts` | キーワード・画像・文書のサーバー照合 |
| `types.ts` | タスク・グループの型 |

作品固有のタスク定義・秘密情報は **`../cases/<case_id>/`** を参照してください。
