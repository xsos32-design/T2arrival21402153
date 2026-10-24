<style>
/* ══ 10/24：自訂時段（今天幾點 → 明天／後天幾點）。入境頁、全時段、出境頁共用 ══ */
#custchip{flex:1 1 0!important;min-width:0!important;width:auto!important;white-space:nowrap}
#custchip.act{box-shadow:inset 0 0 0 1px currentColor,0 0 14px -2px currentColor!important}
#custbox{flex:1 0 100%;width:100%;margin:6px 0 2px;padding:10px 10px 8px;border:1px solid rgba(0,240,255,.45);background:rgba(10,6,20,.6);box-sizing:border-box}
#custbox[hidden]{display:none!important}
#custbox .cl{display:grid;grid-template-columns:auto 1fr 1fr;gap:6px 8px;align-items:center}
#custbox .cl b{font-size:14px;font-weight:900;color:#e8e3f5;white-space:nowrap}
#custbox input,#custbox select{width:100%!important;min-width:0!important;box-sizing:border-box;margin:0!important;font:inherit;font-size:16px!important;font-weight:800;padding:8px 6px!important;min-height:42px;
  background:#120a1f!important;color:#fff!important;border:1px solid rgba(255,255,255,.28)!important;border-radius:0;color-scheme:dark}
#custbox .qk{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
#custbox .qk button,#custbox .ac button{width:auto!important;min-width:0!important;margin:0!important;font:inherit;font-size:13.5px;font-weight:900;padding:7px 10px!important;min-height:38px;cursor:pointer;clip-path:none!important;box-shadow:none!important;
  background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.25);color:#cfd6e0}
