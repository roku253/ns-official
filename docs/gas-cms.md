# 公式 CMS（お知らせ・作品カタログ）GAS 連携

運営コンソールからお知らせと作品詳細をデプロイなしで更新するための契約です。

## 必要なアクション

| action | 認証 | 説明 |
|--------|------|------|
| `publicGetNews` | 不要 | `{ success, news: { items: NewsItem[] } }` |
| `adminGetNews` | `adminKey` | 同上（下書き含む全件） |
| `adminSetNews` | `adminKey` | body.`news` を保存 |
| `publicGetWorksCatalog` | 不要 | 既存。JSON を丸ごと返す（未知キーを落とさない） |
| `adminGetWorksCatalog` / `adminSetWorksCatalog` | `adminKey` | 既存。詳細上書きフィールドを保持 |

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

## 作品カタログの拡張フィールド

`works.<engine>.stories.<caseId>`（およびレガシー `overrides.<caseId>`）に:

- `title` / `tagline` / `subtitle` / `status` / `coverImage`
- `detail`: `{ estimatedPlayMinutesMin, estimatedPlayMinutesMax, genres[], longDescription[], screenshots[{src,alt}] }`

既存の公開フラグ・`featuredId` はそのままです。

## デプロイ手順

1. [gas/cms-actions.gs](../gas/cms-actions.gs) の関数を Apps Script プロジェクトに貼る（または同等のシート読み書きに置き換え）
2. `doPost` に `publicGetNews` / `adminGetNews` / `adminSetNews` を追加
3. ウェブアプリとして再デプロイ（新しいデプロイ URL が発行されたら Vercel / `.env` の GAS URL を更新）
4. `/admin/news` で保存 → 公式 `/news` をリロードして反映を確認
5. `/admin/works` で詳細を保存 → 作品詳細ページで反映を確認

## フォールバック

GAS 未対応・通信失敗時、公式サイトは `data/official/news.json` と静的 `stories.json` を使います。
