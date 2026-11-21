/* 桃機出入境看板 App 版
   - 免費版：只看現在起 4 小時、陽春清單、登機門群組 2 組、回報文字只能看
   - 訂閱版：時段隨意切換、狀態顏色、人數、提醒…（Apple App 內購買，自動續訂）
   - 兩版都有 AdMob 底部橫幅
   上架前要換掉的設定都在 CONFIG。 */
(function () {
  'use strict';
  var CONFIG = {
    // App Store Connect 裡建立的兩個自動續訂商品（同一個訂閱群組）
    products: {
      monthly: 'tw.xsos32.t2board.pro.monthly',
      yearly: 'tw.xsos32.t2board.pro.yearly'
    },
    // AdMob 橫幅廣告單元（11/16 建立）：iOS 用小韋自己的；Android 還沒建 AdMob App，先用 Google 測試 ID
    bannerId: (window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() === 'android')
      ? 'ca-app-pub-3940256099942544/6300978111'
      : 'ca-app-pub-7535692982479289/1491072768',
    // true＝只顯示測試廣告（自己測試時不會被算成無效點擊）。送審前改成 false，才會有真的廣告和收入
    adTesting: false,
    // 1.2：獎勵廣告「看廣告解鎖 2 小時」，每天最多 2 次（不含 Apple Watch，手錶只看 Apple 訂閱）
    rewardId: 'ca-app-pub-7535692982479289/5682516489',
    rewardHours: 2,
    rewardPerDay: 2,
    // 1.3：免費版每 1 小時一則全螢幕廣告（看完繼續用免費版）；訂閱完整版完全沒有廣告
    interstitialId: 'ca-app-pub-7535692982479289/9311353460',
    interstitialEveryMin: 60,
    privacyUrl: 'https://xsos32-design.github.io/T2arrival21402153/preview/privacy.html',
    termsUrl: 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
    manageUrl: 'https://apps.apple.com/account/subscriptions',
    // 網頁版（綠界付款，單次買 30 天／365 天）：付款與啟用碼查詢都在這個 Cloudflare Worker
    payApi: 'https://tpe-pay.xsos32.workers.dev',
    pricingUrl: 'https://xsos32-design.github.io/T2arrival21402153/preview/pricing.html'
  };

  var D = document, B = D.body, W = window;
  var P = (W.Capacitor && W.Capacitor.Plugins) || {};
  var IAP = P.NativePurchases, ADS = P.AdMob, LN = P.LocalNotifications;
  var NATIVE = !!W.__APP;
  var WEB = !NATIVE && !!W.__WEBPAY;   // 網頁正式版：用啟用碼解鎖
  var pro = false, bypass = false, subPro = false;

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ───────── 訂閱狀態 ───────── */
  function cachedPro() {
    var until = +ls('proUntil') || 0;
    return until > Date.now();
  }
  /* 網頁版：啟用碼（付款完成頁會用 #code=… 帶回來） */
  function webCode(v) { if (v !== undefined) ls('webCode', v ? String(v).toUpperCase().replace(/[^A-Z0-9]/g, '') : null); return ls('webCode') || ''; }
  (function () { var m = /[#&]code=([A-Za-z0-9-]+)/.exec(location.hash || ''); if (m) { webCode(m[1]); try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} } })();
  function webCheck() {
    var c = webCode(); if (!c) { ls('proUntil', null); return Promise.resolve(false); }
    return fetch(CONFIG.payApi + '/check?code=' + encodeURIComponent(c), { cache: 'no-store' }).then(function (r) { return r.json(); })
      .then(function (j) { ls('proUntil', j && j.ok ? String(j.until) : null); return !!(j && j.ok); })
      ['catch'](function () { return cachedPro(); });
  }
  function checkPro() {
    if (WEB) return webCheck();
    if (!NATIVE || !IAP) return Promise.resolve(ls('devPro') === '1'); // 瀏覽器測試用
    var ids = [CONFIG.products.monthly, CONFIG.products.yearly];
    return IAP.getPurchases({ productType: 'subs' }).then(function (r) {
      var best = 0;
      ((r && r.purchases) || []).forEach(function (p) {
        if (ids.indexOf(p.productIdentifier) < 0) return;
        var exp = p.expirationDate ? Date.parse(p.expirationDate) : 0;
        if (p.isActive === true || exp > Date.now() || p.purchaseState === '1') best = Math.max(best, exp || Date.now() + 864e5);
      });
      ls('proUntil', best ? String(best) : null);
      return best > 0;
    })['catch'](function () { return cachedPro(); }); // 沒網路：用上次確認到的到期日
  }

  /* ───────── 看廣告解鎖（1.2）───────── */
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function rewardUntil() { return +ls('rwUntil') || 0; }
  function rewardActive() { return rewardUntil() > Date.now(); }
  function rewardUsed() { var v = (ls('rwDay') || '').split('|'); return v[0] === today() ? (+v[1] || 0) : 0; }
  function rewardLeft() { return Math.max(0, CONFIG.rewardPerDay - rewardUsed()); }
  function rewardGrant() {
    ls('rwDay', today() + '|' + (rewardUsed() + 1));
    ls('rwUntil', String(Math.max(Date.now(), rewardUntil()) + CONFIG.rewardHours * 3600e3));
    applyTier(subPro);
  }
  function rewardLabel() { var m = Math.max(0, Math.ceil((rewardUntil() - Date.now()) / 60000)); return '試用 ' + Math.floor(m / 60) + ':' + ('0' + (m % 60)).slice(-2); }
  var rwBusy = false;
  function watchReward() {
    if (!NATIVE || !ADS) { msg('App 裡才能看廣告解鎖'); return; }
    if (rwBusy) return;
    if (!rewardLeft()) { msg('今天的 ' + CONFIG.rewardPerDay + ' 次已經用完，明天再來，或直接訂閱'); return; }
    rwBusy = true; msg('廣告載入中…');
    var got = false, granted = false, hs = [];
    function done() { rwBusy = false; hs.forEach(function (h) { try { h.remove(); } catch (e) {} }); }
    function finish() {
      if (granted) return;
      if (got) { granted = true; rewardGrant(); msg('已解鎖完整版 ' + CONFIG.rewardHours + ' 小時'); setTimeout(function () { var p = D.getElementById('paywall'); if (p) p.remove(); }, 1200); }
      else msg('要看完廣告才能解鎖');
      done();
    }
    Promise.all([
      ADS.addListener('onRewardedVideoAdReward', function () { got = true; }),
      ADS.addListener('onRewardedVideoAdDismissed', function () { setTimeout(finish, 300); }),
      ADS.addListener('onRewardedVideoAdFailedToShow', function () { msg('廣告播放失敗，請稍後再試'); done(); })
    ]).then(function (a) { hs = a; return ADS.prepareRewardVideoAd({ adId: CONFIG.rewardId, isTesting: CONFIG.adTesting }); })
      .then(function () { msg(''); return ADS.showRewardVideoAd(); })
      .then(function () { got = true; })
      ['catch'](function () { msg('目前沒有可以看的廣告，請稍後再試'); done(); });
  }
  setInterval(function () {
    if (pro && !subPro && !rewardActive()) applyTier(subPro);   // 試用時間到，回到免費版
    else if (pro && !subPro) { var pb = D.getElementById('probtn'); if (pb) pb.textContent = rewardLabel(); }
  }, 30000);

  /* ───────── 1.2：讓人知道分類名稱／顏色可以改 ───────── */
  function catLabel() {   // 設定裡的標題寫清楚可以改顏色
    [].forEach.call(D.querySelectorAll('details > summary'), function (sm) {
      if (/分類設定（名稱／登機門）/.test(sm.innerHTML)) sm.innerHTML = sm.innerHTML.replace('分類設定（名稱／登機門）', '分類設定（名稱／顏色／登機門）');
    });
  }
  function tip(t) {
    var el = D.createElement('div'); el.className = 'app-tip'; el.setAttribute('role', 'status');
    el.innerHTML = '<span>' + t + '</span><button type="button">知道了</button>';
    el.querySelector('button').onclick = function () { el.remove(); };
    B.appendChild(el); setTimeout(function () { if (el.parentNode) el.remove(); }, 12000);
  }
  function catTip() {   // 第一次變成完整版（訂閱或看廣告）時提示一次
    if (!pro || ls('tipCat')) return;
    ls('tipCat', '1');
    setTimeout(function () { tip('小提醒：分類的<b>名稱、顏色、登機門</b>都可以自己改，在「設定 › 分類設定」。'); }, 1500);
  }

  /* ───────── 1.3：分類設定同步到 Apple Watch ───────── */
  /* 11/21：外掛是 App 啟動後才註冊的，用到時才找（先找 Capacitor.Plugins，再用 registerPlugin） */
  var WSYNC = null;
  function wsPlugin() {
    if (WSYNC) return WSYNC;
    try { if (W.Capacitor && W.Capacitor.Plugins && W.Capacitor.Plugins.WatchSync) WSYNC = W.Capacitor.Plugins.WatchSync; } catch (e) {}
    try { if (!WSYNC && W.Capacitor && W.Capacitor.registerPlugin) WSYNC = W.Capacitor.registerPlugin('WatchSync'); } catch (e) {}
    return WSYNC;
  }
  var watchSent = '';
  function syncWatch() {
    if (!NATIVE || /depall\.html/.test(location.pathname)) return;
    var MH = W.webkit && W.webkit.messageHandlers && W.webkit.messageHandlers.watchSync;
    if (!MH && !wsPlugin()) { wsMsg('手錶同步：iPhone 端同步元件沒載入（稍後自動重試）', false); return; }
    try {
      var C = W.CATS || [], col = {};
      try { col = JSON.parse(ls('tpeCatCol1') || '{}') || {}; } catch (e) {}
      var DEF = ['#00F0FF', '#FF2A6D', '#8CF23A', '#7B78FF'], K = ['c0', 'c1', 'a2', 'a3'];
      var out = [0, 1, 2, 3].map(function (i) {
        var c = C[i] || {}, cc = col[K[i]];
        return { name: String(c.name || ''), spec: String(c.spec || ''), term: String(c.term || 'any'),
          color: /^#[0-9a-fA-F]{6}$/.test(cc || '') ? String(cc).toUpperCase() : DEF[i] };
      });
      // 出境分類：第 1、2 格跟入境共用；第 3、4 格是出境頁自己的（tpeCats1 的 3、4 格，顏色 d2／d3）
      var DD = [{ name: '一航', spec: '', term: '1' }, { name: '二航其他', spec: '', term: '2' }], dc = [];
      try { dc = JSON.parse(ls('tpeCats1') || '[]') || []; } catch (e) {}
      var dout = [0, 1, 2, 3].map(function (i) {
        if (i < 2) return out[i];
        var c = (dc.length === 4 && dc[i]) || DD[i - 2], cc = col['d' + i];
        return { name: String(c.name || DD[i - 2].name).slice(0, 12), spec: String(c.spec || ''), term: (c.term === '1' || c.term === 'any') ? c.term : '2',
          color: /^#[0-9a-fA-F]{6}$/.test(cc || '') ? String(cc).toUpperCase() : (i === 2 ? '#A78BFA' : '#9AA3B0') };
      });
      var dj = JSON.stringify(dout);
      var j = JSON.stringify(out); if (j + dj === watchSent) return;   // 每次打開 App 至少送一次（不記在手機上，免得以為送過了）
      var answered = false; setTimeout(function () { if (!answered) wsMsg('手錶同步：iPhone 端沒有回應（同步元件可能沒啟動）', false); }, 8000);
      /* 11/21：先走原生直接掛的 watchSync（不靠 Capacitor 外掛），結果由 window.__wsyncDone 回來 */
      var send = MH ? new Promise(function (res) { W.__wsyncDone = function (why) { res({ ok: why === 'ok', why: why }); }; MH.postMessage({ json: j, djson: dj }); })
                    : WSYNC.send({ json: j, djson: dj });
      send.then(function (r) { answered = true;
        if (r && r.ok) watchSent = j + dj;
        var why = { ok: '已傳到手錶', empty: '分類是空的', nosupport: '這支 iPhone 不支援手錶連線', inactive: '連線中…', unpaired: '這支 iPhone 沒有配對 Apple Watch', noapp: '手錶上還沒裝手錶版 App', error: '傳送失敗，稍後自動重試' };
        var d = new Date();
        wsMsg('手錶同步：' + (why[r && r.why] || (r && r.ok ? '已傳到手錶' : '稍後自動重試（' + String(r && r.why) + '）')) + ((r && r.ok) ? '（' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + '）' : ''), r && r.ok);
      })['catch'](function (e) { answered = true; wsMsg('手錶同步失敗：iPhone 端同步元件沒啟動（' + String(e && (e.message || e.code) || e) + '）', false); });
    } catch (e) { wsMsg('手錶同步失敗：' + String(e && e.message || e), false); }
  }
  /* 同步狀態顯示在兩個地方：分類設定裡、設定面板「分類設定」按鈕那一排下面（不用展開就看得到） */
  function wsMsg(t, ok) {
    W.__wsync = t;
    [['wsyncmsg', D.getElementById('catbox')], ['wsyncmsg2', (D.getElementById('tdcatset') || D.getElementById('snone')) && (D.getElementById('tdcatset') || D.getElementById('snone')).parentNode]].forEach(function (x) {
      var host = x[1]; if (!host || !host.parentNode) return;
      var el = D.getElementById(x[0]);
      if (!el) { el = D.createElement('div'); el.id = x[0]; el.style.cssText = 'font-size:12px;margin:6px 2px;font-weight:700'; host.parentNode.insertBefore(el, host.nextSibling); }
      el.style.color = ok ? '#49E3A3' : '#FFC53D';
      el.textContent = t;
    });
  }
  setTimeout(syncWatch, 3000); setInterval(syncWatch, 10000);

  /* ───────── 免費／訂閱切換畫面 ───────── */
  function clickQuiet(el) { if (!el) return; bypass = true; try { el.click(); } finally { bypass = false; } }
  function applyTier(isPro) {
    subPro = !!isPro; tierKnown = true;
    pro = subPro || rewardActive();
    try { catLabel(); catTip(); paintRewardBar(); syncBanner(); } catch (e) {}
    B.classList.toggle('tier-free', !pro);
    W.__FREE3 = !pro;
    var pb = D.getElementById('probtn');
    if (pb) { pb.textContent = subPro ? '已訂閱' : (pro ? rewardLabel() : '訂閱'); pb.classList.toggle('on', pro); }
    var dv = D.getElementById('devtier'); if (dv) dv.textContent = '測試：' + (pro ? '訂閱版' : '免費版');
    // 班機樣式（設定 › 外觀樣式）是訂閱功能：免費版固定「螢光」；之前訂閱時選的樣式先記著，再訂閱時換回來
    try {
      var curTh = ls('cth1') || '0';
      if (!pro && curTh !== 'cyber') { ls('cth1pro', curTh); if (W.__cthSet) W.__cthSet('cyber'); else { ls('cth1', 'cyber'); ls('rth1', 'H'); } }
      if (pro && ls('cth1pro')) { var back = ls('cth1pro'); ls('cth1pro', null); if (W.__cthSet) W.__cthSet(back); else ls('cth1', back); }
    } catch (e) {}
    try {
      if (!pro) {
        if (W.hideDone) clickQuiet(D.getElementById('hide'));
        [].forEach.call(D.querySelectorAll('#shopslot .chip'), function (c) { var i = +c.getAttribute('data-i'), on = c.classList.contains('act'); if ((i >= 2 && on) || (i < 2 && !on)) clickQuiet(c); }); // 免費版固定看前 2 組
        try { W.CUST = null; } catch (e) {}
        try { W.FOLD_OPEN = true; } catch (e) {}
        if (W.setNow6 && W.runNow6) { W.setNow6(true); W.runNow6(); }
      } else {
        try { W.FOLD_OPEN = false; } catch (e) {}
        if (W.now6Mode && W.runNow6) W.runNow6(); else if (W.render) W.render();
      }
    } catch (e) {}
  }
  // 免費版：點班機卡片不展開；保險起見也擋住被藏起來的訂閱功能
  var LOCKED = '#now6,#hide,#fNow,#cpgo,#fsearch,#cpM,#cpMset,#slotset,#tdsty,.throw .chip,.rdr,#dock button[data-k="radar"],#rmap,.chip[data-t],#custchip,#dTom,#shopslot .chip,#sall,#snone,#out .r,[data-cp]';
  D.addEventListener('click', function (e) {
    if (pro || bypass || !e.target.closest) return;
    if (e.target.closest('#paywall,#probtn,#fsmenu,#bigbtn')) return;
    if (e.target.closest(LOCKED)) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  // 免費版：回報文字照樣產生，但不自動複製
  if (typeof W.autoCopy === 'function') {
    var ac0 = W.autoCopy;
    W.autoCopy = function (t) { if (pro) return ac0(t); var m = D.getElementById('cpmsg'); if (m) m.innerHTML = '長按文字可以自己複製'; };
  }

  /* ───────── 標題列：訂閱鍵 ───────── */
  function addRewardBar() {   // 免費版：清單上方一條「看廣告免費用」
    if (!NATIVE || D.getElementById('rwbar')) return;
    var hd = D.querySelector('header'); if (!hd) return;
    var b = D.createElement('button'); b.type = 'button'; b.id = 'rwbar';
    b.onclick = openPaywall;
    hd.parentNode.insertBefore(b, hd.nextSibling);
    paintRewardBar();
  }
  function paintRewardBar() {
    var b = D.getElementById('rwbar'); if (!b) return;
    var n = rewardLeft();
    b.innerHTML = n ? '▶ 看廣告，免費用完整版 ' + CONFIG.rewardHours + ' 小時<small>今天還剩 ' + n + ' 次・每天最多 ' + (CONFIG.rewardPerDay * CONFIG.rewardHours) + ' 小時・點這裡看能用哪些功能</small>'
      : '今天的免費時間用完了<small>明天 0 點重新計算，或訂閱完整版不限時間</small>';
  }
  function addProButton() {
    var hd = D.querySelector('header'); if (!hd || D.getElementById('probtn')) return;
    var b = D.createElement('button'); b.type = 'button'; b.id = 'probtn'; b.textContent = '訂閱';
    b.onclick = openPaywall;
    var anchor = D.getElementById('bigbtn') || hd.querySelector('.live');
    hd.insertBefore(b, anchor || null);
  }

  /* ───────── 訂閱頁 ───────── */
  var UNOFFICIAL = '本 App 為個人開發的非官方工具，與桃園國際機場股份有限公司無關。班機資料來自桃園機場與交通部公開資料，預估人數為估計值，一律以現場與官方公告為準。';
  var RW_FEATURES = '全時段與明天的班機、狀態顏色、每班預估人數、人潮波段、門改延誤取消提醒、雷達地圖、搜尋、隱藏已抵達、分類名稱／顏色／登機門自訂、回報文字一鍵複製、10 種外觀樣式。';
  var FEAT = [['照實際落地時間排序', '提早、延誤後自動重排，下一班一眼看到'], ['每班預估人數', '人潮波段、到幾點前還有幾班幾人'],
    ['提早延誤・班距空檔', '表定差幾分鐘、哪段時間有空檔'], ['雷達地圖', '飛機在哪、離桃園還有幾公里'],
    ['分類名稱、登機門自己設', '照你的工作區域分組'], ['分類顏色自己選', '卡片、登機門、標籤一起變色'],
    ['群組回報一鍵複製', '幾點後的班機整理好，直接貼 LINE'], ['Apple Watch 手錶版', '抬手就知道下一班', WEB ? 'iPhone App 訂閱限定' : '只限訂閱']];
  var MORE = (WEB ? '' : '完全沒有廣告、') + '時段隨意切換（整天、自訂、明天）、門改延誤取消提醒、隱藏已抵達、搜尋班號或城市、10 種外觀樣式、班機抵達通知、開會時間自動排。';
  var FEATURES = [(WEB ? 'Apple Watch 手錶版（iPhone App 訂閱限定，網頁啟用碼不含）' : 'Apple Watch 手錶版（只限訂閱）'), '時段隨意切換：整天、自訂、明天、現在 6 小時', '狀態顏色、快到班機標示', '點卡片看機型、共用班號',
    '每班預估入境人數、國籍人數', '下一班落地、接下來 1 小時、空檔與門改提醒', '人潮提示、班距空檔虛線',
    '隱藏已抵達、搜尋班號或城市', '回報文字一鍵複製', '分類名稱、顏色、登機門自己改（設定 › 分類設定），不限組數', '班機抵達通知（iPhone 內建通知；網頁允許通知後也會跳）'];
  function openPaywall() {
    if (D.getElementById('paywall')) return;
    var el = D.createElement('div'); el.id = 'paywall'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '訂閱');
    el.innerHTML = '<div class="pw-in">'
      + '<div class="pw-top"><h2>' + (subPro ? '你已經是訂閱會員' : '訂閱完整版') + '</h2><button type="button" class="pw-x" id="pwX">關閉</button></div>'
      + '<div id="pwhero" aria-hidden="true"></div>'
      + '<div class="pw-feat">' + FEAT.map(function (f, i) { return '<div>' + (f[2] ? '<em>' + f[2] + '</em>' : '') + '<i style="background-position:' + (i * 100 / 7).toFixed(4) + '% 0"></i><b>' + f[0] + '</b><small>' + f[1] + '</small></div>'; }).join('') + '</div>'
      + '<div class="pw-more"><b>還有：</b>' + MORE + '</div>'
      + '<div class="pw-free">免費版：只看現在起 4 小時的班機清單、登機門群組 2 組，回報文字要自己複製' + (WEB ? '。' : '，有廣告（每 1 小時一則全螢幕廣告）。<b>訂閱完整版沒有任何廣告。</b>') + '</div>'
      + (!WEB && NATIVE && !subPro ? '<button type="button" class="pw-plan pw-rw" id="pwRw"><span>看廣告，免費用 ' + CONFIG.rewardHours + ' 小時<small>' + (rewardActive() ? '試用中，剩 ' + rewardLabel().replace('試用 ', '') + '・' : '') + '今天還可以 ' + rewardLeft() + ' 次・不含手錶版</small></span><b>▶</b></button>'
        + '<div class="pw-rwinfo"><b>看廣告可以用：</b>' + RW_FEATURES + '<br><b>每天免費時間：</b>每天 ' + CONFIG.rewardPerDay + ' 次，每次 ' + CONFIG.rewardHours + ' 小時（一天最多 ' + (CONFIG.rewardPerDay * CONFIG.rewardHours) + ' 小時），每天 0 點重新計算。<br>Apple Watch 手錶版只限訂閱。</div>' : '')
      + '<div class="pw-watch">⚠ ' + (WEB ? '網頁啟用碼<b>不含 Apple Watch</b>。手錶版只能在 iPhone App 內用 App Store 訂閱開通' : '<b>Apple Watch 手錶版</b>只能用這裡的 App Store 訂閱開通（網頁版付費不含手錶）') + '</div>'
      + (WEB ? webPlans() : (subPro ? '' : '<button type="button" class="pw-plan pw-best" id="pwY" disabled><em class="pw-badge" id="pwYbadge">最划算・年繳更省</em><span>年繳<small id="pwYsub">每年自動續訂</small></span><b id="pwYp">讀取中…</b></button>'
        + '<button type="button" class="pw-plan" id="pwM" disabled><span>月繳<small>每月自動續訂</small></span><b id="pwMp">讀取中…</b></button>'))
      + '<div class="pw-msg" id="pwMsg" role="status"></div>'
      + (WEB ? '<div class="pw-row"><a href="' + CONFIG.pricingUrl + '">方案與退款說明</a><a href="' + CONFIG.privacyUrl + '">隱私權政策</a></div>'
        + '<div class="pw-legal">網頁版以信用卡單次付款（綠界科技 ECPay），不會自動續扣；到期前會提醒你。付款完成後會給你一組啟用碼，換手機或換瀏覽器時輸入同一組即可。</div>'
      : '<div class="pw-row"><button type="button" class="pw-link" id="pwR">恢復購買</button>'
      + '<a href="' + CONFIG.manageUrl + '">管理或取消訂閱</a>'
      + '<a href="' + CONFIG.privacyUrl + '">隱私權政策</a><a href="' + CONFIG.termsUrl + '">使用條款（EULA）</a></div>'
      + '<div class="pw-legal">付款會從你的 Apple ID 帳戶扣款。訂閱會在每期結束前 24 小時內自動續訂並扣款，除非你在到期前至少 24 小時關閉自動續訂。'
      + '可以隨時到「設定 › Apple ID › 訂閱項目」管理或取消。</div>')
      + '<div class="pw-legal">' + UNOFFICIAL + '</div>'
      + '</div>';
    B.appendChild(el);
    D.getElementById('pwX').onclick = function () { el.remove(); };
    if (WEB) { webBind(); return; }
    D.getElementById('pwR').onclick = restore;
    var rw = D.getElementById('pwRw'); if (rw) rw.onclick = watchReward;
    if (!subPro) loadPrices();
  }
  function webPlans() {
    var c = webCode(), until = +ls('proUntil') || 0;
    var day = until ? new Date(until).toLocaleDateString('zh-TW') : '';
    return (pro && day ? '<div class="pw-free">完整版可以用到 <b>' + day + '</b>，啟用碼 ' + esc(c.replace(/(.{4})(?=.)/g, '$1-')) + '。下面買的天數會接在後面延長。</div>' : '')
      + '<button type="button" class="pw-plan pw-best" id="pwY"><em class="pw-badge">最划算・省 NT$90</em><span>365 天<small>平均每月不到 NT$83・比買 12 次 30 天省 NT$90</small></span><b>NT$990</b></button>'
      + '<button type="button" class="pw-plan" id="pwM"><span>30 天<small>單次付款・不自動續扣</small></span><b>NT$90</b></button>'
      + '<div class="pw-code"><label for="pwC">已經買過？輸入啟用碼</label><div><input id="pwC" autocomplete="off" autocapitalize="characters" placeholder="XXXX-XXXX-XXXX" value="' + esc(c ? c.replace(/(.{4})(?=.)/g, '$1-') : '') + '">'
      + '<button type="button" class="pw-link" id="pwCgo">啟用</button></div></div>';
  }
  function webBind() {
    function go(plan) { var c = webCode(); location.href = CONFIG.payApi + '/buy?plan=' + plan + (c ? '&code=' + encodeURIComponent(c) : ''); }
    D.getElementById('pwM').onclick = function () { msg('前往綠界付款頁…'); go('m'); };
    D.getElementById('pwY').onclick = function () { msg('前往綠界付款頁…'); go('y'); };
    D.getElementById('pwCgo').onclick = function () {
      var v = D.getElementById('pwC').value; if (!v.trim()) { msg('請輸入啟用碼'); return; }
      var old = webCode(); webCode(v); msg('確認中…');
      webCheck().then(function (ok) {
        if (ok) { applyTier(true); msg('已開通完整版'); setTimeout(function () { var p = D.getElementById('paywall'); if (p) p.remove(); }, 1000); }
        else { webCode(old || null); msg('這組啟用碼無效或已經到期'); }
      });
    };
  }
  function msg(t) { var m = D.getElementById('pwMsg'); if (m) m.textContent = t; }
  function loadPrices() {
    if (!NATIVE || !IAP) {
      msg('瀏覽器測試模式：按方案會直接切成訂閱版');
      ['M', 'Y'].forEach(function (k) { var b = D.getElementById('pw' + k); b.disabled = false; D.getElementById('pw' + k + 'p').textContent = '測試';
        b.onclick = function () { ls('devPro', '1'); applyTier(true); D.getElementById('paywall').remove(); }; });
      return;
    }
    var ids = [CONFIG.products.monthly, CONFIG.products.yearly];
    IAP.getProducts({ productIdentifiers: ids, productType: 'subs' }).then(function (r) {
      var map = {}; ((r && r.products) || []).forEach(function (p) { map[p.identifier] = p; });
      [['M', CONFIG.products.monthly], ['Y', CONFIG.products.yearly]].forEach(function (x) {
        var p = map[x[1]], b = D.getElementById('pw' + x[0]); if (!b) return;
        if (!p) { D.getElementById('pw' + x[0] + 'p').textContent = '暫時無法購買'; return; }
        D.getElementById('pw' + x[0] + 'p').textContent = p.priceString || p.price;
        b.disabled = false; b.onclick = function () { buy(x[1]); };
      });
      yearDeal(map[CONFIG.products.monthly], map[CONFIG.products.yearly]);
    })['catch'](function () { msg('讀不到價格，請確認網路後再開一次'); });
  }
  // 年繳省多少：用 App Store 回傳的實際價格算（不同國家價格不同，不寫死）
  function yearDeal(m, y) {
    var pm = m && +m.price, py = y && +y.price; if (!(pm > 0 && py > 0)) return;
    var save = Math.round((1 - py / (pm * 12)) * 100), cur = String((y.priceString || '').replace(/[\d.,\s]/g, '')) || '';
    var bd = D.getElementById('pwYbadge'), sb = D.getElementById('pwYsub');
    if (bd && save > 0) bd.textContent = '最划算・省 ' + save + '%';
    if (sb) sb.textContent = '平均每月 ' + cur + (Math.round(py / 12 * 10) / 10) + (save > 0 ? '・比月繳一年省 ' + cur + Math.round(pm * 12 - py) : '') + '・每年自動續訂';
  }
  function buy(id) {
    msg('處理中…');
    var android = W.Capacitor && W.Capacitor.getPlatform && W.Capacitor.getPlatform() === 'android';
    // Android 訂閱要指定 Play Console 裡的基本方案 ID（monthly／yearly）
    var opt = { productIdentifier: id, productType: 'subs' };
    if (android) opt.planIdentifier = id === CONFIG.products.yearly ? 'yearly' : 'monthly';
    IAP.purchaseProduct(opt).then(function () {
      return checkPro();
    }).then(function (ok) {
      applyTier(ok); msg(ok ? '訂閱成功，謝謝支持！' : '還沒收到付款確認，稍後按「恢復購買」');
      if (ok) setTimeout(function () { var p = D.getElementById('paywall'); if (p) p.remove(); }, 1200);
    })['catch'](function (e) { msg(/cancel/i.test(String(e && e.message)) ? '已取消' : '購買沒有完成，請再試一次'); });
  }
  function restore() {
    msg('恢復中…');
    var p = (NATIVE && IAP) ? IAP.restorePurchases() : Promise.resolve();
    p.then(checkPro).then(function (ok) { applyTier(ok); msg(ok ? '已恢復訂閱' : '這個 Apple ID 沒有有效的訂閱'); })
      ['catch'](function () { msg('恢復失敗，請確認網路後再試'); });
  }

  /* ───────── 廣告（兩版都有）───────── */
  var adsReady = false, bannerOn = false, bannerBusy = false, tierKnown = false;
  function setAdH(px) { D.documentElement.style.setProperty('--ad-h', px); }
  function startAds() {
    if (!NATIVE || !ADS) return;
    var ask = ADS.trackingAuthorizationStatus().then(function (s) {
      return s && s.status === 'notDetermined' ? ADS.requestTrackingAuthorization() : null;
    })['catch'](function () {});
    ask.then(function () { return ADS.initialize({ initializeForTesting: CONFIG.adTesting }); })
      .then(function () {
        ADS.addListener('bannerAdSizeChanged', function (s) { if (bannerOn) setAdH(((s && s.height) || 0) + 'px'); });
        adsReady = true; syncBanner();
      })['catch'](function () {});
  }
  // 訂閱完整版：拿掉橫幅廣告；免費版／看廣告試用中：顯示橫幅
  function syncBanner() {
    if (!adsReady || !tierKnown || bannerBusy) return;
    var want = !subPro;
    if (want === bannerOn) return;
    bannerBusy = true;
    if (!want) {
      ADS.removeBanner()['catch'](function () {}).then(function () { bannerOn = false; setAdH('0px'); bannerBusy = false; syncBanner(); });
      return;
    }
    ADS.removeBanner()['catch'](function () {})
      .then(function () { return ADS.showBanner({ adId: CONFIG.bannerId, adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', margin: 0, isTesting: CONFIG.adTesting }); })
      .then(function () {
        bannerOn = true; bannerBusy = false; syncBanner();
        // 沒收到高度事件時，先保守讓出一條橫幅的高度（自適應橫幅手機直式約 50–62）
        setTimeout(function () { if (bannerOn && !parseFloat(getComputedStyle(D.documentElement).getPropertyValue('--ad-h'))) setAdH('62px'); }, 1500);
      })['catch'](function () { bannerBusy = false; });
  }
  // 免費版：每 1 小時跳一則全螢幕廣告，看完（或關掉）就繼續用免費版
  var itBusy = false;
  function itDue() {
    var last = +ls('itLast') || 0;
    if (!last) { ls('itLast', String(Date.now())); return false; }   // 第一次打開不跳
    return Date.now() - last >= CONFIG.interstitialEveryMin * 60000;
  }
  function itBlocked() { return D.getElementById('paywall') || D.getElementById('setupg') || D.getElementById('tourg') || D.getElementById('fxnews') || D.querySelector('.sheet'); }
  function maybeInterstitial() {
    if (!NATIVE || !ADS || !adsReady || subPro || itBusy || D.hidden || itBlocked() || !itDue()) return;
    if (!CONFIG.interstitialId || /INTERSTITIAL/.test(CONFIG.interstitialId)) return;
    itBusy = true;
    ADS.prepareInterstitial({ adId: CONFIG.interstitialId, isTesting: CONFIG.adTesting })
      .then(function () { return ADS.showInterstitial(); })
      .then(function () { ls('itLast', String(Date.now())); itBusy = false; })
      ['catch'](function () { ls('itLast', String(Date.now() - (CONFIG.interstitialEveryMin - 10) * 60000)); itBusy = false; });   // 沒廣告可播：10 分鐘後再試
  }
  setInterval(maybeInterstitial, 60000);
  D.addEventListener('visibilitychange', function () { if (!D.hidden) setTimeout(maybeInterstitial, 3000); });

  /* ───────── 字級 5 段（兩版都有）───────── */
  // 11/14 起網頁版自己有「字體」選單（小／標準／大／特大／超大，tools/fontsz.js），App 直接用它，不再另做一套。
  // 舊版 App 存的字級（appFont）搬過去一次
  function applyFont() {
    try { var v = ls('appFont'); if (v !== null && ls('fsLevel1') === null) { ls('fsLevel1', String(Math.max(0, Math.min(4, +v)))); } ls('appFont', null); } catch (e) {}
  }

  /* ───────── 11/22：班機抵達（起飛）通知（訂閱）─────────
     點開班機按「抵達時通知我」：
       iPhone App：用 iPhone 內建通知。App 開著時，班機一標「抵達」就馬上通知；
                   App 沒開時，先排一則「預計抵達」通知在預計時間（每次打開 App 會照最新預計時間改）。
       網頁：瀏覽器允許通知後跳通知（電腦、Android 都可以；iPhone 要先「加入主畫面」），看板要開著。
       手錶：iPhone 收到的通知會照 Apple 規則轉到手錶。 */
  var DEP = /depall\.html/.test(location.pathname);
  var AN_KEY = 'arrNotif1';
  function anList() { try { return JSON.parse(ls(AN_KEY) || '{}') || {}; } catch (e) { return {}; } }
  function anSave(l) { ls(AN_KEY, JSON.stringify(l)); }
  function anId(key) { var h = 0; for (var i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0; return Math.abs(h) % 1000000000 * 2; }
  function rowInfo(row) {
    var tEl = row.querySelector('.c-time b'), m = tEl && /(\d{1,2}):(\d{2})/.exec(tEl.textContent);
    return { f: ((row.querySelector('.c-fno b') || {}).textContent || '').trim(), m: m,
      t: m ? (('0' + m[1]).slice(-2) + ':' + m[2]) : '',
      g: ((row.querySelector('.c-gate .gn') || {}).textContent || '').trim(),
      c: ((row.querySelector('.c-city .cn') || {}).textContent || '').trim(),
      done: row.classList.contains('done') };
  }
  function atOf(m) { var at = new Date(); at.setHours(+m[1], +m[2], 0, 0); if (at.getTime() < Date.now() - 6 * 3600e3) at.setDate(at.getDate() + 1); return at.getTime(); }
  var WORD = DEP ? '起飛' : '抵達';
  function anToast(title, body) {
    var t = D.createElement('div'); t.className = 'app-tip'; t.setAttribute('role', 'status');
    t.innerHTML = '<span><b>' + title + '</b><br>' + body + '</span><button type="button">知道了</button>';
    t.querySelector('button').onclick = function () { t.remove(); }; B.appendChild(t); setTimeout(function () { if (t.parentNode) t.remove(); }, 20000);
    try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {}
  }
  /* 跳通知：App 用內建通知（at 沒給＝馬上）；網頁用瀏覽器通知＋畫面提示 */
  function anFire(id, title, body, at) {
    if (NATIVE && LN) return LN.schedule({ notifications: [{ id: id, title: title, body: body, schedule: { at: new Date(at || Date.now() + 1000) } }] })['catch'](function () {});
    if (at) return;   // 網頁不能預約，只在看板開著時當場通知
    try { if (W.Notification && Notification.permission === 'granted') new Notification(title, { body: body, tag: String(id) }); } catch (e) {}
    anToast(title, body);
  }
  function anCancel(id) { if (NATIVE && LN) LN.cancel({ notifications: [{ id: id }] })['catch'](function () {}); }
  function anBody(r, t) { return (r.g ? '登機門 ' + r.g : '') + (r.c ? (r.g ? '・' : '') + r.c : '') + (t ? '・' + t : '') + '（以現場為準）'; }
  /* App 沒開時的備案：在預計時間排一則「預計抵達」 */
  function anPlan(r) { if (!(NATIVE && LN) || r.at < Date.now() + 5e3) return; anCancel(r.id);
    anFire(r.id, r.f + ' 預計現在' + WORD, anBody(r, '預計 ' + r.t), r.at); }
  /* 每 20 秒＋每次畫面更新：看關注的班機是不是已經抵達、預計時間有沒有變 */
  function anCheck() {
    var l = anList(), ch = false, rows = {}, now = Date.now();
    [].forEach.call(D.querySelectorAll('#out .r:not(.head)'), function (row) { var x = rowInfo(row); if (x.f) rows[(DEP ? 'D' : 'A') + x.f] = x; });
    for (var k in l) {
      var r = l[k]; if (!r || typeof r !== 'object') { delete l[k]; ch = true; continue; }
      if (r.dep !== DEP) continue;
      var x = rows[(DEP ? 'D' : 'A') + r.f];
      if (x && x.done && !r.sent) {   // 已經標「抵達／已起飛」→ 馬上通知，取消預計那則
        anCancel(r.id); anFire(r.id + 1, r.f + ' 已' + WORD, anBody(x, x.t ? '實際 ' + x.t : ''));
        r.sent = 1; ch = true;
      } else if (x && !x.done && x.m && x.t !== r.t) {   // 預計時間改了 → 重排
        r.t = x.t; r.at = atOf(x.m); r.g = x.g || r.g; anPlan(r); ch = true;
      } else if (!r.sent && !NATIVE && now >= r.at + 5 * 60e3 && !r.soft) {   // 網頁：過了預計時間還沒標抵達，先提醒一次
        anFire(r.id, r.f + ' 預計已' + WORD, anBody(r, '預計 ' + r.t)); r.soft = 1; ch = true;
      }
      if (now > r.at + 3 * 3600e3) { delete l[k]; ch = true; }
    }
    if (ch) anSave(l);
    paintAnBtns();
  }
  setInterval(anCheck, 20000);
  function paintAnBtns() {
    var l = anList();
    [].forEach.call(D.querySelectorAll('button.anbtn'), function (b) {
      var on = !!l[b.getAttribute('data-key')];
      b.className = 'remind anbtn' + (on ? ' on' : '');
      b.textContent = on ? '✓ ' + WORD + '時會通知你（再按取消）' : WORD + '時通知我';
    });
  }
  function addRemind(row) {
    var dt = row.querySelector('.dt'); if (!dt || dt.querySelector('.anbtn')) return;
    [].forEach.call(dt.querySelectorAll('.remind,.remind2'), function (x) { x.remove(); });   // 舊的「前 15 分鐘提醒」按鍵拿掉
    var x = rowInfo(row); if (!x.f || !x.m) return;
    var key = (DEP ? 'D' : 'A') + x.f;
    var b = D.createElement('button'); b.type = 'button'; b.className = 'remind anbtn'; b.setAttribute('data-key', key);
    if (!pro) {   // 免費版：按了開訂閱頁
      b.className = 'remind anbtn'; b.textContent = WORD + '時通知我（訂閱完整版）';
      b.onclick = function (e) { e.stopPropagation(); try { openPaywall(); } catch (_) {} };
      dt.insertBefore(b, dt.querySelector('.x') || null); return;
    }
    b.onclick = function (e) {
      e.stopPropagation(); var l = anList();
      if (l[key]) { anCancel(l[key].id); delete l[key]; anSave(l); paintAnBtns(); return; }
      if (x.done) { b.textContent = '這班已經' + WORD + '了'; return; }
      var r = { id: anId(key + Date.now()), f: x.f, t: x.t, at: atOf(x.m), g: x.g, c: x.c, dep: DEP };
      function ok() { l[key] = r; anSave(l); anPlan(r); paintAnBtns(); }
      if (NATIVE && LN) {
        LN.requestPermissions().then(function (p) { if (p && p.display && p.display !== 'granted') throw new Error('denied'); ok(); })
          ['catch'](function () { b.textContent = '請到 iPhone「設定 › 通知」允許本 App 通知'; });
      } else {
        ok();
        try {
          if (W.Notification && Notification.permission === 'default') Notification.requestPermission().then(function () { paintAnBtns(); });
          else if (!W.Notification || Notification.permission === 'denied') anToast('已設定（只會在看板上提示）', '這個瀏覽器沒開通知權限；iPhone 請先把網頁「加入主畫面」再允許通知。');
        } catch (_) {}
      }
    };
    dt.insertBefore(b, dt.querySelector('.x') || null); paintAnBtns();
  }
  D.addEventListener('click', function (e) {
    var r = e.target.closest && e.target.closest('#out .r'); if (!r) return;
    setTimeout(function () { addRemind(r); anCheck(); }, 60);
  });
  setTimeout(anCheck, 4000);

  /* ───────── 瀏覽器測試用：模擬訂閱開關（App 裡不會出現）───────── */
  function devToggle() {
    if (NATIVE || WEB) return;
    var t = D.createElement('button'); t.type = 'button'; t.id = 'devtier';
    function paint() { t.textContent = '測試：' + (pro ? '訂閱版' : '免費版'); }
    t.onclick = function () { ls('devPro', pro ? '0' : '1'); applyTier(!pro); paint(); };
    B.appendChild(t); paint();
  }

  /* ───────── 開會時間自訂（訂閱）：可排時段、每場長度、避開分類、班機前後留空 ───────── */
  var MEET_KEY = 'meetCfg1';
  var MEET_DEF = { lo: '18:00', hi: '21:30', dur: 15, pre: 0, post: 0, avoid: [] };
  function meetLoad() {
    var c = {}; try { c = JSON.parse(ls(MEET_KEY) || '{}') || {}; } catch (e) { c = {}; }
    var o = {}; for (var k in MEET_DEF) o[k] = (c[k] !== undefined ? c[k] : MEET_DEF[k]);
    if (!Array.isArray(o.avoid)) o.avoid = [];
    return o;
  }
  function hm2m(t) { var p = String(t).split(':'); return (+p[0]) * 60 + (+p[1]); }
  function m2hm(m) { m = Math.max(0, Math.min(1439, m)); return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2); }
  W.meetCfg = meetLoad;
  // 開會要看「開始前 2 小時」起的班機，才算得出開始前後的空檔
  W.meetCut = function () { return m2hm(Math.min(hm2m('16:00'), hm2m(meetLoad().lo) - 120)); };
  function meetLabel() {
    var c = meetLoad(), chip = D.getElementById('cpM'); if (!chip) return;
    var svg = chip.querySelector('svg'); chip.textContent = ' 開會時間 ' + c.lo + '–' + c.hi;
    if (svg) chip.insertBefore(svg, chip.firstChild);
  }
  function addMeetGear() {
    var chip = D.getElementById('cpM'); if (!chip || D.getElementById('cpMset')) return;
    var g = D.createElement('span'); g.className = 'chip'; g.id = 'cpMset'; g.setAttribute('role', 'button'); g.tabIndex = 0;
    g.textContent = '開會設定'; g.onclick = openMeetCfg;
    chip.parentNode.insertBefore(g, chip.nextSibling); meetLabel();
  }
  function opts(list, cur, fmt) { return list.map(function (v) { return '<option value="' + v + '"' + (String(v) === String(cur) ? ' selected' : '') + '>' + (fmt ? fmt(v) : v) + '</option>'; }).join(''); }
  function openMeetCfg() {
    if (D.getElementById('meetcfg')) return;
    var c = meetLoad(), times = [], t;
    for (t = 0; t < 1440; t += 15) times.push(m2hm(t));
    var names = []; try { names = W.CATS.map(function (x) { return x.name; }); } catch (e) { names = ['分類1', '分類2', '分類3', '分類4']; }
    var el = D.createElement('div'); el.id = 'meetcfg'; el.className = 'sheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '開會設定');
    el.innerHTML = '<div class="sh-in">'
      + '<div class="sh-top"><h2>開會設定</h2><button type="button" class="sh-x" id="mcX">關閉</button></div>'
      + '<p class="sh-note">會幫「' + esc(names[0] || '') + '」「' + esc(names[1] || '') + '」各排一場會，兩場不重疊，挑班機空檔最大的時間。</p>'
      + '<div class="sh-grid">'
      + '<label>最早開始<select id="mcLo">' + opts(times, c.lo) + '</select></label>'
      + '<label>最晚結束<select id="mcHi">' + opts(times, c.hi) + '</select></label>'
      + '<label>每場長度<select id="mcDur">' + opts([10, 15, 20, 25, 30, 45, 60], c.dur, function (v) { return v + ' 分鐘'; }) + '</select></label>'
      + '<label>開會前多久不能有班機<select id="mcPre">' + opts([0, 5, 10, 15, 20, 30, 45], c.pre, function (v) { return v ? v + ' 分鐘' : '不限'; }) + '</select></label>'
      + '<label>散會後多久不能有班機<select id="mcPost">' + opts([0, 5, 10, 15, 20, 30, 45], c.post, function (v) { return v ? v + ' 分鐘' : '不限'; }) + '</select></label>'
      + '</div>'
      + '<fieldset class="sh-avoid"><legend>另外也要避開這些分類的班機</legend>'
      + names.map(function (n, i) { return (i < 2) ? '' : '<label class="ck"><input type="checkbox" value="' + i + '"' + (c.avoid.indexOf(i) >= 0 ? ' checked' : '') + '> ' + esc(n) + '</label>'; }).join('')
      + '<label class="ck"><input type="checkbox" value="x"' + (c.avoid.indexOf(0) >= 0 && c.avoid.indexOf(1) >= 0 ? ' checked' : '') + '> 兩場都避開「' + esc(names[0] || '') + '」和「' + esc(names[1] || '') + '」兩邊的班機</label>'
      + '</fieldset>'
      + '<div class="sh-msg" id="mcMsg" role="status"></div>'
      + '<div class="sh-row"><button type="button" class="sh-btn" id="mcReset">恢復預設</button><button type="button" class="sh-btn pri" id="mcSave">儲存並重新排</button></div>'
      + '</div>';
    B.appendChild(el);
    function close() { el.remove(); }
    D.getElementById('mcX').onclick = close;
    D.getElementById('mcReset').onclick = function () { ls(MEET_KEY, null); close(); meetLabel(); openMeetCfg(); };
    D.getElementById('mcSave').onclick = function () {
      var lo = D.getElementById('mcLo').value, hi = D.getElementById('mcHi').value, dur = +D.getElementById('mcDur').value;
      if (hm2m(hi) - hm2m(lo) < dur) { D.getElementById('mcMsg').textContent = '最晚結束要比最早開始晚至少 ' + dur + ' 分鐘'; return; }
      if (hm2m(hi) - hm2m(lo) < dur * 2) { D.getElementById('mcMsg').textContent = '時段太短，排不下兩場 ' + dur + ' 分鐘的會'; return; }
      var av = [];
      [].forEach.call(el.querySelectorAll('.sh-avoid input:checked'), function (x) { if (x.value === 'x') { av.push(0, 1); } else av.push(+x.value); });
      ls(MEET_KEY, JSON.stringify({ lo: lo, hi: hi, dur: dur, pre: +D.getElementById('mcPre').value, post: +D.getElementById('mcPost').value, avoid: av }));
      close(); meetLabel();
      // 已經打開的開會結果：重新排一次
      var box = D.getElementById('copybox'); if (box && box.innerHTML && W.cpKind === 'M') { box.innerHTML = ''; W.cpKind = null; }
      var chip = D.getElementById('cpM'); if (chip) { bypass = true; try { chip.click(); } finally { bypass = false; } }
    };
  }


  /* ───────── 時段鍵（11/22 統一：00–06、06–12、12–18、18–24；訂閱可自訂起訖）───────── */
  var SLOT_KEY = 'slotCfg1';
  var SLOT_DEF = [['00:00', '06:00'], ['06:00', '12:00'], ['12:00', '18:00'], ['18:00', '24:00']];   // 迄＝不含（24:00＝當天結束）
  function slotLoad() {
    try { var a = JSON.parse(ls(SLOT_KEY) || 'null'); if (a && a.length === 4 && a.every(function (x) { return x && /^\d\d:\d\d$/.test(x[0]) && /^\d\d:\d\d$/.test(x[1]); })) return a; } catch (e) {}
    return SLOT_DEF.map(function (x) { return x.slice(); });
  }
  function slotChips() {
    var all = [].slice.call(D.querySelectorAll('.wrap .card .chip[data-t]'));
    var marked = all.filter(function (c) { return c.hasAttribute('data-slot'); });
    if (marked.length === 4) return marked;
    var four = all.slice(0, 4); four.forEach(function (c, i) { c.setAttribute('data-slot', i); }); return four;
  }
  function endIncl(e) { return e === '24:00' ? '23:59' : m2hm((hm2m(e) + 1439) % 1440); }
  function hLab(t) { return t === '24:00' ? '24' : (/:00$/.test(t) ? t.slice(0, 2) : t); }
  function ensureOpt(sel, v) {
    if (!sel || [].some.call(sel.options, function (o) { return o.value === v; })) return;
    var o = D.createElement('option'); o.value = v; o.textContent = v;
    var nx = [].filter.call(sel.options, function (x) { return x.value > v; })[0];
    sel.insertBefore(o, nx || null);
  }
  function applySlots() {
    var cfg = slotLoad(), t1 = D.getElementById('t1'), t2 = D.getElementById('t2');
    slotChips().forEach(function (c, i) {
      var s = cfg[i][0], e = endIncl(cfg[i][1]);
      c.setAttribute('data-t', s); c.setAttribute('data-e', e);
      c.textContent = hLab(s) + '–\u200b' + hLab(cfg[i][1]);
      ensureOpt(t1, s); ensureOpt(t2, e);
    });
    return cfg;
  }
  function slotNow(cfg) {
    var n = new Date(), m = n.getHours() * 60 + n.getMinutes();
    for (var i = 0; i < cfg.length; i++) {
      var a = hm2m(cfg[i][0]), b = cfg[i][1] === '24:00' ? 1440 : hm2m(cfg[i][1]);
      if (a < b ? (m >= a && m < b) : (m >= a || m < b)) return i;
    }
    return -1;
  }
  function pickSlotNow(cfg) {
    var i = slotNow(cfg); if (i < 0) return;
    var c = slotChips()[i]; if (!c) return;
    bypass = true; try { c.click(); } finally { bypass = false; }
  }
  function addSlotGear() {
    var chips = slotChips(); if (!chips.length || D.getElementById('slotset')) return;
    var host = chips[0].parentNode;
    var g = D.createElement('span'); g.className = 'chip'; g.id = 'slotset'; g.setAttribute('role', 'button'); g.tabIndex = 0;
    g.textContent = '自訂時段鍵（改上面四顆的時間）'; g.onclick = openSlotCfg;
    var row = D.createElement('div'); row.className = 'chips'; row.id = 'slotrow'; row.appendChild(g);
    host.parentNode.insertBefore(row, host.nextSibling);
    var cfg = applySlots();
    // 有自訂過，而且現在不是「現在 6 小時」或自訂區間：照新時段重新挑現在這一段
    // 照新時段重新挑現在這一段（原本頁面預設是舊的 13:30 分段）
    if (!W.now6Mode && !W.CUST) setTimeout(function () { if ((pro || cachedPro()) && !W.now6Mode && !W.CUST) pickSlotNow(cfg); }, 1500);
    if (W.paintWin) W.paintWin();
  }
  function openSlotCfg() {
    if (D.getElementById('slotcfg')) return;
    var cfg = slotLoad(), st = [], en = [], t;
    for (t = 0; t < 1440; t += 15) st.push(m2hm(t));
    for (t = 15; t <= 1440; t += 15) en.push(t === 1440 ? '24:00' : m2hm(t));
    var el = D.createElement('div'); el.id = 'slotcfg'; el.className = 'sheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '時段設定');
    el.innerHTML = '<div class="sh-in">'
      + '<div class="sh-top"><h2>時段設定</h2><button type="button" class="sh-x" id="scX">關閉</button></div>'
      + '<p class="sh-note">把上面四顆時段鍵改成你自己的上班時段。結束比開始早＝跨到隔天（例：22:00 到 06:00）。</p>'
      + '<div class="sh-grid">'
      + cfg.map(function (x, i) {
          return '<label>時段 ' + (i + 1) + '　開始<select data-k="s" data-i="' + i + '">' + opts(st, x[0]) + '</select></label>'
               + '<label>結束<select data-k="e" data-i="' + i + '">' + opts(en, x[1], function (v) { return v === '24:00' ? '24:00（當天結束）' : v; }) + '</select></label>';
        }).join('')
      + '</div>'
      + '<div class="sh-msg" id="scMsg" role="status"></div>'
      + '<div class="sh-row"><button type="button" class="sh-btn" id="scReset">恢復預設</button><button type="button" class="sh-btn pri" id="scSave">儲存</button></div>'
      + '</div>';
    B.appendChild(el);
    function close() { el.remove(); }
    D.getElementById('scX').onclick = close;
    D.getElementById('scReset').onclick = function () { ls(SLOT_KEY, null); close(); var c = applySlots(); pickSlotNow(c); openSlotCfg(); };
    D.getElementById('scSave').onclick = function () {
      var out = [0, 1, 2, 3].map(function (i) { return [el.querySelector('select[data-k="s"][data-i="' + i + '"]').value, el.querySelector('select[data-k="e"][data-i="' + i + '"]').value]; });
      for (var i = 0; i < 4; i++) if (out[i][0] === out[i][1] || (out[i][1] === '24:00' && out[i][0] === '00:00')) {
        if (out[i][0] === out[i][1]) { D.getElementById('scMsg').textContent = '時段 ' + (i + 1) + ' 的開始和結束不能一樣'; return; }
      }
      ls(SLOT_KEY, JSON.stringify(out));
      close(); var c = applySlots(); pickSlotNow(c);
    };
  }

  /* ───────── 1.3：設定引導＋功能導覽（第一次打開跑一次；可跳過；設定裡可以重看）───────── */
  var GUIDE_KEY = 'guide1';   // '' 沒看過；'skip' 跳過；'done' 看完
  var PAL = ['#00F0FF', '#FF2A6D', '#8CF23A', '#7B78FF', '#4DA3FF', '#FF8A3D', '#C65CFF', '#FFC53D', '#E8EDF3'];
  var CDEF = ['#00F0FF', '#FF2A6D', '#8CF23A', '#7B78FF'], CK = ['c0', 'c1', 'a2', 'a3'];
  function gColors() { try { return JSON.parse(ls('tpeCatCol1') || '{}') || {}; } catch (e) { return {}; } }
  function gBusy() { return D.getElementById('fxnews') || D.getElementById('paywall') || D.getElementById('setupg') || D.getElementById('tourg') || D.querySelector('.sheet'); }
  function guideClose(state) { var a = D.getElementById('setupg'); if (a) a.remove(); if (state && !ls(GUIDE_KEY)) ls(GUIDE_KEY, state); else if (state === 'done') ls(GUIDE_KEY, 'done'); }

  function openSetup(step) {
    var old = D.getElementById('setupg'); if (old) old.remove();
    step = step || 0;
    var C = W.CATS || [], col = gColors(), N = 4;
    var el = D.createElement('div'); el.id = 'setupg'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '設定引導');
    var dots = '<div class="sg-dots">' + [0, 1, 2, 3].map(function (i) { return '<i' + (i === step ? ' class="on"' : '') + '></i>'; }).join('') + '</div>';
    var body = '';
    if (step === 0) {
      body = '<div class="sg-kicker">歡迎使用</div><h2>下一班誰先到，一眼看懂</h2>'
        + '<p>一般航班表照「表定時間」排，延誤、提早一多就亂了。這裡照<b>實際' + (DEP ? '起飛' : '落地') + '時間</b>重新排序，最上面永遠是下一班。</p>'
        + '<div class="sg-demo"><div><b>12:41</b><small>表定 +16</small><span>CZ3087</span><em>C7</em></div>'
        + '<div><b>12:58</b><small>表定 −7</small><span>BR0852</span><em>B9</em></div>'
        + '<div><b>13:24</b><small>表定 +9</small><span>BR0133</span><em>B8</em></div></div>'
        + '<p class="sg-mute">花 30 秒設定你負責的登機門，之後打開就只看你要的。</p>';
    } else if (step === 1) {
      body = '<div class="sg-kicker">第 1 步・你的工作區域</div><h2>你負責哪些登機門？</h2>'
        + '<p class="sg-mute">分成兩組，取你們自己習慣的名字。登機門可以寫範圍，例如「C1-C4, B7」；留空＝那個航廈其他的門。</p>'
        + [0, 1].map(function (i) {
            var c = C[i] || {}, cur = (col[CK[i]] || CDEF[i]).toUpperCase();
            return '<fieldset class="sg-cat"><legend>第 ' + (i + 1) + ' 組</legend>'
              + '<label>名稱<input data-k="name" data-i="' + i + '" maxlength="12" value="' + esc(c.name || '') + '"></label>'
              + '<label>登機門<input data-k="spec" data-i="' + i + '" placeholder="例：C1-C4, B7-B9" value="' + esc(c.spec || '') + '"></label>'
              + '<label>航廈<select data-k="term" data-i="' + i + '"><option value="2"' + (c.term === '2' ? ' selected' : '') + '>二航</option><option value="1"' + (c.term === '1' ? ' selected' : '') + '>一航</option><option value="any"' + (c.term === 'any' ? ' selected' : '') + '>不分</option></select></label>'
              + '<div class="sg-pal" data-i="' + i + '">' + PAL.map(function (h) { return '<button type="button" data-c="' + h + '" style="background:' + h + '"' + (h === cur ? ' class="on"' : '') + ' aria-label="顏色 ' + h + '"></button>'; }).join('') + '</div>'
              + '</fieldset>';
          }).join('')
        + '<p class="sg-mute">之後都能在「設定 › 分類設定」改。' + (pro ? '' : '訂閱完整版可以用到 4 組。') + '</p>';
    } else if (step === 2) {
      var lv = +(ls('fsLevel1') || 1), NM = ['小', '標準', '大', '特大', '超大'];
      body = '<div class="sg-kicker">第 2 步・字體</div><h2>字要多大？</h2><p class="sg-mute">站著看、走路看，選看得最清楚的。右上「字體」隨時可以換。</p>'
        + '<div class="sg-fs">' + NM.map(function (n, i) { return '<button type="button" data-l="' + i + '" style="font-size:' + (13 + i * 2.5) + 'px"' + (i === lv ? ' class="on"' : '') + '>' + n + '<small>12:41 C7</small></button>'; }).join('') + '</div>';
    } else {
      body = '<div class="sg-kicker">設定好了</div><h2>要不要看 30 秒功能導覽？</h2>'
        + '<p>會一個一個指給你看：時間怎麼看、登機門顏色、設定在哪、' + (NATIVE && !pro ? '怎麼看廣告免費用完整版、' : '') + '回報文字怎麼複製。</p>'
        + '<p class="sg-mute">之後想再看，到「設定」最下面按「使用引導」。</p>';
    }
    // 1.3：上一步／下一步放在左右兩側（不放最下面，免得被廣告擋住）
    var L = step === 0 ? ['skip', '跳過'] : (step < 3 ? ['back', '上一步'] : ['done', '先不用']);
    var R = step === 0 ? ['next', '開始設定'] : (step === 1 ? ['next', '儲存'] : (step === 2 ? ['next', '下一步'] : ['tour', '看導覽']));
    function side(cls, x, arrow) { return '<button type="button" class="sg-side ' + cls + '" data-a="' + x[0] + '" aria-label="' + x[1] + '"><b>' + arrow + '</b><span>' + x[1] + '</span></button>'; }
    el.innerHTML = '<div class="sg-in">' + '<div class="sg-top">' + dots + (step < 3 ? '<button type="button" class="sg-skip" data-a="skip">跳過引導</button>' : '') + '</div>'
      + body + '</div>' + side('sg-l', L, '‹') + side('sg-r', R, '›');
    B.appendChild(el);
    [].forEach.call(el.querySelectorAll('.sg-pal button'), function (b) {
      b.onclick = function () { [].forEach.call(b.parentNode.children, function (x) { x.classList.toggle('on', x === b); }); };
    });
    [].forEach.call(el.querySelectorAll('.sg-fs button'), function (b) {
      b.onclick = function () {
        [].forEach.call(b.parentNode.children, function (x) { x.classList.toggle('on', x === b); });
        var m = D.querySelector('#fsmenu button[data-l="' + b.getAttribute('data-l') + '"]');
        if (m) m.click(); else ls('fsLevel1', b.getAttribute('data-l'));
      };
    });
    function saveCats() {
      try {
        [0, 1].forEach(function (i) {
          var c = W.CATS[i]; if (!c) return;
          var n = el.querySelector('input[data-k="name"][data-i="' + i + '"]').value.trim();
          c.name = n || ('分類' + (i + 1));
          c.spec = el.querySelector('input[data-k="spec"][data-i="' + i + '"]').value;
          c.term = el.querySelector('select[data-k="term"][data-i="' + i + '"]').value;
        });
        if (W.catsSave) W.catsSave();
        if (W.paintCatBox) W.paintCatBox();
        if (W.paintShops) W.paintShops();
        var o = gColors();
        [0, 1].forEach(function (i) { var on = el.querySelector('.sg-pal[data-i="' + i + '"] button.on'); if (on) o[CK[i]] = on.getAttribute('data-c'); });
        ls('tpeCatCol1', JSON.stringify(o));
        if (W.catColApply) W.catColApply();
        if (W.render) W.render();
        syncWatch();
      } catch (e) {}
    }
    el.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('[data-a]'); if (!a) return;
      var k = a.getAttribute('data-a');
      if (k === 'skip') { guideClose('skip'); tip('隨時可以到「設定」最下面按「使用引導」再看一次。'); }
      else if (k === 'next') { if (step === 1) saveCats(); openSetup(step + 1); }
      else if (k === 'back') openSetup(step - 1);
      else if (k === 'done') { guideClose('done'); }
      else if (k === 'tour') { guideClose('done'); setTimeout(openTour, 300); }
    });
  }

  function gRect(t) {   // 有些格子是 display:contents（自己沒有大小），改用裡面字的範圍
    var r = t.getBoundingClientRect(); if (r.width && r.height) return r;
    var L = 1e9, T = 1e9, R = -1e9, Bm = -1e9;
    [].forEach.call(t.children, function (c) { var q = c.getBoundingClientRect(); if (!q.width) return; L = Math.min(L, q.left); T = Math.min(T, q.top); R = Math.max(R, q.right); Bm = Math.max(Bm, q.bottom); });
    return R > L ? { left: L, top: T, right: R, bottom: Bm, width: R - L, height: Bm - T } : r;
  }
  function tourSteps() {
    var row = D.querySelector('#out .r:not(.head):not(.done)') || D.querySelector('#out .r:not(.head)');
    var T = DEP ? '起飛' : '落地';
    var s = [
      [row && row.querySelector('.c-time'), '時間', (function () {
        var m = /表定\s*([+−-])\s*(\d+)/.exec(((row && row.querySelector('.c-time i')) || {}).textContent || ''), ex = m ? '「表定 ' + m[1] + m[2] + '」＝比表定' + (m[1] === '+' ? '晚 ' : '早 ') + m[2] + ' 分鐘' : '「表定 +16」＝比表定晚 16 分鐘';
        return '大字是實際（預計）' + T + '時間；下面' + ex + '，+ 是延後、− 是提早。整張清單照這個時間排，最上面就是下一班。';
      })()],
      [row && row.querySelector('.c-gate'), '登機門', '顏色跟著分類走，一眼分出是哪一組的門。'],
      [row && row.querySelector('.tag'), '分類標籤', '你在引導設的組名。名稱、顏色、登機門都能在「設定 › 分類設定」改。'],
      [D.querySelector('#dock button'), '設定', '時段、日期、分類、A～D 區、隱藏已' + (DEP ? '起飛' : '抵達') + '、回報文字、外觀樣式，都在這裡。'],
      [D.getElementById('rwbar'), '看廣告免費用', '看一則廣告就能用完整版 ' + CONFIG.rewardHours + ' 小時，每天 ' + CONFIG.rewardPerDay + ' 次，每天 0 點重新計算（手錶版不含）。'],
      [D.getElementById('probtn'), pro ? '完整版' : '訂閱', pro ? '這裡看你的訂閱或試用剩多久。' : '看完整版有哪些功能：全時段、每班人數、雷達、群組回報一鍵複製' + (WEB ? '' : '、Apple Watch，而且沒有廣告') + '。年繳最划算。'],
      [D.querySelector('header a:not(.on)') || D.querySelector('header a'), '入境／出境', '兩邊切換，分類設定共用。'],
      [D.getElementById('bigbtn'), '字體', '5 段大小，隨時換。'],
      [D.getElementById('fGo'), '更新', '平常會自動更新；想馬上更新就按這裡。'],
      [null, '就這樣', '想再看一次：「設定」最下面按「使用引導」。']
    ];
    return s.filter(function (x) { if (!x[0] && x[1] !== '就這樣') return false; if (!x[0]) return true; var r = gRect(x[0]); return r.width > 0 && r.height > 0; });
  }
  function openTour() {
    if (D.getElementById('tourg')) return;
    var steps = tourSteps(), i = 0;
    var el = D.createElement('div'); el.id = 'tourg'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '功能導覽');
    el.innerHTML = '<div class="tg-hole"></div><div class="tg-card" role="status"><div class="tg-n"></div><b class="tg-h"></b><p class="tg-t"></p>'
      + '<div class="tg-foot"><button type="button" class="tg-skip">跳過導覽</button></div></div>'
      + '<button type="button" class="sg-side sg-l tg-back" aria-label="上一步"><b>‹</b><span>上一步</span></button>'
      + '<button type="button" class="sg-side sg-r tg-next" aria-label="下一步"><b>›</b><span>下一步</span></button>';
    B.appendChild(el);
    var hole = el.querySelector('.tg-hole'), card = el.querySelector('.tg-card');
    function place() {
      var s = steps[i], t = s[0];
      el.querySelector('.tg-n').textContent = (i + 1) + ' / ' + steps.length;
      el.querySelector('.tg-h').textContent = s[1]; el.querySelector('.tg-t').textContent = s[2];
      el.querySelector('.tg-back').style.visibility = i ? '' : 'hidden';
      el.querySelector('.tg-next span').textContent = i === steps.length - 1 ? '完成' : '下一步';
      if (!t) { hole.style.cssText = 'left:50%;top:40%;width:0;height:0'; card.style.cssText = 'left:58px;right:58px;top:34%'; return; }
      var r0 = gRect(t);
      if (r0.top < 80 || r0.bottom > innerHeight - 220 - (parseFloat(getComputedStyle(D.documentElement).getPropertyValue('--ad-h')) || 0)) { try { (t.firstElementChild && !t.getBoundingClientRect().width ? t.firstElementChild : t).scrollIntoView({ block: 'center' }); } catch (e) {} }
      setTimeout(function () {
        var r = gRect(t), pad = 6;
        hole.style.cssText = 'left:' + (r.left - pad) + 'px;top:' + (r.top - pad) + 'px;width:' + (r.width + pad * 2) + 'px;height:' + (r.height + pad * 2) + 'px';
        var below = r.bottom + 14, h = card.offsetHeight || 170, adH = parseFloat(getComputedStyle(D.documentElement).getPropertyValue('--ad-h')) || 0;
        card.style.cssText = 'left:58px;right:58px;' + (below + h < innerHeight - adH - 10 ? 'top:' + below + 'px' : 'top:' + Math.max(10, r.top - h - 14) + 'px');
      }, 260);
    }
    function end() { el.remove(); ls(GUIDE_KEY, 'done'); }
    el.querySelector('.tg-skip').onclick = end;
    el.querySelector('.tg-back').onclick = function () { if (i) { i--; place(); } };
    el.querySelector('.tg-next').onclick = function () { if (i < steps.length - 1) { i++; place(); } else end(); };
    addEventListener('resize', function () { if (D.getElementById('tourg')) place(); });
    place();
  }
  W.tpeGuide = openSetup; W.tpeTour = openTour;

  function addGuideEntry() {   // 設定最下面：使用引導
    if (D.getElementById('guiderow')) return;
    var card = D.querySelector('.wrap .card'); if (!card) return;
    var row = D.createElement('div'); row.className = 'chips'; row.id = 'guiderow';
    row.innerHTML = '<span class="chip" id="gSetup" role="button" tabindex="0">使用引導：重新設定</span><span class="chip" id="gTour" role="button" tabindex="0">功能導覽</span>';
    card.appendChild(row);
    D.getElementById('gSetup').onclick = function () { openSetup(0); };
    D.getElementById('gTour').onclick = function () { try { W.scrollTo(0, 0); } catch (e) {} var dk = D.querySelector('#dock button'); if (dk && card.offsetParent) dk.click(); setTimeout(openTour, 400); };
  }
  function guideBoot() {
    addGuideEntry();
    if (ls(GUIDE_KEY)) return;
    var n = 0, iv = setInterval(function () {   // 等班機出來、更新日誌關掉再跳
      n++;
      if (n > 240) { clearInterval(iv); return; }
      if (!D.querySelector('#out .r:not(.head)') || gBusy()) return;
      clearInterval(iv); setTimeout(function () { if (!gBusy() && !ls(GUIDE_KEY)) openSetup(0); }, 600);
    }, 500);
  }

  /* ───────── 啟動 ───────── */
  function addUnofficial() {
    if (D.getElementById('unofficial')) return;
    var n = D.createElement('div'); n.id = 'unofficial'; n.textContent = UNOFFICIAL;
    var host = D.querySelector('.wrap') || B; host.appendChild(n);
  }
  function addBrand() {
    if (D.getElementById('brand')) return;
    var n = D.createElement('div'); n.id = 'brand';
    n.innerHTML = '<b>桃機出入境看板</b><i>非官方 · ' + (/出境/.test(D.title) ? '出境' : '入境') + '班機即時看板</i>';
    var h = D.querySelector('header'); if (h) h.parentNode.insertBefore(n, h); else B.insertBefore(n, B.firstChild);
  }
  function boot() {
    addBrand(); addProButton(); addRewardBar(); applyFont(); addUnofficial(); addMeetGear(); addSlotGear(); guideBoot();
    B.classList.toggle('tier-free', !cachedPro()); W.__FREE3 = !cachedPro();
    var tries = 0, iv = setInterval(function () {
      tries++;
      if ((D.querySelector('#out .r') || tries > 40) && W.runNow6) {
        clearInterval(iv);
        checkPro().then(function (ok) { applyTier(ok); devToggle(); });
      }
    }, 250);
    setTimeout(startAds, 800);
    if (NATIVE && IAP && IAP.addListener) {
      try { IAP.addListener('transactionUpdated', function () { checkPro().then(applyTier); }); } catch (e) {}
    }
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})();
