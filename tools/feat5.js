<style>
/* ══ 版面第五輪（2026-10-18）：H1 設定列單層、H2 時段鍵一排、H4 資訊卡順序、H5 搜尋框變細、H7 標題統一、H8 收合線變細。入境頁、出境頁共用 ══ */
/* H1 設定列單層：收起時拿掉外面那層框，只剩一條設定列 */
html.hH1 .wrap>.card:not(.open){padding:0!important;border:0!important;background:none!important;box-shadow:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;margin-bottom:8px!important}
html.hH1 .wrap>.card:not(.open)::before,html.hH1 .wrap>.card:not(.open)::after{display:none!important}
html.hH1 .wrap>.card:not(.open) #ctlbar{min-height:48px!important;padding:8px 12px!important}
/* H2 時段鍵一排：打開設定時，時段五顆擠成一排（跟出境頁一樣），整塊矮一大截 */
html.hH2 #ctl .chips.ctl-row:first-child,html.hH2 #ctl>.chips:first-of-type{display:flex!important;flex-wrap:wrap!important;gap:6px!important}
html.hH2 #ctl .ctl-row .chip[data-t]{flex:1 1 0!important;min-width:0!important;width:auto!important;padding:9px 2px!important;font-size:13.5px!important;letter-spacing:-.02em;text-align:center;justify-content:center}
/* H4 資訊卡順序：日期／班數那行移到最下面、變小字 */
html.hH4 #infobox #status{font-size:11.5px!important;opacity:.75;margin-top:8px!important;order:99}
/* H5 搜尋框變細 */
html.hH5 #fsearch{margin:6px 0 6px!important}
html.hH5 #fsearch input{padding:6px 10px!important;font-size:15px!important;min-height:38px}
html.hH5 #fsearch button{min-height:38px!important;font-size:13px!important;padding:0 10px!important}
/* H7 標題統一：大一點、分頁一眼分得出 */
html.hH7 header h1{font-size:17px!important;letter-spacing:.04em}
html.hH7 header h1 .h7k{display:inline-block;margin-left:6px;padding:0 6px;font-size:13px;background:rgba(0,240,255,.14);border:1px solid rgba(0,240,255,.5);color:#00f0ff;vertical-align:2px}
html.hH7.dep header h1 .h7k{background:rgba(255,42,109,.16);border-color:rgba(255,42,109,.55);color:#ff9ec0}
/* H8 「已抵達 N 班」「空檔」那幾條變細，不像按鈕那麼搶眼 */
html.hH8 .foldline{min-height:0!important;padding:6px 12px!important;font-size:13px!important;margin:6px 0!important}
html.hH8 .gapline{padding:3px 10px!important;font-size:12.5px!important;margin:6px 0!important;opacity:.85}
</style>
<script>
(function(){
  var D=document, R=D.documentElement, DEP=/出境/.test(D.title), ALL=/全時段/.test(D.title);
  ['hH1','hH2','hH4','hH5','hH7','hH8'].forEach(function(c){ R.classList.add(c); });
  function paint(){
    var ib=D.getElementById('infobox');
    /* H4 日期／班數那行搬到資訊卡最下面（「更多」上面） */
    var st=D.getElementById('status');
    if(ib&&st&&st.parentNode===ib){ var mb=D.getElementById('ibmore');
      if(mb&&mb.parentNode===ib){ if(st.nextSibling!==mb) ib.insertBefore(st,mb); } else if(ib.lastChild!==st) ib.appendChild(st); }
    /* H5 搜尋框提示加放大鏡 */
    var si=D.querySelector('#fsearch input'); if(si&&si.placeholder.indexOf('🔍')<0) si.placeholder='🔍 '+si.placeholder;
    /* H7 標題：入境／出境 + 小標籤 */
    var h1=D.querySelector('header h1');
    if(h1&&!h1.querySelector('.h7k')){ var ic=h1.querySelector('svg');
      h1.innerHTML=(ic?ic.outerHTML:'')+' '+(DEP?'出境班機':'入境班機')+'<span class="h7k">'+(ALL?'全時段':'2140 / 2153')+'</span>'; }
  }
  if(D.readyState==='loading') D.addEventListener('DOMContentLoaded',paint); else paint();
  var wait=setInterval(function(){
    if(typeof window.render!=='function') return; clearInterval(wait);
    var _r=window.render;
    window.render=function(){ var x=_r.apply(this,arguments); try{ paint(); }catch(e){ console.log('feat5',e); } return x; };
    try{ paint(); }catch(e){}
  },100);
})();
</script>
