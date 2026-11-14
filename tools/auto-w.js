<!-- 11/14：手錶自動更新（tools/auto-w.js）：螢幕亮著每 60 秒自己抓一次；手指在滑的時候先不動 -->
<script>
(function(){
  var D=document, W=window, EVERY=60000, last=Date.now(), touch=0;
  ['touchstart','touchmove','scroll'].forEach(function(ev){ W.addEventListener(ev,function(){ touch=Date.now(); },{passive:true,capture:true}); });
  function go(){ if(D.hidden||Date.now()-touch<4000) return; try{ if(typeof dayOff!=='undefined'&&dayOff!==0) return; }catch(e){}
    last=Date.now(); try{ load(false); }catch(e){} }
  setInterval(function(){ if(Date.now()-last>=EVERY) go(); },5000);
  D.addEventListener('visibilitychange',function(){ if(!D.hidden&&Date.now()-last>=EVERY) setTimeout(go,400); });
})();
</script>
