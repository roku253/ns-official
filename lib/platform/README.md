# プラットフォーム（基盤）

ゲーム非依存の **認証・スプレッドシート連携・API・セーブ** の置き場です。

| 領域 | 実装の例 |
|------|-----------|
| GAS プロキシ | `lib/gas.ts`, `app/api/gas/` |
| 既存プレイヤー検証 API | `app/api/player/validate-*` |
| 統合判定 | `app/api/platform/check-answer/` — `gameId` / `stageId` / `answer`、任意で `loginId`+`password`+`persist` で GAS へ即保存 |
| iframe プレイ画面 | `/play/[gameId]`。静的ゲームの正本は `games/<slug>/static/` → `public/games/<slug>/` に同期 |
| iframe 通信の型 | `lib/platform/iframe-protocol.ts` |
| 任務ポータル用タスクエンジン（シグナル・トレース専用） | `games/signal-trace/portal-engine/*` |

**正解ロジック**はクライアント（ゲーム iframe）に置かず、API ＋ マスタ（シート等）側に寄せる方針です。任務ポータル UI 自体は「シグナル・トレース」専用のため `games/signal-trace/portal/` にあります。
