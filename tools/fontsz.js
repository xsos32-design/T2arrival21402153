<!-- 11/12：字體大小改成五段（tools/fontsz.js）：原本的「大字」鍵改成「字體」選單 小／標準／大／特大／超大，記在這台裝置 -->
<style>
/* 小：整份清單縮 88%，一頁看得到更多班 */
body.fs0 #out,body.fs0 #pending{zoom:.88}
/* 特大、超大：在「大」的基礎上，城市、人數、分類、狀態這些小字再放大 */
body.fs3 .r .c-city .cn{font-size:24px!important} body.fs3 .r .px{font-size:21px!important} body.fs3.dep .r .px u{font-size:14px!important}
body.fs3 .r .tag{font-size:20px!important} body.fs3 .r .badge{font-size:19px!important} body.fs3 .r .c-time i{font-size:17px!important}
body.fs3 .r .ac{font-size:14px!important} body.fs3 .r .nat{font-size:16px!important} body.fs3 .r .dt{font-size:17px!important}
body.fs4 .r .c-city .cn{font-size:27px!important} body.fs4 .r .px{font-size:24px!important} body.fs4.dep .r .px u{font-size:15.5px!important}
body.fs4 .r .tag{font-size:22px!important} body.fs4 .r .badge{font-size:21px!important} body.fs4 .r .c-time i{font-size:19px!important}
body.fs4 .r .ac{font-size:15px!important} body.fs4 .r .nat{font-size:17.5px!important} body.fs4 .r .dt{font-size:19px!important}
/* 選單 */
#bigbtn{min-width:64px!important}
#bigbtn small{font-size:11px;font-weight:800;opacity:.8;margin-left:3px}
#fsmenu{position:fixed;z-index:9999;display:grid;grid-template-columns:repeat(5,auto);gap:4px;padding:6px;background:#0b1019;border:1px solid #00efd4;box-shadow:0 8px 24px -6px rgba(0,0,0,.8)}
#fsmenu[hidden]{display:none}
#fsmenu button{all:unset;box-sizing:border-box;cursor:pointer;min-width:52px;min-height:44px;padding:4px 8px;display:flex;align-items:center;justify-content:center;
  background:#161e29;border:1px solid #2a3545;color:#c3cad4;font-weight:900;white-space:nowrap}
#fsmenu button.on{background:rgba(0,239,212,.15);border-color:#00efd4;color:#00efd4}
#fsmenu button[data-l="0"]{font-size:13px} #fsmenu button[data-l="1"]{font-size:15px} #fsmenu button[data-l="2"]{font-size:17px}
#fsmenu button[data-l="3"]{font-size:19px} #fsmenu button[data-l="4"]{font-size:21px}
</style>
<script>
(function(){
  var D=document, K='fsLevel1', NAMES=['小','標準','大','特大','超大'], lv=1, menu=null;
  try{ var s=localStorage.getItem(K); if(s!==null&&/^[0-4]$/.test(s)) lv=+s; else if(localStorage.getItem('bigtxt1')==='1') lv=2; }catch(e){}
  function apply(){
    var B=D.body; if(!B) return;
    for(var i=0;i<5;i++) B.classList.toggle('fs'+i,i===lv);
    B.classList.toggle('bigtxt',lv>=2);                 /* 大以上沿用原本「大字」的放大 */
    try{ localStorage.setItem(K,String(lv)); localStorage.setItem('bigtxt1',lv>=2?'1':'0'); }catch(e){}
    var b=D.getElementById('bigbtn'); if(b){ b.innerHTML='字體<small>'+NAMES[lv]+'</small>'; b.classList.toggle('on',lv!==1); }
    if(menu) [].forEach.call(menu.querySelectorAll('button'),function(x){ x.classList.toggle('on',+x.dataset.l===lv); });
  }
  function place(){ var b=D.getElementById('bigbtn'); if(!b||!menu) return; var r=b.getBoundingClientRect();
    menu.style.top=Math.round(r.bottom+6)+'px';
    var w=menu.offsetWidth||300, left=Math.min(r.right-w, innerWidth-w-8); menu.style.left=Math.max(8,Math.round(left))+'px'; }
  function init(){
    var b=D.getElementById('bigbtn'); if(!b) return false;
    menu=D.createElement('div'); menu.id='fsmenu'; menu.hidden=true;
    menu.innerHTML=NAMES.map(function(n,i){ return '<button type="button" data-l="'+i+'">'+n+'</button>'; }).join('');
    D.body.appendChild(menu);
    b.onclick=function(e){ e.stopPropagation(); menu.hidden=!menu.hidden; if(!menu.hidden) place(); };
    menu.addEventListener('click',function(e){ var x=e.target.closest('button'); if(!x) return; e.stopPropagation(); lv=+x.dataset.l; apply(); menu.hidden=true; });
    D.addEventListener('click',function(e){ if(menu&&!menu.hidden&&!menu.contains(e.target)) menu.hidden=true; });
    addEventListener('scroll',function(){ if(menu&&!menu.hidden) menu.hidden=true; },{passive:true});
    apply(); return true;
  }
  /* 「大字」鍵是 DOMContentLoaded 才放上去，等它出現 */
  var n=0, t=setInterval(function(){ if(init()||++n>50) clearInterval(t); },100);
})();
</script>
