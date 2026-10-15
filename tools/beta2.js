<style>
/* ══ 試用版第二輪（beta.html）══ */
#betabar{position:relative;z-index:80;display:flex;align-items:center;gap:8px;padding:8px 12px;background:#2b1d00;border-bottom:2px solid #ffc53d;color:#ffc53d;font-weight:900;font-size:14px}
#betabar a{color:#fff;margin-left:auto;font-size:13px;text-decoration:underline}
#betabar button{background:#ffc53d;color:#2b1d00;border:0;font-weight:900;font-size:14px;padding:8px 12px;min-height:40px}
#betapanel{display:none;position:fixed;z-index:200;left:8px;right:8px;top:60px;max-height:80vh;overflow:auto;background:#0b1019;border:2px solid #ffc53d;box-shadow:0 20px 60px #000;padding:10px 12px}
@media (min-width:821px){#betapanel{left:auto;width:420px}}
#betapanel.on{display:block}
#betapanel h3{margin:0 0 6px;color:#ffc53d;font-size:16px}
#betapanel label{display:flex;align-items:center;gap:10px;padding:9px 4px;border-bottom:1px solid #1b2431;color:#e8edf3;font-size:15px;font-weight:800}
#betapanel label input{width:22px;height:22px;flex:none;accent-color:#00efd4}
#betapanel label b{color:#00efd4;min-width:2.2em}
#betapanel label i{font-style:normal;color:#8b94a1;font-size:12px;font-weight:700;display:block}
#betapanel .row{display:flex;gap:8px;margin-top:10px}
#betapanel .row button{flex:1;min-height:44px;background:#00efd4;color:#02241f;border:0;font-weight:900;font-size:15px}

/* E1 下一班大卡 */
#hero{margin:10px 0;padding:12px 14px;border:1px solid #2a3545;background:linear-gradient(120deg,#101826,#0b1019);position:relative;overflow:hidden}
#hero.k40{border-color:rgba(0,239,212,.6);background:linear-gradient(120deg,rgba(0,239,212,.2),rgba(11,16,25,.95) 60%);box-shadow:inset 6px 0 0 #00efd4}
#hero.k53{border-color:rgba(255,46,110,.6);background:linear-gradient(120deg,rgba(255,46,110,.22),rgba(11,16,25,.95) 60%);box-shadow:inset 6px 0 0 #ff2e6e}
#hero .h1{font-size:12px;font-weight:900;letter-spacing:.12em;color:#a08e55}
#hero .h2{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-top:2px}
#hero .cd{font-size:44px;font-weight:900;color:#ffc53d;line-height:1}
#hero .cd small{font-size:16px;margin-left:2px}
#hero .fn{font-size:24px;font-weight:900;color:#fff}
#hero .gt{font-size:24px;font-weight:900;padding:0 6px;background:#00efd4;color:#02241f}
#hero.k53 .gt{background:#ff2e6e;color:#2b0411}
#hero .h3{margin-top:4px;font-size:14px;font-weight:800;color:#c3cad4}
#hero .h3 b{color:#ffc53d}
#hero .steps{display:flex;margin-top:10px;gap:3px}
#hero .steps span{flex:1;text-align:center;font-size:12px;font-weight:900;padding:4px 0;background:#161e29;color:#5f6b7b;border-top:3px solid #2a3545}
#hero .steps span.on{color:#fff;border-top-color:#ffc53d;background:#1f2a1a}
#hero .steps span.now{color:#02241f;background:#ffc53d;border-top-color:#ffc53d}
/* E2 到店 */
.shopeta{display:inline-block;margin-left:6px;font-size:12px;font-weight:900;color:#49e3a3}
/* E3 每小時你的客人 */
#myhours{margin-top:8px}
#myhours .t{display:flex;justify-content:space-between;font-size:12px;font-weight:900;color:#a08e55;letter-spacing:.06em;margin-bottom:4px}
#myhours .bars{display:flex;align-items:flex-end;gap:6px;height:90px}
#myhours .col{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:stretch;height:100%;position:relative}
#myhours .col i{display:block}
#myhours .col .a{background:#00efd4}
#myhours .col .b{background:#ff2e6e}
#myhours .col em{position:absolute;top:-2px;left:0;right:0;text-align:center;font-style:normal;font-size:11px;font-weight:900;color:#e8edf3;transform:translateY(-100%)}
#myhours .lab{display:flex;gap:6px;margin-top:3px}
#myhours .lab span{flex:1;text-align:center;font-size:11px;color:#8b94a1;font-weight:800}
#myhours .lg{font-size:11px;color:#8b94a1;margin-top:4px}
#myhours .lg i{display:inline-block;width:10px;height:10px;vertical-align:-1px;margin:0 3px 0 8px}
/* E4 人潮警示 */
#rush{margin-top:8px;padding:10px 12px;background:#3a2a00;border:1px solid #ffc53d;border-left:5px solid #ffc53d;color:#ffe3a3;font-weight:900;font-size:15px}
#rush b{color:#ffc53d;font-size:19px}
/* E5 國籍排行 */
#natrank{margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
#natrank .t{font-size:12px;font-weight:900;color:#a08e55;letter-spacing:.06em;width:100%}
#natrank span{padding:3px 8px;border:1px solid #7a5c12;background:rgba(255,197,61,.1);color:#ffc53d;font-weight:900;font-size:14px}
#natrank span b{color:#fff;margin-left:4px}
/* E6 搜尋 */
#sbtn{margin-left:8px;background:#161e29;border:1px solid #2a3545;color:#e8edf3;font-weight:900;font-size:14px;padding:4px 10px;min-height:34px}
#sbox{position:sticky;top:0;z-index:70;display:none;gap:6px;padding:8px;background:#080b11;border-bottom:1px solid #00efd4}
#sbox.on{display:flex}
#sbox input{flex:1;font-size:18px;padding:8px 10px;background:#0b1019;border:1px solid #00efd4;color:#fff}
#sbox button{min-width:56px;font-size:15px;font-weight:900;background:#161e29;border:1px solid #2a3545;color:#e8edf3}
#out.searching .r:not(.hit):not(.head){opacity:.18}
#out .r.hit{outline:3px solid #ffc53d;outline-offset:-3px}
/* E7 大字 */
body.bigtxt .c-city{font-size:22px!important}
body.bigtxt .px{font-size:19px!important}
body.bigtxt .nat{font-size:15px!important}
body.bigtxt .badge{font-size:18px!important}
body.bigtxt .c-time i{font-size:16px!important}
body.bigtxt .tag{font-size:19px!important}
/* E8 航空公司色點 */
.al{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px;vertical-align:middle;box-shadow:0 0 0 2px rgba(0,0,0,.4)}
/* E9 今日進度 */
#prog{margin-top:8px;display:grid;gap:6px}
#prog .p{font-size:13px;font-weight:900;color:#c3cad4}
#prog .bar{height:10px;background:#161e29;margin-top:3px;position:relative}
#prog .bar i{position:absolute;left:0;top:0;bottom:0}
#prog .p.a .bar i{background:#00efd4} #prog .p.b .bar i{background:#ff2e6e}
</style>
<script>
(function(){
  var FEAT=[
    ['E1','下一班大卡＋倒數','最上面一張大卡：下一班還有幾分、走到哪一步'],
    ['E2','預估到店時間','落地後約 20 分到店（大卡、展開裡看得到）'],
    ['E3','每小時你的客人','2140 青、2153 粉，每小時各幾人的長條'],
    ['E4','人潮警示','接下來 2 小時有半小時超過 400 人就跳金色提醒'],
    ['E5','國籍排行','這個時段你的客人哪國最多'],
    ['E6','班機搜尋','上面「搜尋」鍵：打班號或城市馬上找到'],
    ['E7','大字模式','城市、人數、狀態的小字放大'],
    ['E8','航空公司色點','班號前面一顆顏色點，長榮綠、華航粉…'],
    ['E9','今日進度條','這個時段 2140／2153 已到幾班、還剩幾班']
  ];
  var KEY='beta2', on={}; try{ on=JSON.parse(localStorage.getItem(KEY)||'null')||{}; }catch(e){}
  FEAT.forEach(function(f){ if(typeof on[f[0]]!=='boolean') on[f[0]]=(f[0]!=='E7'); });
  function save(){ try{ localStorage.setItem(KEY,JSON.stringify(on)); }catch(e){} }
  var SHOP_MIN=20, RUSH=400;
  var NAT={'日':'日本','韓':'韓國','陸':'中國','港':'香港','澳':'澳門','菲':'菲律賓','越':'越南','泰':'泰國','美':'美國','印尼':'印尼','馬':'馬來西亞','新':'新加坡','柬埔寨':'柬埔寨','緬':'緬甸','印':'印度','加':'加拿大','澳洲':'澳洲','英':'英國','德':'德國','法':'法國','荷':'荷蘭','土':'土耳其'};
  var AL={BR:'#00a04a',CI:'#e2007a',JX:'#c8a35b',IT:'#ffcc00',CX:'#00706b',CZ:'#3d8fd6',MU:'#1a3f8f',CA:'#d71920',HX:'#c8102e',UO:'#c6d300',OZ:'#7a5aa6',KE:'#4aa3df',TW:'#e63a2e',LJ:'#00a3a1',ZE:'#1e4ca1',JL:'#e0001b',NH:'#14306b',MM:'#d6006e',VJ:'#e0221f',VN:'#00788a',SQ:'#f4a81d',TG:'#5c2d91',PR:'#00205b',Z2:'#e3242b',AK:'#e3242b',DL:'#c01933',UA:'#0033a0',B7:'#00843d',AE:'#d71a21',QR:'#5c0632',TK:'#c8102e',KL:'#00a1de',NZ:'#111',MH:'#0b2a6f',GK:'#ff5a00',BX:'#003f8a',ZH:'#0067b1'};

  function ui(){
    var bar=document.createElement('div'); bar.id='betabar';
    bar.innerHTML='🧪 試用版・第二輪（還沒上線）<button type="button" id="betabtn">開關</button><a href="index.html">回正式版</a>';
    document.body.insertBefore(bar,document.body.firstChild);
    var p=document.createElement('div'); p.id='betapanel';
    p.innerHTML='<h3>要試哪些？打勾＝開</h3>'+FEAT.map(function(f){
      return '<label><input type="checkbox" data-k="'+f[0]+'"'+(on[f[0]]?' checked':'')+'><b>'+f[0]+'</b><span>'+f[1]+'<i>'+f[2]+'</i></span></label>'; }).join('')
      +'<div class="row"><button type="button" id="b_ok">好了（重新整理）</button></div>';
    document.body.appendChild(p);
    document.getElementById('betabtn').onclick=function(){ p.classList.toggle('on'); };
    p.addEventListener('change',function(e){ var k=e.target.getAttribute('data-k'); if(k){ on[k]=e.target.checked; save(); } });
    document.getElementById('b_ok').onclick=function(){ location.reload(); };
    if(on.E7) document.body.classList.add('bigtxt');
    /* E6 搜尋 */
    if(on.E6){
      var hd=document.querySelector('header'); var sb=document.createElement('button'); sb.id='sbtn'; sb.type='button'; sb.textContent='🔍 搜尋';
      if(hd){ var live=hd.querySelector('.live'); hd.insertBefore(sb,live||null); }
      var box=document.createElement('div'); box.id='sbox';
      box.innerHTML='<input id="sq" type="search" placeholder="打班號（BR105）或城市（福岡）" autocomplete="off"><button type="button" id="sx">關</button>';
      var out=document.getElementById('out'); out.parentNode.insertBefore(box,out);
      sb.onclick=function(){ box.classList.add('on'); var q=document.getElementById('sq'); q.focus(); box.scrollIntoView({block:'start'}); };
      document.getElementById('sx').onclick=function(){ box.classList.remove('on'); document.getElementById('sq').value=''; doSearch(); };
      document.getElementById('sq').addEventListener('input',doSearch);
    }
  }
  function norm(s){ return String(s||'').toUpperCase().replace(/\s+/g,'').replace(/^([A-Z0-9]{2})0+/,'$1'); }
  function doSearch(){
    var out=document.getElementById('out'), q=norm((document.getElementById('sq')||{}).value);
    var rows=out.querySelectorAll('.r:not(.head)'), first=null;
    [].forEach.call(rows,function(r){ r.classList.remove('hit'); });
    if(!q){ out.classList.remove('searching'); return; }
    out.classList.add('searching');
    [].forEach.call(rows,function(r){
      var t=norm((r.querySelector('.c-fno b')||{}).textContent)+'|'+String((r.querySelector('.cn')||{}).textContent||'');
      if(t.indexOf(q)>=0||t.indexOf((document.getElementById('sq')||{}).value.trim())>=0){ r.classList.add('hit'); if(!first) first=r; }
    });
    if(first){ var fold=out.querySelector('.foldline'); first.scrollIntoView({block:'center'}); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ui); else ui();

  function hm(s){ var m=String(s||'').match(/(\d\d):(\d\d)/); return m?(+m[1])*60+(+m[2]):null; }
  function p2(n){ return (n<10?'0':'')+n; }
  function fmt(m){ m=((m%1440)+1440)%1440; return p2(Math.floor(m/60))+':'+p2(m%60); }

  function paint(){
    var out=document.getElementById('out'); if(!out) return;
    var info=document.getElementById('infobox');
    var rows=[].slice.call(out.querySelectorAll('.r:not(.head)'));
    var now=new Date(), nm=now.getHours()*60+now.getMinutes();
    var t1=hm((document.getElementById('t1')||{}).value||'00:00'), t2=hm((document.getElementById('t2')||{}).value||'23:59');
    var mine=[], next=null, hours={}, nat={}, buckets={}, prog={c40:[0,0],c53:[0,0]};
    rows.forEach(function(r){
      var is40=r.classList.contains('r40'), is53=r.classList.contains('r53'); if(!is40&&!is53) return;
      var t=hm((r.querySelector('.c-time b')||{}).textContent); if(t===null) return;
      var px=parseInt((r.querySelector('.px')||{}).textContent,10)||0;
      var done=r.classList.contains('done'), taxi=r.classList.contains('taxi');
      prog[is40?'c40':'c53'][done?0:1]++;
      /* E8 */
      if(on.E8&&!r.querySelector('.al')){ var fb=r.querySelector('.c-fno b'); if(fb){ var code=fb.textContent.slice(0,2); var d=document.createElement('i'); d.className='al'; d.style.background=AL[code]||'#5f6b7b'; d.title=code; fb.parentNode.insertBefore(d,fb); } }
      if(done) return;
      var h=Math.floor(t/60); hours[h]=hours[h]||[0,0]; hours[h][is40?0:1]+=px;
      if(t>=nm-15&&t<=nm+120){ var b=Math.floor((t-nm)/30); if(b>=0&&b<4){ buckets[b]=(buckets[b]||0)+px; } }
      if(t>=nm||taxi){ var n=r.querySelector('.nat'); if(n){ var m=n.textContent.match(/^(.+?)籍約(\d+)/); if(m){ var k=NAT[m[1]]||m[1]; nat[k]=(nat[k]||0)+(+m[2]); } } }
      if(!next&&(t>=nm-10||taxi)) next={r:r,t:t,px:px,k:is40?'k40':'k53',taxi:taxi};
    });
    /* E1 + E2 下一班大卡 */
    var hero=document.getElementById('hero');
    if(on.E1&&next){
      if(!hero){ hero=document.createElement('div'); hero.id='hero'; out.parentNode.insertBefore(hero,out); }
      var r=next.r, fn=(r.querySelector('.c-fno b')||{}).textContent||'', gt=(r.querySelector('.gn')||{}).textContent||'—', city=(r.querySelector('.cn')||{}).textContent||'';
      var left=next.t-nm, stage=next.taxi?2:(left<=0?1:0);
      hero.className=next.k;
      hero.innerHTML='<div class="h1">下一班'+(next.k==='k40'?' 2140':' 2153')+'</div>'
        +'<div class="h2"><span class="cd">'+(next.taxi?'滑行中':(left>0?left+'<small>分後落地</small>':'剛落地'))+'</span><span class="fn">'+fn+'</span><span class="gt">'+gt+'</span></div>'
        +'<div class="h3">'+city+'・約 <b>'+next.px+'</b> 人'+(on.E2?'・預估到店 <b>'+fmt(next.t+SHOP_MIN)+'</b>':'')+'</div>'
        +'<div class="steps"><span class="'+(stage>0?'on':'now')+'">飛行中</span><span class="'+(stage===1?'now':(stage>1?'on':''))+'">落地</span><span class="'+(stage===2?'now':'')+'">滑行</span><span>靠橋</span><span>到店</span></div>';
    } else if(hero) hero.remove();
    /* E2 到店（展開詳細裡也加一行） */
    if(on.E2) rows.forEach(function(r){ var dt=r.querySelector('.dt'); if(dt&&!dt.querySelector('.shopeta2')){ var t=hm((r.querySelector('.c-time b')||{}).textContent); if(t!==null){ var x=document.createElement('i'); x.className='shopeta2'; x.textContent='預估到店'; var y=document.createElement('b'); y.textContent='約 '+fmt(t+SHOP_MIN)+'（落地後 '+SHOP_MIN+' 分）'; var ref=dt.children[4]||null; dt.insertBefore(y,ref); dt.insertBefore(x,y); } } });
    if(!info) return;
    ['rush','natrank','myhours','prog'].forEach(function(id){ var e=document.getElementById(id); if(e) e.remove(); });
    var anchor=document.getElementById('remain')||document.getElementById('nextnote');
    function add(el){ if(anchor&&anchor.parentNode===info){ info.insertBefore(el,anchor.nextSibling); anchor=el; } else info.appendChild(el); }
    /* E4 人潮警示（放最上面一點：接下來 1 小時之後） */
    if(on.E4){ var mx=-1,mb=0; for(var b in buckets){ if(buckets[b]>mx){ mx=buckets[b]; mb=+b; } }
      if(mx>=RUSH){ var ru=document.createElement('div'); ru.id='rush'; ru.innerHTML='⚠ 人潮來了：'+fmt(nm+mb*30)+'–'+fmt(nm+mb*30+30)+' 約 <b>'+mx.toLocaleString()+'</b> 人'; add(ru); } }
    /* E9 今日進度 */
    if(on.E9){ var pg=document.createElement('div'); pg.id='prog';
      pg.innerHTML=['c40','c53'].map(function(k){ var d=prog[k][0], tot=prog[k][0]+prog[k][1]; return '<div class="p '+(k==='c40'?'a':'b')+'">'+(k==='c40'?'2140':'2153')+'　已到 '+d+'／'+tot+' 班<div class="bar"><i style="width:'+(tot?Math.round(d/tot*100):0)+'%"></i></div></div>'; }).join('');
      add(pg); }
    /* E5 國籍排行 */
    if(on.E5){ var ks=Object.keys(nat).sort(function(a,b){ return nat[b]-nat[a]; }).slice(0,6);
      if(ks.length){ var nr=document.createElement('div'); nr.id='natrank'; nr.innerHTML='<div class="t">接下來你的客人（國籍推估）</div>'+ks.map(function(k){ return '<span>'+k+'<b>'+nat[k]+'</b></span>'; }).join(''); add(nr); } }
    /* E3 每小時你的客人 */
    if(on.E3){ var hs=Object.keys(hours).map(Number).sort(function(a,b){return a-b;});
      if(hs.length){ var max=1; hs.forEach(function(h){ max=Math.max(max,hours[h][0]+hours[h][1]); });
        var mh=document.createElement('div'); mh.id='myhours';
        mh.innerHTML='<div class="t"><span>每小時你的客人（還沒到的）</span></div><div class="bars">'+hs.map(function(h){ var a=hours[h][0], b=hours[h][1];
          return '<div class="col"><em>'+(a+b)+'</em><i class="b" style="height:'+(b/max*76)+'px"></i><i class="a" style="height:'+(a/max*76)+'px"></i></div>'; }).join('')
          +'</div><div class="lab">'+hs.map(function(h){ return '<span>'+h+' 時</span>'; }).join('')+'</div><div class="lg"><i style="background:#00efd4"></i>2140<i style="background:#ff2e6e"></i>2153</div>';
        add(mh); } }
  }
  var wait=setInterval(function(){
    if(typeof window.render!=='function') return; clearInterval(wait);
    var _r=window.render;
    window.render=function(){ var x=_r.apply(this,arguments); try{ paint(); if(document.getElementById('sq')&&document.getElementById('sq').value) doSearch(); }catch(e){ console.log('beta2',e); } return x; };
    try{ paint(); }catch(e){}
  },100);
  document.addEventListener('click',function(e){ if(e.target.closest&&e.target.closest('#out .r')) setTimeout(function(){ try{ paint(); }catch(_){ } },30); });
  setInterval(function(){ try{ paint(); }catch(e){} },30000);
})();
</script>
