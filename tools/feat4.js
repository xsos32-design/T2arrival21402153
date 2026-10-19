<style>
/* ══ 新功能第四輪（2026-10-18）：G3 最後一班、G7 同時到。入境頁、出境頁共用 ══ */
/* G3 最後一班：卡片時間下面紫色小標；資訊卡多一行 */
.c-time .lastb{display:table;font-style:normal;font-size:11.5px;font-weight:900;margin-top:3px;padding:0 5px;background:#b026ff;color:#fff}
#glast{margin-top:8px;padding:7px 12px;border:1px solid rgba(176,38,255,.55);background:rgba(176,38,255,.12);font-size:13.5px;font-weight:800;color:#e3b6ff;line-height:1.55}
#glast b{color:#fff}
/* G7 同時到：清單裡那一串前面加一條黃線 */
.wave{margin:10px 0 4px;padding:6px 12px;border-left:4px solid #f5ee0b;background:linear-gradient(90deg,rgba(245,238,11,.18),rgba(245,238,11,0));color:#fff8b0;font-size:13.5px;font-weight:900}
.wave b{color:#f5ee0b;font-size:15px}
</style>
<script>
(function(){
  var D=document, DEP=/出境/.test(D.title);
  function hm(s){ var m=String(s||'').match(/(\d\d):(\d\d)/); return m?(+m[1])*60+(+m[2]):null; }
  function p2(n){ return (n<10?'0':'')+n; }
  function fmt(m){ m=((m%1440)+1440)%1440; return p2(Math.floor(m/60))+':'+p2(m%60); }
  function sel(){ try{ return selCats(); }catch(e){ return ['2140','2153']; } }
  function tagOf(r){ var t=r.querySelector('.c-shop .tag'); return t?t.textContent.trim():''; }
  function pxOf(r){ var p=r.querySelector('.px'); return p?parseInt(p.textContent,10)||0:0; }
  function fnoOf(r){ return ((r.querySelector('.c-fno b')||{}).textContent||'').trim(); }
  function tOf(r){ return ((r.querySelector('.c-time b')||{}).textContent||'').trim(); }
  function etaOf(r){ var t=hm(tOf(r)); if(t===null) return null; var d=new Date(), e=t-(d.getHours()*60+d.getMinutes()); if(e<-720) e+=1440; return e; }
  function rows(){ return [].slice.call(D.querySelectorAll('#out .r:not(.head)')); }

  function paint(){
    var out=D.getElementById('out'); if(!out) return;
    var S=sel(), RS=rows();

    /* ── G3 最後一班：這個時段裡，每個勾選分類的最後一班 ── */
    [].forEach.call(out.querySelectorAll('.c-time .lastb'),function(x){ x.remove(); });
    var L={}; RS.forEach(function(r){ var t=tagOf(r); if(S.indexOf(t)>=0) L[t]=r; });
    var ks=S.filter(function(k){ return L[k]; }), html='';
    /* 10/19：卡片上的紫色「最後一班」小標也拿掉（會讓人誤會），G3 整個不顯示 */
    /* 10/19：資訊卡那行「本時段最後一班」拿掉（小韋說不要），只留卡片上的紫色小標 */
    var gl=D.getElementById('glast'), ib=D.getElementById('infobox');
    if(html&&ib){ if(!gl){ gl=D.createElement('div'); gl.id='glast'; }
      var an=D.getElementById('prog')||D.getElementById('remain')||D.getElementById('nextnote');
      if(an&&an.parentNode===ib){ if(an.nextSibling!==gl) ib.insertBefore(gl,an.nextSibling); } else if(gl.parentNode!==ib) ib.appendChild(gl);
      gl.innerHTML=html; }
    else if(gl) gl.remove();
    var mb=D.getElementById('ibmore'); if(mb&&ib&&mb.nextSibling) ib.appendChild(mb);   /* 「更多」那顆維持最後一行 */

    /* ── G7 同時到：你勾的分類（還沒到的），相鄰兩班相隔 10 分內連成一串，3 班以上就標出來 ── */
    [].forEach.call(out.querySelectorAll('.wave'),function(x){ x.remove(); });
    var q=D.querySelector('#fsearch input'); if(q&&q.value.trim()) return;     /* 搜尋時不標，免得畫面亂 */
    var M=RS.filter(function(r){ return r.style.display!=='none'&&S.indexOf(tagOf(r))>=0&&!r.classList.contains('done'); }), grp=[], all=[];
    M.forEach(function(r){ var t=hm(tOf(r)); if(t===null) return; var last=grp[grp.length-1];
      if(last&&((t-last.t+1440)%1440)<=10) grp.push({r:r,t:t}); else { if(grp.length>=3) all.push(grp); grp=[{r:r,t:t}]; } });
    if(grp.length>=3) all.push(grp);
    all.forEach(function(g){ var p=0; g.forEach(function(x){ p+=pxOf(x.r); });
      var w=D.createElement('div'); w.className='wave';
      w.innerHTML='🌊 <b>'+fmt(g[0].t)+'–'+fmt(g[g.length-1].t)+'</b>　'+g.length+' 班接連'+(DEP?'起飛':'落地')+(p?'・約 <b>'+p.toLocaleString()+'</b> 人':'');
      g[0].r.parentNode.insertBefore(w,g[0].r); });
  }
  var wait=setInterval(function(){
    if(typeof window.render!=='function') return; clearInterval(wait);
    var _r=window.render;
    window.render=function(){ var x=_r.apply(this,arguments); try{ paint(); }catch(e){ console.log('feat4',e); } return x; };
    try{ paint(); }catch(e){}
  },100);
  setInterval(function(){ try{ paint(); }catch(e){} },60000);
  D.addEventListener('input',function(e){ if(e.target&&e.target.closest&&e.target.closest('#fsearch')) setTimeout(function(){ try{ paint(); }catch(_){ } },0); });
  D.addEventListener('click',function(e){ if(e.target&&e.target.closest&&e.target.closest('#fsearch button')) setTimeout(function(){ try{ paint(); }catch(_){ } },0); });
})();
</script>
