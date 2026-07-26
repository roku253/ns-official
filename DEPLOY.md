# デプロイ手順（公式 ↔ ここにいる）

## 本番 URL（現行）

| 役割 | URL / プロジェクト |
|------|-------------------|
| 公式 | https://nazo-portal.vercel.app （Vercel: `nazo-portal` ← GitHub `roku253/ns-official`） |
| 作品 | https://koko-ni-iru.vercel.app （Vercel: `koko-ni-iru`） |
| プレイ | 公式コンソール／カタログの **プレイ先 URL** → 作品へ直接遷移（rewrite なし） |

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

## 作品の紐づけ

公式はゲームをホストしません。`/admin/works` の **プレイ先 URL**（静的シードは `manifest.json` の `catalog.externalUrl`）で作品アプリへ飛ばします。

例（ここにいる）: `https://koko-ni-iru.vercel.app/play/koko-ni-iru`

## API 経路

| パス | 担当 |
|------|------|
| `/api/gas` | 公式（公式ページ用） |
| `/api/platform/*` | 公式（token-gate / entitlement） |
| 作品側 `/api/*` | 作品アプリ（独自オリジン） |

## 確認チェック

- [ ] 公式ログイン → works プレイ → 作品オリジンへ遷移
- [ ] バーガー「続きから」
- [ ] 家ボタンで公式トップへ
- [ ] 班長チャット / token-gate

## ローカル同時起動

```bash
cd "D:\謎解き\公式サイト" && npm run dev
cd "D:\謎解き\作品\ここにいる" && npm run dev -- -p 3001
```

ローカルでは `/admin/works` のプレイ先を `http://127.0.0.1:3001/play/koko-ni-iru` に一時変更して確認できます。
