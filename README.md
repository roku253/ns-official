# NS 公式サイト

謎解きブランドの**公式サイト専用** Next.js アプリです。

## 役割

- トップ / 作品一覧・詳細 / お知らせ / ログイン・登録
- 管理画面（`/admin`）
- GAS 中継（`/api/gas`）・プラットフォーム entitlement API
- 作品への入口: `/play/koko-ni-iru`（Vercel rewrite で作品アプリへ）

## 含めないもの

- 任務ポータル UI（`/portal`）
- `games/signal-trace`・班長チャット・player 正誤 API  
  → [`作品/ここにいる`](../作品/ここにいる)

## 開発

```bash
npm install
cp .env.example .env.local   # GAS_WEBAPP_URL / NEXT_PUBLIC_GAS_URL / ADMIN_PORTAL_KEY
npm run dev                  # http://localhost:3000
```

## デプロイ

手順・env・確認項目は [`DEPLOY.md`](./DEPLOY.md)。

- Vercel: `nazo-portal`（https://nazo-portal.vercel.app）
- rewrite 先: `https://koko-ni-iru.vercel.app/play/koko-ni-iru`
- Apps Script 正本: この配下の `apps-script/`

## 旧モノリス

以前の一体型は `メイン画面/` にアーカイブ（[`ARCHIVE.md`](../メイン画面/ARCHIVE.md)）。
