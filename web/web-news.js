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
        '分類名稱、顏色、負責的登機門都可以照自己的工作區域改，只記在這台裝置。']] }
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
