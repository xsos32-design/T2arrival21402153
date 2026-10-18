/* ══ 第四輪提案（G1–G7）：只在 preview/g4.html 裡注入，正式版還沒上 ══
   window.__G = {G1:true,...} 決定開哪些；每次 render() 畫完就補上 */
(function(){
  var W=window, D=document;
  if(W.__g4) return; W.__g4=1;
  W.__G=W.__G||{};
  var css=D.createElement('style'); css.textContent=[
  /* G1 螢幕常亮、G2 語音：右上角小鍵（跟「大字」同一排） */
  '.g4hb{margin-right:6px;background:#161e29;border:1px solid #2a3545;color:#c3cad4;font:inherit;font-weight:900;font-size:13px;padding:2px 8px;min-height:30px;line-height:1;width:auto!important;flex:0 0 auto!important;min-width:0!important;margin-top:0!important;margin-bottom:0!important;cursor:pointer}',
  '.g4hb.on{background:rgba(245,238,11,.14);border-color:#f5ee0b;color:#f5ee0b}',
  /* G3 最後一班 */
  '.c-time .lastb{display:table;font-style:normal;font-size:11.5px;font-weight:900;margin-top:3px;padding:0 5px;background:#b026ff;color:#fff}',
  '#glast{margin-top:8px;padding:7px 12px;border:1px solid rgba(176,38,255,.55);background:rgba(176,38,255,.12);font-size:13.5px;font-weight:800;color:#e3b6ff}',
  '#glast b{color:#fff}',
  /* G4 分享、G6 提醒：詳細裡的按鈕 */
  '.r .dt .g4row{grid-column:1/-1;display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}',
  '.r .dt .g4b{font:inherit;font-size:14px;font-weight:900;padding:7px 12px;min-height:38px;background:#1a1030;border:1px solid rgba(0,240,255,.5);color:#d7f6ff;cursor:pointer;width:auto!important;flex:0 0 auto!important}',
  '.r .dt .g4b.on{background:#f5ee0b;border-color:#f5ee0b;color:#1a1400}',
  '.c-fno .bell{font-style:normal;font-size:15px;margin-left:4px}',
  /* G5 離線 */
  '#goff{position:sticky;top:0;z-index:70;margin:0 0 8px;padding:8px 12px;background:#ff2a6d;color:#fff;font-weight:900;font-size:14px;text-align:center}',
  /* G7 同時到 */
  '.wave{margin:10px 0 4px;padding:6px 12px;border-left:4px solid #f5ee0b;background:linear-gradient(90deg,rgba(245,238,11,.18),rgba(245,238,11,0));color:#fff8b0;font-size:13.5px;font-weight:900}',
  '.wave b{color:#f5ee0b;font-size:15px}',
  /* 通知 */
  '.g4toast{position:fixed;left:10px;right:10px;top:calc(10px + env(safe-area-inset-top));z-index:320;background:#f5ee0b;color:#1a1400;padding:12px 14px;font-weight:900;font-size:16px;box-shadow:0 10px 40px rgba(0,0,0,.7);border-left:6px solid #1a1400;cursor:pointer}',
  '.g4toast small{display:block;font-size:12.5px;opacity:.85;margin-top:4px}',
  '@media (min-width:821px){.g4toast{left:auto;width:390px}}'
  ].join('\n'); D.head.appendChild(css);

  function hm(s){ var m=String(s||'').match(/(\d\d):(\d\d)/); return m?(+m[1])*60+(+m[2]):null; }
  function p2(n){ return (n<10?'0':'')+n; }
  function fmt(m){ m=((m%1440)+1440)%1440; return p2(Math.floor(m/60))+':'+p2(m%60); }
  function sel(){ try{ return W.selCats(); }catch(e){ return ['2140','2153']; } }
  function tagOf(r){ var t=r.querySelector('.c-shop .tag'); return t?t.textContent.trim():''; }
  function pxOf(r){ var p=r.querySelector('.px'); return p?parseInt(p.textContent,10)||0:0; }
  function fnoOf(r){ return ((r.querySelector('.c-fno b')||{}).textContent||'').trim(); }
  function cityOf(r){ var c=r.querySelector('.c-city .cn'); return c?c.textContent.trim():''; }
  function gateOf(r){ return ((r.querySelector('.gn')||{}).textContent||'').trim(); }
  function tOf(r){ return ((r.querySelector('.c-time b')||{}).textContent||'').trim(); }
  function nowM(){ var d=new Date(); return d.getHours()*60+d.getMinutes(); }
  function etaOf(r){ var t=hm(tOf(r)); if(t===null) return null; var e=t-nowM(); if(e<-720) e+=1440; return e; }
  function rows(){ return [].slice.call(D.querySelectorAll('#out .r:not(.head)')).filter(function(r){ return r.style.display!=='none'; }); }
  var DEP=/出境/.test(D.title);
  function toast(h,sm,ms){ var t=D.createElement('div'); t.className='g4toast'; t.innerHTML=h+'<small>'+(sm||'')+'點一下關掉</small>';
    t.onclick=function(){ t.remove(); }; D.body.appendChild(t);
    try{ if(navigator.vibrate) navigator.vibrate([200,100,200]); }catch(e){}
    setTimeout(function(){ if(t.parentNode) t.remove(); },ms||20000); return t; }
  function store(k,v){ try{ if(v===undefined) return JSON.parse(localStorage.getItem(k)||'null'); localStorage.setItem(k,JSON.stringify(v)); }catch(e){ return null; } }

  /* ── G1 螢幕常亮 ── */
  var WL=null, wlOn=false;
  function wlSet(v){ wlOn=v; var b=D.getElementById('g4wake'); if(b) b.classList.toggle('on',v);
    if(v){ if(!('wakeLock' in navigator)){ toast('這支手機的瀏覽器不支援「螢幕常亮」','iPhone 要 iOS 16.4 以上；也可以到設定把自動鎖定改長一點・'); wlOn=false; if(b) b.classList.remove('on'); return; }
      navigator.wakeLock.request('screen').then(function(l){ WL=l; },function(){ }); }
    else if(WL){ try{ WL.release(); }catch(e){} WL=null; } }
  D.addEventListener('visibilitychange',function(){ if(!D.hidden&&wlOn&&W.__G.G1) wlSet(true); });

  /* ── G2 語音播報 ── */
  var vOn=false, TX={};
  function say(s){ try{ var u=new SpeechSynthesisUtterance(s); u.lang='zh-TW'; u.rate=1.05; speechSynthesis.cancel(); speechSynthesis.speak(u); }catch(e){} }
  function spell(f){ return String(f).replace(/^([A-Z]{2}|[A-Z]\d|\d[A-Z])0*/,function(m,a){ return a.split('').join(' ')+' '; }); }
  W.__g4SimVoice=function(){ var r=rows().filter(function(r){ return !r.classList.contains('done'); })[0]; if(!r) return;
    var s=spell(fnoOf(r))+' '+cityOf(r)+(DEP?' 開始滑行，':' 落地了，')+'登機門 '+(gateOf(r)||'待定');
    toast('🔊 '+fnoOf(r)+'　'+cityOf(r)+(DEP?'　開始滑行':'　落地滑行中')+'　門 '+(gateOf(r)||'待定'),'（模擬）手機會唸：「'+s+'」・'); say(s); };

  /* ── G6 落地提醒 ── */
  var RKEY='g4rem1', REM=store(RKEY)||{};
  function remKey(r){ return fnoOf(r)+'|'+(new Date()).toDateString(); }
  function remCheck(force){
    rows().forEach(function(r){ var k=remKey(r); if(!REM[k]||REM[k]===2) return; var e=etaOf(r);
      if(force||(e!==null&&e<=10)){ REM[k]=2; store(RKEY,REM);
        toast('🔔 '+fnoOf(r)+' '+cityOf(r)+(e!==null&&e>0?' 約 '+e+' 分後':' 快')+(DEP?'起飛':'落地')+'　門 '+(gateOf(r)||'待定'),(force?'（模擬）':'')+'你設定的提醒・');
        if(vOn) say(spell(fnoOf(r))+' 快要'+(DEP?'起飛':'落地')+'了'); } }); }
  W.__g4SimRem=function(){ var r=rows().filter(function(r){ return !r.classList.contains('done'); })[0]; if(!r) return; REM[remKey(r)]=1; remCheck(true); };

  /* ── G5 離線 ── */
  function offPaint(sim){ var o=D.getElementById('goff'), off=sim||!navigator.onLine;
    if(W.__G.G5&&off){ if(!o){ o=D.createElement('div'); o.id='goff'; var w=D.querySelector('.wrap'); if(w) w.insertBefore(o,w.firstChild); }
      var lv=(D.getElementById('live')||{}).textContent||''; o.textContent='📴 目前沒有網路，先顯示 '+(lv.match(/\d\d:\d\d/)||['上次'])[0]+' 抓到的班機；有網路會自動更新'; }
    else if(o) o.remove(); }
  addEventListener('online',function(){ offPaint(); }); addEventListener('offline',function(){ offPaint(); });
  W.__g4SimOff=function(){ offPaint(true); setTimeout(function(){ offPaint(); },8000); };

  function hdBtn(id,txt,fn){ var b=D.getElementById(id); var hd=D.querySelector('header'); if(!hd) return null;
    if(!b){ b=D.createElement('button'); b.type='button'; b.id=id; b.className='g4hb'; b.textContent=txt; b.onclick=fn;
      var ref=D.getElementById('bigbtn')||hd.querySelector('.live'); hd.insertBefore(b,ref||null); }
    return b; }

  function paint(){
    var G=W.__G, out=D.getElementById('out'); if(!out) return;
    var S=sel(), RS=rows();

    /* G1 */
    if(G.G1) hdBtn('g4wake','常亮',function(){ wlSet(!wlOn); }); else { var b1=D.getElementById('g4wake'); if(b1) b1.remove(); if(wlOn) wlSet(false); }
    /* G2 */
    if(G.G2){ var b2=hdBtn('g4voice','播報',function(){ vOn=!vOn; this.classList.toggle('on',vOn); if(vOn) say('語音播報開啟'); }); if(b2) b2.classList.toggle('on',vOn); }
    else { var x2=D.getElementById('g4voice'); if(x2) x2.remove(); vOn=false; }
    if(G.G2&&vOn) RS.forEach(function(r){ var k=fnoOf(r), tx=r.classList.contains('taxi');
      if(tx&&TX[k]===false&&S.indexOf(tagOf(r))>=0) say(spell(k)+' '+cityOf(r)+(DEP?' 開始滑行，':' 落地了，')+'登機門 '+(gateOf(r)||'待定'));
      TX[k]=tx; });
    else RS.forEach(function(r){ TX[fnoOf(r)]=r.classList.contains('taxi'); });

    /* G3 最後一班（這個時段裡，每個勾選分類的最後一班） */
    [].forEach.call(D.querySelectorAll('.c-time .lastb'),function(x){ x.remove(); });
    var lastHtml='';
    if(G.G3){ var L={}; RS.forEach(function(r){ var t=tagOf(r); if(S.indexOf(t)>=0) L[t]=r; });
      var ks=S.filter(function(k){ return L[k]; });
      ks.forEach(function(k){ var i=D.createElement('i'); i.className='lastb'; i.textContent=k+' 最後一班'; var c=L[k].querySelector('.c-time'); if(c) c.appendChild(i); });
      if(ks.length) lastHtml='🏁 本時段最後一班：'+ks.map(function(k){ var r=L[k], e=etaOf(r); return k+' <b>'+tOf(r)+' '+fnoOf(r)+'</b>'+(L[k].classList.contains('done')?'（已到）':(e!==null&&e>0?'（'+(e>=60?Math.floor(e/60)+' 時'+(e%60?' '+(e%60)+' 分':'')+'後）':e+' 分後）'):'')); }).join('　'); }
    var gl=D.getElementById('glast'), ib=D.getElementById('infobox');
    if(lastHtml&&ib){ if(!gl){ gl=D.createElement('div'); gl.id='glast'; } var an=D.getElementById('prog')||D.getElementById('remain'); if(an&&an.nextSibling!==gl) an.parentNode.insertBefore(gl,an.nextSibling); else if(!gl.parentNode) ib.appendChild(gl); gl.innerHTML=lastHtml; }
    else if(gl) gl.remove();

    /* G4 分享、G6 提醒：點開的詳細裡 */
    RS.forEach(function(r){ var dt=r.querySelector('.dt'), row=dt&&dt.querySelector('.g4row');
      var bell=r.querySelector('.c-fno .bell'), on=G.G6&&REM[remKey(r)]===1;
      if(on&&!bell){ bell=D.createElement('i'); bell.className='bell'; bell.textContent='🔔'; var fb=r.querySelector('.c-fno b'); if(fb) fb.parentNode.insertBefore(bell,fb.nextSibling); }
      if(!on&&bell) bell.remove();
      if(!dt) return;
      if(!G.G4&&!G.G6){ if(row) row.remove(); return; }
      if(!row){ row=D.createElement('div'); row.className='g4row'; var x=dt.querySelector('.x'); dt.insertBefore(row,x||null); }
      var h='';
      if(G.G4) h+='<button type="button" class="g4b" data-a="share">📤 分享這班</button>';
      if(G.G6&&!r.classList.contains('done')) h+='<button type="button" class="g4b'+(on?' on':'')+'" data-a="rem">'+(on?'🔔 已設提醒（再按取消）':'🔔 '+(DEP?'起飛':'落地')+'前 10 分提醒我')+'</button>';
      if(row.innerHTML!==h) row.innerHTML=h;
      [].forEach.call(row.querySelectorAll('.g4b'),function(b){ b.onclick=function(ev){ ev.stopPropagation();
        if(b.dataset.a==='share'){ var txt=fnoOf(r)+' '+cityOf(r)+'｜'+(DEP?'預計起飛 ':'預計落地 ')+tOf(r)+'｜登機門 '+(gateOf(r)||'待定')+'（'+(tagOf(r)||'')+'）';
          if(navigator.share) navigator.share({text:txt}).catch(function(){});
          else { try{ navigator.clipboard.writeText(txt); toast('📋 已複製，可以貼到 LINE','「'+txt+'」・',6000); }catch(e){} } }
        else { var k=remKey(r); if(REM[k]===1) delete REM[k]; else REM[k]=1; store(RKEY,REM); paint(); } }; }); });

    /* G5 */
    offPaint();

    /* G7 同時到：你勾的分類，相鄰兩班相隔 10 分內連成一串，3 班以上就標出來 */
    [].forEach.call(out.querySelectorAll('.wave'),function(x){ x.remove(); });
    if(G.G7){ var M=RS.filter(function(r){ return S.indexOf(tagOf(r))>=0&&!r.classList.contains('done'); }), grp=[], all=[];
      M.forEach(function(r){ var t=hm(tOf(r)); if(t===null) return; var last=grp[grp.length-1];
        if(last&&((t-last.t+1440)%1440)<=10) grp.push({r:r,t:t}); else { if(grp.length>=3) all.push(grp); grp=[{r:r,t:t}]; } });
      if(grp.length>=3) all.push(grp);
      all.forEach(function(g){ var p=0; g.forEach(function(x){ p+=pxOf(x.r); });
        var w=D.createElement('div'); w.className='wave';
        w.innerHTML='🌊 <b>'+fmt(g[0].t)+'–'+fmt(g[g.length-1].t)+'</b>　'+g.length+' 班接連'+(DEP?'起飛':'落地')+'・約 <b>'+p.toLocaleString()+'</b> 人';
        g[0].r.parentNode.insertBefore(w,g[0].r); }); }
  }
  W.__g4paint=paint;
  var wait=setInterval(function(){ if(typeof W.render!=='function') return; clearInterval(wait);
    var _r=W.render; W.render=function(){ var x=_r.apply(this,arguments); try{ paint(); }catch(e){ console.log('g4',e); } return x; };
    try{ paint(); }catch(e){} },100);
  D.addEventListener('click',function(e){ if(e.target.closest&&e.target.closest('#out .r')) setTimeout(function(){ try{ paint(); }catch(_){ } },60); });
  setInterval(function(){ try{ remCheck(); paint(); }catch(e){} },30000);
})();
