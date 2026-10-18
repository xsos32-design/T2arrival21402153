<style>
/* ══ 新功能第三輪（2026-10-17）：F1 班機搜尋、F7 門改提醒。入境頁、出境頁共用 ══ */
/* F1 搜尋框：放在班機清單正上方 */
#fsearch{display:flex;gap:6px;margin:8px 0 6px}
#fsearch input{flex:1 1 auto!important;width:auto!important;min-width:0;font:inherit;font-size:16px;font-weight:800;padding:9px 12px;
  background:#120a1f;border:1px solid rgba(0,240,255,.5);color:#fff;clip-path:polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,0 100%)}
#fsearch input::placeholder{color:#7d6f9a}
#fsearch button{flex:0 0 auto!important;width:auto!important;min-height:42px;font:inherit;font-size:14px;font-weight:900;padding:0 12px;
  background:#1a1030;border:1px solid #3a2a5a;color:#b9aed6}
#fsearchn{display:block;font-size:12.5px;font-weight:800;color:#9a8fb5;margin:-2px 0 6px}
/* F7 門改提醒：紫色，跟滑行提醒（藍色）分開 */
.gtoast{position:fixed;left:10px;right:10px;top:calc(10px + env(safe-area-inset-top));z-index:310;background:#b026ff;color:#fff;padding:12px 14px;
  font-weight:900;font-size:16px;box-shadow:0 10px 40px rgba(0,0,0,.7);border-left:6px solid #fff;cursor:pointer}
.gtoast .gt-h{font-size:15px;margin-bottom:4px}
.gtoast .gt-r{font-size:16.5px;padding:2px 0;border-top:1px solid rgba(255,255,255,.25)}
.gtoast .gt-r b{background:#fff;color:#3a0060;padding:0 5px}
.gtoast small{display:block;font-size:12.5px;opacity:.92;margin-top:4px}
@media (min-width:821px){.gtoast{left:auto;width:390px}}
.btoast~.gtoast,.gtoast~.btoast{top:auto;bottom:calc(70px + env(safe-area-inset-bottom))}
/* iPhone：打字時（鍵盤開著）先把浮動按鈕藏起來，免得浮在畫面中間 */
body.kbd #fab{display:none!important}
</style>
<script>
(function(){
  var D=document, Q='';
  function sel(){ try{ return selCats(); }catch(e){ return ['2140','2153']; } }
  function norm(s){ return String(s||'').toUpperCase().replace(/\s+/g,''); }
  function short(c){ return norm(c).replace(/^([A-Z0-9]{2})0*(\d)/,'$1$2'); }   /* BR0023 → BR23 */

  /* ── F1 班機搜尋：打班號（BR23、BR0023 都可以）或城市，清單馬上只剩符合的 ── */
  function f1(){
    var out=D.getElementById('out'); if(!out) return;
    var sb=D.getElementById('fsearch');
    if(!sb){ sb=D.createElement('div'); sb.id='fsearch';
      sb.innerHTML='<input type="search" placeholder="搜班號或城市（BR23、大阪）" enterkeyhint="search" autocomplete="off"><button type="button">清除</button>';
      out.parentNode.insertBefore(sb,out);
      var inp=sb.querySelector('input');
      inp.addEventListener('input',function(){ Q=norm(inp.value); f1(); });
      sb.querySelector('button').onclick=function(){ inp.value=''; Q=''; f1(); };
    }
    var q2=short(Q), n=0;
    [].forEach.call(out.querySelectorAll('.r:not(.head)'),function(r){
      if(r.__f1h){ r.style.display=''; r.__f1h=0; }
      if(!Q) return;
      var fno=short((r.querySelector('.c-fno b')||{}).textContent), txt=norm(r.textContent);
      if(txt.indexOf(Q)<0&&fno.indexOf(q2)<0){ if(r.style.display!=='none'){ r.style.display='none'; r.__f1h=1; } }
      else if(r.style.display!=='none') n++;
    });
    /* 搜尋時把空檔線、現在線、已抵達收合那行先藏起來，免得畫面亂 */
    [].forEach.call(out.querySelectorAll('.gapline,.nowline,.foldline,.daybreak'),function(x){ x.style.display=Q?'none':''; });
    var nn=D.getElementById('fsearchn');
    if(Q){ if(!nn){ nn=D.createElement('small'); nn.id='fsearchn'; sb.parentNode.insertBefore(nn,sb.nextSibling); } nn.textContent=n?('找到 '+n+' 班'):'找不到——只搜目前清單裡的班機（沒勾的分類、已抵達收起來的不算）'; }
    else if(nn) nn.remove();
  }

  /* ── F7 門改提醒：登機門換了，而且換進或換出你勾的分類，就跳紫色通知＋震動 ──
     只看接下來 6 小時內的班機；第一次開頁只記下現在的門，不會亂跳 */
  var GATES=null, GLIST=[], GT=0;
  function gtoast(items){
    GLIST=GLIST.concat(items);
    var t=D.querySelector('.gtoast');
    if(!t){ t=D.createElement('div'); t.className='gtoast'; t.onclick=function(){ t.remove(); GLIST=[]; }; D.body.appendChild(t); }
    t.innerHTML='<div class="gt-h">🔀 '+(GLIST.length>1?GLIST.length+' 班登機門有變動':'登機門有變動')+'</div>'
      +GLIST.map(function(x){ return '<div class="gt-r">'+x.f+'　'+(x.from||'待定')+' → <b>'+x.to+'</b>　'+x.why+'</div>'; }).join('')
      +'<small>點一下關掉</small>';
    try{ if(navigator.vibrate) navigator.vibrate([150,80,150,80,150]); }catch(e){}
    clearTimeout(GT); GT=setTimeout(function(){ var o=D.querySelector('.gtoast'); if(o) o.remove(); GLIST=[]; },30000);
  }
  function f7(){
    if(typeof lastRows==='undefined'||!lastRows||!lastRows.length) return;
    var S=sel(), EX; try{ EX=catsExpand(); }catch(e){ return; }
    var d=new Date(), nowM=d.getHours()*60+d.getMinutes(), first=!GATES, cur={}, items=[];
    lastRows.forEach(function(f){
      var code=f.flightCode||((f.ACode||'')+(f.FlightNo||'')), k=code+'|'+(f.ODate||'');
      var g=String(f.Gate||'').trim().toUpperCase(), tg='';
      if(g){ try{ tg=tagOf(shopOf(f,EX)).txt; }catch(e){} }
      cur[k]={g:g,t:tg};
      if(first||!GATES[k]) return;
      var old=GATES[k]; if(old.g===g||!g) return;
      var tm=hhmm(f.RTime)||hhmm(f.OTime); if(!tm) return;
      var eta=mins(tm)-nowM; if(eta<-720) eta+=1440; if((f._day||0)===1) eta+=1440;
      if(eta<-30||eta>360) return;                       /* 只提醒 6 小時內的 */
      var into=S.indexOf(tg)>=0, from=S.indexOf(old.t)>=0;
      if(!into&&!from) return;                           /* 跟你勾的分類無關就不吵你 */
      var why=!old.g?('派到 '+tg):(into&&from?(old.t===tg?'還是 '+tg:old.t+' → '+tg):(into?'改進 '+tg:'改出去了（原本 '+old.t+'）'));
      items.push({f:fno4(code),from:old.g,to:g,why:why});
    });
    GATES=cur;
    if(items.length) gtoast(items);
  }

  /* ── iPhone 浮動按鈕跑位修正 ──
     iOS 收鍵盤、切回 App、網址列伸縮後，有時「固定在底部」的按鈕會卡在畫面中間；
     打字時先藏起來，收鍵盤／畫面大小一變就輕推一下捲動，讓 iOS 重新排好位置 */
  function nudge(){ setTimeout(function(){ var y=scrollY; scrollTo(scrollX,y+1); scrollTo(scrollX,y); },60); }
  D.addEventListener('focusin',function(e){ if(e.target&&/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) D.body.classList.add('kbd'); });
  D.addEventListener('focusout',function(){ D.body.classList.remove('kbd'); nudge(); setTimeout(nudge,350); });
  if(window.visualViewport) visualViewport.addEventListener('resize',function(){ if(!D.body.classList.contains('kbd')) nudge(); });
  addEventListener('orientationchange',function(){ setTimeout(nudge,300); });
  addEventListener('pageshow',nudge);
  D.addEventListener('visibilitychange',function(){ if(!D.hidden) nudge(); });

  function paint(){ try{ f1(); }catch(e){ console.log('f1',e); } }
  var wait=setInterval(function(){
    if(typeof window.render!=='function') return; clearInterval(wait);
    var _r=window.render;
    window.render=function(){ var x=_r.apply(this,arguments); paint(); try{ f7(); }catch(e){ console.log('f7',e); } return x; };
    paint();
  },100);
})();
</script>
