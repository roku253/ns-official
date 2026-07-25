# ゲームパッケージ（カタログ用スタブ）

公式サイト用の **最小スタブ**のみ。プレイ本体は `作品/ここにいる` デプロイ。

```
games/signal-trace/
  cases/koko-ni-iru/manifest.json   … カタログ・ルーティング生成の元
  static/cover-*.webp, playview-*   … → public/games/signal-trace/
```

`npm run generate:games` / `npm run sync:games` で stories と静的配信を更新。  
文面の運用編集は `/admin/works`（GAS）。
