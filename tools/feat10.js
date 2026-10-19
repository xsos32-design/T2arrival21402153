<script>
/* ══ 直覺版（2026-10-19）：N1 下一班、N3 按了有回饋、N5 說明收成一行、N6 晚上回報快捷。入境頁、出境頁共用 ══
   小韋最常做：看下一班幾點到哪個門、看人數準備人力、快速切時段、晚上複製回報／查一班
   最困擾：要的資訊要捲很久、按了不知道有沒有生效、字和標示看不懂 */
(function(){
  var W=window, D=document, R=D.documentElement;
  if(W.__n10) return; W.__n10=1; W.__N={N1:1,N3:1,N5:1,N6:1};
  var DEP=/出境/.test(D.title);
  var css=D.createElement('style'); css.textContent=[
  /* N1 下一班：資訊卡最上面，每個分類一行，點了跳到那班 */
  '#nnext{margin:0 0 10px;display:grid;gap:6px}',
  '#nnext .h{display:flex;justify-content:space-between;align-items:baseline;font-size:12.5px;font-weight:900;letter-spacing:.1em;color:#a08e55}',
  '#nnext .h a{color:#00f0ff;letter-spacing:0;font-size:13px;cursor:pointer;text-decoration:none}',
  '#nnext .nx{margin:0!important;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:4px 10px;padding:9px 12px;background:rgba(10,6,20,.6);border:1px solid rgba(255,255,255,.12);cursor:pointer;text-align:left;font:inherit;color:#e8e3f5;width:100%}',
  '#nnext .nx.k40{border-color:rgba(0,240,255,.55);box-shadow:inset 4px 0 0 #00f0ff}',
  '#nnext .nx.k53{border-color:rgba(255,42,109,.6);box-shadow:inset 4px 0 0 #ff2a6d}',
  '#nnext .nx .tg{font-size:13px;font-weight:900;padding:2px 7px;background:#2a2340;color:#fff;align-self:start;margin-top:3px}',
  '#nnext .nx.k40 .tg{background:#00f0ff;color:#00202a} #nnext .nx.k53 .tg{background:#ff2a6d;color:#2b0411}',
  '#nnext .nx .m{min-width:0}',
  '#nnext .nx .t{font-size:24px;font-weight:900;color:#f5ee0b;line-height:1.1;margin-right:8px}',
  '#nnext .nx .f{font-size:17px;font-weight:900;color:#fff}',
  '#nnext .nx .s{display:block;font-size:13.5px;font-weight:800;color:#c3cad4;margin-top:2px}',
  '#nnext .nx .g{font-size:24px;font-weight:900;padding:2px 8px;background:#fff;color:#111;align-self:center}',
  '#nnext .nx.k40 .g{background:#00f0ff;color:#00202a} #nnext .nx.k53 .g{background:#ff2a6d;color:#2b0411}',
  '#nnext .nx .cd{color:#f5ee0b}',
  '#nnext .nx.none{display:block;color:#9a8fb5;font-weight:800;cursor:default}',
  '#nnext .rep{display:flex;gap:6px}',
  '#nnext .rep button{flex:1!important;width:auto!important;margin:0!important;font:inherit;font-size:14px;font-weight:900;min-height:42px;cursor:pointer;background:rgba(245,238,11,.12);border:1px solid #f5ee0b;color:#f5ee0b}',
  '.r.nflash{animation:nfl 1.6s ease-out}',
  '@keyframes nfl{0%,30%{box-shadow:0 0 0 3px #f5ee0b,0 0 30px #f5ee0b}100%{box-shadow:none}}',
  /* N2 時段一排，直接按 */
  '#ntime{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 0 10px}',
  '#ntime::-webkit-scrollbar{display:none}',
  '#ntime button{flex:1 0 auto!important;width:auto!important;margin:0!important;font:inherit;font-size:14.5px;font-weight:900;padding:8px 11px;min-height:42px;cursor:pointer;background:#1a1030;border:1px solid #3a2a5a;color:#b9aed6;white-space:nowrap}',
  '#ntime button.on{background:rgba(0,240,255,.16);border-color:#00f0ff;color:#00f0ff;box-shadow:0 0 12px -3px #00f0ff}',
  /* N3 按了就回饋 */
  '#nfb{position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:330;background:rgba(10,6,20,.95);border:1px solid #00f0ff;color:#e8fbff;font-weight:900;font-size:14.5px;padding:10px 16px;box-shadow:0 10px 30px rgba(0,0,0,.6);max-width:92vw;text-align:center;pointer-events:none;opacity:0;transition:opacity .2s}',
  '#nfb.on{opacity:1}',
  '#nfb b{color:#f5ee0b}',
  /* N5 說明收成一行 */
  'details.nhelp{margin:14px 0}',
  'details.nhelp>summary{cursor:pointer;font-weight:900;color:#9a8fb5;padding:10px 12px;border:1px dashed rgba(154,143,181,.5);list-style:none}',
  'details.nhelp>summary::-webkit-details-marker{display:none}',
  'details.nhelp[open]>summary{color:#00f0ff}'
  ].join('\n'); D.head.appendChild(css);

  function hm(s){ var m=String(s||'').match(/(\d\d):(\d\d)/); return m?(+m[1])*60+(+m[2]):null; }
  function sel(){ try{ return W.selCats(); }catch(e){ return ['2140','2153']; } }
  function tagOf(r){ var t=r.querySelector('.c-shop .tag'); return t?t.textContent.trim():''; }
  function txt(el){ return el?String(el.textContent||'').trim():''; }
  function pxN(r){ var p=r.querySelector('.px'); return p?parseInt(p.textContent.replace(/[^\d]/g,''),10)||0:0; }
  function etaOf(r){ var t=hm(txt(r.querySelector('.c-time b'))); if(t===null) return null; var d=new Date(), e=t-(d.getHours()*60+d.getMinutes()); if(e<-720) e+=1440; return e; }
  function left(e){ return e<=0?'快到了':(e>=60?Math.floor(e/60)+' 小時'+(e%60?' '+(e%60)+' 分':'')+'後':e+' 分後'); }
  /* 還有幾分：跨過午夜的（清單裡「隔日」那條線以後的）才加 24 小時，早上已經過去的班不會被當成明天 */
  function eta2(r){ var t=hm(txt(r.querySelector('.c-time b'))); if(t===null) return 1e9; var d=new Date(), e=t-(d.getHours()*60+d.getMinutes());
    var db=D.querySelector('#out .daybreak'); if(db&&(db.compareDocumentPosition(r)&Node.DOCUMENT_POSITION_FOLLOWING)) e+=1440; return e; }
  function rows(){ return [].slice.call(D.querySelectorAll('#out .r:not(.head)')); }

  /* N3：使用者按了時段／分類／區域／隱藏，畫完就跳一行「現在看的是什麼」 */
  var poke=0, lastSig='';
  D.addEventListener('click',function(e){ if(e.target.closest&&e.target.closest('.chip,#ntime button,.dqb,#fNow')) poke=Date.now(); },true);
  D.addEventListener('change',function(e){ if(e.target&&/^(t1|t2|date)$/.test(e.target.id)) poke=Date.now(); },true);
  function feedback(){
    var S=sel(), pre=D.querySelector('.chip.act[data-t]'), n6=D.getElementById('now6'), t2=D.getElementById('t2'), t1=D.getElementById('t1');
    var range=(n6&&n6.classList.contains('act'))?'現在起 6 小時':(pre?txt(pre).replace(/[✓\s]/g,''):((t1&&t1.value)+'–'+(t2&&t2.value)));
    var mine=rows().filter(function(r){ return S.indexOf(tagOf(r))>=0&&r.style.display!=='none'; }).length;
    var sig=range+'|'+S.join(',')+'|'+mine;
    if(sig!==lastSig&&Date.now()-poke<4000){
      var b=D.getElementById('nfb'); if(!b){ b=D.createElement('div'); b.id='nfb'; D.body.appendChild(b); }
      b.innerHTML='✓ 現在看：<b>'+range+'</b>　'+(S.length?S.join('、'):'沒勾分類')+'　<b>'+mine+'</b> 班';
      b.classList.add('on'); clearTimeout(b.__t); b.__t=setTimeout(function(){ b.classList.remove('on'); },2200);
    }
    lastSig=sig;
  }

  /* N4：字改成一看就懂 */
  function words(on){
    rows().forEach(function(r){
      var i=r.querySelector('.c-time i');
      if(i){ if(i.__n4==null) i.__n4=i.textContent;
        if(on){ var s=i.__n4, m=s.match(/表定\s*([+−-])\s*(\d+)/), nd=/隔日/.test(s)?'隔日・':'';
          i.textContent=m?(nd+(m[1]==='+'?'晚 ':'早 ')+m[2]+' 分'):(/表定/.test(s)&&r.querySelector('.c-time b.t-same')?nd+'準時':s); }
        else i.textContent=i.__n4; }
      [].forEach.call(r.querySelectorAll('.badge.b-none span'),function(sp){ if(sp.__n4==null) sp.__n4=sp.textContent; sp.textContent=on&&sp.__n4==='預計'?'還沒動態':sp.__n4; });
      var px=r.querySelector('.px'); if(px){ if(px.__n4==null) px.__n4=px.innerHTML;
        if(on){ var n=parseInt(px.textContent,10); if(n) px.innerHTML='約 '+n+'<u>人</u>'; } else px.innerHTML=px.__n4; }
    });
    var st=D.getElementById('status');
    if(st&&!st.__n4obs){ st.__n4obs=1; new MutationObserver(function(){ if(st.__n4busy) return; stFix(); }).observe(st,{childList:true,characterData:true,subtree:true}); }
    stFix();
    var rm=D.getElementById('remain');
    if(rm&&on&&!rm.__n4){ rm.__n4=1; rm.innerHTML=rm.innerHTML.replace(/(\d\d):59\s*前/,function(a,h){ return '到 '+('0'+((+h+1)%24||24)).slice(-2)+':00 '; }).replace('前還有','還有'); }
  }

  /* 「10/19 18:00–23:59 · 113 班」→「10/19 18–24・全部 113 班・你的 20 班」（狀態列是畫完清單後才寫，所以盯著它改） */
  function stFix(){
    var st=D.getElementById('status'); if(!st) return; var on=!!(W.__N&&W.__N.N4);
    st.__n4busy=1;
    if(on&&st.innerHTML!==st.__n4o){ st.__n4=st.innerHTML;
      var S=sel(), mine=rows().filter(function(r){ return S.indexOf(tagOf(r))>=0; }).length;
      var h=st.innerHTML.replace(/(\d\d):59/g,function(a,x){ return ('0'+(((+x+1)%24)||24)).slice(-2)+':00'; })
        .replace(/(\d\d):00–(\d\d):00/,function(a,x,y){ return (+x)+'–'+(+y); })
        .replace(/<b>(\d+)<\/b>\s*班/,'全部 <b>$1</b> 班・你的 <b>'+mine+'</b> 班');
      st.innerHTML=h; st.__n4o=h; }
    else if(!on&&st.__n4&&st.innerHTML===st.__n4o){ st.innerHTML=st.__n4; st.__n4=null; st.__n4o=null; }
    st.__n4busy=0;
  }
  function paint(){
    var N=W.__N, ib=D.getElementById('infobox'), card=D.querySelector('.wrap>.card'); if(!ib) return;
    var S=sel(), RS=rows();

    /* N2 時段一排：按鈕是原本時段鍵的分身，按了等於按原本的 */
    var nt=D.getElementById('ntime');
    if(N.N2){ var src=[D.getElementById('now6')].concat([].slice.call(D.querySelectorAll('#ctl .chip[data-t], #qbar .chip[data-t]'))).filter(Boolean);
      if(!nt){ nt=D.createElement('div'); nt.id='ntime'; ib.parentNode.insertBefore(nt,ib); }
      var h=src.map(function(c,i){ return '<button type="button" data-i="'+i+'" class="'+(c.classList.contains('act')?'on':'')+'">'+(c.id==='now6'?'現在6小時':txt(c).replace(/[✓\s]/g,''))+'</button>'; }).join('');
      if(nt.innerHTML!==h){ nt.innerHTML=h; [].forEach.call(nt.querySelectorAll('button'),function(b){ b.onclick=function(){ poke=Date.now(); src[+b.dataset.i].click(); }; }); } }
    else if(nt) nt.remove();

    /* N1 下一班 */
    var nx=D.getElementById('nnext');
    if(N.N1){ if(!nx){ nx=D.createElement('div'); nx.id='nnext'; ib.insertBefore(nx,ib.firstChild); }
      else if(ib.firstChild!==nx) ib.insertBefore(nx,ib.firstChild);
      var d=new Date(), late=d.getHours()*60+d.getMinutes()>=22*60;
      var html='<div class="h"><span>下一班'+(DEP?'起飛':'落地')+'</span><a data-go="now">看清單 ▾</a></div>';
      var list=[];
      S.forEach(function(k){ var r=RS.filter(function(r){ if(tagOf(r)!==k||r.classList.contains('done')||r.style.display==='none') return false; var e=eta2(r); return r.classList.contains('taxi')||(e!==null&&e>=-15); }).sort(function(a,b){ return eta2(a)-eta2(b); })[0];
        var cls=k==='2140'?'k40':(k==='2153'?'k53':'');
        if(!r){ html+='<div class="nx none">'+k+'　這個時段沒有還沒到的班機了</div>'; return; }
        var e=eta2(r), taxi=r.classList.contains('taxi'), n=pxN(r);
        list.push(r);
        html+='<button type="button" class="nx '+cls+'" data-r="'+(list.length-1)+'"><span class="tg">'+k+'</span><span class="m"><span class="t">'+txt(r.querySelector('.c-time b'))+'</span><span class="f">'+txt(r.querySelector('.c-fno b'))+'</span>'
          +'<span class="s">'+txt(r.querySelector('.c-city .cn'))+(n?'・約 '+n+' 人':'')+'・<span class="cd">'+(taxi?'滑行中':left(e))+'</span></span></span><span class="g">'+(txt(r.querySelector('.gn'))||'待定')+'</span></button>'; });
      if(!S.length) html+='<div class="nx none">分類都沒勾，按「設定」勾 2140／2153</div>';
      if(N.N6&&late&&!DEP&&D.getElementById('cpS')) html+='<div class="rep"><button type="button" data-cp="cpD">📋 複製 兆豐D區回報</button><button type="button" data-cp="cpS">📋 複製 2140+2153</button></div>';
      if(nx.__h!==html){ nx.innerHTML=html; nx.__h=html; }
      nx.onclick=function(e){ var b=e.target.closest('[data-r],[data-go],[data-cp]'); if(!b) return;
        if(b.dataset.cp){ var c=D.getElementById(b.dataset.cp); if(c){ poke=0; c.click(); b.textContent='✓ 已複製，貼到群組就好'; } return; }
        var r=b.dataset.go?D.querySelector('.nowline')||list[0]:list[+b.dataset.r]; if(!r) return;
        scrollTo({top:r.getBoundingClientRect().top+scrollY-90,behavior:'smooth'}); if(r.classList.contains('r')){ r.classList.remove('nflash'); void r.offsetWidth; r.classList.add('nflash'); } };
    } else if(nx) nx.remove();

    /* N4 文字 */
    if(N.N4) words(true);

    /* N5 說明收成一行 */
    var no=D.querySelector('.wrap>.notice, details.nhelp>.notice'), dh=D.querySelector('details.nhelp');
    if(N.N5&&no&&!dh){ dh=D.createElement('details'); dh.className='nhelp'; dh.innerHTML='<summary>ⓘ 說明：顏色代表什麼、人數怎麼算、資料來源 ▸</summary>'; no.parentNode.insertBefore(dh,no); dh.appendChild(no); }
    if(!N.N5&&dh){ dh.parentNode.insertBefore(no,dh); dh.remove(); }

    if(N.N3) feedback();
  }
  W.__n10paint=paint;
  var wait=setInterval(function(){ if(typeof W.render!=='function'||!D.getElementById('infobox')) return; clearInterval(wait);
    var _r=W.render; W.render=function(){ var x=_r.apply(this,arguments); try{ paint(); }catch(e){ console.log('n10',e); } return x; };
    try{ paint(); }catch(e){}
  },100);
  setInterval(function(){ try{ paint(); }catch(e){} },30000);
})();
</script>
