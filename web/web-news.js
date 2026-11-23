/* tpeboard.com 網頁版：「看板更新了」跳窗（做法跟 T2arrival21402153/all.html 一樣）
   之後改版只要在 NEWS 最後加一筆；看過的版本記在這台裝置（tpenews1）。網址加 ?news=1 可以重看。 */
(function () {
  var D = document;
  var NEWS = [
    { v: '2026-11-20', d: '11/20', t: '網頁版跟 App 同步', it: [
      ['land', '', '新網址 tpeboard.com', '網頁版搬到 <em>tpeboard.com</em>，好記也好分享。',
        '舊網址會繼續可以用。方案與價格在 tpeboard.com/pricing，隱私權政策在 tpeboard.com/privacy。'],
      ['users', 'pk', '訂閱頁看得到功能畫面', '訂閱完整版的頁面，每個功能都配一張<em>實際畫面縮圖</em>，一看就懂。',
        '照實際落地時間排序、每班預估人數、提早延誤與班距空檔、雷達地圖、分類名稱與登機門、分類顏色、群組回報，每項都有縮圖和一句說明。'],
      ['copy', '', '回報鍵寫清楚', '設定裡的回報按鍵改成「<em>複製回報文字：分類名稱</em>」，一看就知道按了會做什麼。',
        '回報只會帶「今天幾點後」、而且上面有打勾的分類的班機，整理好直接貼 LINE 群組。'],
      ['cog', 'yl', '分類可以自己改', '設定標題改成「分類設定（<em>名稱／顏色／登機門</em>）」，第一次開通完整版會提示一次。',
        '分類名稱、顏色、負責的登機門都可以照自己的工作區域改，只記在這台裝置。']] },
    { v: '2026-11-20b', d: '11/20', t: '新手引導＋年繳更划算', it: [
      ['check', '', '30 秒設定引導', '第一次打開會帶你設定<em>負責的登機門、組名、顏色、字體</em>，不想設定可以直接跳過。',
        '設定完就只看你要的班機；之後都能在「設定 › 分類設定」改。'],
      ['users', 'pk', '功能導覽', '一個一個指給你看：時間怎麼看、表定差、登機門顏色、設定在哪、怎麼更新。',
        '想再看一次：打開「設定」，最下面按「使用引導：重新設定」或「功能導覽」。'],
      ['unlock', 'yl', '365 天方案標出省多少', '訂閱頁把 <em>365 天方案</em>放第一個，直接標「最划算・省 NT$90」。',
        '365 天 NT$990，平均每月不到 NT$83；買 12 次 30 天要 NT$1,080。']] },
    { v: '2026-11-21', d: '11/21', t: '免費版看 4 小時', it: [
      ['clock', '', '免費版延長到 4 小時', '免費版現在可以看<em>現在起 4 小時</em>的班機（原本 3 小時）。',
        '要看整天、明天或自訂時段，訂閱完整版就能隨意切換。'],
      ['check', 'pk', '引導按鍵移到左右兩側', '設定引導和功能導覽的「上一步／下一步」改放在<em>畫面左右兩側</em>，不會再被下面擋住。',
        '想再看一次：「設定」最下面按「使用引導」。']] },
    { v: '2026-11-22', d: '11/22', t: '抵達通知・時段鍵', it: [
      ['alert', 'pk', '班機抵達跳通知', '點開班機按「<em>抵達時通知我</em>」，班機一標抵達就跳通知（出境頁是起飛時）。',
        '訂閱完整版功能。網頁要允許瀏覽器通知，而且看板要開著；iPhone 用 Safari 的話要先「加入主畫面」。'],
      ['clock', '', '時段鍵改成每 6 小時', '四顆時段鍵統一成 <em>00–06、06–12、12–18、18–24</em>，App 跟網頁一樣。',
        '訂閱完整版還是可以按「自訂時段鍵」改成自己的上班時段。']] },
    { v: '2026-11-23', d: '11/23', t: 'App 關著也通知・桌面小工具', it: [
      ['alert', 'pk', 'App 關著也收得到抵達通知', 'iPhone App 按「<em>抵達時通知我</em>」後，App 關著也會跳通知（出境是起飛時）；班機取消也會通知。',
        '每班只通知一次，隔天自動取消。通知依機場公開資料，可能比現場晚幾分鐘，以現場為準。訂閱完整版功能；網頁版還是要開著看板。'],
      ['clock', 'yl', 'iPhone 桌面小工具', '不用開 App：<em>小</em>看下一班、<em>中</em>看接下來 3 班、<em>大</em>看 7 班＋1 小時人數（估計）。',
        '鎖定畫面也能放（長方形、圓形、一行文字）；可以選要看哪幾個分類。需要 App 1.4，訂閱完整版功能。'],
      ['users', '', 'Apple Watch 分類兩字標籤', '登機門色塊旁多了分類標籤，自動縮成兩個字：<em>分一、分二、大A、大B、一航、二航</em>。',
        '城市名放不下時會先拿掉「入境」小字，不再被擠成「…」。'],
      ['check', '', '功能導覽多一步', '功能導覽會指給你看「<em>抵達時通知我</em>」在哪裡：點班機的「詳細」就看得到。',
        '想再看一次：「設定」最下面按「功能導覽」。']] }
  ];
  var K = 'tpenews1', seen = '';
  try { seen = localStorage.getItem(K) || ''; } catch (e) {}
  var list = NEWS.filter(function (n) { return n.v > seen; });
  if (/[?&]news=1/.test(location.search)) list = NEWS;
  window.__TPE_NEWS = NEWS;
  if (!list.length || /changelog\.html$/.test(location.pathname)) return;
  function ic(n) { return '<svg class="ic" viewBox="0 0 24 24"><use href="#i-' + n + '"/></svg>'; }
  function show() {
    if (D.getElementById('fxnews')) return;
    var n = 0, h = '', lastD = '';
    list.forEach(function (s) {
      if (s.d !== lastD) { lastD = s.d; h += '<div class="nw-d"><i>' + s.d + '</i><span>' + list.filter(function (x) { return x.d === s.d; }).map(function (x) { return x.t; }).join('、') + '</span></div>'; }
      s.it.forEach(function (x) { h += '<div class="nw-i ' + x[1] + '" style="--n:' + (n++) + '" role="button" tabindex="0" aria-expanded="false"><div class="nw-ic">' + ic(x[0]) + '</div><div><b>' + x[2] + '<u>看更多 ▾</u></b><p>' + x[3] + '</p><div class="nw-x"><div>' + x[4] + '</div></div></div></div>'; });
    });
    var o = D.createElement('div'); o.id = 'fxnews'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-label', '更新資訊');
    o.innerHTML = '<div class="nw"><div class="nw-h"><small>WHAT\'S NEW</small><b>看板更新了</b></div><div class="nw-b">' + h + '</div>' +
      '<div class="nw-f"><a class="nw-log" href="changelog.html">完整更新日誌 ›</a><button type="button" class="nw-go">開始使用</button></div></div>';
    function close() { try { localStorage.setItem(K, NEWS[NEWS.length - 1].v); } catch (e) {} o.classList.add('out'); setTimeout(function () { o.remove(); }, 260); }
    o.querySelector('.nw-go').onclick = close;
    [].forEach.call(o.querySelectorAll('.nw-i'), function (it) { it.addEventListener('click', function () { var op = it.classList.toggle('open'); it.setAttribute('aria-expanded', op ? 'true' : 'false'); var u = it.querySelector('b u'); if (u) u.textContent = op ? '收起 ▴' : '看更多 ▾'; }); });
    o.addEventListener('click', function (e) { if (e.target === o) close(); });
    o.querySelector('.nw-log').addEventListener('click', function () { try { localStorage.setItem(K, NEWS[NEWS.length - 1].v); } catch (e) {} });
    D.body.appendChild(o);
  }
  function go() { setTimeout(show, 1700); }
  if (D.readyState === 'complete') go(); else addEventListener('load', go);
})();
