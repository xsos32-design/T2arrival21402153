<style>
/* ══ 新功能第二輪（2026-10-15）：E2 預估到店、E7 大字模式、E9 今日進度（E1 下一班大卡已拿掉） ══ */
/* E1 下一班大卡（只在入境頁） */
#hero{margin:10px 0;padding:12px 14px;border:1px solid #2a3545;background:linear-gradient(120deg,#101826,#0b1019);position:relative;overflow:hidden}
#hero.k40{border-color:rgba(0,239,212,.6);background:linear-gradient(120deg,rgba(0,239,212,.2),rgba(11,16,25,.95) 60%);box-shadow:inset 6px 0 0 #00efd4}
#hero.k53{border-color:rgba(255,46,110,.6);background:linear-gradient(120deg,rgba(255,46,110,.22),rgba(11,16,25,.95) 60%);box-shadow:inset 6px 0 0 #ff2e6e}
#hero .h1{font-size:12px;font-weight:900;letter-spacing:.12em;color:#a08e55}
#hero .h2{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-top:2px}
#hero .cd{font-size:40px;font-weight:900;color:#ffc53d;line-height:1.05;white-space:nowrap}
#hero .cd small{font-size:15px;margin-left:2px}
#hero .fn{font-size:24px;font-weight:900;color:#fff;white-space:nowrap}
#hero .gt{font-size:24px;font-weight:900;padding:0 6px;background:#00efd4;color:#02241f;white-space:nowrap}
#hero.k53 .gt{background:#ff2e6e;color:#2b0411}
#hero .h3{margin-top:4px;font-size:14px;font-weight:800;color:#c3cad4}
#hero .h3 b{color:#ffc53d}
#hero .steps{display:flex;margin-top:10px;gap:3px}
#hero .steps span{flex:1;min-width:0;text-align:center;font-size:12px;font-weight:900;padding:4px 0;background:#161e29;color:#5f6b7b;border-top:3px solid #2a3545;white-space:nowrap}
#hero .steps span.on{color:#e8edf3;border-top-color:#a08e55}
#hero .steps span.now{color:#2b1d00;background:#ffc53d;border-top-color:#ffc53d}
@media (min-width:821px){#hero{max-width:720px}}
/* E9 今日進度 */
#prog{margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:6px 12px}
#prog .p{font-size:13px;font-weight:900;color:#c3cad4;white-space:nowrap}
#prog .bar{height:8px;background:#161e29;margin-top:3px;position:relative}
#prog .bar i{position:absolute;left:0;top:0;bottom:0}
#prog .p.a .bar i{background:#00efd4} #prog .p.b .bar i{background:#ff2e6e}
/* 卡片欄寬固定：右欄一律 86px（有「門改」標籤也一樣），每張卡的城市、人數、國籍都在同一個位置 */
@media (max-width:820px){
  .r{grid-template-columns:minmax(0,auto) minmax(0,1fr) 86px!important}
  .r .gchg{font-size:10.5px!important;white-space:nowrap;letter-spacing:-.02em}
  .r .c-city .px{min-width:3.6em!important}
  body.arr .r .px u{font-size:0!important}
  body.arr .r .px u::after{content:"入境";font-size:11.5px;letter-spacing:-.02em}
  body.arr.bigtxt .r .px u::after{font-size:12.5px}
}
/* E7 大字模式（右上「大字」鍵） */
#bigbtn{margin-left:auto;margin-right:8px;background:#161e29;border:1px solid #2a3545;color:#c3cad4;font-weight:900;font-size:13px;padding:2px 9px;min-height:30px;line-height:1}
#bigbtn{width:auto!important;flex:0 0 auto!important;min-width:0!important;margin-top:0!important;margin-bottom:0!important}
#bigbtn+.live{margin-left:0!important}
#bigbtn.on{background:rgba(0,239,212,.15);border-color:#00efd4;color:#00efd4}
body.bigtxt .r .c-city .cn{font-size:21px!important}
body.bigtxt .r .px{font-size:18px!important}
body.dep.bigtxt .r .px u{font-size:12.5px!important}
body.bigtxt .r .nat{font-size:14.5px!important}
body.bigtxt .r .badge{font-size:17px!important}
body.bigtxt .r .c-time i{font-size:15.5px!important}
body.bigtxt .r .tag{font-size:18px!important}
body.bigtxt .r .ac{font-size:13px!important}
body.bigtxt .r .dt{font-size:15.5px!important}
</style>
<script>
(function(){
  var DEP=/出境/.test(document.title), SHOP_MIN=20, BIGKEY='bigtxt1';
  document.documentElement.classList.add(DEP?'dep':'arr'); if(document.body) document.body.classList.add(DEP?'dep':'arr'); else document.addEventListener('DOMContentLoaded',function(){ document.body.classList.add(DEP?'dep':'arr'); });
  function hm(s){ var m=String(s||'').match(/(\d\d):(\d\d)/); return m?(+m[1])*60+(+m[2]):null; }
  function p2(n){ return (n<10?'0':'')+n; }
  function fmt(m){ m=((m%1440)+1440)%1440; return p2(Math.floor(m/60))+':'+p2(m%60); }
  function left(n){ return n>=60?(Math.floor(n/60)+'<small>時</small>'+(n%60?(n%60)+'<small>分後落地</small>':'<small>後落地</small>')):(n+'<small>分後落地</small>'); }

  /* E7 大字：右上角一個鍵，記在這台裝置 */
  function bigInit(){
    var hd=document.querySelector('header'); if(!hd||document.getElementById('bigbtn')) return;
    var on=false; try{ on=localStorage.getItem(BIGKEY)==='1'; }catch(e){}
    var b=document.createElement('button'); b.type='button'; b.id='bigbtn'; b.textContent='大字';
    function set(v){ on=v; document.body.classList.toggle('bigtxt',v); b.classList.toggle('on',v); try{ localStorage.setItem(BIGKEY,v?'1':'0'); }catch(e){} }
    b.onclick=function(){ set(!on); };
    var live=hd.querySelector('.live'); hd.insertBefore(b,live||null);
    set(on);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bigInit); else bigInit();

  function paint(){
    var out=document.getElementById('out'); if(!out) return;
    var rows=[].slice.call(out.querySelectorAll('.r:not(.head)'));
    var d=new Date(), nm=d.getHours()*60+d.getMinutes(), next=null, prog={a:[0,0],b:[0,0]};
    rows.forEach(function(r){
      var a=r.classList.contains('r40'), b=r.classList.contains('r53'); if(!a&&!b) return;
      var done=r.classList.contains('done'), taxi=r.classList.contains('taxi');
      prog[a?'a':'b'][done?0:1]++;
      if(done||next) return;
      var t=hm((r.querySelector('.c-time b')||{}).textContent); if(t===null) return;
      if(t>=nm-10||taxi) next={r:r,t:t,k:a?'k40':'k53',taxi:taxi,px:parseInt((r.querySelector('.px')||{}).textContent,10)||0};
    });
    /* 下一班大卡（E1）10/15 拿掉：只能顯示一班、同時落地會漏，小韋說沒用 */
    var hero=document.getElementById('hero'); if(hero) hero.remove();
    /* E2 點卡片展開裡也加「預估到店」 */
    if(!DEP) rows.forEach(function(r){ var dt=r.querySelector('.dt'); if(!dt||dt.querySelector('.eta2')) return;
      var t=hm((r.querySelector('.c-time b')||{}).textContent); if(t===null) return;
      var i=document.createElement('i'); i.className='eta2'; i.textContent='預估到店';
      var b=document.createElement('b'); b.textContent='約 '+fmt(t+SHOP_MIN)+'（落地後約 '+SHOP_MIN+' 分）';
      var ref=dt.children[4]||null; dt.insertBefore(b,ref); dt.insertBefore(i,b); });
    /* E9 今日進度：放在「本時段還剩」下面 */
    var info=document.getElementById('infobox'); if(!info) return;
    var old=document.getElementById('prog'); if(old) old.remove();
    var pg=document.createElement('div'); pg.id='prog';
    pg.innerHTML=[['a','2140'],['b','2153']].map(function(x){ var dn=prog[x[0]][0], tot=dn+prog[x[0]][1];
      return '<div class="p '+x[0]+'">'+x[1]+'　'+(DEP?'已飛':'已到')+' '+dn+'／'+tot+' 班<div class="bar"><i style="width:'+(tot?Math.round(dn/tot*100):0)+'%"></i></div></div>'; }).join('');
    var anchor=document.getElementById('remain')||document.getElementById('nextnote');
    if(anchor&&anchor.parentNode===info) info.insertBefore(pg,anchor.nextSibling); else info.appendChild(pg);
  }
  var wait=setInterval(function(){
    if(typeof window.render!=='function') return; clearInterval(wait);
    var _r=window.render;
    window.render=function(){ var x=_r.apply(this,arguments); try{ paint(); }catch(e){ console.log('feat2',e); } return x; };
    try{ paint(); }catch(e){}
  },100);
  document.addEventListener('click',function(e){ if(e.target.closest&&e.target.closest('#out .r')) setTimeout(function(){ try{ paint(); }catch(_){ } },30); });
  setInterval(function(){ try{ paint(); }catch(e){} },30000);
})();
</script>
