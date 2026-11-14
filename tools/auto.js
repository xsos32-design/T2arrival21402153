<!-- 11/14：自動更新（tools/auto.js）：畫面開著每 60 秒自己抓一次最新班機；切回來超過 60 秒也馬上抓。打字、捲動、開著地圖時先不動 -->
<style>
html.autoref #dot{animation:autodot 1.6s ease-in-out infinite} @keyframes autodot{50%{opacity:.3}}
</style>
<script>
(function(){
  var D=document, W=window, EVERY=60000, last=Date.now(), touch=0, busyUntil=0;
  ['touchstart','touchmove','wheel','scroll','keydown'].forEach(function(ev){ W.addEventListener(ev,function(){ touch=Date.now(); },{passive:true,capture:true}); });
  function p2(n){ return (n<10?'0':'')+n; }
  function onToday(){ if(W.CUST) return true; try{ if(typeof now6Mode!=='undefined'&&now6Mode) return true; }catch(e){}
    var el=D.getElementById('date'), d=new Date(); return !el||!el.value||el.value===d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate()); }
  function ok(){
    if(D.hidden||Date.now()<busyUntil||!onToday()) return false;
    var ae=D.activeElement; if(ae&&/^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName)) return false;   /* 正在打字、選日期 */
    var m=D.getElementById('rmap'); if(m&&!m.hidden) return false;                               /* 地圖開著 */
    if(D.querySelector('.rpt,.mt')&&D.querySelector('.mt')&&D.querySelector('.mt').offsetParent) return false;   /* 正在看開會時間表 */
    if(Date.now()-touch<4000) return false;                                                      /* 手指還在滑 */
    return true;
  }
  function go(){ if(!ok()) return; busyUntil=Date.now()+12000; last=Date.now();
    try{ ((typeof now6Mode!=='undefined'&&now6Mode)?runNow6:run)(); }catch(e){} }
  var w=setInterval(function(){ if(typeof W.render!=='function'||typeof W.run!=='function') return; clearInterval(w);
    var _r=W.render; W.render=function(){ last=Date.now(); busyUntil=0; return _r.apply(this,arguments); };   /* 自己按更新也算，重新計時 */
    D.documentElement.classList.add('autoref');
    setInterval(function(){ if(Date.now()-last>=EVERY) go(); },5000);
    D.addEventListener('visibilitychange',function(){ if(!D.hidden&&Date.now()-last>=EVERY) setTimeout(go,400); });
  },200);
})();
</script>
