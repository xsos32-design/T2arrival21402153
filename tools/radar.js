<!-- 11/14：雷達（tools/radar.js）。每張班機卡片多一行雷達狀態；點那行或上面「雷達」鍵打開地圖，
     像 Flightradar24 一樣看飛機在哪、點飛機看詳細。資料：adsb.lol（ODbL），經 Cloudflare 中繼 /radar 共用 15 秒 -->
<style>
.r .rdr{grid-column:1/-1;flex:1 1 100%;width:100%;box-sizing:border-box;display:flex;align-items:center;gap:6px;margin-top:6px;padding:5px 8px;
  font-size:13.5px;font-weight:800;color:#c3cad4;background:rgba(10,14,22,.55);border:1px solid #2a3545;cursor:pointer;-webkit-tap-highlight-color:transparent}
.r .rdr .ic{width:15px;height:15px;flex:0 0 auto}
.r .rdr b{font-weight:900}
.r .rdr .go{margin-left:auto;font-size:12px;color:#00efd4;white-space:nowrap}
.r .rdr.k-enr{color:#9fb3be} .r .rdr.k-app{color:#ffd84a;border-color:#7a5c12}
.r .rdr.k-land{color:#00f0ff;border-color:#0b6b70} .r .rdr.k-taxi{color:#7ab8ff;border-color:#2b4f80}
.r .rdr.k-park{color:#8CF23A;border-color:#3f6b1a} .r .rdr.k-off{color:#8CF23A;border-color:#3f6b1a}
.r .rdr.k-lost{color:#8d99a9}
body.fs3 .r .rdr,body.fs4 .r .rdr{font-size:16px}
/* 地圖 */
#rmap{position:fixed;inset:0;z-index:10000;background:#05040a;display:flex;flex-direction:column}
#rmap[hidden]{display:none}
#rmap .rm-h{display:flex;align-items:center;gap:10px;padding:calc(env(safe-area-inset-top,0px) + 8px) 12px 8px;background:#07040e;border-bottom:2px solid #00f0ff;box-shadow:0 2px 14px -4px #00f0ff;color:#00f0ff;font-weight:900;text-shadow:0 0 8px rgba(0,240,255,.7)}
#rmap .rm-h b{font-size:17px;letter-spacing:.08em}
#rmap .rm-h small{color:#8d99a9;font-weight:800;font-size:12px}
#rmap .rm-x{all:unset;margin-left:auto;cursor:pointer;font-size:15px;font-weight:900;padding:8px 14px;border:1px solid #2a3545;color:#e8e3f5;background:#161e29}
#rmap .rm-m{flex:1;min-height:0;background:#0a0f16}
#rmap .rm-i{background:#07040e;border-top:2px solid #ff2a6d;box-shadow:0 -2px 14px -4px #ff2a6d;padding:10px 14px calc(env(safe-area-inset-bottom,0px) + 10px);color:#e8e3f5}
#rmap .rm-i[hidden]{display:none}
#rmap .rm-i .t1{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
#rmap .rm-i .t1 b{font-size:22px;font-weight:900;color:#fff}
#rmap .rm-i .t1 span{font-size:14px;font-weight:900}
#rmap .rm-i .g{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:8px 0}
#rmap .rm-i .g div{background:#161e29;border:1px solid #2a3545;padding:5px 6px;text-align:center}
#rmap .rm-i .g small{display:block;font-size:11px;color:#8d99a9;font-weight:800}
#rmap .rm-i .g i{font-style:normal;font-size:15px;font-weight:900}
#rmap .rm-i .fr{display:block;text-align:center;padding:10px;font-weight:900;font-size:15px;background:#ffc53d;color:#1a1400;text-decoration:none}
#rmap .rm-src{font-size:11px;color:#6b7686;text-align:right;margin-top:6px}
.rp{width:30px;height:30px;margin:-15px 0 0 -15px;display:flex;align-items:center;justify-content:center}
.rp svg{width:28px;height:28px;filter:drop-shadow(0 0 4px currentColor) drop-shadow(0 1px 2px #000)}
.rp.sel svg{width:34px;height:34px}
.rk{position:absolute;transform:translate(-50%,-50%);white-space:nowrap;font:900 11px/1 system-ui,sans-serif;color:#ff7a95;text-shadow:0 0 6px rgba(255,42,109,.9),0 0 2px #000}
.rc{position:absolute;transform:translate(-50%,-50%);white-space:nowrap;font:900 13px/1 system-ui,sans-serif;color:#c9b8ff;letter-spacing:.08em;text-shadow:0 0 8px rgba(123,120,255,.9),0 0 2px #000}
#rmap .leaflet-container{background:#07040e;background-image:linear-gradient(rgba(0,240,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(0,240,255,.07) 1px,transparent 1px);background-size:44px 44px}
#rmap .rg-coast{filter:drop-shadow(0 0 3px #00f0ff)}
#rmap .rg-ring{filter:drop-shadow(0 0 2px #ff2a6d)}
#rmap .rg-rwy{filter:drop-shadow(0 0 4px #f5ee0b)}
#rmap .leaflet-control-attribution{background:rgba(5,4,10,.7)!important;color:#6b7686!important;font-size:10px!important}
#rmap .leaflet-control-attribution a{color:#6b7686!important}
#rmap .leaflet-bar a{background:#161e29!important;color:#e8e3f5!important;border-color:#2a3545!important}
.rl{position:absolute;left:50%;top:22px;transform:translateX(-50%);white-space:nowrap;font:900 12px/1.25 system-ui,sans-serif;color:#fff;background:rgba(7,4,14,.85);border:1px solid #00f0ff;padding:1px 5px;box-shadow:0 0 8px rgba(0,240,255,.5)}
</style>
<script>
(function(){
  var D=document, W=window, DEP=/出境/.test(D.title);
  var RADAR_URL='https://tpe-board.xsos32.workers.dev/radar', TPE=[25.0777,121.2328];
  /* 航空公司 IATA → ICAO（呼號前三碼） */
  var ICAO={BR:'EVA',CI:'CAL',JX:'SJX',B7:'UIA',AE:'MDA',IT:'TTW',CX:'CPA',UO:'HKE',HX:'CRK',NX:'AMU',CA:'CCA',MU:'CES',CZ:'CSN',FM:'CSH',HO:'DKH',
    MF:'CXA',ZH:'CSZ',SC:'CDG','3U':'CSC',HU:'CHH',JD:'CBJ',GS:'GCR',KN:'CUA',KE:'KAL',OZ:'AAR','7C':'JJA',LJ:'JNA',TW:'TWB',ZE:'ESR',BX:'ABL',RS:'ASV',
    JL:'JAL',NH:'ANA',MM:'APJ',GK:'JJP',BC:'SKY','7G':'SFJ',TR:'TGW',SQ:'SIA',MH:'MAS',AK:'AXM',D7:'XAX',TG:'THA',FD:'AIQ',VZ:'TVJ',SL:'TLM',WE:'THD',
    VN:'HVN',VJ:'VJC',QH:'BAV',PR:'PAL','5J':'CEB',Z2:'APG',DG:'SRQ',GA:'GIA',KL:'KLM',LH:'DLH',TK:'THY',EK:'UAE',QR:'QTR',EY:'ETD',NZ:'ANZ',QF:'QFA',
    UA:'UAL',DL:'DAL',AA:'AAL',AC:'ACA',AS:'ASA',OD:'MXD',ZG:'TZP',OM:'MGL',BI:'RBA',HY:'UZB',AI:'AIC','6E':'IGO',UL:'ALK',PG:'BKP',DD:'NOK',XJ:'TAX',
    '8L':'LKE',BL:'PIC',VU:'VAG',DZ:'EPA',TV:'TBA',RF:'EOK',YP:'APZ',IJ:'SJO',MP:'MPH',CV:'CLX','5X':'UPS',FX:'FDX',CK:'CKK',PO:'PAC',K4:'CKS'};
  var R={}, RT=0, busy=false, map=null, marks={}, sel='', mapEl=null;
  function csOf(code){ var m=String(code||'').toUpperCase().replace(/\s/g,'').match(/^([A-Z0-9]{2})0*(\d{1,4})([A-Z]?)$/); if(!m||!ICAO[m[1]]) return ''; return ICAO[m[1]]+m[2]+m[3]; }
  function iataShort(code){ var m=String(code||'').toUpperCase().match(/^([A-Z0-9]{2})0*(\d{1,4}[A-Z]?)$/); return m?m[1]+m[2]:code; }
  function km(la,lo){ var r=Math.PI/180, dl=(la-TPE[0])*r, dn=(lo-TPE[1])*r, a=Math.sin(dl/2)*Math.sin(dl/2)+Math.cos(TPE[0]*r)*Math.cos(la*r)*Math.sin(dn/2)*Math.sin(dn/2); return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)); }
  function n0(x){ return Math.round(x).toLocaleString(); }
  /* 狀態判斷 */
  function stOf(a){
    var alt=a[3], gs=a[4], age=a[7], d=km(a[1],a[2]);
    var ground=alt<0||(alt<=150&&gs<80);
    if(DEP){   /* 出境頁：起飛的說法 */
      if(ground){
        if(age>120) return {k:'park',t:'停在機位',s:'還沒開機（訊號 '+Math.round(age/60)+' 分前）',d:d};
        if(gs>=40) return {k:'land',t:'起飛滑跑',s:gs+' 節',d:d};
        if(gs>=4) return {k:'taxi',t:'滑行中',s:'往跑道 '+gs+' 節',d:d};
        return {k:'park',t:'停在機位',s:'已開機、等待後推',d:d};
      }
      if(age>300) return {k:'lost',t:'訊號消失',s:Math.round(age/60)+' 分前，最後在距桃園 '+Math.round(d)+' 公里',d:d};
      return {k:'enr',t:'已起飛',s:n0(alt)+' 呎・距桃園 '+Math.round(d)+' 公里',d:d};
    }
    if(ground){
      if(age>120) return d<4?{k:'off',t:'已停機',s:'訊號 '+Math.round(age/60)+' 分前消失（多半已關機）',d:d}:{k:'lost',t:'訊號消失',s:Math.round(age/60)+' 分前',d:d};
      if(gs>=40) return {k:'land',t:'已落地',s:'減速中 '+gs+' 節',d:d};
      if(gs>=4) return {k:'taxi',t:'滑行中',s:gs+' 節',d:d};
      return {k:'park',t:'已停妥',s:'停在地面',d:d};
    }
    if(age>300) return {k:'lost',t:'訊號消失',s:Math.round(age/60)+' 分前，最後在距桃園 '+Math.round(d)+' 公里',d:d};
    var eta=Math.max(1,Math.round(d/(Math.max(gs,140)*1.852)*60+(alt>10000?4:1)));
    if(alt<10000) return {k:'app',t:'進場中',s:n0(alt)+' 呎・距 '+Math.round(d)+' 公里・約 '+eta+' 分落地',d:d,eta:eta};
    return {k:'enr',t:'航路中',s:'距 '+Math.round(d)+' 公里・約 '+eta+' 分落地',d:d,eta:eta};
  }
  function load(){
    if(busy||D.hidden) return; busy=true;
    var ac=W.AbortController?new AbortController():null, tm=setTimeout(function(){ if(ac) ac.abort(); },8000);
    fetch(RADAR_URL,{cache:'no-store',signal:ac?ac.signal:undefined}).then(function(r){ return r.json(); }).then(function(j){
      var m={}; (j.a||[]).forEach(function(a){ m[a[0]]=a; }); R=m; RT=Date.now(); paintCards(); if(mapEl&&!mapEl.hidden) paintMap();
    })['catch'](function(){}).then(function(){ clearTimeout(tm); busy=false; });
  }
  /* 卡片：照班號找呼號，加一行 */
  function rowsInfo(){ return [].map.call(D.querySelectorAll('#out .r:not(.head)'),function(r){
      var b=r.querySelector('.c-fno b'), t=r.querySelector('.c-time b'), tg=r.querySelector('.c-shop .tag');
      var code=b?String(b.textContent).trim().split(/\s/)[0]:''; return {r:r,code:code,cs:csOf(code),t:t?t.textContent.trim():'',tag:tg?tg.textContent.trim():''}; }); }
  function plausible(x,a){
    /* 同呼號可能是別趟（例如早上那班停著）：班機還要 90 分以上才到，但雷達顯示已停在地面 → 不採用 */
    var m=String(x.t).match(/(\d\d):(\d\d)/); if(!m) return true;
    var d=new Date(), eta=(+m[1])*60+(+m[2])-(d.getHours()*60+d.getMinutes()); if(eta<-720) eta+=1440;
    var ground=a[3]<0||(a[3]<=150&&a[4]<80);
    if(DEP){ if(!ground&&eta>30) return false; if(eta<-120) return false; return true; }
    if(ground&&eta>90) return false;
    if(!ground&&eta<-180) return false;
    return true;
  }
  function paintCards(){
    rowsInfo().forEach(function(x){
      var a=x.cs&&R[x.cs], el=x.r.querySelector('.rdr');
      if(!a||!plausible(x,a)){ if(el) el.remove(); return; }
      var s=stOf(a);
      var h='<svg class="ic" viewBox="0 0 24 24"><use href="#i-signal"/></svg><b>'+s.t+'</b><span>'+s.s+'</span><span class="go">地圖 ›</span>';
      if(!el){ el=D.createElement('div'); x.r.appendChild(el); }
      el.className='rdr k-'+s.k; if(el.__h!==h){ el.innerHTML=h; el.__h=h; } el.dataset.cs=x.cs; el.dataset.code=x.code;
    });
    var dk=D.querySelector('#dock button[data-k="radar"] small'); if(dk){ var n=rowsInfo().filter(function(x){ var a=x.cs&&R[x.cs]; if(!a||!plausible(x,a)) return false; var k=stOf(a).k; return DEP?(k==='taxi'||k==='land'):(k==='app'||k==='enr'); }).length; dk.textContent=n?n+' 班'+(DEP?'滑行':''):'地圖'; }
  }
  D.addEventListener('click',function(e){ var el=e.target.closest&&e.target.closest('.r .rdr'); if(!el) return; e.stopPropagation(); openMap(el.dataset.cs); },true);
  /* 地圖 */
  function css(h){ var l=D.createElement('link'); l.rel='stylesheet'; l.href=h; D.head.appendChild(l); }
  function js(s,cb){ var x=D.createElement('script'); x.src=s; x.onload=cb; D.head.appendChild(x); }
  function plane(c){ return '<svg viewBox="0 0 24 24"><path fill="'+c+'" stroke="#000" stroke-width=".6" d="M12 2c.8 0 1.3.9 1.3 2v5.2l7.7 4.6v2l-7.7-2.3v4.8l2.2 1.7v1.6L12 20.6l-3.5 1v-1.6l2.2-1.7v-4.8L3 15.8v-2l7.7-4.6V4c0-1.1.5-2 1.3-2z"/></svg>'; }
  function colorOf(cs){ var x=rowsInfo().filter(function(x){ return x.cs===cs; })[0]; if(!x) return '#ffd84a';
    return /2140/.test(x.tag)?'#00f0ff':(/2153/.test(x.tag)?'#ff2a6d':(/YA/.test(x.tag)?'#8CF23A':(/YB/.test(x.tag)?'#7B78FF':'#ffd84a'))); }
  /* 自繪底圖（不用別人的地圖圖磚）：海岸線 Natural Earth、跑道 OurAirports，兩個都是公有領域，其他自己畫 */
  function off(p,dn,de){ var r=Math.PI/180; return [p[0]+dn/111320, p[1]+de/(111320*Math.cos(p[0]*r))]; }
  function strip(a,b,w){ var r=Math.PI/180, dn=(b[0]-a[0])*111320, de=(b[1]-a[1])*111320*Math.cos(a[0]*r), L2=Math.sqrt(dn*dn+de*de), un=-de/L2*w/2, ue=dn/L2*w/2;
    return [off(a,un,ue),off(b,un,ue),off(b,-un,-ue),off(a,-un,-ue)]; }
  function drawBase(){
    mapEl.querySelector('.rm-m').style.background='#07040e';
    fetch('img/radar-map.json').then(function(r){ return r.json(); }).then(function(m){
      (m.land||[]).forEach(function(ring){ L.polygon(ring,{stroke:true,color:'#00f0ff',weight:1.6,fillColor:'#140b2a',fillOpacity:.92,interactive:false,className:'rg-coast'}).addTo(map); });
      (m.coast||[]).forEach(function(ln){ L.polyline(ln,{color:'#00f0ff',weight:1.4,opacity:.7,interactive:false,className:'rg-coast'}).addTo(map); });
      [10,30,60,100].forEach(function(k){ L.circle(TPE,{radius:k*1000,color:'#ff2a6d',weight:1.2,opacity:.6,dashArray:'6 8',fill:false,interactive:false,className:'rg-ring'}).addTo(map);
        L.marker(off(TPE,k*1000,0),{icon:L.divIcon({className:'',iconSize:[0,0],html:'<div class="rk">'+k+' 公里</div>'}),interactive:false}).addTo(map); });
      (m.cities||[]).forEach(function(c){ L.marker([c[1],c[2]],{icon:L.divIcon({className:'',iconSize:[0,0],html:'<div class="rc">'+c[0]+'</div>'}),interactive:false}).addTo(map); });
      var rw=m.rw||[];
      if(rw.length===2){ var c1=[(rw[0][1][0]+rw[0][2][0])/2,(rw[0][1][1]+rw[0][2][1])/2], c2=[(rw[1][1][0]+rw[1][2][0])/2,(rw[1][1][1]+rw[1][2][1])/2];
        var mid=[(c1[0]+c2[0])/2,(c1[1]+c2[1])/2], d0=[rw[0][2][0]-rw[0][1][0],rw[0][2][1]-rw[0][1][1]];
        var a=[mid[0]-d0[0]*.32,mid[1]-d0[1]*.32], b=[mid[0]+d0[0]*.32,mid[1]+d0[1]*.32];
        L.polygon(strip(a,b,900),{stroke:true,color:'#7B78FF',weight:1,fillColor:'#2a1f4a',fillOpacity:.9,interactive:false}).addTo(map); }   /* 航廈、停機坪一帶 */
      rw.forEach(function(r){ L.polygon(strip(r[1],r[2],60),{stroke:true,color:'#f5ee0b',weight:1.5,fillColor:'#fff7b0',fillOpacity:1,interactive:false,className:'rg-rwy'}).addTo(map);
        L.marker(r[1],{icon:L.divIcon({className:'',iconSize:[0,0],html:'<div class="rk" style="color:#f5ee0b">'+r[0].split('/')[0]+'</div>'}),interactive:false}).addTo(map); });
      map.attributionControl.addAttribution('自繪｜Natural Earth・OurAirports・adsb.lol');
    })['catch'](function(){});
  }
  function openMap(cs){
    var all=!cs; sel=cs||'';
    if(!mapEl){
      mapEl=D.createElement('div'); mapEl.id='rmap';
      mapEl.innerHTML='<div class="rm-h"><b>雷達</b><small>ADS-B 即時位置</small><button type="button" class="rm-x">關閉 ✕</button></div><div class="rm-m"></div><div class="rm-i" hidden></div>';
      D.body.appendChild(mapEl);
      mapEl.querySelector('.rm-x').onclick=function(){ mapEl.hidden=true; };
    }
    mapEl.hidden=false;
    if(!W.L){ css('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'); js('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',function(){ initMap(all); }); }
    else initMap(all);
    load();
  }
  function initMap(all){
    if(!map){
      map=L.map(mapEl.querySelector('.rm-m'),{zoomControl:false,attributionControl:true,minZoom:7,maxZoom:15}).setView(TPE,11);
      map.attributionControl.setPrefix(false);
      drawBase();
      L.control.zoom({position:'topright'}).addTo(map);
      map.on('click',function(){ sel=''; paintMap(); });
      L.marker(TPE,{icon:L.divIcon({className:'',iconSize:[0,0],html:'<div class="rl" style="top:-34px;background:#00efd4;color:#00202a">桃園 TPE</div>'}),interactive:false}).addTo(map);
    }
    setTimeout(function(){ map.invalidateSize(); if(all) map.setView(TPE,10); paintMap(!all); },50);
  }
  function paintMap(fly){
    if(!map) return;
    var keep={};
    Object.keys(R).forEach(function(cs){ var a=R[cs]; if(a[7]>1800) return;   /* 半小時以上沒訊號的不畫 */
      keep[cs]=1; var on=cs===sel, c=colorOf(cs);
      var lab=rowsInfo().filter(function(x){ return x.cs===cs; })[0];
      var html='<div class="rp'+(on?' sel':'')+'" style="color:'+(on?'#ffffff':c)+';transform:rotate('+(a[5]||0)+'deg)">'+plane(on?'#ffffff':c)+'</div>'+(lab||on?'<div class="rl">'+(lab?iataShort(lab.code):cs)+'</div>':'');
      var ic=L.divIcon({className:'',html:html,iconSize:[0,0]});
      if(marks[cs]){ marks[cs].setLatLng([a[1],a[2]]); marks[cs].setIcon(ic); marks[cs].setOpacity(a[7]>120?.45:1); }
      else { marks[cs]=L.marker([a[1],a[2]],{icon:ic,opacity:a[7]>120?.45:1}).addTo(map); marks[cs].on('click',function(e){ L.DomEvent.stopPropagation(e); sel=cs; paintMap(); }); }
      if(on) marks[cs].setZIndexOffset(1000); else marks[cs].setZIndexOffset(0);
    });
    Object.keys(marks).forEach(function(cs){ if(!keep[cs]){ map.removeLayer(marks[cs]); delete marks[cs]; } });
    var box=mapEl.querySelector('.rm-i'), a=sel&&R[sel];
    if(!a){ box.hidden=true; return; }
    var s=stOf(a), lab=rowsInfo().filter(function(x){ return x.cs===sel; })[0], code=lab?lab.code:sel;
    box.hidden=false;
    box.innerHTML='<div class="t1"><b>'+code+'</b><span style="color:'+colorOf(sel)+'">'+s.t+'</span><span style="color:#8d99a9">'+(lab?lab.tag:'')+'</span></div>'
      +'<div class="g"><div><small>高度</small><i>'+(a[3]<0?'地面':n0(a[3])+' 呎')+'</i></div><div><small>速度</small><i>'+a[4]+' 節</i></div>'
      +'<div><small>距桃園</small><i>'+Math.round(s.d)+' 公里</i></div><div><small>訊號</small><i>'+(a[7]<60?a[7]+' 秒前':Math.round(a[7]/60)+' 分前')+'</i></div></div>'
      +'<div style="font-size:13px;font-weight:800;color:#c3cad4;margin-bottom:8px">'+s.s+(a[9]?'・'+a[9]:'')+(a[8]?'・'+a[8]:'')+'</div>'
      +'<a class="fr" href="https://www.flightradar24.com/'+encodeURIComponent(lab?iataShort(lab.code):sel)+'" target="_blank" rel="noopener">用 Flightradar24 開啟這班 ›</a>'
      +'<div class="rm-src">飛機位置：adsb.lol（志工接收站，地面訊號可能缺漏）</div>';
    if(fly) map.setView([a[1],a[2]],a[3]<0?14:10);
  }
  W.radarOpen=openMap;
  /* 上面那排加一顆「雷達」 */
  var w=setInterval(function(){ var dk=D.getElementById('dock'); if(!dk) return; clearInterval(w);
    if(!dk.querySelector('[data-k="radar"]')){ var b=D.createElement('button'); b.type='button'; b.dataset.k='radar'; b.innerHTML='<b>雷達</b><small>地圖</small>';
      b.addEventListener('click',function(e){ e.stopPropagation(); openMap(''); },true); dk.appendChild(b); dk.style.gridTemplateColumns='repeat(6,minmax(0,1fr))'; }
  },150);
  var w2=setInterval(function(){ if(typeof W.render!=='function') return; clearInterval(w2);
    var _r=W.render; W.render=function(){ var x=_r.apply(this,arguments); try{ paintCards(); }catch(e){} return x; }; load(); },100);
  setInterval(load,20000);
  D.addEventListener('visibilitychange',function(){ if(!D.hidden) load(); });
})();
</script>
