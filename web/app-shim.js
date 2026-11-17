/* App 版：頁面最先執行。把網頁原本讀「同網站」的資料檔改成讀 GitHub Pages，
   並擋掉網頁版的「有新版就重新整理」檢查（App 的更新走 App Store）。
   桃機 API、TDX、Cloudflare 中繼照常連；App 有開 CapacitorHttp，不會被 CORS 擋。 */
(function () {
  // 11/15 起網頁版有「班機樣式」選單（設定裡，記在 cth1）。App 第一次開預設用「螢光」，之後照使用者自己選的
  try { if (!localStorage.getItem('cth1')) { localStorage.setItem('cth1', 'cyber'); localStorage.setItem('rth1', 'H'); } } catch (e) {}   // 雷達樣式也配螢光（H）
  window.__APPV = true;   // 網頁版看到這個，就不重複加 App 已經有的開會設定、時段鍵、提醒
  window.__news = 1;      // 網頁版的「更新資訊」視窗講的是網頁改版，App 不跳
  var BASE = 'https://xsos32-design.github.io/T2arrival21402153/';
  var REMOTE = /^(data|snap|pax|imm|meta)\.json/;
  var nf = window.fetch.bind(window);
  window.__APP = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  window.fetch = function (u, o) {
    var s = String((u && u.url) || u);
    if (/^ver\.json/.test(s)) return Promise.resolve(new Response('{}', { status: 404 }));
    if (REMOTE.test(s)) return nf(BASE + s, o);
    return nf(u, o);
  };
})();
