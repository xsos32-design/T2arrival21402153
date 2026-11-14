<!-- 11/14：手錶雷達（tools/radar-w.js）：每班下面一行雷達狀態。資料：adsb.lol（ODbL） -->
<style>
.rdr{display:flex;align-items:center;gap:5px;margin:-3px 2px 6px 6px;padding:3px 7px;font-size:12.5px;font-weight:800;
  color:#c3cad4;background:rgba(10,14,22,.85);border:1px solid #2a3545;border-top:0;white-space:nowrap;overflow:hidden;text-decoration:none}
.rx{font-style:normal;font-size:11px;font-weight:900;padding:0 4px;margin-left:auto;white-space:nowrap;border:1px solid currentColor;flex:0 0 auto}
.rx-on{color:#8CF23A} .rx-off{color:#07040e;background:#8CF23A;border-color:#8CF23A} .rx-off2{color:#8CF23A;border-style:dashed} .rx-lost{color:#ffc53d}
.rdr b{font-weight:900;flex:0 0 auto} .rdr span{overflow:hidden;text-overflow:ellipsis}
.rdr.k-app{color:#ffd84a;border-color:#7a5c12} .rdr.k-land{color:#00f0ff} .rdr.k-taxi{color:#7ab8ff}
.rdr.k-park,.rdr.k-off{color:#8CF23A} .rdr.k-enr,.rdr.k-lost{color:#9fb3be}
@media (min-width:300px){ .rdr{font-size:15px;padding:4px 9px} }
</style>
<script>
(function(){
  var D=document, W=window, DEP=false;
  var RADAR_URL='https://tpe-board.xsos32.workers.dev/radar', TPE=[25.0777,121.2328];
  var ICAO={BR:'EVA',CI:'CAL',JX:'SJX',B7:'UIA',AE:'MDA',IT:'TTW',CX:'CPA',UO:'HKE',HX:'CRK',NX:'AMU',CA:'CCA',MU:'CES',CZ:'CSN',FM:'CSH',HO:'DKH',
    MF:'CXA',ZH:'CSZ',SC:'CDG','3U':'CSC',HU:'CHH',JD:'CBJ',GS:'GCR',KN:'CUA',KE:'KAL',OZ:'AAR','7C':'JJA',LJ:'JNA',TW:'TWB',ZE:'ESR',BX:'ABL',RS:'ASV',
    JL:'JAL',NH:'ANA',MM:'APJ',GK:'JJP',BC:'SKY','7G':'SFJ',TR:'TGW',SQ:'SIA',MH:'MAS',AK:'AXM',D7:'XAX',TG:'THA',FD:'AIQ',VZ:'TVJ',SL:'TLM',WE:'THD',
    VN:'HVN',VJ:'VJC',QH:'BAV',PR:'PAL','5J':'CEB',Z2:'APG',DG:'SRQ',GA:'GIA',KL:'KLM',LH:'DLH',TK:'THY',EK:'UAE',QR:'QTR',EY:'ETD',NZ:'ANZ',QF:'QFA',
    UA:'UAL',DL:'DAL',AA:'AAL',AC:'ACA',AS:'ASA',OD:'MXD',ZG:'TZP',OM:'MGL',BI:'RBA',HY:'UZB',AI:'AIC','6E':'IGO',UL:'ALK',PG:'BKP',DD:'NOK',XJ:'TAX',
    '8L':'LKE',BL:'PIC',VU:'VAG',DZ:'EPA',TV:'TBA',RF:'EOK',YP:'APZ',IJ:'SJO',MP:'MPH',CV:'CLX','5X':'UPS',FX:'FDX',CK:'CKK',PO:'PAC',K4:'CKS'};
  var R={}, busy=false;
  function csOf(code){ var m=String(code||'').toUpperCase().replace(/\s/g,'').match(/^([A-Z0-9]{2})0*(\d{1,4})([A-Z]?)$/); if(!m||!ICAO[m[1]]) return ''; return ICAO[m[1]]+m[2]+m[3]; }
  function iataShort(code){ var m=String(code||'').toUpperCase().match(/^([A-Z0-9]{2})0*(\d{1,4}[A-Z]?)$/); return m?m[1]+m[2]:code; }
  function km(la,lo){ var r=Math.PI/180, dl=(la-TPE[0])*r, dn=(lo-TPE[1])*r, a=Math.sin(dl/2)*Math.sin(dl/2)+Math.cos(TPE[0]*r)*Math.cos(la*r)*Math.sin(dn/2)*Math.sin(dn/2); return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)); }
  function n0(x){ return Math.round(x).toLocaleString(); }
  /* 狀態判斷 */
  /* 雷達（飛機自己的發報機）開著還是關了：90 秒內有訊號＝開啟；停在機場地面後訊號斷掉＝已關閉；其他＝訊號中斷 */
  function tOf(age){ var d=new Date(Date.now()-age*1000); return ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2); }
  /* 實測（11/14 傍晚 18 班）：訊號斷掉有 10 班是落地前低空就斷、5 班是滑行中斷、只有 3 班是停好才斷。
     所以「斷訊」不能直接當成關雷達。分三種：
       看到它停好才沒訊號            → 雷達已關閉 HH:MM（實際看到的）
       沒看到，但桃機已經標「抵達」   → 雷達應已關閉（照機場資料推的，不寫時間）
       其他                          → 斷訊 HH:MM */
  function rxOf(a,done){
    var age=a[7], ground=a[3]<0||(a[3]<=150&&a[4]<80), d=km(a[1],a[2]);
    if(age<=90) return {k:'on',t:'雷達開啟中',c:'開啟中'};
    if(ground&&d<5&&a[4]<5) return DEP?{k:'off',t:'雷達未開 '+tOf(age)+' 後沒訊號',c:'未開啟'}:{k:'off',t:'雷達已關閉 '+tOf(age),c:'已關閉'};
    if(done&&!DEP&&age>180) return {k:'off2',t:'雷達應已關閉（桃機已標抵達）',c:'應已關閉',m:'雷達應已關'};
    return {k:'lost',t:'訊號中斷 '+tOf(age),c:'中斷'};
  }
  function stFix(s,rx,b){ return rx.k==='off2'?{k:'off',t:'已抵達',s:'桃機已標抵達・最後訊號 '+tOf(b[7]),c:'最後訊號 '+tOf(b[7]),d:s.d}:s; }
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
  function plausible(x,a){
    /* 同呼號可能是別趟（例如早上那班停著）：班機還要 90 分以上才到，但雷達顯示已停在地面 → 不採用 */
    if(a[7]>2700) return false;
    var m=String(x.t).match(/(\d\d):(\d\d)/); if(!m) return true;
    var d=new Date(), eta=(+m[1])*60+(+m[2])-(d.getHours()*60+d.getMinutes()); if(eta<-720) eta+=1440;
    var ground=a[3]<0||(a[3]<=150&&a[4]<80);
    if(DEP){ if(!ground&&eta>30) return false; if(eta<-120) return false; return true; }
    if(ground&&eta>90) return false;
    if(!ground&&eta<-180) return false;
    return true;
  }
  function load(){
    if(busy||D.hidden) return; busy=true;
    var ac=W.AbortController?new AbortController():null, tm=setTimeout(function(){ if(ac) ac.abort(); },8000);
    fetch(RADAR_URL,{cache:'no-store',signal:ac?ac.signal:undefined}).then(function(r){ return r.json(); }).then(function(j){
      var m={}; (j.a||[]).forEach(function(a){ m[a[0]]=a; }); R=m; paint();
    })['catch'](function(){}).then(function(){ clearTimeout(tm); busy=false; });
  }
  function short(t){ return String(t).replace(/距 /g,'').replace(/距桃園 /g,'').replace(/ 公里/g,'km').replace(/約 /g,'').replace(/ 分落地/g,'分落地').replace(/ 分前/g,'分前').replace(/ 呎/g,'呎').replace(/ 節/g,'節'); }
  function paint(){
    var list=D.getElementById('list'); if(!list) return;
    [].forEach.call(list.querySelectorAll(':scope > .rdr'),function(e){ e.remove(); });
    [].forEach.call(list.querySelectorAll('.r'),function(r){
      var fe=r.querySelector('.f'), te=r.querySelector('.t'); if(!fe) return;
      var code=String((fe.firstChild&&fe.firstChild.nodeType===3?fe.firstChild.nodeValue:fe.textContent)||'').trim().split(/\s/)[0], x={code:code,cs:csOf(code),t:te?te.textContent:''};
      var a=x.cs&&R[x.cs]; if(!a||!plausible(x,a)) return;
      var rx=rxOf(a,r.classList.contains('done')), s=stFix(stOf(a),rx,a), el=D.createElement('div');
      el.className='rdr k-'+s.k;
      el.innerHTML='<b>'+s.t+'</b><span>'+(rx.k==='on'?short(s.s):'')+'</span><i class="rx rx-'+rx.k+'">'+(rx.k==='on'?'雷達開':rx.t.replace('雷達已關閉 ','雷達關 ').replace('訊號中斷 ','斷訊 ').replace('雷達應已關閉（桃機已標抵達）','雷達應已關'))+'</i>';
      r.parentNode.insertBefore(el,r.nextSibling);
    });
  }
  var w=setInterval(function(){ if(typeof W.render!=='function') return; clearInterval(w);
    var _r=W.render; W.render=function(){ var x=_r.apply(this,arguments); try{ paint(); }catch(e){} return x; }; load(); },100);
  setInterval(load,20000);
  D.addEventListener('visibilitychange',function(){ if(!D.hidden) load(); });
})();
</script>
