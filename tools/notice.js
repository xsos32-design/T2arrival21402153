<!-- 公告：小額贊助訂閱（tools/notice.js，試覽用） -->
<style>
#notice26{position:relative;margin:0 0 10px;padding:12px 14px 12px 16px;background:linear-gradient(135deg,rgba(255,197,61,.12),rgba(255,42,109,.10));
  border:1px solid #7a5c12;border-left:4px solid #ffc53d;clip-path:polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,0 100%);color:#e8e3f5}
#notice26 .nt-h{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:900;letter-spacing:.14em;color:#ffc53d;margin-bottom:6px}
#notice26 .nt-h .ic{width:16px;height:16px}
#notice26 .nt-t{font-size:16px;font-weight:900;line-height:1.45;margin:0 0 6px;color:#fff}
#notice26 p{margin:0 0 4px;font-size:14px;font-weight:700;line-height:1.65;color:#c9cfdb}
#notice26 p b{color:#ffc53d}
#notice26 .nt-f{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px}
#notice26 .nt-sig{font-size:13px;font-weight:900;color:#ff7a95;letter-spacing:.08em}
#notice26 .nt-ok{all:unset;cursor:pointer;font-size:14px;font-weight:900;padding:7px 16px;background:#ffc53d;color:#1a1400}
</style>
<script>
(function(){
  var D=document, K='notice26sub';
  try{ if(localStorage.getItem(K)==='1') return; }catch(e){}
  function put(){
    var wrap=D.querySelector('.wrap'); if(!wrap||D.getElementById('notice26')) return !!wrap;
    var n=D.createElement('div'); n.id='notice26';
    n.innerHTML='<div class="nt-h"><svg class="ic" viewBox="0 0 24 24"><use href="#i-alert"/></svg> 公告</div>'
      +'<div class="nt-t">感謝大家一直以來的支持 🙏</div>'
      +'<p>看板營運至今的費用，目前都是由我自行吸收。</p>'
      +'<p>隨著使用人數增加，偶爾會出現讀取不穩的情況，為了讓大家用得更順，已陸續升級雲端等服務。</p>'
      +'<p>為了能長期維持下去，未來不得不加入<b>少量廣告</b>及<b>小額訂閱</b>，詳細方式確定後會再公告。</p>'
      +'<p>還請各位多多支持，感謝大家 🙏</p>'
      +'<div class="nt-f"><span class="nt-sig">— 小韋</span><button type="button" class="nt-ok">知道了</button></div>';
    wrap.insertBefore(n,wrap.firstChild);
    n.querySelector('.nt-ok').onclick=function(){ n.remove(); try{ localStorage.setItem(K,'1'); }catch(e){} };
    return true;
  }
  var t=setInterval(function(){ if(put()) clearInterval(t); },100);
})();
</script>
