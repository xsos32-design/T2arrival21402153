<style>
/* ══ 設計第二版（2026-10-13）════════════════════════════════════════════
   1. 控制面板可收合：手機預設收起來，只留一條摘要，班機一打開就看得到
   2. 資訊卡：狀態、桃機校正、移民署、連假、接下來一小時、每小時人潮，集中在一張卡
   3. 按鈕統一大小、分組加標題；電腦版浮動按鈕改成直排，不再蓋到班機
   ════════════════════════════════════════════════════════════════════ */
#ctlbar{display:flex;align-items:center;gap:10px;width:100%;box-sizing:border-box;cursor:pointer;user-select:none;
  padding:10px 12px;border:1px solid var(--line,#e2e8f0);border-radius:12px;background:#f8fafc;margin-bottom:10px}
#ctlbar .cb-main{flex:1;min-width:0;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
#ctlbar .cb-pill{font-size:13px;font-weight:800;padding:3px 9px;border-radius:999px;background:#e2e8f0;color:#0f172a;white-space:nowrap}
#ctlbar .cb-pill.k40{background:#ccfbf1;color:#0f766e} #ctlbar .cb-pill.k53{background:#ffe4e6;color:#be123c}
#ctlbar .cb-act{font-size:13px;font-weight:900;color:#2563eb;white-space:nowrap}
#ctlbar .cb-act b{display:inline-block;transition:transform .15s}
#ctl.closed{display:none}
.card:not(.open){padding-bottom:2px}
.card.open #ctlbar .cb-act b{transform:rotate(180deg)}
.ctl-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px}
.ctl-row>.v2lab{flex:0 0 52px;font-size:12px;font-weight:800;color:var(--muted,#64748b);letter-spacing:.06em}
#infobox{margin:0 0 12px;padding:10px 12px;border:1px solid var(--line,#e2e8f0);border-radius:14px;background:#fff}
#infobox:empty{display:none}
#infobox #status{margin:0;font-size:12.5px}
#nextnote{margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:13.5px}
#nextnote:empty{display:none}
#nextnote .nn-h{font-weight:900;color:#0f172a;margin-right:2px}
#nextnote .nn{padding:3px 10px;border-radius:999px;font-weight:800;white-space:nowrap}
#nextnote .nn.k40{background:#ccfbf1;color:#0f766e} #nextnote .nn.k53{background:#ffe4e6;color:#be123c}
#nextnote .nn b{font-size:15px}
#hourbar{margin-top:10px} #hourbar:empty{display:none}
#hourbar .hb-t{display:flex;justify-content:space-between;font-size:12px;font-weight:800;color:#475569;margin-bottom:4px}
#hourbar .hb-t b{color:#b45309}
#hourbar .hb{display:flex;align-items:flex-end;gap:2px;height:46px}
#hourbar .hb i{flex:1;background:#cbd5e1;border-radius:2px 2px 0 0;min-height:2px;position:relative}
#hourbar .hb i.in{background:#94a3b8} #hourbar .hb i.now{background:#f59e0b}
#hourbar .hb-x{display:flex;justify-content:space-between;font-size:10.5px;color:#94a3b8;margin-top:2px;font-family:ui-monospace,Menlo,monospace}
@media (min-width:821px){
  #fab{flex-direction:column;align-items:stretch;bottom:20px;right:16px}
  #fab .fabb{justify-content:flex-start}
  #ctlbar{display:none}
}
/* ── 手機深色版 ── */
@media (max-width:820px){
  #ctlbar{background:#0B1019;border:1px solid #2a3545;border-radius:0;padding:12px 12px;min-height:52px}
  .card.open #ctlbar{border-color:#00EFD4}
  #ctlbar .cb-pill{background:#1b2431;color:#C3CAD4;font-size:14px;border-radius:0}
  #ctlbar .cb-pill.k40{background:rgba(0,239,212,.13);color:#00EFD4} #ctlbar .cb-pill.k53{background:rgba(255,46,110,.15);color:#FF7A9C}
  #ctlbar .cb-act{color:#00EFD4;font-size:14px}
  .ctl-row>.v2lab{flex:1 1 100%;font-size:12px;color:#6b7686;margin:4px 0 -2px}
  .chips{margin-top:8px}
  .chip{min-height:46px!important;font-size:15.5px!important}
  .chip.shop{min-height:50px!important;font-size:17px!important}
  .chip.zone{min-height:44px!important}
  .chip.mini{flex:1 1 30%!important;min-height:38px!important;font-size:13.5px!important;color:#8b94a1}
  #go{display:none}
  #infobox{background:#0B1019;border:1px solid #1b2431;border-radius:0;padding:10px}
  #infobox #status{color:#8b94a1}
  #nextnote .nn-h{color:#E8EDF3}
  #nextnote .nn{border-radius:0}
  #nextnote .nn.k40{background:rgba(0,239,212,.13);color:#00EFD4} #nextnote .nn.k53{background:rgba(255,46,110,.15);color:#FF7A9C}
  #hourbar .hb-t{color:#8b94a1} #hourbar .hb-t b{color:#FFC53D}
  #hourbar .hb i{background:#243042;border-radius:0} #hourbar .hb i.in{background:#3d5068} #hourbar .hb i.now{background:#FFC53D}
  #hourbar .hb-x{color:#4e5968}
  .foldline{background:#0B1019!important;border:1px solid #2a3545!important;color:#B9C0CB!important;border-radius:0}
  .foldline i{color:#00EFD4!important}
}
</style>
<script>
(function(){
  var card=document.querySelector('.wrap > .card'); if(!card) return;
  var st=document.getElementById('status');
  /* ── 1. 控制面板包起來，上面加一條摘要 ── */
  var ctl=document.createElement('div'); ctl.id='ctl';
  var kids=[].slice.call(card.childNodes);
  kids.forEach(function(n){ if(n!==st) ctl.appendChild(n); });
  var bar=document.createElement('div'); bar.id='ctlbar';
  card.insertBefore(bar,card.firstChild); card.insertBefore(ctl,bar.nextSibling);
  /* 分組標題：時段／顯示（原本沒有標題的兩排） */
  var rows=ctl.querySelectorAll('.chips');
  function lab(row,t){ if(!row) return; var s=document.createElement('span'); s.className='v2lab'; s.textContent=t; row.insertBefore(s,row.firstChild); row.classList.add('ctl-row'); }
  lab(rows[0],'時段'); lab(rows[1],'顯示');
  [].forEach.call(ctl.querySelectorAll('.chips .chiplabel'),function(l){ l.classList.add('v2lab'); l.parentNode.classList.add('ctl-row');
    if(/群組/.test(l.textContent)) l.textContent='回報'; });
  /* 全部／全不要 縮小，接在分類那排後面 */
  var shopRow=(document.getElementById('shopslot')||{}).parentNode;
  ['sall','snone'].forEach(function(id){ var b=document.getElementById(id); if(!b) return; b.classList.add('mini');
    var old=b.parentNode; if(shopRow&&old!==shopRow){ shopRow.appendChild(b); if(!old.querySelector('.chip')) old.parentNode.removeChild(old); } });
  var openKey='ctlOpen1', small=window.matchMedia('(max-width:820px)').matches, open;
  try{ open=localStorage.getItem(openKey); }catch(e){}
  open = open==null ? !small : open==='1';
  function setOpen(v){ open=v; ctl.classList.toggle('closed',!v); card.classList.toggle('open',v);
    try{ localStorage.setItem(openKey,v?'1':'0'); }catch(e){} paintBar(); }
  function txt(el){ return el?String(el.textContent||'').replace(/[✓\s]+/g,' ').trim():''; }
  function paintBar(){
    var t1=document.getElementById('t1'), t2=document.getElementById('t2');
    var pre=ctl.querySelector('.chips .chip.act[data-t]'), n6=document.getElementById('now6');
    var range=(n6&&n6.classList.contains('act'))?'現在起 6 小時':(pre?txt(pre):((t1?t1.value:'')+'–'+(t2?t2.value.replace(':59',''):'')));
    var cats=[].map.call(ctl.querySelectorAll('#shopslot .chip.act, .chip.shop.act'),function(c){ return txt(c); })
      .filter(function(v,i,a){ return v&&a.indexOf(v)===i; });
    var zs=[].filter.call(ctl.querySelectorAll('.chip.zone'),function(z){ return z.classList.contains('act'); })
      .map(function(z){ return txt(z).replace('區',''); });
    var h=document.getElementById('hide'), hid=h&&h.classList.contains('act');
    var html='<span class="cb-pill">⏱ '+range+'</span>';
    cats.forEach(function(c){ html+='<span class="cb-pill'+(c==='2140'?' k40':(c==='2153'?' k53':''))+'">'+c+'</span>'; });
    if(zs.length&&zs.length<4) html+='<span class="cb-pill">'+zs.join('')+' 區</span>';
    if(hid) html+='<span class="cb-pill">'+(/出境/.test(document.title)?'隱藏已起飛':'隱藏已抵達')+'</span>';
    bar.innerHTML='<div class="cb-main">'+html+'</div><span class="cb-act">'+(open?'收起':'設定')+' <b>▾</b></span>';
  }
  bar.addEventListener('click',function(){ setOpen(!open); });
  ctl.addEventListener('click',function(){ setTimeout(paintBar,30); });
  ctl.addEventListener('change',function(){ setTimeout(paintBar,30); });
  setOpen(open);
  /* ── 2. 資訊卡 ── */
  var info=document.createElement('div'); info.id='infobox';
  card.parentNode.insertBefore(info,card.nextSibling);
  var mv=[st]; ['offnote','immnote','holnote'].forEach(function(id){ var e=document.getElementById(id); if(e) mv.push(e); });
  mv.forEach(function(e){ if(e) info.appendChild(e); });
  var nn=document.createElement('div'); nn.id='nextnote'; info.appendChild(nn);
  var hb=document.createElement('div'); hb.id='hourbar'; info.appendChild(hb);
  window.V2_INFO=true;
})();
/* 接下來 1 小時：從畫面上的班機算（2140／2153 各幾班、約幾人） */
function v2Next(){
  var el=document.getElementById('nextnote'); if(!el) return;
  var d=new Date(), nowM=d.getHours()*60+d.getMinutes(), sum={};
  [].forEach.call(document.querySelectorAll('#out .r:not(.head)'),function(r){
    if(r.classList.contains('done')) return;
    var t=r.querySelector('.c-time b'), tg=r.querySelector('.c-shop .tag'), px=r.querySelector('.px');
    if(!t||!tg) return;
    var m=String(t.textContent).match(/(\d\d):(\d\d)/); if(!m) return;
    var eta=(+m[1])*60+(+m[2])-nowM; if(eta<-720) eta+=1440;
    if(eta<0||eta>60) return;
    var k=String(tg.textContent).trim(), n=px?parseInt(px.textContent,10)||0:0;
    if(!sum[k]) sum[k]={f:0,p:0}; sum[k].f++; sum[k].p+=n;
  });
  var keys=Object.keys(sum).sort();
  el.innerHTML='<div class="nn-h">接下來 1 小時</div><div class="nn-g">'+(keys.length?keys.map(function(k){
    return '<div class="nn'+(k==='2140'?' k40':(k==='2153'?' k53':''))+'"><span class="nn-k">'+k+'</span><b>'+sum[k].p.toLocaleString()+'</b><span class="nn-u">人・'+sum[k].f+' 班</span></div>'; }).join('')
    :'<div class="nn none">沒有你負責的班機</div>')+'</div>';
}
/* 今天每小時 T2 入境（桃機官方），現在這小時標金色 */
function v2Hours(kind){
  var el=document.getElementById('hourbar'); if(!el) return;
  var d=new Date(), iso=d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);
  var H=(typeof OFFPAX!=='undefined')&&OFFPAX&&OFFPAX[iso]; if(!H){ el.innerHTML=''; return; }
  var idx=kind==='D'?2:0, v=[], mx=1, pk=0, i;
  for(i=0;i<24;i++){ var x=H[i]||H[String(i)]; v[i]=x?(+x[idx]||0):0; if(v[i]>mx){ mx=v[i]; pk=i; } }
  var t1=document.getElementById('t1'), t2=document.getElementById('t2');
  var a=t1?+String(t1.value).slice(0,2):0, b=t2?+String(t2.value).slice(0,2):23;
  var bars=''; for(i=0;i<24;i++){
    var inr=a<=b?(i>=a&&i<=b):(i>=a||i<=b);
    bars+='<i class="'+(i===d.getHours()?'now':(inr?'in':''))+'" style="height:'+Math.max(4,Math.round(v[i]/mx*100))+'%" title="'+i+' 時 '+v[i]+' 人"></i>'; }
  el.innerHTML='<div class="hb-t"><span>今天每小時第二航廈'+(kind==='D'?'出境':'入境')+'（桃機官方）</span><span>尖峰 <b>'+pk+' 時 '+v[pk].toLocaleString()+' 人</b></span></div>'
    +'<div class="hb">'+bars+'</div><div class="hb-x"><span>0</span><span>6</span><span>12</span><span>18</span><span>23</span></div>';
}
</script>