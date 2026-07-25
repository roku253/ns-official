# ゲームパッケージ（コンテンツ）

このディレクトリは **演出・操作・作品固有データ** をまとめます。  
**ログイン / スプレッドシート / 正解 API / セーブの共通処理** はプラットフォーム側（`lib/platform/`、`app/api/`、`lib/official/` 等）に置きます。

## レイアウト

```
games/
  <game-slug>/          例: signal-trace（作品の内部スラッグ）
    portal/             任務ポータル UI（シグナル・トレース専用）
    cases/              case_id ごとのタスク定義・本部 JSON 等
    assets/             サーバー照合用画像など（リポジトリ相対パスで参照）
    static/             iframe 用 HTML 等の正本 → ビルド時に public/games/<slug>/ へ同期
```

**`public/games/`** は Next の配信ルール用のコピー先です。手で編集せず、`games/<slug>/static/` を編集して `npm run sync:games`（`predev` / `prebuild` で自動）を使ってください。

シグナル・トレースの任務ポータル用タスクエンジンは **`games/signal-trace/portal-engine/`** にあります（クリア条件・連鎖・照合フレームワーク）。

## ロードマップ（設計メモ）

1. **Phase 1** — `app/api/platform/check-answer` で gameId / stageId / answer を受け、マスタ（シート等）で判定。正解時のみ進捗更新。現状はスタブ；任務ポータルは従来の `validate-*` を継続利用。
2. **Phase 2** — iframe ↔ 親の postMessage（`SUBMIT_ANSWER`, `SAVE_DATA`）。`lib/platform/iframe-protocol.ts` を参照。親で `event.origin` 検証。
3. **Phase 3** — `public/games/<id>/` の直接アクセス抑止。`middleware.ts` で `/games/*` に Referer チェック（本番は Cookie 等で強化）。
4. **Phase 4** — `public/games/_template/index.html` をコピーして新ゲーム用 HTML を追加。React からゲームファイルを import しない。

## 禁止事項（目標）

- ゲーム側 JS に `if (input === "正解")` を置かない（判定は API）。
- クリア後アセット URL の推測対策（ハッシュ名 or API 経由取得を検討）。
