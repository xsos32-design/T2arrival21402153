<!-- 11/25 預覽：搬家公告（tools/move.js）
     只放在舊網址（GitHub）：上方一條「12/10 起搬到 tpeboard.com」＋每天第一次打開跳一次公告視窗
     手錶（螢幕 ≤340px）：只有上方一行，不跳視窗。tpeboard.com 不放這個。
     12/10 00:00 起由 <head> 裡的轉址程式直接帶到 tpeboard.com（見 MOVE_HEAD）。
     記在手機裡：localStorage move1（存今天日期，同一天不再跳） -->
<style>
#fxmvbar{position:relative;z-index:30;display:flex;align-items:center;justify-content:center;gap:8px;padding:7px 12px;
  font-size:13.5px;font-weight:900;letter-spacing:.04em;color:#0b0716;background:linear-gradient(90deg,#ffc53d,#ff8a3d);text-decoration:none;
  box-shadow:0 0 14px -4px rgba(255,197,61,.8)}
#fxmvbar u{text-decoration:none;padding:1px 7px;background:#0b0716;color:#ffc53d;font-size:12.5px}
#fxmv{position:fixed;inset:0;z-index:2147483631;display:flex;align-items:center;justify-content:center;padding:18px;
  background:rgba(4,2,10,.74);-webkit-backdrop-filter:blur(7px);backdrop-filter:blur(7px);animation:mvfade .3s ease-out}
@keyframes mvfade{0%{opacity:0}}
#fxmv.out{animation:mvfade .25s ease-in reverse forwards}
#fxmv .mv{width:min(400px,100%);max-height:min(86vh,760px);display:flex;flex-direction:column;color:#e3eef8;
  background:linear-gradient(165deg,#1a0f33 0%,#0c0a1d 55%,#120a26 100%);border:1.5px solid #ffc53d;
  box-shadow:0 0 34px -6px rgba(255,197,61,.6),inset 0 0 50px -24px #ffc53d;
  clip-path:polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px));animation:mvin .5s cubic-bezier(.2,1.3,.35,1) both}
@keyframes mvin{0%{opacity:0;transform:translateY(40px) scale(.94)}100%{opacity:1;transform:none}}
#fxmv .mv-h{padding:18px 20px 12px;border-bottom:1px solid rgba(255,197,61,.3)}
#fxmv .mv-h small{display:block;font-size:11.5px;letter-spacing:.35em;color:#ffc53d;font-weight:900;margin-bottom:4px}
#fxmv .mv-h b{display:block;font-size:23px;font-weight:900;letter-spacing:.06em;color:#fff;text-shadow:0 0 12px rgba(255,197,61,.7)}
#fxmv .mv-b{overflow-y:auto;-webkit-overflow-scrolling:touch;padding:12px 20px 6px;overscroll-behavior:contain;font-size:15px;line-height:1.7;font-weight:700}
#fxmv .mv-b p{margin:0 0 12px}
#fxmv .mv-new{display:block;margin:4px 0 14px;padding:12px;text-align:center;text-decoration:none;color:#0b0716;background:#ffc53d;font-size:20px;font-weight:900;letter-spacing:.04em;
  box-shadow:0 0 18px -4px rgba(255,197,61,.9)}