#custbox .ac{display:flex;gap:8px;margin-top:8px;align-items:center;flex-wrap:wrap}
#custbox .ac .go{background:#00f0ff!important;border-color:#00f0ff!important;color:#00202a!important;font-size:15px!important;padding:8px 18px!important}
#custbox .msg{font-size:13px;font-weight:800;color:#9a8fb5}
#custbox .msg.bad{color:#FF7A95}
</style>
<script>
(function(){
  var W=window, D=document;
  W.CUST=null;          /* {d:'YYYY-MM-DD', a:'HH:MM', k:0|1|2, b:'HH:MM'} ＝ d 那天 a 點 → 第 k 天 b 點 */
  /* 一般版固定不顯示 06:00–13:30；全時段版（all.html）把那行拿掉了，這裡跟著它走 */
  var LOCK=/'06:00'&&t<='13:30'\) return;/.test(String(W.run));
  function p2(n){ return (n<10?'0':'')+n; }
  function iso(x){ return x.getFullYear()+'-'+p2(x.getMonth()+1)+'-'+p2(x.getDate()); }
  function md(s){ var p=String(s).split('-'); return (+p[1])+'/'+(+p[2]); }
  function addDay(s,n){ return iso(new Date(new Date(s+'T12:00:00').getTime()+n*86400000)); }
  function hmM(s){ var m=String(s||'').match(/(\d\d):(\d\d)/); return m?(+m[1])*60+(+m[2]):null; }
  function label(C){ C=C||W.CUST; if(!C) return ''; return md(C.d)+' '+C.a+' → '+md(addDay(C.d,C.k))+' '+C.b; }
  W.custLabel=function(){ return label(); };
  W.DAYMD=null;

  W.runCust=function(){
    var C=W.CUST, st=D.getElementById('status'); if(!C) return;
    var ds=[]; for(var i=0;i<=C.k;i++) ds.push(addDay(C.d,i));
    var A=hmM(C.a), B=C.k*1440+hmM(C.b);
    W.DAYMD=ds.map(md); dayBreakMD=ds[1]?md(ds[1]):'';
    paint(); setDot('busy','更新中…');
    return Promise.all(ds.map(function(d){ return getFlights(d); })).then(function(res){
      var want=ds.map(function(d){ return d.replace(/-/g,'/'); }), seen={}, sel=[];
      res.forEach(function(list){ (list||[]).forEach(function(f){
        var key=f.id||(String(f.flightCode||'')+'|'+f.ODate+'|'+f.OTime); if(seen[key]) return;
        var t=effTime(f); if(!t) return;
        if(LOCK&&t>='06:00'&&t<='13:30') return;
        var day=want.indexOf(effDate(f)); if(day<0) return;
        var m=day*1440+hmM(t); if(m<A||m>B) return;
        seen[key]=1; f._day=day; delete f._nd; sel.push(f);
      }); });
      sel.sort(function(a,b){ return ((a._day||0)-(b._day||0)) || effTime(a).localeCompare(effTime(b)) || String(a.flightCode||'').localeCompare(String(b.flightCode||'')); });
      lastRows=sel.filter(function(f){ return (f.Gate||'').trim() || !/取消/.test(f.Memo||''); });
      lastPending=[];
      D.getElementById('errslot').innerHTML='';
      render();
      var n=new Date(); setDot('on',p2(n.getHours())+':'+p2(n.getMinutes()));
      st.innerHTML='自訂　<b>'+label(C)+'</b>'+(C.k?'（跨日）':'')+'　·　<b>'+sel.length+'</b> 班'+(LOCK?'　·　06:00–13:30 照樣不顯示':'');
      var ss=D.getElementById('srcslot'); if(ss) ss.innerHTML='';
    })['catch'](function(e){
      setDot('err','失敗');
      D.getElementById('errslot').innerHTML='<div class="errbox"><b>抓不到班機（'+esc(e&&e.message||e)+'）</b><br>請稍後按「更新」再試一次。</div>';
    });
  };

  /* ── 畫面：時段那排多一顆「自訂」，按了打開設定框 ── */
  var chip, box;
  function build(){
    var all=D.querySelector('.chip[data-t="00:00"][data-e="23:59"]'); if(!all) return false;
    chip=D.createElement('span'); chip.className='chip'; chip.id='custchip'; chip.textContent='自訂';
    all.parentNode.insertBefore(chip,all.nextSibling);
    box=D.createElement('div'); box.id='custbox'; box.hidden=true;
    box.innerHTML='<div class="cl">'
      +'<b>從</b><input type="date" id="cuD"><input type="time" id="cuA" step="300">'
      +'<b>到</b><select id="cuK"><option value="0">同一天</option><option value="1">隔天</option><option value="2">後天</option></select><input type="time" id="cuB" step="300">'
      +'</div>'
      +'<div class="qk"><button type="button" data-q="tonight">今晚 18:00 → 明早 06:00</button><button type="button" data-q="now12">現在 → 12 小時後</button><button type="button" data-q="now24">現在 → 明天這時候</button></div>'
      +'<div class="ac"><button type="button" class="go">套用</button><button type="button" class="off">取消自訂</button><span class="msg"></span></div>';
    chip.parentNode.insertBefore(box,chip.nextSibling);
    chip.addEventListener('click',function(){ if(box.hidden) open(); else box.hidden=true; });
    box.addEventListener('click',function(e){
      var b=e.target.closest('button'); if(!b) return;
      if(b.classList.contains('go')) apply();
      else if(b.classList.contains('off')){ W.CUST=null; box.hidden=true; paint(); run(); }
      else if(b.dataset.q) quick(b.dataset.q);
    });
    ['cuD','cuA','cuK','cuB'].forEach(function(id){ D.getElementById(id).addEventListener('change',hint); });
    return true;
  }
  function today(){ return iso(new Date()); }
  function open(){
    var C=W.CUST, now=new Date();
    var d=(C&&C.d)||(D.getElementById('date')||{}).value||today();
    D.getElementById('cuD').value=d;
    D.getElementById('cuA').value=(C&&C.a)||p2(now.getHours())+':00';
    D.getElementById('cuK').value=String(C?C.k:1);
    D.getElementById('cuB').value=(C&&C.b)||'06:00';
    box.hidden=false; hint();
  }
  function read(){ return {d:D.getElementById('cuD').value, a:D.getElementById('cuA').value, k:+D.getElementById('cuK').value, b:D.getElementById('cuB').value}; }
  function check(C){
    if(!C.d) return '請選開始日期';
    if(hmM(C.a)===null||hmM(C.b)===null) return '請填開始和結束的時間';
    if(C.k*1440+hmM(C.b)<=hmM(C.a)) return '結束要比開始晚（要跨到隔天，就把「到」改成隔天）';
    var lim=addDay(today(),2); if(addDay(C.d,C.k)>lim) return '桃機只給到後天（'+md(lim)+'）的班機';
    return '';
  }
  function hint(){
    var C=read(), m=box.querySelector('.msg'), bad=check(C);
    if(bad){ m.textContent=bad; m.className='msg bad'; return; }
    var h=(C.k*1440+hmM(C.b)-hmM(C.a))/60;
    m.textContent=label(C)+'，共 '+(Math.round(h*10)/10)+' 小時'; m.className='msg';
  }
  function apply(){
    var C=read(), bad=check(C); if(bad){ hint(); return; }
    W.CUST=C; box.hidden=true;
    try{ setNow6(false); }catch(e){}
    W.CUST=C; paint(); run();
  }
  function quick(q){
    var n=new Date(), d=today(), a, k, b, hh=p2(n.getHours())+':'+p2(Math.floor(n.getMinutes()/5)*5);
    if(q==='tonight'){ a='18:00'; k=1; b='06:00'; }
    else if(q==='now12'){ a=hh; var e=n.getHours()*60+n.getMinutes()+720; k=e>=1440?1:0; b=p2(Math.floor((e%1440)/60))+':'+p2(Math.floor((e%60)/5)*5); }
    else { a=hh; k=1; b=hh; }
    D.getElementById('cuD').value=d; D.getElementById('cuA').value=a; D.getElementById('cuK').value=String(k); D.getElementById('cuB').value=b; hint();
  }
  function paint(){
    if(!chip) return;
    var on=!!W.CUST;
    chip.className='chip'+(on?' act':'');
    chip.textContent=on?'✓ 自訂':'自訂';   /* 起訖寫在上面那條和狀態列，按鈕只寫「自訂」免得擠 */
    if(on) [].forEach.call(D.querySelectorAll('.chip[data-t]'),function(c){ c.className='chip'; });
  }
  W.custPaint=paint;
  /* 按了其他時段鍵、現在 6 小時、改日期 → 自動離開自訂 */
  D.addEventListener('click',function(e){ var t=e.target; if(!W.CUST||!t||!t.closest) return;
    if(t.closest('.chip[data-t],#now6,#fNow,.dqb,#ntime button,.btn.pre')){ W.CUST=null; paint(); } },true);
  D.addEventListener('change',function(e){ var t=e.target; if(W.CUST&&t&&/^(t1|t2|date)$/.test(t.id)){ W.CUST=null; paint(); } },true);
  var wait=setInterval(function(){ if(typeof W.render!=='function'||!D.getElementById('status')) return; clearInterval(wait);
    if(build()) paint(); },100);
})();
</script>
