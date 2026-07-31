# デプロイ手順（公式 ↔ ここにいる）

## 本番 URL（現行）

| 役割 | URL / プロジェクト |
|------|-------------------|
| 公式 | https://nazo-portal.vercel.app （Vercel: `nazo-portal` ← GitHub `roku253/ns-official`） |
| 作品 | https://koko-ni-iru.vercel.app （Vercel: `koko-ni-iru`） |
| プレイ | https://nazo-portal.vercel.app/play/koko-ni-iru → rewrite → 作品（**同一オリジン**でログイン維持） |

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

## 作品の紐づけ

コンソールの **プレイ先 URL** は次のどちらか:

1. **同一オリジン経路（推奨・ここにいる）**: `/play/koko-ni-iru`  
   → [`vercel.json`](./vercel.json) の rewrite で作品へ転送。ログイン情報が残る。
2. **別オリジンの絶対 URL**: 別デプロイ作品向け。ログイン共有は別途必要。

`https://koko-ni-iru.vercel.app/...` を直書きすると別オリジンになり、任務ポータルが未ログイン扱いで公式へ戻します。公式側はこれを `/play/koko-ni-iru` に正規化します。

## rewrite

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

## 確認チェック

- [ ] 公式ログイン → プレイ → 任務ポータル（公式ドメインのまま）
- [ ] バーガー「続きから」
- [ ] 家ボタンで公式トップへ

## ローカル同時起動

```bash
cd "D:\謎解き\公式サイト" && npm run dev
cd "D:\謎解き\作品\ここにいる" && npm run dev -- -p 3001
```

ローカルでは rewrite が効かないので、プレイ先を `http://127.0.0.1:3001/play/koko-ni-iru` にするか、本番相当の proxy を別途用意してください。
