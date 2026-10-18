<style>
/* ══ 10/17e 版面精簡：手機上讓班機早一點出現。入境頁、出境頁共用 ══ */
/* 招牌變矮：霓虹框一樣在，高度從 122 降到 76 */
html:is(.arr,.dep) body:not(.mkslim) .mk{min-height:76px!important;padding:14px 14px 12px!important}
html:is(.arr,.dep) body:not(.mkslim) .mk b{font-size:26px!important;line-height:1.15}
html:is(.arr,.dep) body:not(.mkslim) .mk i{font-size:12.5px!important;margin-top:2px!important}
@media (min-width:821px){html:is(.arr,.dep) body:not(.mkslim) .mk{min-height:110px!important}html:is(.arr,.dep) body:not(.mkslim) .mk b{font-size:34px!important}}
/* 資訊卡：「接下來 1 小時」「還有幾班」「已到幾班」一直看得到；人數統計、每小時長條收進「更多」 */
#infobox.ibfold #offnote,#infobox.ibfold #immnote,#infobox.ibfold #holnote,#infobox.ibfold #hourbar{display:none!important}
#ibmore{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;margin-top:8px;padding:8px 12px;min-height:40px;
  font:inherit;font-size:13.5px;font-weight:900;color:#b9aed6;background:rgba(26,16,48,.7);border:1px dashed rgba(0,240,255,.35);cursor:pointer;text-align:left}
#ibmore b{color:#00f0ff;font-size:13px;white-space:nowrap}
#ibmore span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#remain{padding:7px 12px!important}
#nextnote .nn{padding:6px 12px 6px 14px!important}
#nextnote .nn b{font-size:27px!important}
</style>
<script>
(function(){
  var D=document, KEY='ibOpen1';
  function open(){ try{ return localStorage.getItem(KEY)==='1'; }catch(e){ return false; } }
  function paint(){
    var ib=D.getElementById('infobox'); if(!ib) return false;
    var b=D.getElementById('ibmore');
    if(!b){ b=D.createElement('button'); b.type='button'; b.id='ibmore';
      b.onclick=function(){ var v=!open(); try{ localStorage.setItem(KEY,v?'1':'0'); }catch(e){} paint(); };
    }
    if(b.parentNode!==ib||b.nextSibling) ib.appendChild(b);       /* 永遠放最後一行 */
    var o=open(), dep=/出境/.test(D.title);
    var has=['offnote','immnote','holnote','hourbar'].some(function(id){ var e=D.getElementById(id); return e&&e.parentNode===ib&&e.innerHTML.trim(); });
    b.style.display=has?'':'none';
    ib.classList.toggle('ibfold',!o);
    b.innerHTML='<span>'+(o?'收起人數統計':'更多：今天'+(dep?'出境':'入境')+'人數、每小時長條')+'</span><b>'+(o?'收起 ▴':'展開 ▾')+'</b>';
    return true;
  }
  var wait=setInterval(function(){
    if(typeof window.render!=='function'||!paint()) return; clearInterval(wait);
    var _r=window.render;
    window.render=function(){ var x=_r.apply(this,arguments); try{ paint(); }catch(e){} return x; };
  },100);
})();
</script>
