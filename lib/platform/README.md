# プラットフォーム（基盤）

公式サイト向けの **認証・GAS 連携・進捗表示・カタログ生成結果** の置き場です。
任務ポータル本体・タスクエンジンは `作品/ここにいる` 側にあります。

| 領域 | 実装の例 |
|------|-----------|
| GAS プロキシ | `lib/gas.ts`, `app/api/gas/` |
| トークン／権利 API | `app/api/platform/*` |
| 解答 API（公式はスタブ） | `app/api/platform/check-answer/` → `check-answer-core.ts` |
| ルーティング／既定案件 | `game-routing.generated.ts`（`npm run generate:games`） |
| アカウント進捗の読取・整形 | `progress-json.ts`, `hq-briefing.ts`, `portal-preferences.ts` |
| プレイヤー GAS 呼び出し | `gas-player-server.ts` |

カタログ用スタブは `games/signal-trace/cases/*/manifest.json` と cover / playview 画像のみ。
