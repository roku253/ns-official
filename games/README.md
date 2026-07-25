# ゲームパッケージ（コンテンツ）

このディレクトリは公式サイト側に残す **カタログ用スタブ**（現状は `signal-trace` / ここにいる）を置きます。  
デモ作品は公式リポジトリから分離済みです。プレイ本体は作品デプロイ（例: `作品/ここにいる`）へ rewrite します。

**ログイン / スプレッドシート / 正解 API / セーブの共通処理** はプラットフォーム側（`lib/platform/`、`app/api/`、`lib/official/` 等）に置きます。

## レイアウト

```
games/
  signal-trace/         ここにいる（カタログ・カバー・ルーティング用スタブ）
    cases/koko-ni-iru/  manifest.json
    portal-engine/      型・照合ヘルパ（本体 UI は作品デプロイ側）
    static/             カバー等 → public/games/signal-trace/
```

**`public/games/`** は Next の配信ルール用のコピー先です。手で編集せず、`games/<slug>/static/` を編集して `npm run sync:games`（`predev` / `prebuild` で自動）を使ってください。

公式コンテンツ（お知らせ・作品詳細・公開）の編集は `/admin/news`・`/admin/works`（GAS 連携、[docs/gas-cms.md](../docs/gas-cms.md)）を使います。
