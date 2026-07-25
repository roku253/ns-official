/**
 * NS Official CMS — Apps Script 貼り付け用断片
 *
 * 既存の doPost ルーティングに以下を追加し、NSPlatform シート（または同等）に
 * `news` 列／プロパティを保持してください。works_catalog は既存の get/set を
 * JSON 丸ごと透過保存すれば詳細フィールド（detail 等）も保持されます。
 *
 * 必要なアクション:
 *   - publicGetNews
 *   - adminGetNews
 *   - adminSetNews
 *
 * 既存のまま透過でよいもの:
 *   - publicGetWorksCatalog / adminGetWorksCatalog / adminSetWorksCatalog
 */

// --- 例: プロパティサービスに news JSON を置く簡易実装 ---
// 本番ではスプレッドシートの NSPlatform!news セル等に合わせて読み書きしてください。

function cmsReadNews_() {
  const raw = PropertiesService.getScriptProperties().getProperty("NS_OFFICIAL_NEWS")
  if (!raw) {
    return { items: [] }
  }
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object") return parsed
  } catch (e) {
    /* ignore */
  }
  return { items: [] }
}

function cmsWriteNews_(news) {
  const payload = news && typeof news === "object" ? news : { items: [] }
  payload.updatedAt = new Date().toISOString()
  PropertiesService.getScriptProperties().setProperty("NS_OFFICIAL_NEWS", JSON.stringify(payload))
  return payload
}

/**
 * doPost 内の switch / if チェーンに組み込む例:
 *
 *   if (action === "publicGetNews") {
 *     return json_({ success: true, news: cmsReadNews_() });
 *   }
 *   if (action === "adminGetNews") {
 *     assertAdmin_(body.adminKey);
 *     return json_({ success: true, news: cmsReadNews_() });
 *   }
 *   if (action === "adminSetNews") {
 *     assertAdmin_(body.adminKey);
 *     const saved = cmsWriteNews_(body.news);
 *     return json_({ success: true, news: saved, message: "保存しました。" });
 *   }
 *
 * publicGetNews は published === false の項目を落としてもよいが、
 * 公式サイト側でもフィルタするため、そのまま返しても問題ない。
 */
