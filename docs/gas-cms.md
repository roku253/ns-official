# 公式 CMS（お知らせ・作品カタログ）GAS 連携

運営コンソールからお知らせと作品をデプロイなしで更新するための契約です。

## 必要なアクション

| action | 認証 | 説明 |
|--------|------|------|
| `publicGetNews` | 不要 | `{ success, news: { items: NewsItem[] } }` |
| `adminGetNews` | `adminKey` | 同上（下書き含む全件） |
| `adminSetNews` | `adminKey` | body.`news` を保存 |
| `publicGetWorksCatalog` | 不要 | 既存。JSON を丸ごと返す（未知キーを落とさない） |
| `adminGetWorksCatalog` / `adminSetWorksCatalog` | `adminKey` | 既存。`cmsStories` など未知キーを保持 |

## NewsItem

```json
{
  "id": "2026-07-25-abc12",
  "date": "2026-07-25",
  "category": "お知らせ",
  "title": "タイトル",
  "body": "本文",
  "published": true
}
```

`published: false` は運営下書き。公開サイトには出ません。

## 作品カタログ

### コンソールでできること（`/admin/works`）

- **新規追加**（ID を指定して CMS 作品を作成）
- **削除**（CMS 追加分のみ。リポジトリ同梱の `ここにいる` 等は非公開のみ）
- 公開オンオフ・トップおすすめ
- タイトル / 詳細
- カバー・スクショ（**ドラッグ＆ドロップ** → Vercel Blob、または URL）
- **同一ログインでプレイ**: 作品デプロイ origin（例 `https://….vercel.app`）を入れると、公式 `/play/<id>` 経由で転送（別オリジン直リンクはログイン切れ）

ゲーム本体の ZIP アップロードはしません。作品アプリは別デプロイし、公式には「一覧メタ + プレイ紐づけ」だけ載せます。

画像UPには環境変数 `BLOB_READ_WRITE_TOKEN`（Vercel Storage → Blob）が必要です。

### 保存フィールド

`works.<engine>.stories.<caseId>` およびレガシー `overrides.<caseId>`:

- `title` / `tagline` / `subtitle` / `status` / `coverImage`
- `upstreamOrigin`（作品デプロイ origin） / `externalUrl`（通常は `/play/<id>` 自動） / `tokenResource` / `gameKind` / `sortOrder` / `theme` / `enginePackage`
- `detail`: `{ estimatedPlayMinutesMin, estimatedPlayMinutesMax, genres[], longDescription[], screenshots[{src,alt}] }`

保存時にトップレベル `playBindings`（`{ "<id>": { "upstreamOrigin": "…" } }`）も再構築します。公式 `proxy.ts` が `/play/*` 転送に使います。

コンソール追加作品のフル定義は `cmsStories.<caseId>` にも保持します（静的 `stories.json` に無い ID）。

既存の公開フラグ・`featuredId` はそのままです。

## デプロイ手順

1. GAS エディタの `コード.gs` を [gas/コード.gs](../gas/コード.gs) の内容で置き換える（ファイル全体をコピー＆ペースト）
2. ウェブアプリとして再デプロイ（新しいデプロイ URL が発行されたら Vercel / `.env` の GAS URL を更新）
3. `/admin/news` で保存 → 公式 `/news` をリロードして反映を確認
4. `/admin/works` で作品を追加・保存 → 一覧・詳細・プレイ先を確認

保存先は `NSPlatform` シートの `key=news` / `works_catalog`（同じ key/value 方式）。

断片だけ欲しい場合は [gas/cms-actions.gs](../gas/cms-actions.gs) を参照（統合済み本体は `gas/コード.gs`）。

## フォールバック

GAS 未対応・通信失敗時、公式サイトは `data/official/news.json` と静的 `stories.json` を使います（CMS 追加作品は GAS 必須）。
