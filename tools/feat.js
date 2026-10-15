<style>
/* ══ 新功能（2026-10-14）：A1 空檔、A2 機型、A3 本時段還剩、A4／A6 點卡片看詳細、A5 滑行提醒、
      B3 開頁跳到「現在」、C1 浮水印細條、C2 大延誤標籤。入境頁、出境頁共用這一份。 ══ */
/* A1 空檔：兩班中間隔 30 分以上 */
.gapline{display:flex;align-items:center;gap:8px;margin:2px 0 10px;color:#a08e55;font-size:13px;font-weight:900;letter-spacing:.06em}
.gapline:before,.gapline:after{content:"";flex:1;border-top:1px dashed #7a5c12}
.gapline b{color:#ffc53d;font-size:15px}
/* A2 機型：固定在右欄、狀態上面 */
.ac{display:inline-block;font-style:normal;font-size:11.5px;font-weight:900;padding:0 5px;border:1px solid #2a3545;color:#93a0b1;line-height:1.5;margin-right:4px;white-space:nowrap}
.ac.big{border-color:#7a5c12;color:#ffc53d;background:rgba(255,197,61,.1)}
@media (max-width:820px){.r .c-st{display:flex;flex-direction:column;align-items:flex-end;gap:3px}.r .c-st .ac{margin:0}}
/* A3 本時段還剩：放在「接下來 1 小時」下面 */
#remain{margin-top:8px;padding:8px 12px;border:1px solid #2a3545;background:#161e29;font-size:13.5px;font-weight:800;color:#c3cad4}
#remain b{color:#ffc53d;font-size:18px}
/* A4＋A6 點卡片看詳細 */
#out .r:not(.head){cursor:pointer;-webkit-tap-highlight-color:transparent}
.r .dt{grid-area:dt;grid-column:1/-1;margin:6px -2px 0;padding:8px 10px;background:rgba(0,0,0,.5);border-top:1px dashed #2a3545;
  font-size:13.5px;line-height:1.7;color:#c3cad4;display:grid;grid-template-columns:auto 1fr;column-gap:10px;cursor:default}
.r .dt i{font-style:normal;color:#8b94a1;font-weight:800}
.r .dt b{color:#e8edf3;font-weight:800}
.r .dt .x{grid-column:1/-1;text-align:center;color:#8b94a1;font-size:12px;margin-top:2px;cursor:pointer}
@media (max-width:820px){.r.open{grid-template-areas:"time fno gate" "shop city st" "dt dt dt"!important}}
/* A5 滑行提醒 */
.btoast{position:fixed;left:10px;right:10px;top:calc(10px + env(safe-area-inset-top));z-index:300;background:#4da3ff;color:#fff;padding:12px 14px;font-weight:900;font-size:16px;
  box-shadow:0 10px 40px rgba(0,0,0,.7);border-left:6px solid #fff;animation:btIn .25s ease-out;cursor:pointer}
@media (min-width:821px){.btoast{left:auto;width:380px}}
.btoast small{display:block;font-size:12.5px;opacity:.92;margin-top:2px}
@keyframes btIn{from{transform:translateY(-30px);opacity:0}to{transform:none;opacity:1}}
/* C1 往下捲時浮水印縮成細條（手機） */
@media (max-width:820px){
  body.mkslim .mk{position:sticky;top:0;z-index:60;padding:4px 0!important;display:flex;justify-content:center;gap:10px;align-items:baseline}
  body.mkslim .mk b{font-size:18px!important}
  body.mkslim .mk i{font-size:11px!important}
}
/* C2 晚／早 30 分以上 */
.c-time i.bigd{display:table!important;margin-top:2px;padding:0 5px;font-weight:900;background:#ff8a3d;color:#1a0b02!important}
.c-time i.bigd.e{background:#5bd6ff;color:#02202b!important}
</style>
<script>
(function(){
  var DEP=/出境/.test(document.title);
  function key(c){ c=String(c||'').toUpperCase().replace(/\s+/g,''); var m=c.match(/^([A-Z0-9]{2})0*(\d+[A-Z]?)$/); return m?m[1]+m[2]:c; }
  function hm(s){ var m=String(s||'').match(/(\d\d):(\d\d)/); return m?(+m[1])*60+(+m[2]):null; }
  function p2(n){ return (n<10?'0':'')+n; }
  function map(){ var M={}; (window.lastRows||[]).forEach(function(f){ M[key(f.flightCode||((f.ACode||'')+(f.FlightNo||'')))]=f; }); return M; }
  var BIG=/A380|B777|B747|A350|A340|B787-10/;
  var OPEN={}, TOLD={}, SCROLLED=false;

  /* A5 你的班機開始滑行 → 跳提示＋震動（同一班只提醒一次） */
  function toast(fno,gate){
    var o=document.querySelector('.btoast'); if(o) o.remove();
    var t=document.createElement('div'); t.className='btoast';
    t.innerHTML='✈ '+fno+' 滑行中 → 登機門 '+gate+'<small>約 5～10 分鐘旅客出來・點一下關掉</small>';
    t.onclick=function(){ t.remove(); };
    document.body.appendChild(t);
    try{ if(navigator.vibrate) navigator.vibrate([250,120,250]); }catch(e){}
    setTimeout(function(){ if(t.parentNode) t.remove(); },20000);
  }

  function detail(r,f){
    if(r.querySelector('.dt')) return;
    var dt=document.createElement('div'); dt.className='dt';
    if(!f){ dt.innerHTML='<i>資料</i><b>找不到這班的詳細資料</b>'; }
    else{
      var sh=(f.sharing||[]).map(function(x){ return x.flightCode||((x.ACode||'')+(x.FlightNo||'')); }).filter(Boolean).join('、')||'沒有';
      var st=String(f.CurrentStatus||'').trim()||String(f.Memo||'').replace(/[\s.．]+$/,'').trim()||'—';
      dt.innerHTML=
        '<i>表定</i><b>'+String(f.OTime||'').slice(0,5)+'</b>'
       +'<i>'+(DEP?'預計起飛':'預計抵達')+'</i><b>'+(String(f.RTime||'').slice(0,5)||'同表定')+'</b>'
       +'<i>即時動態</i><b>'+st+'</b>'
       +'<i>機型</i><b>'+(f.PlaneNo&&f.PlaneNo!=='-'?f.PlaneNo:'—')+'</b>'
       +'<i>共用班號</i><b>'+sh+'</b>'
       +'<i>經停</i><b>'+(f.StopCname||'直飛')+'</b>'
       +'<i>航空公司</i><b>'+(f.AName||'')+'</b>'
       +'<span class="x">▲ 收起</span>';
    }
    r.appendChild(dt); r.classList.add('open');
  }

  function paint(){
    var out=document.getElementById('out'); if(!out) return;
    var M=map(), rows=[].slice.call(out.querySelectorAll('.r:not(.head)'));
    var now=new Date(), nm=now.getHours()*60+now.getMinutes(), prev=null, n=0, pax=0;
    var t2el=document.getElementById('t2'), t2=(t2el&&t2el.value)||'23:59', end=hm(t2);
    rows.forEach(function(r){
      var fb=r.querySelector('.c-fno b'); if(!fb) return;
      var k=key(fb.textContent), f=M[k], mine=r.classList.contains('r40')||r.classList.contains('r53');
      r.setAttribute('data-k',k);
      /* A2 */
      if(f&&f.PlaneNo&&f.PlaneNo!=='-'&&!r.querySelector('.ac')){
        var a=document.createElement('i'); a.className='ac'+(BIG.test(f.PlaneNo)?' big':''); a.textContent=String(f.PlaneNo).split('-')[0]; a.title=f.PlaneNo;
        var cs=r.querySelector('.c-st'); if(cs) cs.insertBefore(a,cs.firstChild);
      }
      /* C2 */
      var si=r.querySelector('.c-time i'); if(si){ var m=si.textContent.match(/([+−-])\s*(\d+)/); if(m&&+m[2]>=30){ si.classList.add('bigd'); if(m[1]!=='+') si.classList.add('e'); } }
      /* A6 展開狀態跟著重畫保留 */
      if(OPEN[k]) detail(r,f);
      /* A5 */
      if(!DEP&&mine&&r.classList.contains('taxi')&&!TOLD[k]){ TOLD[k]=1; var g=r.querySelector('.gn'); toast(fb.textContent,g?g.textContent:''); }
      if(r.classList.contains('done')) return;
      var t=hm((r.querySelector('.c-time b')||{}).textContent); if(t===null) return;
      /* A1 */
      if(prev!==null&&t-prev>=30){
        var gl=document.createElement('div'); gl.className='gapline';
        gl.innerHTML='空檔 <b>'+(t-prev)+'</b> 分（'+p2(Math.floor(prev/60))+':'+p2(prev%60)+'–'+p2(Math.floor(t/60))+':'+p2(t%60)+'）';
        r.parentNode.insertBefore(gl,r);
      }
      prev=t;
      if(mine&&t>=nm&&end!==null&&t<=end){ n++; var px=r.querySelector('.px'); pax+=px?parseInt(px.textContent,10)||0:0; }
    });
    /* A3 */
    var old=document.getElementById('remain'); if(old) old.remove();
    var nn=document.getElementById('nextnote');
    if(nn){ var rm=document.createElement('div'); rm.id='remain';
      rm.innerHTML=n?('到 '+t2.replace(':59',':59')+' 前還有 <b>'+n+'</b> 班　約 <b>'+pax.toLocaleString()+'</b> 人'+(DEP?'出境':'入境')+'（2140＋2153）')
                    :('到 '+t2+' 前沒有你負責的班機了');
      nn.parentNode.insertBefore(rm,nn.nextSibling); }
    /* B3 開頁第一次畫完：跳到「現在」 */
    if(!SCROLLED&&rows.length){
      SCROLLED=true; var nl=document.querySelector('.nowline');
      if(nl&&scrollY<50&&!location.hash) setTimeout(function(){ var y=nl.getBoundingClientRect().top+scrollY-8; scrollTo(0,Math.max(0,y)); },300);
    }
  }
  /* A4＋A6 點卡片展開／收起（點按鈕、連結不算） */
  document.addEventListener('click',function(e){
    if(e.target.closest&&e.target.closest('a,button,.btoast')) return;
    var r=e.target.closest&&e.target.closest('#out .r:not(.head)'); if(!r) return;
    var k=r.getAttribute('data-k'), d=r.querySelector('.dt');
    if(d){ if(e.target.closest('.dt')&&!e.target.closest('.x')) return; d.remove(); r.classList.remove('open'); delete OPEN[k]; return; }
    OPEN[k]=1; detail(r,map()[k]);
  });
  /* C1 */
  addEventListener('scroll',function(){ document.body.classList.toggle('mkslim',scrollY>140); },{passive:true});
  /* 每次畫完都補上 */
  var wait=setInterval(function(){
    if(typeof window.render!=='function') return; clearInterval(wait);
    var _r=window.render;
    window.render=function(){ var x=_r.apply(this,arguments); try{ paint(); }catch(e){ console.log('feat',e); } return x; };
    try{ paint(); }catch(e){}
  },100);
})();
</script>
