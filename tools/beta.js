<style>
/* ══ 試用版（beta.html）：新功能先在這頁試，滿意再搬到正式版 ══ */
#betabar{position:relative;z-index:80;display:flex;align-items:center;gap:8px;padding:8px 12px;
  background:#2b1d00;border-bottom:2px solid #ffc53d;color:#ffc53d;font-weight:900;font-size:14px}
#betabar a{color:#fff;margin-left:auto;font-size:13px;text-decoration:underline}
#betabar button{background:#ffc53d;color:#2b1d00;border:0;font-weight:900;font-size:14px;padding:8px 12px;min-height:40px}
#betapanel{display:none;position:fixed;z-index:200;left:8px;right:8px;top:60px;max-height:78vh;overflow:auto;
  background:#0b1019;border:2px solid #ffc53d;box-shadow:0 20px 60px #000;padding:10px 12px}
#betapanel.on{display:block}
#betapanel h3{margin:0 0 6px;color:#ffc53d;font-size:16px}
#betapanel label{display:flex;align-items:center;gap:10px;padding:9px 4px;border-bottom:1px solid #1b2431;color:#e8edf3;font-size:15px;font-weight:800}
#betapanel label input{width:22px;height:22px;flex:none;accent-color:#00efd4}
#betapanel label b{color:#00efd4;min-width:2.2em}
#betapanel label i{font-style:normal;color:#8b94a1;font-size:12px;font-weight:700;display:block}
#betapanel .row{display:flex;gap:8px;margin-top:10px}
#betapanel .row button{flex:1;min-height:44px;background:#161e29;border:1px solid #2a3545;color:#e8edf3;font-weight:900;font-size:14px}
#betapanel .row button.go{background:#00efd4;color:#02241f;border-color:#00efd4}
/* A1 空檔 */
.gapline{display:flex;align-items:center;gap:8px;margin:2px 0 10px;color:#a08e55;font-size:13px;font-weight:900;letter-spacing:.06em}
.gapline:before,.gapline:after{content:"";flex:1;border-top:1px dashed #7a5c12}
.gapline b{color:#ffc53d;font-size:15px}
/* A2 機型 */
.ac{display:inline-block;font-style:normal;font-size:11.5px;font-weight:900;padding:0 5px;border:1px solid #2a3545;color:#93a0b1;line-height:1.5;margin-right:4px}
.ac.big{border-color:#7a5c12;color:#ffc53d;background:rgba(255,197,61,.1)}
@media (max-width:820px){.r .c-st{display:flex;flex-direction:column;align-items:flex-end;gap:3px}.r .c-st .ac{margin:0}}
/* A3 本時段還剩 */
#remain{margin-top:8px;padding:8px 12px;border:1px solid #2a3545;background:#161e29;font-size:13.5px;font-weight:800;color:#c3cad4}
#remain b{color:#ffc53d;font-size:18px}
/* A6 展開 */
.r.bclick{cursor:pointer}
.r .dt{grid-area:dt;grid-column:1/-1;margin:6px -2px 0;padding:8px 10px;background:rgba(0,0,0,.5);border-top:1px dashed #2a3545;
  font-size:13.5px;line-height:1.7;color:#c3cad4;display:grid;grid-template-columns:auto 1fr;column-gap:10px}
.r .dt i{font-style:normal;color:#8b94a1;font-weight:800}
.r .dt b{color:#e8edf3}
@media (max-width:820px){.r.open{grid-template-areas:"time fno gate" "shop city st" "dt dt dt"!important}}
.bhint{font-size:11px;color:#8b94a1;font-weight:800}
/* A5 滑行提醒 */
.btoast{position:fixed;left:10px;right:10px;top:10px;z-index:300;background:#4da3ff;color:#fff;padding:12px 14px;font-weight:900;font-size:16px;
  box-shadow:0 10px 40px rgba(0,0,0,.7);border-left:6px solid #fff;animation:btIn .25s ease-out}
.btoast small{display:block;font-size:12.5px;opacity:.92;margin-top:2px}
@keyframes btIn{from{transform:translateY(-30px);opacity:0}to{transform:none;opacity:1}}
/* C1 浮水印細條 */
body.mkslim .mk{position:sticky;top:0;z-index:60;padding:4px 0!important;display:flex;justify-content:center;gap:10px;align-items:baseline}
body.mkslim .mk b{font-size:18px!important}
body.mkslim .mk i{font-size:11px!important}
/* C2 大延誤 */
.c-time i.bigd{display:table!important;margin-top:2px;padding:0 5px;font-weight:900;background:#ff8a3d;color:#1a0b02!important}
.c-time i.bigd.e{background:#5bd6ff;color:#02202b!important}
/* D1／D2 兩欄 */
#twocol{display:flex;gap:6px;height:calc(100vh - 58px)}
#twocol>div{flex:1;display:flex;flex-direction:column;min-width:0}
#twocol h2{margin:0;padding:6px 10px;font-size:18px;font-weight:900}
#twocol iframe{flex:1;width:100%;border:0;background:#05070a}
</style>
<script>
(function(){
  var FEAT=[
    ['A1','空檔提示','兩班中間隔 30 分以上就標出來'],
    ['A2','機型標籤','右邊寫機型，大飛機金色'],
    ['A3','本時段還剩多少','資訊卡多一格'],
    ['A4','共用班號','點卡片展開時看得到'],
    ['A5','滑行提醒','你的班機開始滑行時跳提示＋震動'],
    ['A6','點班機看詳細','點一下卡片展開，再點收起'],
    ['B3','打開自動跳到「現在」','重新整理就看得到效果'],
    ['C1','浮水印縮成細條','往下捲時「小韋製作」縮小黏在上面'],
    ['C2','大延誤標籤','晚／早 30 分以上，時間下面變醒目標籤'],
    ['D1','電腦版兩欄','螢幕夠寬時左 2140、右 2153'],
    ['D2','手機橫放兩欄','手機轉橫就變兩欄']
  ];
  var KEY='beta1', Q=location.search, INNER=/[?&]col=c[01]/.test(Q);
  var on={}; try{ on=JSON.parse(localStorage.getItem(KEY)||'null')||{}; }catch(e){}
  FEAT.forEach(function(f){ if(typeof on[f[0]]!=='boolean') on[f[0]]=true; });
  function save(){ try{ localStorage.setItem(KEY,JSON.stringify(on)); }catch(e){} }
  window.BETA_ON=on;

  /* ── D1／D2：寬螢幕或手機橫放 → 兩個窄欄，各自就是手機版的樣子 ── */
  function wantTwo(){
    var w=innerWidth, h=innerHeight;
    return (on.D1&&w>=1100)||(on.D2&&w>=640&&w>h&&w<1100);
  }
  if(!INNER&&wantTwo()){
    document.addEventListener('DOMContentLoaded',function(){
      [].forEach.call(document.body.children,function(e){ if(e.id!=='betabar'&&e.id!=='betapanel'&&e.tagName!=='SCRIPT'&&e.tagName!=='STYLE') e.style.display='none'; });
      var box=document.createElement('div'); box.id='twocol';
      box.innerHTML='<div><h2 style="color:#00efd4;border-bottom:3px solid #00efd4">2140</h2><iframe src="beta.html?col=c0"></iframe></div>'
        +'<div><h2 style="color:#ff2e6e;border-bottom:3px solid #ff2e6e">2153</h2><iframe src="beta.html?col=c1"></iframe></div>';
      document.body.appendChild(box);
    });
    var t=0; addEventListener('resize',function(){ clearTimeout(t); t=setTimeout(function(){ if(!wantTwo()) location.reload(); },400); });
  } else if(!INNER){
    var t2=0; addEventListener('resize',function(){ clearTimeout(t2); t2=setTimeout(function(){ if(wantTwo()) location.reload(); },400); });
  }

  /* ── 上方黃條＋開關面板 ── */
  function ui(){
    if(INNER) return;
    var bar=document.createElement('div'); bar.id='betabar';
    bar.innerHTML='🧪 試用版（還沒正式上線）<button type="button" id="betabtn">開關</button><a href="index.html">回正式版</a>';
    document.body.insertBefore(bar,document.body.firstChild);
    var p=document.createElement('div'); p.id='betapanel';
    p.innerHTML='<h3>要試哪些？打勾＝開</h3>'+FEAT.map(function(f){
      return '<label><input type="checkbox" data-k="'+f[0]+'"'+(on[f[0]]?' checked':'')+'><b>'+f[0]+'</b><span>'+f[1]+'<i>'+f[2]+'</i></span></label>'; }).join('')
      +'<div class="row"><button type="button" id="b_demo">示範 A5 滑行提醒</button><button type="button" class="go" id="b_ok">好了（重新整理）</button></div>';
    document.body.appendChild(p);
    document.getElementById('betabtn').onclick=function(){ p.classList.toggle('on'); };
    p.addEventListener('change',function(e){ var k=e.target.getAttribute('data-k'); if(k){ on[k]=e.target.checked; save(); } });
    document.getElementById('b_ok').onclick=function(){ location.reload(); };
    document.getElementById('b_demo').onclick=function(){ p.classList.remove('on'); toast('BR0216','C9',true); };
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ui); else ui();

  /* ── 內層（兩欄裡的一欄）：只顯示一個分點，收掉設定 ── */
  if(INNER){
    var col=Q.match(/col=(c[01])/)[1];
    var st=document.createElement('style');
    st.textContent='.mk,header,#ctl,.card,#infobox,#fab,.notice,.cllink,.credit,#pending,.foot{display:none!important}body{padding-top:0!important}';
    document.head.appendChild(st);
    var tryCol=setInterval(function(){
      if(typeof show==='undefined'||typeof render!=='function') return;
      clearInterval(tryCol);
      ['c0','c1','c2','c3'].forEach(function(k){ show[k]=(k===col); });
      try{ render(); }catch(e){}
    },200);
  }

  function key(c){ c=String(c||'').toUpperCase().replace(/\s+/g,''); var m=c.match(/^([A-Z0-9]{2})0*(\d+[A-Z]?)$/); return m?m[1]+m[2]:c; }
  function hm(s){ var m=String(s||'').match(/(\d\d):(\d\d)/); return m?(+m[1])*60+(+m[2]):null; }
  function p2(n){ return (n<10?'0':'')+n; }
  var BIG=/A380|B777|B747|A350|A340|B787-10/;
  var OPEN={}, TOLD={}, SCROLLED=false;

  function toast(fno,gate,demo){
    var o=document.querySelector('.btoast'); if(o) o.remove();
    var t=document.createElement('div'); t.className='btoast';
    t.innerHTML='✈ '+fno+' 滑行中 → 登機門 '+gate+'<small>'+(demo?'（示範）':'')+'約 5～10 分鐘旅客出來・點一下關掉</small>';
    t.onclick=function(){ t.remove(); };
    document.body.appendChild(t);
    try{ if(navigator.vibrate) navigator.vibrate([250,120,250]); }catch(e){}
    setTimeout(function(){ if(t.parentNode) t.remove(); },15000);
  }

  function paint(){
    var out=document.getElementById('out'); if(!out) return;
    var M={}; (window.lastRows||[]).forEach(function(f){ M[key(f.flightCode||((f.ACode||'')+(f.FlightNo||'')))]=f; });
    var rows=[].slice.call(out.querySelectorAll('.r:not(.head)'));
    var now=new Date(), nm=now.getHours()*60+now.getMinutes(), prev=null, n=0, pax=0;
    var t2el=document.getElementById('t2'), t2=(t2el&&t2el.value)||'23:59', end=hm(t2);
    rows.forEach(function(r){
      var fb=r.querySelector('.c-fno b'); if(!fb) return;
      var k=key(fb.textContent), f=M[k];
      r.setAttribute('data-k',k);
      if(on.A2&&f&&f.PlaneNo&&f.PlaneNo!=='-'&&!r.querySelector('.ac')){
        var a=document.createElement('i'); a.className='ac'+(BIG.test(f.PlaneNo)?' big':''); a.textContent=String(f.PlaneNo).split('-')[0];
        var cs=r.querySelector('.c-st'); if(cs) cs.insertBefore(a,cs.firstChild);
      }
      if(on.C2){ var si=r.querySelector('.c-time i'); if(si){ var m=si.textContent.match(/([+−-])\s*(\d+)/); if(m&&+m[2]>=30){ si.classList.add('bigd'); if(m[1]!=='+') si.classList.add('e'); } } }
      if(on.A6||on.A4){ r.classList.add('bclick'); if(OPEN[k]) detail(r,f); }
      if(on.A5&&r.classList.contains('taxi')&&(r.classList.contains('r40')||r.classList.contains('r53'))&&!TOLD[k]){
        TOLD[k]=1; var g=r.querySelector('.gn'); toast(fb.textContent,g?g.textContent:'',false);
      }
      if(r.classList.contains('done')) return;
      var t=hm((r.querySelector('.c-time b')||{}).textContent); if(t===null) return;
      if(on.A1&&prev!==null&&t-prev>=30&&!(r.previousElementSibling&&r.previousElementSibling.classList.contains('gapline'))){
        var gl=document.createElement('div'); gl.className='gapline';
        gl.innerHTML='空檔 <b>'+(t-prev)+'</b> 分（'+p2(Math.floor(prev/60))+':'+p2(prev%60)+'–'+p2(Math.floor(t/60))+':'+p2(t%60)+'）';
        r.parentNode.insertBefore(gl,r);
      }
      prev=t;
      if(t>=nm&&end!==null&&t<=end&&(r.classList.contains('r40')||r.classList.contains('r53'))){
        n++; var px=r.querySelector('.px'); pax+=px?parseInt(px.textContent,10)||0:0;
      }
    });
    var old=document.getElementById('remain'); if(old) old.remove();
    var nn=document.getElementById('nextnote');
    if(on.A3&&nn){ var rm=document.createElement('div'); rm.id='remain';
      rm.innerHTML='到 '+t2+' 前還有 <b>'+n+'</b> 班　約 <b>'+pax.toLocaleString()+'</b> 人（2140＋2153）';
      nn.parentNode.insertBefore(rm,nn.nextSibling); }
    if(on.B3&&!SCROLLED&&rows.length&&!INNER){
      SCROLLED=true; var nl=document.querySelector('.nowline');
      if(nl&&scrollY<50) setTimeout(function(){ nl.scrollIntoView({block:'start'}); scrollBy(0,-8); },300);
    }
  }
  function detail(r,f){
    if(r.querySelector('.dt')) return;
    var dt=document.createElement('div'); dt.className='dt';
    if(!f){ dt.innerHTML='<i>資料</i><b>找不到這班的詳細資料</b>'; }
    else{
      var sh=(f.sharing||[]).map(function(x){ return x.flightCode||((x.ACode||'')+(x.FlightNo||'')); }).filter(Boolean).join('、')||'沒有';
      var rows='';
      if(on.A6) rows+='<i>表定</i><b>'+String(f.OTime||'').slice(0,5)+'</b><i>預計</i><b>'+(String(f.RTime||'').slice(0,5)||'—')+'</b><i>機型</i><b>'+(f.PlaneNo&&f.PlaneNo!=='-'?f.PlaneNo:'—')+'</b>';
      if(on.A4) rows+='<i>共用班號</i><b>'+sh+'</b>';
      if(on.A6) rows+='<i>經停</i><b>'+(f.StopCname||'直飛')+'</b><i>航空公司</i><b>'+(f.AName||'')+'</b><i>即時動態</i><b>'+(f.CurrentStatus||f.Memo||'—')+'</b>';
      dt.innerHTML=rows;
    }
    r.appendChild(dt); r.classList.add('open');
  }
  document.addEventListener('click',function(e){
    if(!(on.A6||on.A4)) return;
    var r=e.target.closest&&e.target.closest('#out .r.bclick'); if(!r) return;
    var k=r.getAttribute('data-k'), d=r.querySelector('.dt');
    if(d){ d.remove(); r.classList.remove('open'); delete OPEN[k]; return; }
    OPEN[k]=1; var M={}; (window.lastRows||[]).forEach(function(f){ M[key(f.flightCode||((f.ACode||'')+(f.FlightNo||'')))]=f; });
    detail(r,M[k]);
  });
  /* C1 */
  addEventListener('scroll',function(){ if(!on.C1||INNER) return; document.body.classList.toggle('mkslim',scrollY>140); },{passive:true});
  /* 每次畫完都補上 */
  var wait=setInterval(function(){
    if(typeof window.render!=='function') return; clearInterval(wait);
    var _r=window.render;
    window.render=function(){ var x=_r.apply(this,arguments); try{ paint(); }catch(e){ console.log('beta',e); } return x; };
    try{ paint(); }catch(e){}
  },100);
})();
</script>
