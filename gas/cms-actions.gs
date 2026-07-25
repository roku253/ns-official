/**
 * NS Official CMS — お知らせ（断片リファレンス）
 *
 * フル統合済み本体は gas/コード.gs。
 * NSPlatform シートの key/value に works_catalog と同様に news を保存する。
 * このファイルは参照用断片。本番は gas/コード.gs を GAS エディタへ丸ごと反映すること。
 */

var NS_PLATFORM_KEY_NEWS = "news";

function publicGetNews() {
  var raw = readPlatformKeyValue(NS_PLATFORM_KEY_NEWS);
  var news = { items: [] };
  if (raw) {
    try {
      news = JSON.parse(raw);
    } catch (e) {
      news = { items: [] };
    }
  }
  if (!news || typeof news !== "object") news = { items: [] };
  if (!Array.isArray(news.items)) news.items = [];
  return { success: true, news: news };
}

function adminGetNews(data) {
  var key = String(data.adminKey || "").trim();
  var expected = getAdminPortalKey();
  if (!expected) {
    return { success: false, message: "GAS に ADMIN_PORTAL_KEY（Script Properties）が未設定です。" };
  }
  if (key !== expected) {
    return { success: false, message: "認証に失敗しました。" };
  }
  return publicGetNews();
}

function adminSetNews(data) {
  var key = String(data.adminKey || "").trim();
  var expected = getAdminPortalKey();
  if (!expected) {
    return { success: false, message: "GAS に ADMIN_PORTAL_KEY（Script Properties）が未設定です。" };
  }
  if (key !== expected) {
    return { success: false, message: "認証に失敗しました。" };
  }
  var news = data.news;
  if (!news || typeof news !== "object") news = { items: [] };
  if (!Array.isArray(news.items)) news.items = [];
  news.updatedAt = new Date().toISOString();
  writePlatformKeyValue(NS_PLATFORM_KEY_NEWS, JSON.stringify(news));
  return { success: true, news: news, message: "お知らせを保存しました。" };
}

/*
 * --- MUTATING_ACTIONS に追加 ---
 *   adminSetNews: true,
 *
 * --- routeAction_ に追加（adminSetWorksCatalog の近くが分かりやすい）---
 *   } else if (data.action === "publicGetNews") {
 *     return publicGetNews();
 *   } else if (data.action === "adminGetNews") {
 *     return adminGetNews(data);
 *   } else if (data.action === "adminSetNews") {
 *     return adminSetNews(data);
 */
