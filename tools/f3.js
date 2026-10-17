/* ══ 第三輪提案（F1–F8）：只在 preview/f3.html 裡注入，正式版還沒上 ══
   window.__F = {F1:true,...} 決定開哪些；每次 render() 畫完就補上 */
(function(){
  var W=window, D=document;
  if(W.__f3) return; W.__f3=1;
  W.__F=W.__F||{};
  var css=D.createElement('style'); css.textContent=[
  /* F1 搜尋 */
  '#fsearch{display:flex;gap:6px;margin:8px 0 6px}',
  '#fsearch input{flex:1 1 auto!important;width:auto!important;min-width:0;font:inherit;font-size:16px;font-weight:800;padding:9px 12px;background:#120a1f;border:1px solid rgba(0,240,255,.5);color:#fff;clip-path:polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,0 100%)}',
  '#fsearch input::placeholder{color:#7d6f9a}',
  '#fsearch button{flex:0 0 auto!important;width:auto!important;min-height:42px;font:inherit;font-size:14px;font-weight:900;padding:0 12px;background:#1a1030;border:1px solid #3a2a5a;color:#b9aed6}',
  '#fsearch small{display:block;font-size:12px;color:#9a8fb5;margin:-2px 0 6px}',
  /* F2 落地倒數 */
  '.c-time .cd{display:table;font-style:normal;font-size:12px;font-weight:900;margin-top:2px;padding:0 5px;background:rgba(245,238,11,.14);color:#f5ee0b;border:1px solid rgba(245,238,11,.45)}',
  '.c-time .cd.hot{background:#f5ee0b;color:#1a1400}',
  /* F3 人潮警示 */
  '#frush{margin:8px 0 2px;padding:9px 12px;background:linear-gradient(90deg,rgba(245,238,11,.22),rgba(245,238,11,.04));border:1px solid #f5ee0b;color:#fff8b0;font-size:14px;font-weight:800;line-height:1.5;clip-path:polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,0 100%)}',
  '#frush b{color:#f5ee0b;font-size:17px}',
  /* F4 國籍排行 */
  '#fnat{margin-top:8px;font-size:13px;font-weight:800;color:#c3cad4}',
  '#fnat .h{color:#9a8fb5;font-size:12px;letter-spacing:.08em;margin-bottom:4px}',
  '#fnat .g{display:flex;flex-wrap:wrap;gap:5px}',
  '#fnat .g span{display:inline-flex;align-items:baseline;gap:4px;padding:3px 8px;background:rgba(176,38,255,.14);border:1px solid rgba(176,38,255,.5);white-space:nowrap}',
  '#fnat .g span b{color:#f5ee0b;font-size:15px}',
  /* F5 每小時長條 */
  '#fhr{margin-top:8px}',
  '#fhr .h{color:#9a8fb5;font-size:12px;letter-spacing:.08em;margin-bottom:4px;font-weight:800}',
  '#fhr .bars{display:flex;align-items:flex-end;gap:3px;height:64px;margin-top:18px}',
  '#fhr .col{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:flex-end;height:100%;position:relative}',
  '#fhr .col i{display:block;min-height:0}',
  '#fhr .col i.a{background:#00f0ff;box-shadow:0 0 8px rgba(0,240,255,.5)} #fhr .col i.b{background:#ff2a6d;box-shadow:0 0 8px rgba(255,42,109,.5)} #fhr .col i.o{background:#b026ff}',
  '#fhr .col em{position:absolute;top:-15px;left:0;right:0;text-align:center;font-style:normal;font-size:10.5px;color:#e8e3f5;font-weight:800}',
  '#fhr .xs{display:flex;gap:3px;margin-top:3px}#fhr .xs span{flex:1;text-align:center;font-size:11px;color:#9a8fb5;font-weight:800}',
  /* F6 釘選 */
  '.pinb{font:inherit;background:none!important;border:0!important;padding:0 2px!important;margin:0!important;width:auto!important;min-height:0!important;font-size:22px;line-height:1;color:#5f5480;cursor:pointer;box-shadow:none!important;clip-path:none!important}',
  '.pinb.on{color:#f5ee0b;text-shadow:0 0 10px rgba(245,238,11,.7)}',
  '.r.pinned{box-shadow:inset 4px 0 0 #f5ee0b,inset 0 0 0 2px #f5ee0b!important}',
  '#fpin{margin:8px 0 4px;padding:8px 10px;border:1px dashed #f5ee0b;background:rgba(245,238,11,.06);font-size:13.5px;font-weight:800;color:#fff8b0}',
  '#fpin a{color:#f5ee0b;margin-right:10px;white-space:nowrap;text-decoration:none;border-bottom:1px solid rgba(245,238,11,.5);cursor:pointer}',
  /* F7 門改提醒 */
  '.gtoast{position:fixed;left:10px;right:10px;top:calc(10px + env(safe-area-inset-top));z-index:310;background:#b026ff;color:#fff;padding:12px 14px;font-weight:900;font-size:16px;box-shadow:0 10px 40px rgba(0,0,0,.7);border-left:6px solid #fff;cursor:pointer}',
  '.gtoast small{display:block;font-size:12.5px;opacity:.9;margin-top:4px}',
  '@media (min-width:821px){.gtoast{left:auto;width:380px}}',
  /* F8 語言小抄 */
  '.r .dt .phr{color:#f5ee0b}'
  ].join('\n'); D.head.appendChild(css);

  function hm(s){ var m=String(s||'').match(/(\d\d):(\d\d)/); return m?(+m[1])*60+(+m[2]):null; }
  function p2(n){ return (n<10?'0':'')+n; }
  function fmt(m){ m=((m%1440)+1440)%1440; return p2(Math.floor(m/60))+':'+p2(m%60); }
  function sel(){ try{ return W.selCats(); }catch(e){ return ['2140','2153']; } }
  function tagOfRow(r){ var t=r.querySelector('.c-shop .tag'); return t?t.textContent.trim():''; }
  function pxOf(r){ var p=r.querySelector('.px'); return p?parseInt(p.textContent,10)||0:0; }
  function ctyOf(r){ var c=r.querySelector('.c-fno .cty'); return c?String(c.getAttribute('title')||'').split(' ')[0]:''; }
  function nowM(){ var d=new Date(); return d.getHours()*60+d.getMinutes(); }
  function etaOf(r){ var t=hm((r.querySelector('.c-time b')||{}).textContent); if(t===null) return null; var e=t-nowM(); if(e<-720) e+=1440; return e; }
  function rows(){ return [].slice.call(D.querySelectorAll('#out .r:not(.head)')); }
  function info(){ return D.getElementById('infobox'); }
  function put(id,html,after){ var o=D.getElementById(id); if(!html){ if(o) o.remove(); return; }
    if(!o){ o=D.createElement('div'); o.id=id; var ib=info(); var a=after&&D.getElementById(after);
      if(a&&a.parentNode) a.parentNode.insertBefore(o,a.nextSibling); else if(ib) ib.appendChild(o); }
    o.innerHTML=html; }
  var PINKEY='pin1', PIN={}; try{ PIN=JSON.parse(localStorage.getItem(PINKEY)||'{}')||{}; }catch(e){}
  function pinSave(){ try{ localStorage.setItem(PINKEY,JSON.stringify(PIN)); }catch(e){} }
  var GATES={}, Q='';

  var HELLO={'日本':['いらっしゃいませ','ありがとうございます','日圓 JPY'],
    '韓國':['어서 오세요','감사합니다','韓元 KRW'],
    '中國':['欢迎光临','谢谢','人民幣 CNY'],'香港':['歡迎光臨','多謝','港幣 HKD'],'澳門':['歡迎光臨','多謝','澳門幣 MOP'],
    '泰國':['สวัสดีค่ะ（Sawasdee ka）','ขอบคุณค่ะ（Khob khun ka）','泰銖 THB'],
    '越南':['Xin chào','Cảm ơn','越南盾 VND'],
    '印尼':['Selamat datang','Terima kasih','印尼盾 IDR'],'馬來西亞':['Selamat datang','Terima kasih','令吉 MYR'],
    '新加坡':['Welcome','Thank you','新幣 SGD'],'菲律賓':['Mabuhay / Welcome','Salamat','披索 PHP'],
    '美國':['Welcome','Thank you','美元 USD'],'加拿大':['Welcome / Bienvenue','Thank you','加幣 CAD'],
    '英國':['Welcome','Thank you','英鎊 GBP'],'澳洲':['Welcome','Thank you','澳幣 AUD'],'紐西蘭':['Welcome','Thank you','紐幣 NZD'],
    '法國':['Bienvenue','Merci','歐元 EUR'],'德國':['Willkommen','Danke','歐元 EUR'],'荷蘭':['Welkom','Dank u','歐元 EUR'],
    '義大利':['Benvenuti','Grazie','歐元 EUR'],'西班牙':['Bienvenidos','Gracias','歐元 EUR'],'奧地利':['Willkommen','Danke','歐元 EUR'],
    '土耳其':['Hoş geldiniz','Teşekkürler','里拉 TRY'],'印度':['Namaste / Welcome','Dhanyavaad','盧比 INR'],
    '柬埔寨':['Sous-dey','Arkun','美元 USD'],'緬甸':['Mingalaba','Kyay zu tin ba deh','緬元 MMK'],'阿聯':['Marhaba','Shukran','迪拉姆 AED'],'卡達':['Marhaba','Shukran','里亞爾 QAR']};

  function toastGate(fno,from,to,where){
    var t=D.createElement('div'); t.className='gtoast';
    t.innerHTML='🔀 門改　'+fno+'　'+(from||'—')+' → <b>'+to+'</b><small>'+where+'・點一下關掉</small>';
    t.onclick=function(){ t.remove(); }; D.body.appendChild(t);
    try{ if(navigator.vibrate) navigator.vibrate([150,80,150]); }catch(e){}
    setTimeout(function(){ if(t.parentNode) t.remove(); },20000);
  }
  W.__f3SimGate=function(){
    var rs=rows().filter(function(r){ return !r.classList.contains('done'); }); if(!rs.length) return;
    var r=rs[0], fb=r.querySelector('.c-fno b'), g=r.querySelector('.gn');
    toastGate(fb?fb.textContent:'', g?g.textContent:'待定', 'B7', '改到 2140 的範圍（模擬）');
  };

  function paint(){
    var F=W.__F, out=D.getElementById('out'); if(!out) return;
    var S=sel(), RS=rows(), nm=nowM();
    var t2el=D.getElementById('t2'), endM=hm((t2el&&t2el.value)||'23:59');

    /* F1 搜尋 */
    var sb=D.getElementById('fsearch');
    if(F.F1){
      if(!sb){ sb=D.createElement('div'); sb.id='fsearch';
        sb.innerHTML='<input type="search" placeholder="搜尋班號或城市（例如 BR23、大阪）" enterkeyhint="search"><button type="button">清除</button>';
        out.parentNode.insertBefore(sb,out);
        var inp=sb.querySelector('input');
        inp.addEventListener('input',function(){ Q=inp.value.trim().toUpperCase(); paint(); });
        sb.querySelector('button').onclick=function(){ inp.value=''; Q=''; paint(); };
      }
    } else { if(sb) sb.remove(); Q=''; }
    var shown=0;
    RS.forEach(function(r){
      if(r.__f1h){ r.style.display=''; r.__f1h=0; }
      if(F.F1&&Q){ var txt=(r.textContent||'').toUpperCase().replace(/\s+/g,'');
        var q2=Q.replace(/^([A-Z0-9]{2})0*(\d)/,'$1$2'), fno=(r.querySelector('.c-fno b')||{}).textContent||'';
        var f2=fno.toUpperCase().replace(/^([A-Z0-9]{2})0*(\d)/,'$1$2');
        if(txt.indexOf(Q)<0&&f2.indexOf(q2)<0){ if(r.style.display!=='none'){ r.style.display='none'; r.__f1h=1; } }
        else shown++; }
    });
    if(F.F1&&sb){ var sm=sb.nextSibling&&sb.nextSibling.tagName==='SMALL'?sb.nextSibling:null;
      if(Q){ if(!sm){ sm=D.createElement('small'); sb.parentNode.insertBefore(sm,sb.nextSibling); sm.style.cssText='display:block;font-size:12px;color:#9a8fb5;margin:-2px 0 6px'; } sm.textContent='找到 '+shown+' 班'; }
      else if(sm) sm.remove(); }
    [].forEach.call(D.querySelectorAll('.gapline,.nowline,.foldline,.daybreak'),function(x){ x.style.display=(F.F1&&Q)?'none':''; });

    /* F2 落地倒數 */
    RS.forEach(function(r){ var c=r.querySelector('.c-time .cd'); if(c) c.remove();
      if(!F.F2||r.classList.contains('done')||r.classList.contains('taxi')) return;
      var e=etaOf(r); if(e===null||e<0||e>90) return;
      var i=D.createElement('i'); i.className='cd'+(e<=15?' hot':''); i.textContent=e===0?'快落地':'還有 '+e+' 分';
      r.querySelector('.c-time').appendChild(i); });

    /* 只算有勾選的分類 */
    var MINE=RS.filter(function(r){ return S.indexOf(tagOfRow(r))>=0&&!r.classList.contains('done'); });

    /* F3 人潮警示：接下來 2 小時，任何連續 30 分鐘超過 400 人 */
    var rush='';
    if(F.F3){ var pts=MINE.map(function(r){ return {e:etaOf(r),p:pxOf(r)}; }).filter(function(x){ return x.e!==null&&x.e>=0&&x.e<=120; });
      var best=null; pts.forEach(function(a){ var s=0,n=0; pts.forEach(function(b){ if(b.e>=a.e&&b.e<a.e+30){ s+=b.p; n++; } }); if(!best||s>best.s) best={s:s,e:a.e,n:n}; });
      if(best&&best.s>=400) rush='⚠ <b>'+fmt(nm+best.e)+'–'+fmt(nm+best.e+30)+'</b> 半小時內 '+best.n+' 班、約 <b>'+best.s.toLocaleString()+'</b> 人（'+S.join('＋')+'），會很忙，先補貨、叫人手';
    }
    var fr=D.getElementById('frush');
    if(rush){ if(!fr){ fr=D.createElement('div'); fr.id='frush'; out.parentNode.insertBefore(fr,D.getElementById('fsearch')||out); } fr.innerHTML=rush; } else if(fr) fr.remove();

    /* F4 國籍排行（現在到時段結束，有勾的分類） */
    var natHtml='';
    if(F.F4){ var C={}; MINE.forEach(function(r){ var e=etaOf(r); if(e===null||e<-10) return; if(endM!==null&&(nm+e)%1440>endM&&e<720) return;
        var k=ctyOf(r)||'其他'; C[k]=(C[k]||0)+pxOf(r); });
      var ks=Object.keys(C).sort(function(a,b){ return C[b]-C[a]; }).slice(0,6);
      if(ks.length) natHtml='<div class="h">接下來的客人哪國最多（依出發地）</div><div class="g">'+ks.map(function(k){ return '<span>'+k+' <b>'+C[k].toLocaleString()+'</b></span>'; }).join('')+'</div>';
    }
    put('fnat',natHtml,'prog');

    /* F5 每小時長條（今天剩下的時段，依分類疊色） */
    var hrHtml='';
    if(F.F5){ var H={}, cats=S.slice(0,3);
      MINE.forEach(function(r){ var e=etaOf(r); if(e===null||e<-30||e>12*60) return; var h=Math.floor(((nm+e)%1440)/60);
        var k=tagOfRow(r); H[h]=H[h]||{}; H[h][k]=(H[h][k]||0)+pxOf(r); });
      var hs=Object.keys(H).map(Number).sort(function(a,b){ var x=(a-Math.floor(nm/60)+24)%24, y=(b-Math.floor(nm/60)+24)%24; return x-y; }).slice(0,8);
      if(hs.length){ var mx=1; hs.forEach(function(h){ var s=0; for(var k in H[h]) s+=H[h][k]; if(s>mx) mx=s; });
        hrHtml='<div class="h">每小時客人（'+S.join('＋')+'）</div><div class="bars">'+hs.map(function(h){ var s=0; for(var k in H[h]) s+=H[h][k];
          return '<div class="col"><em>'+s+'</em>'+cats.map(function(k,ix){ var v=H[h][k]||0; return v?'<i class="'+(ix===0?'a':(ix===1?'b':'o'))+'" style="height:'+Math.round(v/mx*100)+'%"></i>':''; }).reverse().join('')+'</div>'; }).join('')
          +'</div><div class="xs">'+hs.map(function(h){ return '<span>'+h+'時</span>'; }).join('')+'</div>'; }
    }
    put('fhr',hrHtml,'fnat');

    /* F6 釘選 */
    var pins=[];
    RS.forEach(function(r){ var fb=r.querySelector('.c-fno b'); if(!fb) return; var k=fb.textContent.trim();
      var b=r.querySelector('.pinb');
      if(!F.F6){ if(b) b.remove(); r.classList.remove('pinned'); return; }
      if(!b){ b=D.createElement('button'); b.type='button'; b.className='pinb'; b.title='釘選這班';
        b.onclick=function(ev){ ev.stopPropagation(); if(PIN[k]) delete PIN[k]; else PIN[k]=1; pinSave(); paint(); };
        var cs=r.querySelector('.c-st'); if(cs) cs.insertBefore(b,cs.firstChild); else fb.parentNode.appendChild(b); }
      b.textContent=PIN[k]?'★':'☆'; b.classList.toggle('on',!!PIN[k]); r.classList.toggle('pinned',!!PIN[k]);
      if(PIN[k]) pins.push({k:k,r:r,t:(r.querySelector('.c-time b')||{}).textContent}); });
    var fp=D.getElementById('fpin');
    if(F.F6&&pins.length){ if(!fp){ fp=D.createElement('div'); fp.id='fpin'; out.parentNode.insertBefore(fp,out); }
      fp.innerHTML='★ 釘選 '+pins.length+' 班：'+pins.map(function(p,i){ return '<a data-i="'+i+'">'+p.t+' '+p.k+'</a>'; }).join('');
      [].forEach.call(fp.querySelectorAll('a'),function(a){ a.onclick=function(){ var r=pins[+a.getAttribute('data-i')].r; scrollTo(0,r.getBoundingClientRect().top+scrollY-60); }; });
    } else if(fp) fp.remove();

    /* F7 門改提醒：登機門換了、而且換進／換出你勾的分類 */
    if(F.F7) RS.forEach(function(r){ var fb=r.querySelector('.c-fno b'); if(!fb) return; var k=fb.textContent.trim();
      var g=(r.querySelector('.gn')||{}).textContent||'', tg=tagOfRow(r), old=GATES[k];
      if(old&&old.g!==g&&g){ var into=S.indexOf(tg)>=0, from=S.indexOf(old.t)>=0;
        if(into||from) toastGate(k,old.g,g,into?(from?'還是 '+tg:'改進 '+tg+' 的範圍'):'改出去了（原本 '+old.t+'）'); }
      GATES[k]={g:g,t:tg}; });

    /* F8 語言小抄：點開卡片的詳細裡加招呼語 */
    RS.forEach(function(r){ var dt=r.querySelector('.dt'); if(!dt) return; var o=dt.querySelectorAll('.f8');
      if(!F.F8){ [].forEach.call(o,function(x){ x.remove(); }); return; } if(o.length) return;
      var c=ctyOf(r), h=HELLO[c]||['Welcome','Thank you','—'];
      var x=dt.querySelector('.x');
      [['打招呼',h[0]],['謝謝',h[1]],['常用幣別',h[2]]].forEach(function(p){ var i=D.createElement('i'); i.className='f8'; i.textContent=p[0];
        var b=D.createElement('b'); b.className='f8 phr'; b.textContent=p[1]; dt.insertBefore(i,x); dt.insertBefore(b,x); }); });
  }
  W.__f3paint=paint;
  var wait=setInterval(function(){ if(typeof W.render!=='function') return; clearInterval(wait);
    var _r=W.render; W.render=function(){ var x=_r.apply(this,arguments); try{ paint(); }catch(e){ console.log('f3',e); } return x; };
    try{ paint(); }catch(e){} },100);
  D.addEventListener('click',function(e){ if(e.target.closest&&e.target.closest('#out .r')) setTimeout(function(){ try{ paint(); }catch(_){ } },60); });
  setInterval(function(){ try{ paint(); }catch(e){} },30000);
})();
