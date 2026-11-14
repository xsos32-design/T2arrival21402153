<!-- 11/14：雷達（tools/radar.js）。每張班機卡片多一行雷達狀態；點那行或上面「雷達」鍵打開地圖，
     看飛機在哪、點飛機看詳細（飛機會動）。資料：adsb.lol（ODbL），經 Cloudflare 中繼 /radar 共用 15 秒 -->
<style>
.r .rdr{grid-column:1/-1;flex:1 1 100%;width:100%;box-sizing:border-box;display:flex;align-items:center;gap:6px;margin-top:6px;padding:5px 8px;
  font-size:13.5px;font-weight:800;color:#c3cad4;background:rgba(10,14,22,.55);border:1px solid #2a3545;cursor:pointer;-webkit-tap-highlight-color:transparent}
.r .rdr .ic{width:15px;height:15px;flex:0 0 auto}
.r .rdr b{font-weight:900}
.r .rdr{flex-wrap:wrap}
.r .rdr .go{margin-left:auto;font-size:12px;color:#00efd4;white-space:nowrap}
.rx{font-style:normal;font-size:12px;font-weight:900;padding:1px 6px;white-space:nowrap;border:1px solid currentColor}
.rx-on{color:#8CF23A} .rx-off{color:#07040e;background:#8CF23A;border-color:#8CF23A} .rx-lost{color:#ffc53d}
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
#rmap .rm-src{font-size:11px;color:#6b7686;text-align:right;margin-top:6px}
.rp{width:30px;height:30px;margin:-15px 0 0 -15px;display:flex;align-items:center;justify-content:center}
.rp svg{width:28px;height:28px;filter:drop-shadow(0 0 4px currentColor) drop-shadow(0 1px 2px #000)}
.rp.sel svg{width:34px;height:34px}
.rk{position:absolute;transform:translate(-50%,-50%);white-space:nowrap;font:900 11px/1 system-ui,sans-serif;color:#ff7a95;text-shadow:0 0 6px rgba(255,42,109,.9),0 0 2px #000}
.rc{position:absolute;transform:translate(-50%,-50%);white-space:nowrap;font:900 12px/1 system-ui,sans-serif;color:#c9b8ff;letter-spacing:.08em;text-shadow:0 0 8px rgba(123,120,255,.9),0 0 2px #000}
.rc1{font-size:15px;color:#fff;text-shadow:0 0 10px #7B78FF,0 0 3px #000}
.rc3{font-size:13px;color:#3fb6c9;letter-spacing:.5em;font-style:italic;text-shadow:none;opacity:.8}
.rkw{color:#f5ee0b!important;text-shadow:0 0 6px rgba(245,238,11,.8),0 0 2px #000!important}
.rz{position:absolute;transform:translate(-50%,-50%);white-space:nowrap;font:900 15px/1 system-ui,sans-serif;color:#fff;background:#ff2a6d;padding:3px 8px;box-shadow:0 0 10px rgba(255,42,109,.8)}
.rt{position:absolute;transform:translate(-50%,-50%);white-space:nowrap;font:900 14px/1 system-ui,sans-serif;color:#00f0ff;text-shadow:0 0 8px #00f0ff,0 0 2px #000}
#rmap .zmid .rz,#rmap .zmid .rt{display:none} #rmap .zfar .rkr,#rmap .leaflet-container:not(.znear) .rkr{display:none}
#rmap .zfar .rc2{display:none} #rmap .znear .rc,#rmap .znear .rtpe{display:none}
#rmap .zmid .rkn{display:none}
#rmap .rg-road{filter:drop-shadow(0 0 3px #ff9f1c)}
.rl i{font-style:normal;margin-left:4px;padding:0 3px;background:#00f0ff;color:#00202a}
#rmap .rm-g{display:flex;flex-wrap:wrap;align-items:center;gap:3px 4px;padding:5px 10px;background:#07040e;border-top:1px solid #2a3545;font-size:11.5px;font-weight:800;color:#9aa6b8}
#rmap .rm-g i{display:inline-block;width:10px;height:10px;margin-left:8px} #rmap .rm-g i:first-child{margin-left:0} #rmap .rm-g i.ln{height:3px;width:14px}
#rmap .rm-i .tg{font-size:12.5px;font-weight:900;padding:1px 6px;color:#07040e!important;white-space:nowrap}
#rmap .rm-i .bk{margin-left:auto;font-size:13px;font-weight:900;color:#00f0ff;cursor:pointer;padding:4px 0 4px 10px}
#rmap .rm-i .t2{font-size:14px;font-weight:800;color:#c3cad4;margin-top:4px} #rmap .rm-i .t2 b{color:#fff;font-size:16px}
#rmap .rm-i .t3{font-size:13px;font-weight:800;color:#c3cad4}
#rmap .rm-i .g .rxc{border:1px solid currentColor;background:#161e29} #rmap .rm-i .g .rxc.rx-off{background:#8CF23A;color:#07040e} #rmap .rm-i .g .rxc.rx-off small{color:#1c3a06}
#rmap .rm-i .lh{display:flex;justify-content:space-between;align-items:baseline;font-size:13px;font-weight:900;color:#ffc53d;letter-spacing:.06em;margin-bottom:6px}
#rmap .rm-i .lh small{color:#8d99a9;letter-spacing:0;font-size:11.5px}
#rmap .rm-i .ll{max-height:26vh;overflow-y:auto;-webkit-overflow-scrolling:touch}
#rmap .rm-i .li{display:grid;grid-template-columns:auto auto auto auto 1fr;align-items:center;gap:8px;padding:7px 0;border-top:1px solid #1e2633;font-size:14px;font-weight:800;cursor:pointer}
#rmap .rm-i .li b{font-size:16px;color:#fff} #rmap .rm-i .li .gt{color:#00f0ff;font-weight:900} #rmap .rm-i .li .ds{color:#9aa6b8;font-size:12.5px;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#rmap .rm-i .li .st{font-weight:900} #rmap .rm-i .li .st.k-app{color:#ffd84a} #rmap .rm-i .li .st.k-land{color:#00f0ff} #rmap .rm-i .li .st.k-taxi{color:#7ab8ff}
#rmap .rm-i .li .st.k-park,#rmap .rm-i .li .st.k-off{color:#8CF23A} #rmap .rm-i .li .st.k-enr,#rmap .rm-i .li .st.k-lost{color:#9fb3be}
#rmap .rm-i .li.none{display:block;color:#9a8fb5;cursor:default}
#rmap .leaflet-container{background:#07040e;background-image:linear-gradient(rgba(0,240,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(0,240,255,.07) 1px,transparent 1px);background-size:44px 44px}
#rmap .rg-coast{filter:drop-shadow(0 0 3px #00f0ff)}
#rmap .rg-ring{filter:drop-shadow(0 0 2px #ff2a6d)}
#rmap .rg-trail{filter:drop-shadow(0 0 4px #fff)}
#rmap .zfar .rk:not(.rkf),#rmap .zfar .rl:not(.rls){display:none}
#rmap .rm-live{display:inline-block;width:8px;height:8px;border-radius:50%;background:#8CF23A;margin-left:8px;box-shadow:0 0 8px #8CF23A;animation:rmlive 1.2s ease-in-out infinite}
@keyframes rmlive{50%{opacity:.25}}
.rp.sel svg{animation:rpsel 1.6s ease-in-out infinite}
@keyframes rpsel{50%{filter:drop-shadow(0 0 12px #fff) drop-shadow(0 1px 2px #000)}}
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
  var R={}, RT=0, JT=0, OFF=null, busy=false, map=null, marks={}, sel='', mapEl=null;
  var LT=0, hist={}, disp={}, follow=false, raf=0, lastTick=0, lastBox=0, panUntil=0, trail=null;
  function csOf(code){ var m=String(code||'').toUpperCase().replace(/\s/g,'').match(/^([A-Z0-9]{2})0*(\d{1,4})([A-Z]?)$/); if(!m||!ICAO[m[1]]) return ''; return ICAO[m[1]]+m[2]+m[3]; }
  function iataShort(code){ var m=String(code||'').toUpperCase().match(/^([A-Z0-9]{2})0*(\d{1,4}[A-Z]?)$/); return m?m[1]+m[2]:code; }
  function km(la,lo){ var r=Math.PI/180, dl=(la-TPE[0])*r, dn=(lo-TPE[1])*r, a=Math.sin(dl/2)*Math.sin(dl/2)+Math.cos(TPE[0]*r)*Math.cos(la*r)*Math.sin(dn/2)*Math.sin(dn/2); return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)); }
  function n0(x){ return Math.round(x).toLocaleString(); }
  /* 狀態判斷 */
  /* 雷達（飛機自己的發報機）開著還是關了：90 秒內有訊號＝開啟；停在機場地面後訊號斷掉＝已關閉；其他＝訊號中斷 */
  function tOf(age){ var d=new Date(Date.now()-age*1000); return ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2); }
  function rxOf(a){
    var age=a[7], ground=a[3]<0||(a[3]<=150&&a[4]<80), d=km(a[1],a[2]);
    if(age<=90) return {k:'on',t:'雷達開啟中',c:'開啟中'};
    if(ground&&d<5&&a[4]<5) return DEP?{k:'off',t:'雷達未開 '+tOf(age)+' 後沒訊號',c:'未開啟'}:{k:'off',t:'雷達已關閉 '+tOf(age),c:'已關閉'};
    return {k:'lost',t:'訊號中斷 '+tOf(age),c:'中斷'};
  }
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
      /* 停著不動時訊號斷掉＝關機；還在滑行就斷訊＝接收站沒收到（地面常漏），不能當成關機 */
      if(age>120) return (d<4&&gs<5)?{k:'off',t:'已停機',s:Math.round(age/60)+' 分前',d:d}:(d<5?{k:'taxi',t:'滑行中',s:'訊號斷了，最後 '+gs+' 節',d:d}:{k:'lost',t:'訊號消失',s:Math.round(age/60)+' 分前',d:d});
      if(gs>=40) return {k:'land',t:'已落地',s:'減速中 '+gs+' 節',d:d};
      if(gs>=4) return {k:'taxi',t:'滑行中',s:gs+' 節',d:d};
      return {k:'park',t:'已停妥',s:'停在地面',d:d};
    }
    /* 低空進場時訊號斷掉（接收站收不到跑道附近）：多半已經落地 */
    if(age>90&&alt<4000&&d<30) return {k:'land',t:'應已落地',s:'落地前訊號就斷了',d:d};
    if(age>300) return {k:'lost',t:'訊號消失',s:Math.round(age/60)+' 分前，最後在距桃園 '+Math.round(d)+' 公里',d:d};
    var eta=Math.max(1,Math.round(d/(Math.max(gs,140)*1.852)*60+(alt>10000?4:1)));
    if(alt<10000) return {k:'app',t:'進場中',s:n0(alt)+' 呎・距 '+Math.round(d)+' 公里・約 '+eta+' 分落地',d:d,eta:eta};
    return {k:'enr',t:'航路中',s:'距 '+Math.round(d)+' 公里・約 '+eta+' 分落地',d:d,eta:eta};
  }
  function load(){
    if(busy||D.hidden) return; busy=true;
    var ac=W.AbortController?new AbortController():null, tm=setTimeout(function(){ if(ac) ac.abort(); },8000);
    fetch(RADAR_URL,{cache:'no-store',signal:ac?ac.signal:undefined}).then(function(r){ return r.json(); }).then(function(j){
      if(j.t&&j.t===JT) return;                       /* 中繼還是同一份（15 秒共用），不用重畫 */
      JT=j.t||0; var sk=Date.now()-(j.t||Date.now()); if(OFF===null||sk<OFF) OFF=sk;   /* 手機跟伺服器的時間差，取看過最小的 */
      var m={}; (j.a||[]).forEach(function(a){ m[a[0]]=a;
        if(a[7]<60){ var h=hist[a[0]]||(hist[a[0]]=[]), l=h[h.length-1]; if(!l||l[0]!==a[1]||l[1]!==a[2]){ h.push([a[1],a[2]]); if(h.length>80) h.shift(); } } });
      R=m; RT=(j.t||Date.now())+OFF; paintCards(); if(mapEl&&!mapEl.hidden) paintMap();
    })['catch'](function(){}).then(function(){ clearTimeout(tm); busy=false; });
  }
  /* 卡片：照班號找呼號，加一行 */
  function rowsInfo(){ return [].map.call(D.querySelectorAll('#out .r:not(.head)'),function(r){
      var b=r.querySelector('.c-fno b'), t=r.querySelector('.c-time b'), tg=r.querySelector('.c-shop .tag');
      var code=b?String(b.textContent).trim().split(/\s/)[0]:'', gn=r.querySelector('.gn'), cn=r.querySelector('.c-city .cn');
      return {r:r,code:code,cs:csOf(code),t:t?t.textContent.trim():'',tag:tg?tg.textContent.trim():'',gate:gn?gn.textContent.trim():'',city:cn?cn.textContent.trim():''}; }); }
  function plausible(x,a){
    /* 同呼號可能是別趟（例如早上那班停著）：班機還要 90 分以上才到，但雷達顯示已停在地面 → 不採用 */
    if(a[7]>2700) return false;                      /* 45 分鐘沒訊號的就不顯示了 */
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
      var rx=rxOf(a), h='<svg class="ic" viewBox="0 0 24 24"><use href="#i-signal"/></svg><b>'+s.t+'</b><span>'+s.s+'</span><i class="rx rx-'+rx.k+'">'+rx.t+'</i><span class="go">地圖 ›</span>';
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
  /* 機場座標：u＝沿跑道方向（往東北為正）、v＝垂直跑道（往東南為正），單位公尺 */
  var HDG=49.3*Math.PI/180;
  function UV(u,v){ var n=u*Math.cos(HDG)-v*Math.sin(HDG), e=u*Math.sin(HDG)+v*Math.cos(HDG); return off(TPE,n,e); }
  function box(u0,u1,v0,v1){ return [UV(u0,v0),UV(u1,v0),UV(u1,v1),UV(u0,v1)]; }
  function lbl(ll,cls,txt,st){ return L.marker(ll,{icon:L.divIcon({className:'',iconSize:[0,0],html:'<div class="'+cls+'"'+(st?' style="'+st+'"':'')+'>'+txt+'</div>'}),interactive:false,keyboard:false}).addTo(map); }
  function drawBase(){
    mapEl.querySelector('.rm-m').style.background='#07040e';
    var NI={interactive:false};
    function P(ll,o){ for(var k in NI) o[k]=NI[k]; return L.polygon(ll,o).addTo(map); }
    function Ln(ll,o){ for(var k in NI) o[k]=NI[k]; return L.polyline(ll,o).addTo(map); }
    fetch('img/radar-map.json').then(function(r){ return r.json(); }).then(function(m){
      (m.land||[]).forEach(function(ring){ P(ring,{stroke:true,color:'#00f0ff',weight:1.6,fillColor:'#140b2a',fillOpacity:.92,className:'rg-coast'}); });
      (m.coast||[]).forEach(function(ln){ Ln(ln,{color:'#00f0ff',weight:1.4,opacity:.7,className:'rg-coast'}); });
      (m.urban||[]).forEach(function(ring){ P(ring,{stroke:false,fillColor:'#6a3fb8',fillOpacity:.38}); });                 /* 市區 */
      (m.admin||[]).forEach(function(ln){ Ln(ln,{color:'#7f8cff',weight:1,opacity:.45,dashArray:'2 5'}); });                  /* 縣市界 */
      (m.rails||[]).forEach(function(ln){ Ln(ln,{color:'#8CF23A',weight:1.2,opacity:.55,dashArray:'6 4'}); });                /* 鐵路 */
      (m.roads||[]).forEach(function(r){ Ln(r[1],{color:'#ff9f1c',weight:r[0]?2.2:1.1,opacity:r[0]?.85:.5,className:r[0]?'rg-road':''}); });   /* 國道、省道 */
      [10,30,60,100].forEach(function(k){ L.circle(TPE,{radius:k*1000,color:'#ff2a6d',weight:1.2,opacity:.6,dashArray:'6 8',fill:false,interactive:false,className:'rg-ring'}).addTo(map);
        lbl(off(TPE,k*1000,0),'rk'+(k>=60?' rkf':''),k+' 公里'); });
      (m.cities||[]).forEach(function(c){ lbl([c[1],c[2]],'rc rc'+(c[3]||2),c[0]); });
      var rw=m.rw||[];
      /* 進場線：兩條跑道往兩頭各延伸 20 公里，每 5 公里一個刻度，看得出飛機有沒有對準跑道 */
      rw.forEach(function(r){ var a=r[1], b=r[2], dn=(b[0]-a[0])*111320, de=(b[1]-a[1])*111320*Math.cos(a[0]*Math.PI/180), Lm=Math.sqrt(dn*dn+de*de), un=dn/Lm, ue=de/Lm;
        [[a,-1],[b,1]].forEach(function(x){ Ln([x[0],off(x[0],un*20000*x[1],ue*20000*x[1])],{color:'#f5ee0b',weight:1,opacity:.5,dashArray:'3 7'});
          [5,10,15,20].forEach(function(k){ var c=off(x[0],un*k*1000*x[1],ue*k*1000*x[1]); Ln([off(c,-ue*350,un*350),off(c,ue*350,-un*350)],{color:'#f5ee0b',weight:1,opacity:.6}); }); }); });
      /* 機場示意（自己畫的，位置是大概的）：停機坪、滑行道、航廈、A／B／C／D 候機廊 */
      P(box(-1050,1100,-420,520),{stroke:true,color:'#7B78FF',weight:1,fillColor:'#1d1438',fillOpacity:.9});
      Ln([UV(-1650,-520),UV(2030,-520)],{color:'#8d99a9',weight:1.5,opacity:.7}); Ln([UV(-1940,610),UV(1880,610)],{color:'#8d99a9',weight:1.5,opacity:.7});
      [[-900,-520,-710],[0,-520,-710],[1000,-520,-710],[1900,-520,-710],[-1800,610,800],[-900,610,800],[0,610,800],[1000,610,800],[1750,610,800],[-1050,-520,-420],[1100,-520,-420],[-1050,520,610],[1100,520,610]].forEach(function(t){
        Ln([UV(t[0],t[1]),UV(t[0],t[2])],{color:'#8d99a9',weight:1.2,opacity:.6}); });
      P(box(-430,-70,-25,115),{stroke:true,color:'#00f0ff',weight:1.2,fillColor:'#0f3a44',fillOpacity:.95});     /* 第二航廈 */
      P(box(400,650,-15,105),{stroke:true,color:'#00f0ff',weight:1.2,fillColor:'#0f3a44',fillOpacity:.95});      /* 第一航廈 */
      [[250,900,-100,-62,'A'],[-720,150,-100,-62,'D'],[250,900,152,190,'B'],[-720,150,152,190,'C']].forEach(function(c){
        P(box(c[0],c[1],c[2],c[3]),{stroke:true,color:'#ff2a6d',weight:1,fillColor:'#4a1230',fillOpacity:.95});
        lbl(UV((c[0]+c[1])/2,c[2]<0?-230:320),'rz',c[4]+' 區'); });
      [[-150,45,-75,-62],[-150,45,115,152],[525,45,-62,-15],[525,45,105,152]].forEach(function(c){ P(box(c[0]-25,c[0]+25,c[2],c[3]),{stroke:false,fillColor:'#0f3a44',fillOpacity:.95}); });
      lbl(UV(-250,45),'rt','T2'); lbl(UV(525,45),'rt','T1');
      rw.forEach(function(r){ P(strip(r[1],r[2],60),{stroke:true,color:'#f5ee0b',weight:1.5,fillColor:'#fff7b0',fillOpacity:1,className:'rg-rwy'});
        var n=r[0].split('/'), dn=r[2][0]-r[1][0], de=r[2][1]-r[1][1]; lbl([r[1][0]-dn*.06,r[1][1]-de*.06],'rk rkw rkr',n[0]); lbl([r[2][0]+dn*.06,r[2][1]+de*.06],'rk rkw rkr',n[1]); });
      lbl(UV(0,-880),'rk rkw rkn','北跑道'); lbl(UV(0,960),'rk rkw rkn','南跑道');
      map.attributionControl.addAttribution('自繪｜Natural Earth・OurAirports・adsb.lol');
      trail&&trail.bringToFront();
    })['catch'](function(){});
  }
  function openMap(cs){
    var all=!cs; sel=cs||''; follow=!!cs;
    if(!mapEl){
      mapEl=D.createElement('div'); mapEl.id='rmap';
      mapEl.innerHTML='<div class="rm-h"><b>雷達</b><small>ADS-B 即時位置<i class="rm-live"></i></small><button type="button" class="rm-x">關閉 ✕</button></div><div class="rm-m"></div><div class="rm-g"><i style="background:#00f0ff"></i>2140<i style="background:#ff2a6d"></i>2153<i style="background:#ffd84a"></i>其他<i class="ln" style="background:#ff9f1c"></i>國道<i class="ln" style="background:#8CF23A"></i>鐵路<i class="ln" style="background:#f5ee0b"></i>進場線</div><div class="rm-i" hidden></div>';
      ['pointerdown','touchstart'].forEach(function(ev){ mapEl.querySelector('.rm-i').addEventListener(ev,function(){ this.__hold=Date.now()+1200; },{passive:true}); });
      mapEl.querySelector('.rm-i').addEventListener('click',function(e){ this.__hold=0; var r=e.target.closest('[data-cs]'); if(!r) return; sel=r.dataset.cs; follow=!!sel; paintMap(!!sel); if(!sel) map.setView(TPE,10); });
      D.body.appendChild(mapEl);
      mapEl.querySelector('.rm-x').onclick=function(){ mapEl.hidden=true; if(raf){ cancelAnimationFrame(raf); raf=0; } };
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
      map.on('click',function(){ sel=''; follow=false; paintMap(); });
      map.on('dragstart',function(){ follow=false; });          /* 自己拖地圖就不再自動跟著飛機 */
      var zf=function(){ var z=map.getZoom(), c=map.getContainer().classList; c.toggle('zfar',z<9); c.toggle('zmid',z<14); c.toggle('znear',z>=13); }; map.on('zoomend',zf); zf();
      trail=L.polyline([],{color:'#ffffff',weight:2,opacity:.85,interactive:false,className:'rg-trail'}).addTo(map);
      L.marker(TPE,{icon:L.divIcon({className:'',iconSize:[0,0],html:'<div class="rl rls rtpe" style="top:-34px;background:#00efd4;color:#00202a">桃園 TPE</div>'}),interactive:false}).addTo(map);
    }
    setTimeout(function(){ map.invalidateSize(); if(all) map.setView(TPE,10); paintMap(!all); },50);
  }
  /* 動態：照最後收到的速度、航向把飛機往前推（新資料來了再滑順修正），所以飛機會一直動，不是 15 秒跳一格 */
  function live(a,now){
    var age=a[7]+(now-RT)/1000, ground=a[3]<0||(a[3]<=150&&a[4]<80), o={lat:a[1],lon:a[2],alt:a[3],age:age};
    if(a[7]>45||a[4]<3) return o;                                   /* 舊訊號、停著的：不推 */
    var cap=ground?(a[4]>=40?8:15):(a[3]<2000?25:75);               /* 快落地、落地滑跑、滑行：少推一點免得衝出跑道 */
    var dt=Math.max(0,Math.min(age,cap)), m=a[4]*0.5144*dt, r=Math.PI/180, th=(a[5]||0)*r;
    o.lat=a[1]+m*Math.cos(th)/111320; o.lon=a[2]+m*Math.sin(th)/(111320*Math.cos(a[1]*r));
    if(!ground&&a[6]) o.alt=Math.max(50,Math.round((a[3]+a[6]*dt/60)/25)*25);
    return o;
  }
  function tick(ts){
    if(!mapEl||mapEl.hidden){ raf=0; return; }
    raf=requestAnimationFrame(tick);
    if(!map||ts-lastTick<66||map._animatingZoom) return; lastTick=ts;
    var now=Date.now();
    Object.keys(marks).forEach(function(cs){ var a=R[cs]; if(!a) return; var p=live(a,now), d=disp[cs];
      if(!d) d=disp[cs]=[p.lat,p.lon]; else { d[0]+=(p.lat-d[0])*.2; d[1]+=(p.lon-d[1])*.2; }
      marks[cs].setLatLng(d); });
    var d=sel&&disp[sel];
    if(trail){ if(d&&R[sel]&&R[sel][7]<120) trail.setLatLngs((hist[sel]||[]).concat([[d[0],d[1]]])); else trail.setLatLngs([]); }
    if(d&&follow&&now>panUntil){ var pt=map.latLngToContainerPoint(d), sz=map.getSize();
      if(pt.x<sz.x*.2||pt.x>sz.x*.8||pt.y<sz.y*.2||pt.y>sz.y*.8){ map.panTo(d,{animate:true,duration:.8}); panUntil=now+1500; } }
    if(now-lastBox>1000){ lastBox=now; paintBox(); }
  }
  function startTick(){ if(!raf&&W.requestAnimationFrame) raf=requestAnimationFrame(tick); }
  function paintMap(fly){
    if(!map) return;
    var keep={}, RI=rowsInfo(), now=Date.now();
    Object.keys(R).forEach(function(cs){ var a=R[cs]; if(a[7]>1800) return;   /* 半小時以上沒訊號的不畫 */
      keep[cs]=1; var on=cs===sel, c=colorOf(cs);
      var lab=RI.filter(function(x){ return x.cs===cs; })[0];
      var html='<div class="rp'+(on?' sel':'')+'" style="color:'+(on?'#ffffff':c)+';transform:rotate('+(a[5]||0)+'deg)">'+plane(on?'#ffffff':c)+'</div>'+(lab||on?'<div class="rl'+(on?' rls':'')+'">'+(lab?iataShort(lab.code)+(lab.gate?'<i>'+lab.gate+'</i>':''):cs)+'</div>':'');
      var op=a[7]>120?.45:1;
      if(!marks[cs]){ var p=live(a,now); disp[cs]=[p.lat,p.lon];
        marks[cs]=L.marker(disp[cs],{icon:L.divIcon({className:'',html:html,iconSize:[0,0]}),opacity:op}).addTo(map); marks[cs].__h=html;
        marks[cs].on('click',function(e){ L.DomEvent.stopPropagation(e); sel=cs; follow=true; paintMap(); }); }
      else { if(marks[cs].__h!==html){ marks[cs].setIcon(L.divIcon({className:'',html:html,iconSize:[0,0]})); marks[cs].__h=html; } marks[cs].setOpacity(op); }
      marks[cs].setZIndexOffset(on?1000:0);
    });
    Object.keys(marks).forEach(function(cs){ if(!keep[cs]){ map.removeLayer(marks[cs]); delete marks[cs]; delete disp[cs]; } });
    paintBox();
    var a=sel&&R[sel]; if(fly&&a){ var q=live(a,now); map.setView([q.lat,q.lon],a[3]<0?14:10); }
    startTick();
  }
  /* 下面那塊資訊：每秒照推算的位置、高度更新，距離和「約幾分落地」會自己倒數 */
  function liveArr(cs,now){ var a=R[cs], p=live(a,now), d=disp[cs]||[p.lat,p.lon], b=a.slice(); b[1]=d[0]; b[2]=d[1]; if(a[3]>=0) b[3]=p.alt; b[7]=Math.max(0,Math.round(p.age)); return b; }
  function paintBox(){
    var box=mapEl.querySelector('.rm-i'), a=sel&&R[sel], now=Date.now(), h='';
    if(a){
      var b=liveArr(sel,now), s=stOf(b), rx=rxOf(b), lab=rowsInfo().filter(function(x){ return x.cs===sel; })[0], code=lab?lab.code:sel;
      h='<div class="t1"><b>'+code+'</b><span style="color:'+colorOf(sel)+'">'+s.t+'</span>'+(lab?'<span class="tg" style="background:'+colorOf(sel)+'">'+lab.tag+'</span>':'')+'<a class="bk" data-cs="">‹ 全部班機</a></div>'
        +(lab?'<div class="t2">'+(lab.gate?'登機門 <b>'+lab.gate+'</b>　':'')+(lab.city?lab.city+'　':'')+(DEP?'起飛 ':'抵達 ')+'<b>'+lab.t+'</b></div>':'')
        +'<div class="g"><div><small>高度</small><i>'+(b[3]<0?'地面':n0(b[3])+' 呎')+'</i></div><div><small>速度</small><i>'+a[4]+' 節</i></div>'
        +'<div><small>距桃園</small><i>'+(s.d<10?s.d.toFixed(1):Math.round(s.d))+' 公里</i></div><div class="rxc rx-'+rx.k+'"><small>雷達</small><i>'+rx.c+'</i></div></div>'
        +'<div class="t3">最後訊號 '+tOf(b[7])+'（'+(b[7]<60?b[7]+' 秒前':Math.round(b[7]/60)+' 分前')+'）・'+s.s+(a[6]&&a[3]>=0&&Math.abs(a[6])>=200?'・'+(a[6]<0?'下降':'爬升')+' '+n0(Math.abs(a[6]))+' 呎/分':'')+'・航向 '+(a[5]||0)+'°'+(a[9]?'・'+a[9]:'')+(a[8]?'・'+a[8]:'')+'</div>';
    } else {
      /* 沒選飛機：列出看板上雷達找得到的班機，照快到的排，點了就看那班 */
      var L2=rowsInfo().filter(function(x){ return x.cs&&R[x.cs]&&plausible(x,R[x.cs]); }).map(function(x){ var b=liveArr(x.cs,now), s=stOf(b); return {x:x,s:s,rx:rxOf(b),o:(s.eta!=null?s.eta:500+b[7]/60)}; });   /* 還在飛的照快到的排前面，落地的排後面 */
      L2.sort(function(p,q){ return p.o-q.o; });
      h='<div class="lh">看板上的班機（雷達找得到 '+L2.length+' 班）<small>點一班看位置</small></div><div class="ll">'
        +(L2.length?L2.slice(0,12).map(function(y){ var x=y.x; return '<div class="li" data-cs="'+x.cs+'"><span class="tg" style="background:'+colorOf(x.cs)+'">'+x.tag+'</span><b>'+iataShort(x.code)+'</b><span class="gt">'+(x.gate||'—')+'</span><span class="st k-'+y.s.k+'">'+y.s.t+'</span><span class="ds">'+(y.s.eta!=null?'約 '+y.s.eta+' 分・'+Math.round(y.s.d)+' 公里':'<i class="rx rx-'+y.rx.k+'">'+y.rx.t+'</i>')+'</span></div>'; }).join('')
          :'<div class="li none">目前雷達上沒有看板裡的班機（還沒飛進 185 公里內，或已經關機）</div>')+'</div>';
    }
    h+='<div class="rm-src">飛機位置：adsb.lol（志工接收站，地面訊號可能缺漏）・兩次訊號之間的位置是推算的</div>';
    if(box.__hold&&Date.now()<box.__hold) return;        /* 手指正按在清單上：先不重畫，免得點不到 */
    if(box.__h!==h){ var sc=(box.querySelector('.ll')||{}).scrollTop||0; box.innerHTML=h; box.__h=h; var l2=box.querySelector('.ll'); if(l2) l2.scrollTop=sc; }
    var kind=a?'s':'l'; if(box.hidden||box.__k!==kind){ box.hidden=false; box.__k=kind; setTimeout(function(){ map.invalidateSize(); },0); }
  }
  W.radarOpen=openMap;
  /* 上面那排加一顆「雷達」 */
  var w=setInterval(function(){ var dk=D.getElementById('dock'); if(!dk) return; clearInterval(w);
    if(!dk.querySelector('[data-k="radar"]')){ var b=D.createElement('button'); b.type='button'; b.dataset.k='radar'; b.innerHTML='<b>雷達</b><small>地圖</small>';
      b.addEventListener('click',function(e){ e.stopPropagation(); openMap(''); },true); dk.appendChild(b); dk.style.gridTemplateColumns='repeat(6,minmax(0,1fr))'; }
  },150);
  var w2=setInterval(function(){ if(typeof W.render!=='function') return; clearInterval(w2);
    var _r=W.render; W.render=function(){ var x=_r.apply(this,arguments); try{ paintCards(); }catch(e){} return x; }; load(); },100);
  /* 地圖開著每 5 秒問一次（中繼 15 秒才換新的，多問不會多抓）；沒開地圖 20 秒一次 */
  setInterval(function(){ var open=mapEl&&!mapEl.hidden; if(open||Date.now()-LT>19000){ LT=Date.now(); load(); } },5000);
  D.addEventListener('visibilitychange',function(){ if(!D.hidden) load(); });
})();
</script>
