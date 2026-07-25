# デプロイ手順（公式 ↔ ここにいる）

## 本番 URL（現行）

| 役割 | URL / プロジェクト |
|------|-------------------|
| 公式 | https://nazo-portal.vercel.app （Vercel: `nazo-portal`） |
| 作品 | https://koko-ni-iru.vercel.app （Vercel: `koko-ni-iru`） |
| プレイ入口 | https://nazo-portal.vercel.app/play/koko-ni-iru → rewrite → 作品 |

## 1. 作品アプリを Vercel に載せる

```bash
cd "D:\謎解き\作品\ここにいる"
npx vercel --yes
# 本番:
npx vercel --prod --yes
```

環境変数（公式と同じ GAS + 作品のみ Claude）:

- `NEXT_PUBLIC_GAS_URL`
- `GAS_WEBAPP_URL`
- `ANTHROPIC_API_KEY`

## 2. 公式の rewrite

[`vercel.json`](./vercel.json) は本番先を固定済み:

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

作品の Production ホストが変わったら、ここを更新して公式を再デプロイする。

## 3. 公式をデプロイ

```bash
cd "D:\謎解き\公式サイト"
npx vercel --prod --yes
```

**注意:** 既存 `nazo-portal` の Root Directory が `main-portal-next` のままの場合、Git 連携デプロイは `D:\謎解き\メイン画面\main-portal-next` 経由になる。そのときは:

1. `公式サイト` の変更を `メイン画面\main-portal-next` に同期して push する、または
2. Vercel の Root Directory を空／`公式サイト` に変更してからこのフォルダをリンクする

環境変数: `GAS_*`, `ADMIN_PORTAL_KEY`（Claude は公式には不要）

## 4. API 経路

| パス | 担当 |
|------|------|
| `/api/gas` | 公式（公式ページ用）。作品プレイ中は `/play/koko-ni-iru/api/gas`（作品側にも同 API あり） |
| `/api/platform/*` | 公式（token-gate / entitlement） |
| `/play/koko-ni-iru/api/player/*` | 作品（rewrite 経由で到達） |

## 5. 確認チェック

- [x] 作品単体: https://koko-ni-iru.vercel.app/play/koko-ni-iru → `/portal` へ
- [x] rewrite: https://nazo-portal.vercel.app/play/koko-ni-iru → 公式ドメインのまま任務 UI
- [x] `/api/gas` が公式で応答する
- [x] `/play/koko-ni-iru/api/player/*` が rewrite 経由で作品に届く（HEAD で 405 = ルート存在）
- [ ] ログイン後、一覧の「プレイ」で調査継続（localStorage 共有）
- [ ] 班長チャット（作品側 `ANTHROPIC_API_KEY`）
- [ ] 作中サイト token-gate（`TOKEN_GATE_ORIGIN` = `https://nazo-portal.vercel.app` のまま）

## ローカル同時起動

```bash
# 公式 :3000
cd "D:\謎解き\公式サイト" && npm run dev

# 作品 :3001
cd "D:\謎解き\作品\ここにいる" && npm run dev -- -p 3001
# → http://localhost:3001/play/koko-ni-iru
```

ローカルで rewrite まで試す場合は、公式 `next.config` の rewrites で `http://localhost:3001` を向けるか、Vercel Preview を使う。
