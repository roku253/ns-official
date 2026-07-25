# 公式サイト（Official site）

トップ `/`、作品一覧 `/works`、アカウント `/account` など、**プレイヤー向け公式ページ**と連動するコードです。

| パス | 役割 |
|------|------|
| `works-catalog.ts` | 静的 `data/official/stories.json` と GAS `publicGetWorksCatalog` のマージ |
| `use-official-bootstrap.ts` | 公式ページ用の初期ロード（カタログ取得・セッション判定） |
| `play-work-navigation.ts` | 「この作品をプレイ」→ `case_id` 保存して `/play/<caseId>` へ |

設定データ: `data/official/stories.json`（作品メタ・並び・featured 等のベース）。

UI コンポーネントは `components/official-site/` を参照してください。
