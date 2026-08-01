# デプロイ手順（公式 ↔ ここにいる）

## 本番 URL（現行）

| 役割 | URL / プロジェクト |
|------|-------------------|
| 公式 | https://nazo-portal.vercel.app （Vercel: `nazo-portal` ← GitHub `roku253/ns-official`） |
| 作品 | https://koko-ni-iru.vercel.app （Vercel: `koko-ni-iru`） |
| プレイ | https://nazo-portal.vercel.app/play/koko-ni-iru → proxy rewrite → 作品（**同一オリジン**でログイン維持） |

## 公式の正本

- ローカル: `D:\謎解き\公式サイト`
- GitHub: https://github.com/roku253/ns-official
- Vercel Root Directory: リポ直下（空 / `.`）

```bash
cd "D:\謎解き\公式サイト"
git add -A && git commit -m "..." && git push
```

環境変数: `GAS_*`, `ADMIN_PORTAL_KEY`, 画像UP用 `BLOB_READ_WRITE_TOKEN`

## 作品アプリ

```bash
cd "D:\謎解き\作品\ここにいる"
npx vercel --prod --yes
```

環境変数: `NEXT_PUBLIC_GAS_URL`, `GAS_WEBAPP_URL`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_OFFICIAL_ORIGIN`

## 作品の紐づけ（コンソール）

`/admin/works` で **作品デプロイ origin** を設定する（例: `https://koko-ni-iru.vercel.app`）。

- 公式プレイ経路は常に `/play/<作品ID>`（自動）
- `proxy.ts` がカタログの `upstreamOrigin` / `playBindings` を読み、`/play/<id>/*` を作品へ rewrite
- 静的フォールバック: `stories.json` の `upstreamOrigin`（ここにいるは本番 origin 入り）
- ローカル上書き: 環境変数 `PLAY_UPSTREAM_KOKO_NI_IRU=http://127.0.0.1:3001`

作品ドメイン直リンクは別オリジンになりログインが切れます。コンソールが origin を入れた作品は `/play/<id>` に正規化します。

## 確認チェック

- [ ] 公式ログイン → プレイ → 任務ポータル（公式ドメインのまま）
- [ ] バーガー「続きから」
- [ ] 家ボタンで公式トップへ

## ローカル同時起動

```bash
cd "D:\謎解き\公式サイト" && npm run dev
cd "D:\謎解き\作品\ここにいる" && npm run dev -- -p 3001
```

`.env.local` に `PLAY_UPSTREAM_KOKO_NI_IRU=http://127.0.0.1:3001` を入れると、公式の `/play/koko-ni-iru` がローカル作品へ転送されます。
