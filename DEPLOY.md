# デプロイ手順（公式 ↔ ここにいる）

## 本番 URL（現行）

| 役割 | URL / プロジェクト |
|------|-------------------|
| 公式 | https://nazo-portal.vercel.app （Vercel: `nazo-portal` ← GitHub `roku253/ns-official`） |
| 作品 | https://koko-ni-iru.vercel.app （Vercel: `koko-ni-iru`） |
| プレイ入口 | https://nazo-portal.vercel.app/play/koko-ni-iru → rewrite → 作品 |

## 公式の正本

- ローカル: `D:\謎解き\公式サイト`
- GitHub: https://github.com/roku253/ns-official
- Vercel Root Directory: リポ直下（空 / `.`）
- **`メイン画面/main-portal-next` への同期は不要**

```bash
cd "D:\謎解き\公式サイト"
# 変更を push すれば Production が自動デプロイ
git add -A && git commit -m "..." && git push

# または CLI
npx vercel --prod
```

環境変数: `GAS_*`, `ADMIN_PORTAL_KEY`（Claude は公式には不要）

## 作品アプリ

```bash
cd "D:\謎解き\作品\ここにいる"
npx vercel --prod --yes
```

環境変数: `NEXT_PUBLIC_GAS_URL`, `GAS_WEBAPP_URL`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_OFFICIAL_ORIGIN`

## rewrite

[`vercel.json`](./vercel.json) は作品 Production を指す:

```json
{
  "rewrites": [
    {
      "source": "/play/koko-ni-iru",
      "destination": "https://koko-ni-iru.vercel.app/play/koko-ni-iru"
    },
    {
      "source": "/play/koko-ni-iru/:path*",
      "destination": "https://koko-ni-iru.vercel.app/play/koko-ni-iru/:path*"
    }
  ]
}
```

## API 経路

| パス | 担当 |
|------|------|
| `/api/gas` | 公式（公式ページ用）。作品プレイ中は `/play/koko-ni-iru/api/gas`（作品側にも同 API あり） |
| `/api/platform/*` | 公式（token-gate / entitlement） |
| `/play/koko-ni-iru/api/player/*` | 作品（rewrite 経由で到達） |

## 確認チェック

- [ ] 公式ログイン → works プレイ → `/play/koko-ni-iru`
- [ ] バーガー「続きから」
- [ ] 家ボタンで公式トップへ
- [ ] 班長チャット / token-gate

## ローカル同時起動

```bash
cd "D:\謎解き\公式サイト" && npm run dev
cd "D:\謎解き\作品\ここにいる" && npm run dev -- -p 3001
```
