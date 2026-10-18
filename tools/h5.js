/* ══ 第五輪：版面／順序／美術／按鈕（H1–H8）：只在 preview/h5.html 裡注入，正式版還沒上 ══
   window.__H = {H1:true,...} 決定開哪些；樣式用 <html class="hH1 ..."> 開關，每次 render() 畫完補上 */
(function(){
  var W=window, D=document, R=D.documentElement;
  if(W.__h5) return; W.__h5=1;
  W.__H=W.__H||{};
  var DEP=/出境/.test(D.title), ALL=/全時段/.test(D.title);
  var css=D.createElement('style'); css.textContent=[
  /* H1 設定列單層：收起時拿掉外面那層框，只剩一條設定列 */
  'html.hH1 .wrap>.card:not(.open){padding:0!important;border:0!important;background:none!important;box-shadow:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;margin-bottom:8px!important}',
  'html.hH1 .wrap>.card:not(.open)::before,html.hH1 .wrap>.card:not(.open)::after{display:none!important}',
  'html.hH1 .wrap>.card:not(.open) #ctlbar{min-height:48px!important;padding:8px 12px!important}',
  /* H2 時段鍵一排：打開設定時，時段五顆擠成一排（跟出境頁一樣），整塊矮一大截 */
  'html.hH2 #ctl .chips.ctl-row:first-child,html.hH2 #ctl>.chips:first-of-type{display:flex!important;flex-wrap:wrap!important;gap:6px!important}',
  'html.hH2 #ctl .ctl-row .chip[data-t]{flex:1 1 0!important;min-width:0!important;width:auto!important;padding:9px 2px!important;font-size:13.5px!important;letter-spacing:-.02em;text-align:center;justify-content:center}',
  /* H3 最後一班併進進度：不另外一大塊，直接寫在「已到 N／M 班」下面 */
  'html.hH3 #glast{display:none!important}',
  '#prog .plast{display:block;margin-top:4px;font-size:12px;font-weight:800;color:#e3b6ff;white-space:normal;line-height:1.35}',
  '#prog .plast b{color:#fff}',
  '#prog .plast i{display:block;font-style:normal;font-size:11.5px;color:#b9aed6;margin-top:1px}',
  /* H4 資訊卡順序：日期／班數那行移到最下面、變小字 */
  'html.hH4 #infobox #status{font-size:11.5px!important;opacity:.75;margin-top:8px!important;order:99}',
  /* H5 搜尋框變細 */
  'html.hH5 #fsearch{margin:6px 0 6px!important}',
  'html.hH5 #fsearch input{padding:6px 10px!important;font-size:15px!important;min-height:38px}',
  'html.hH5 #fsearch button{min-height:38px!important;font-size:13px!important;padding:0 10px!important}',
  /* H6 浮動按鈕：深色毛玻璃、矮一點，看得到後面的班機（三顆順序不變） */
  '@media (max-width:820px){html.hH6 #fab .fabb{min-height:42px!important;font-size:14.5px!important;background:rgba(14,8,26,.62)!important;-webkit-backdrop-filter:blur(10px) saturate(1.3);backdrop-filter:blur(10px) saturate(1.3);border-color:rgba(0,240,255,.35)!important}}',
  /* H7 標題統一：大一點、分頁一眼分得出 */
  'html.hH7 header h1{font-size:17px!important;letter-spacing:.04em}',
  'html.hH7 header h1 .h7k{display:inline-block;margin-left:6px;padding:0 6px;font-size:13px;background:rgba(0,240,255,.14);border:1px solid rgba(0,240,255,.5);color:#00f0ff;vertical-align:2px}',
  'html.hH7.dep header h1 .h7k{background:rgba(255,42,109,.16);border-color:rgba(255,42,109,.55);color:#ff9ec0}',
  /* H8 「已抵達 N 班」「空檔」那幾條變細，不像按鈕那麼搶眼 */
  'html.hH8 .foldline{min-height:0!important;padding:6px 12px!important;font-size:13px!important;margin:6px 0!important}',
  'html.hH8 .gapline{padding:3px 10px!important;font-size:12.5px!important;margin:6px 0!important;opacity:.85}'
  ].join('\n'); D.head.appendChild(css);

  function hm(s){ var m=String(s||'').match(/(\d\d):(\d\d)/); return m?(+m[1])*60+(+m[2]):null; }
  function sel(){ try{ return W.selCats(); }catch(e){ return ['2140','2153']; } }
  function tagOf(r){ var t=r.querySelector('.c-shop .tag'); return t?t.textContent.trim():''; }
  function fnoOf(r){ return ((r.querySelector('.c-fno b')||{}).textContent||'').trim(); }
  function tOf(r){ return ((r.querySelector('.c-time b')||{}).textContent||'').trim(); }
  function etaOf(r){ var t=hm(tOf(r)); if(t===null) return null; var d=new Date(), e=t-(d.getHours()*60+d.getMinutes()); if(e<-720) e+=1440; return e; }
  function left(e){ return e>=60?Math.floor(e/60)+' 時'+(e%60?' '+(e%60)+' 分':'')+'後':e+' 分後'; }
  var H1TXT=null;

  function paint(){
    var H=W.__H, k;
    for(k in H) R.classList.toggle('h'+k,!!H[k]);
    var ib=D.getElementById('infobox');

    /* H3 最後一班寫進進度那兩欄 */
    [].forEach.call(D.querySelectorAll('#prog .plast'),function(x){ x.remove(); });
    if(H.H3){ var S=sel(), L={};
      [].forEach.call(D.querySelectorAll('#out .r:not(.head)'),function(r){ var t=tagOf(r); if(S.indexOf(t)>=0) L[t]=r; });
      [].forEach.call(D.querySelectorAll('#prog .p'),function(p){ var nm=String(p.firstChild&&p.firstChild.textContent||p.textContent).trim().split(/\s/)[0], r=L[nm]; if(!r) return;
        var e=etaOf(r), done=r.classList.contains('done');
        var s=D.createElement('span'); s.className='plast';
        s.innerHTML='🏁 最後 <b>'+tOf(r)+' '+fnoOf(r)+'</b><i>'+(done?(DEP?'已飛':'已到'):(e!==null&&e>0?'還有 '+left(e).replace('後',''):'就是現在'))+'</i>';
        p.appendChild(s); }); }

    /* H4 日期／班數那行搬到資訊卡最下面（「更多」上面） */
    var st=D.getElementById('status');
    if(ib&&st&&st.parentNode===ib){
      if(H.H4){ var mb=D.getElementById('ibmore'); if(mb&&mb.parentNode===ib){ if(st.nextSibling!==mb) ib.insertBefore(st,mb); } else if(ib.lastChild!==st) ib.appendChild(st); }
      else if(ib.firstChild!==st) ib.insertBefore(st,ib.firstChild); }

    /* H5 搜尋框提示加放大鏡 */
    var si=D.querySelector('#fsearch input'); if(si){ si.placeholder=(H.H5?'🔍 ':'')+'搜班號或城市（BR23、大阪）'; }

    /* H7 標題：入境／出境 + 小標籤 */
    var h1=D.querySelector('header h1');
    if(h1){ if(H1TXT===null) H1TXT=h1.innerHTML;
      if(H.H7){ var ic=h1.querySelector('svg'); var want=(ic?ic.outerHTML:'')+' '+(DEP?'出境班機':'入境班機')+'<span class="h7k">'+(ALL?'全時段':'2140 / 2153')+'</span>';
        if(h1.innerHTML!==want) h1.innerHTML=want; }
      else if(h1.innerHTML!==H1TXT) h1.innerHTML=H1TXT; }
  }
  W.__h5paint=paint;
  var wait=setInterval(function(){ if(typeof W.render!=='function') return; clearInterval(wait);
    var _r=W.render; W.render=function(){ var x=_r.apply(this,arguments); try{ paint(); }catch(e){ console.log('h5',e); } return x; };
    try{ paint(); }catch(e){} },100);
  setInterval(function(){ try{ paint(); }catch(e){} },30000);
})();
