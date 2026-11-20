/* 桃機出入境看板 App 版
   - 免費版：只看現在起 3 小時、陽春清單、登機門群組 2 組、回報文字只能看
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
  var WSYNC = (NATIVE && W.Capacitor && W.Capacitor.registerPlugin) ? W.Capacitor.registerPlugin('WatchSync') : null;
  function syncWatch() {
    if (!WSYNC || /depall\.html/.test(location.pathname)) return;
    try {
      var C = W.CATS || [], col = {};
      try { col = JSON.parse(ls('tpeCatCol1') || '{}') || {}; } catch (e) {}
      var DEF = ['#00F0FF', '#FF2A6D', '#8CF23A', '#7B78FF'], K = ['c0', 'c1', 'a2', 'a3'];
      var out = [0, 1, 2, 3].map(function (i) {
        var c = C[i] || {}, cc = col[K[i]];
        return { name: String(c.name || ''), spec: String(c.spec || ''), term: String(c.term || 'any'),
          color: /^#[0-9a-fA-F]{6}$/.test(cc || '') ? String(cc).toUpperCase() : DEF[i] };
      });
      var j = JSON.stringify(out); if (j === ls('watchSent')) return;
      WSYNC.send({ json: j }).then(function (r) { if (r && r.ok) ls('watchSent', j); })['catch'](function () {});
    } catch (e) {}
  }
  setTimeout(syncWatch, 3000); setInterval(syncWatch, 10000);

  /* ───────── 免費／訂閱切換畫面 ───────── */
  function clickQuiet(el) { if (!el) return; bypass = true; try { el.click(); } finally { bypass = false; } }
  function applyTier(isPro) {
    subPro = !!isPro;
    pro = subPro || rewardActive();
    try { catLabel(); catTip(); paintRewardBar(); } catch (e) {}
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
  var MORE = '時段隨意切換（整天、自訂、明天）、門改延誤取消提醒、隱藏已抵達、搜尋班號或城市、10 種外觀樣式、落地前 15 分鐘提醒、開會時間自動排。';
  var FEATURES = [(WEB ? 'Apple Watch 手錶版（iPhone App 訂閱限定，網頁啟用碼不含）' : 'Apple Watch 手錶版（只限訂閱）'), '時段隨意切換：整天、自訂、明天、現在 6 小時', '狀態顏色、快到班機標示', '點卡片看機型、共用班號',
    '每班預估入境人數、國籍人數', '下一班落地、接下來 1 小時、空檔與門改提醒', '人潮提示、班距空檔虛線',
    '隱藏已抵達、搜尋班號或城市', '回報文字一鍵複製', '分類名稱、顏色、登機門自己改（設定 › 分類設定），不限組數', '落地前 15 分鐘提醒（關注班機）'];
  function openPaywall() {
    if (D.getElementById('paywall')) return;
    var el = D.createElement('div'); el.id = 'paywall'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '訂閱');
    el.innerHTML = '<div class="pw-in">'
      + '<div class="pw-top"><h2>' + (subPro ? '你已經是訂閱會員' : '訂閱完整版') + '</h2><button type="button" class="pw-x" id="pwX">關閉</button></div>'
      + '<div id="pwhero" aria-hidden="true"></div>'
      + '<div class="pw-feat">' + FEAT.map(function (f, i) { return '<div>' + (f[2] ? '<em>' + f[2] + '</em>' : '') + '<i style="background-position:' + (i * 100 / 7).toFixed(4) + '% 0"></i><b>' + f[0] + '</b><small>' + f[1] + '</small></div>'; }).join('') + '</div>'
      + '<div class="pw-more"><b>還有：</b>' + MORE + '</div>'
      + '<div class="pw-free">免費版：只看現在起 3 小時的班機清單、登機門群組 2 組，回報文字要自己複製。' + (WEB ? '' : '兩版都有廣告。') + '</div>'
      + (!WEB && NATIVE && !subPro ? '<button type="button" class="pw-plan pw-rw" id="pwRw"><span>看廣告，免費用 ' + CONFIG.rewardHours + ' 小時<small>' + (rewardActive() ? '試用中，剩 ' + rewardLabel().replace('試用 ', '') + '・' : '') + '今天還可以 ' + rewardLeft() + ' 次・不含手錶版</small></span><b>▶</b></button>'
        + '<div class="pw-rwinfo"><b>看廣告可以用：</b>' + RW_FEATURES + '<br><b>每天免費時間：</b>每天 ' + CONFIG.rewardPerDay + ' 次，每次 ' + CONFIG.rewardHours + ' 小時（一天最多 ' + (CONFIG.rewardPerDay * CONFIG.rewardHours) + ' 小時），每天 0 點重新計算。<br>Apple Watch 手錶版只限訂閱。</div>' : '')
      + (WEB ? webPlans() : (subPro ? '' : '<button type="button" class="pw-plan" id="pwM" disabled><span>月繳<small>每月自動續訂</small></span><b id="pwMp">讀取中…</b></button>'
        + '<button type="button" class="pw-plan" id="pwY" disabled><span>年繳<small>每年自動續訂</small></span><b id="pwYp">讀取中…</b></button>'))
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
      + '<button type="button" class="pw-plan" id="pwM"><span>30 天<small>單次付款・不自動續扣</small></span><b>NT$90</b></button>'
      + '<button type="button" class="pw-plan" id="pwY"><span>365 天<small>單次付款・不自動續扣</small></span><b>NT$990</b></button>'
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
    })['catch'](function () { msg('讀不到價格，請確認網路後再開一次'); });
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
  function startAds() {
    if (!NATIVE || !ADS) return;
    var ask = ADS.trackingAuthorizationStatus().then(function (s) {
      return s && s.status === 'notDetermined' ? ADS.requestTrackingAuthorization() : null;
    })['catch'](function () {});
    ask.then(function () { return ADS.initialize({ initializeForTesting: CONFIG.adTesting }); })
      .then(function () {
        ADS.addListener('bannerAdSizeChanged', function (s) { D.documentElement.style.setProperty('--ad-h', ((s && s.height) || 0) + 'px'); });
        return ADS.removeBanner()['catch'](function () {});
      })
      .then(function () {
        return ADS.showBanner({ adId: CONFIG.bannerId, adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', margin: 0, isTesting: CONFIG.adTesting });
      })['catch'](function () {});
  }

  /* ───────── 字級 5 段（兩版都有）───────── */
  // 11/14 起網頁版自己有「字體」選單（小／標準／大／特大／超大，tools/fontsz.js），App 直接用它，不再另做一套。
  // 舊版 App 存的字級（appFont）搬過去一次
  function applyFont() {
    try { var v = ls('appFont'); if (v !== null && ls('fsLevel1') === null) { ls('fsLevel1', String(Math.max(0, Math.min(4, +v)))); } ls('appFont', null); } catch (e) {}
  }

  /* ───────── 關注班機：落地（起飛）前 15 分鐘提醒（訂閱）───────── */
  var DEP = /depall\.html/.test(location.pathname);
  function reminded() { try { return JSON.parse(ls('reminders') || '{}'); } catch (e) { return {}; } }
  function remindId(key) { var h = 0; for (var i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0; return Math.abs(h) % 2000000000; }
  function addRemind(row) {
    var dt = row.querySelector('.dt'); if (!dt || dt.querySelector('.remind')) return;
    var tEl = row.querySelector('.c-time b'), fno = row.getAttribute('data-k') || ((row.querySelector('.c-fno b') || {}).textContent || '');
    var gate = ((row.querySelector('.c-gate .gn') || {}).textContent || '').trim();
    var city = ((row.querySelector('.c-city .cn') || {}).textContent || '').trim();
    var m = tEl && /(\d{1,2}):(\d{2})/.exec(tEl.textContent); if (!m) return;
    var at = new Date(); at.setHours(+m[1], +m[2], 0, 0);
    if (at.getTime() < Date.now() - 2 * 3600e3) at.setDate(at.getDate() + 1);
    var key = (DEP ? 'D' : 'A') + fno + at.toDateString(), id = remindId(key), list = reminded();
    var b = D.createElement('button'); b.type = 'button'; b.className = 'remind' + (list[key] ? ' on' : '');
    b.textContent = list[key] ? '✓ 已設定提醒（再按取消）' : (DEP ? '起飛前 15 分鐘提醒我' : '落地前 15 分鐘提醒我');
    b.onclick = function (e) {
      e.stopPropagation();
      if (!NATIVE || !LN) { b.textContent = 'App 裡才能設定提醒'; return; }
      var l = reminded();
      if (l[key]) {
        LN.cancel({ notifications: [{ id: id }] })['catch'](function () {});
        delete l[key]; ls('reminders', JSON.stringify(l)); b.className = 'remind'; b.textContent = DEP ? '起飛前 15 分鐘提醒我' : '落地前 15 分鐘提醒我'; return;
      }
      var when = new Date(at.getTime() - 15 * 60e3);
      if (when.getTime() < Date.now() + 5e3) { b.textContent = '已經不到 15 分鐘，不用提醒了'; return; }
      LN.requestPermissions().then(function (p) {
        if (p && p.display && p.display !== 'granted') throw new Error('denied');
        return LN.schedule({ notifications: [{ id: id, title: fno + (DEP ? ' 即將起飛' : ' 即將落地'),
          body: (DEP ? '起飛' : '預計落地') + ' ' + m[1].padStart(2, '0') + ':' + m[2] + (gate ? '・登機門 ' + gate : '') + (city ? '・' + city : '') + '（以現場為準）',
          schedule: { at: when } }] });
      }).then(function () {
        l[key] = when.getTime(); ls('reminders', JSON.stringify(l)); b.className = 'remind on'; b.textContent = '✓ 已設定提醒（再按取消）';
      })['catch'](function () { b.textContent = '請到「設定 › 通知」允許本 App 通知'; });
    };
    var x = dt.querySelector('.x'); dt.insertBefore(b, x || null);
  }
  D.addEventListener('click', function (e) {
    if (!pro) return; var r = e.target.closest && e.target.closest('#out .r'); if (!r) return;
    setTimeout(function () { addRemind(r); }, 60);
  });

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


  /* ───────── 時段鍵自訂（訂閱）：00–06、06–13:30、13:30–18、18–24 四顆可改起訖 ───────── */
  var SLOT_KEY = 'slotCfg1';
  var SLOT_DEF = [['00:00', '06:00'], ['06:00', '13:30'], ['13:30', '18:00'], ['18:00', '24:00']];   // 迄＝不含（24:00＝當天結束）
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
    if (ls(SLOT_KEY) && !W.now6Mode && !W.CUST) setTimeout(function () { if ((pro || cachedPro()) && !W.now6Mode && !W.CUST) pickSlotNow(cfg); }, 1500);
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
    addBrand(); addProButton(); addRewardBar(); applyFont(); addUnofficial(); addMeetGear(); addSlotGear();
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