#fxmv .mv-new small{display:block;font-size:12.5px;letter-spacing:.06em;opacity:.8}
#fxmv .mv-sub{color:#ffd77a}
#fxmv hr{border:0;border-top:1px dashed rgba(255,197,61,.35);margin:6px 0 12px}
#fxmv .mv-t{font-size:16.5px;font-weight:900;color:#fff;margin-bottom:6px}
#fxmv ul{margin:0 0 12px;padding:0;list-style:none}
#fxmv li{position:relative;padding:3px 0 3px 18px;color:#d3e2ef}
#fxmv li::before{content:"";position:absolute;left:2px;top:.8em;width:8px;height:8px;background:#00f0ff;box-shadow:0 0 8px #00f0ff}
#fxmv .mv-ln{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:6px}
#fxmv .mv-ln a{display:block;padding:10px 6px;text-align:center;text-decoration:none;font-weight:900;font-size:15px;color:#00f0ff;border:1px solid rgba(0,240,255,.6);background:rgba(0,240,255,.07)}
#fxmv .mv-ln a small{display:block;font-size:11.5px;color:#9fb3c6;font-weight:700}
#fxmv .mv-f{padding:10px 20px 16px;display:flex}
#fxmv .mv-ok{all:unset;cursor:pointer;flex:1;text-align:center;padding:13px 0;font-weight:900;font-size:16px;color:#0b0716;background:#00efd4;letter-spacing:.1em}
@media (max-width:340px){ #fxmvbar{font-size:11px;padding:4px 6px;gap:5px} #fxmvbar u{font-size:10.5px;padding:0 5px} }
</style>
<script>
(function(){
  var D=document, W=window;
  if(W.__fxmove) return; W.__fxmove=1;
  var NEW='https://tpeboard.com', APP='https://apps.apple.com/tw/app/id6835178181';
  var OLD=/github\.io$/.test(location.hostname) || /[?&]mv=old/.test(location.search);  /* 舊網址（GitHub）才說搬家 */
  if(!OLD) return;
  var WATCH=Math.min(screen.width||999, innerWidth||999)<=340;
  var today=new Date(); var ymd=today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
  var K='move1';
  function get(){ try{ return localStorage.getItem(K)||''; }catch(e){ return ''; } }
  function set(v){ try{ localStorage.setItem(K,v); }catch(e){} }

  /* 上方一條（只有舊網址）：點了開新網址 */
  function bar(){
    if(D.getElementById('fxmvbar')) return;
    var a=D.createElement('a'); a.id='fxmvbar'; a.href=NEW;
    a.innerHTML=WATCH?'12/10 起搬家 <u>tpeboard.com</u>':'12/10 起網站搬到新網址 <u>tpeboard.com ›</u>';
    D.body.insertBefore(a,D.body.firstChild);
  }

  function pop(){
    if(WATCH||D.getElementById('fxmv')) return;
    if(D.getElementById('fxnews')){ setTimeout(pop,800); return; }   /* 「看板更新了」還開著就先等它關 */
    var h='';
    h+='<p>感謝大家一路以來的支持！<br>這個網站 <b>12/10 起搬到新網址</b>，記得改存新網址、重新加到主畫面：</p>'
      +'<a class="mv-new" href="'+NEW+'">tpeboard.com<small>點這裡打開新網址</small></a>';
    h+='<p class="mv-sub">網站要持續營運，需要大家幫忙，歡迎訂閱或贊助支持。</p><hr>'
      +'<div class="mv-t">「下一班誰先到」看板</div>'
      +'<ul><li>照實際落地時間重新排序，不用一直刷官網、不用自己對時間</li>'
      +'<li>下一班幾點到、哪個門、大概幾個人，3 秒看懂</li>'
      +'<li>班機一落地就跳通知，手錶抬手就看</li></ul>'
      +'<div class="mv-ln"><a href="'+NEW+'">網頁版<small>tpeboard.com</small></a><a href="'+APP+'">iPhone App<small>App Store</small></a></div>';
    var o=D.createElement('div'); o.id='fxmv'; o.setAttribute('role','dialog'); o.setAttribute('aria-label','網站搬家公告');
    o.innerHTML='<div class="mv"><div class="mv-h"><small>NOTICE</small><b>看板要搬家了</b></div>'
      +'<div class="mv-b">'+h+'</div><div class="mv-f"><button type="button" class="mv-ok">知道了</button></div></div>';
    function close(){ set(ymd); o.classList.add('out'); setTimeout(function(){ o.remove(); },260); }
    o.querySelector('.mv-ok').onclick=close;
    o.addEventListener('click',function(e){ if(e.target===o) close(); });
    [].forEach.call(o.querySelectorAll('a'),function(a){ a.addEventListener('click',function(){ set(ymd); }); });
    D.body.appendChild(o);
  }

  function go(){
    bar();
    var seen=get(), force=/[?&]mv=1/.test(location.search);       /* 預覽：網址加 ?mv=1 一定跳 */
    if(force || seen!==ymd) setTimeout(pop,2200);  /* 等招牌、卡片進場跑完 */
  }
  if(D.readyState==='complete') go(); else addEventListener('load',go);
})();
</script>
