<!-- 11/12：班機以外的東西都收成一排按鍵（tools/dock.js）：設定／空檔／異動／人數／搜尋，按了才打開，一次開一個 -->
<style>
#dock{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin:0 0 10px}
#dock button{all:unset;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:54px;padding:6px 2px;cursor:pointer;
  background:#161e29;border:1px solid #2a3545;color:#c3cad4;text-align:center;clip-path:polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,0 100%);-webkit-tap-highlight-color:transparent}
#dock button b{font-size:14px;font-weight:900;letter-spacing:.04em;white-space:nowrap}
#dock button small{font-size:12.5px;font-weight:800;color:#8d99a9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
#dock button.on{background:rgba(0,239,212,.14);border-color:#00efd4;color:#00efd4}
#dock button.on small{color:#9ff5ea}
#dock button.hot small{color:#ffc53d}
#dock button.hot{border-color:#7a5c12}
html.dep #dock button.on{background:rgba(255,42,109,.14);border-color:#ff2a6d;color:#ff7a95}
@media (min-width:821px){ #dock button{min-height:50px} }
/* 收起來的：設定卡、空檔、異動、人數那幾塊、搜尋框 */
html.dock body:not(#_) .wrap>.card,
html.dock body:not(#_) #infobox,
html.dock body:not(#_) #fsearch{display:none!important}
html.dock.dk-set body:not(#_) .wrap>.card{display:block!important}
html.dock body:not(#_) #ctlbar{display:none!important}   /* 上面「設定」鍵就是開關，原本那條摘要不用了 */
html.dock.dk-gap body:not(#_) #infobox,html.dock.dk-chg body:not(#_) #infobox,html.dock.dk-pax body:not(#_) #infobox{display:block!important}
html.dock.dk-search body:not(#_) #fsearch{display:flex!important}
/* 資訊卡裡：只顯示按的那一塊 */
html.dock body:not(#_) #infobox>*{display:none!important}
html.dock.dk-gap body:not(#_) #nalert,html.dock.dk-chg body:not(#_) #nalert{display:grid!important}
html.dock.dk-gap body:not(#_) #nalert>.na:nth-child(2),html.dock.dk-chg body:not(#_) #nalert>.na:nth-child(1){display:none!important}
html.dock.dk-pax body:not(#_) #infobox>#remain,html.dock.dk-pax body:not(#_) #infobox>#prog,html.dock.dk-pax body:not(#_) #infobox>#status,
html.dock.dk-pax body:not(#_) #infobox>#hourbar:not(:empty),html.dock.dk-pax body:not(#_) #infobox>#immnote:not(:empty),
html.dock.dk-pax body:not(#_) #infobox>#holnote:not(:empty),html.dock.dk-pax body:not(#_) #infobox>#offnote:not(:empty){display:block!important}
html.dock.dk-pax body:not(#_) #infobox>#remain{margin-top:0!important}
/* 晚上 22:00 後的「複製 2140+2153」回報鍵：一直顯示，放在按鍵排下面 */
html.dock body:not(#_) #nnext.dkrep{display:block!important;margin:0 0 10px}
html.dock body:not(#_) #nnext.dkrep>:not(.rep){display:none!important}
</style>
<script>
(function(){
  var D=document, H=D.documentElement, W=window;
  var KEYS=[['set','設定'],['gap','空檔'],['chg','異動'],['pax','人數'],['search','搜尋']];
  var cur='', dock=null;
  function txt(sel){ var e=D.querySelector(sel); return e?String(e.textContent||'').replace(/\s+/g,' ').trim():''; }
  function build(){
    var wrap=D.querySelector('.wrap'); if(!wrap||D.getElementById('dock')) return !!dock;
    dock=D.createElement('div'); dock.id='dock';
    dock.innerHTML=KEYS.map(function(k){ return '<button type="button" data-k="'+k[0]+'"><b>'+k[1]+'</b><small></small></button>'; }).join('');
    wrap.insertBefore(dock,wrap.firstChild);
    dock.addEventListener('click',function(e){ var b=e.target.closest('button'); if(!b) return; open(cur===b.dataset.k?'':b.dataset.k); });
    H.classList.add('dock');
    return true;
  }
  function open(k){
    KEYS.forEach(function(x){ H.classList.toggle('dk-'+x[0],x[0]===k); });
    /* 設定：連同完整的選項一起打開；關掉時收回去 */
    var card=D.querySelector('.wrap>.card'), bar=D.getElementById('ctlbar');
    if(card&&bar&&W.matchMedia&&W.matchMedia('(max-width:820px)').matches){
      var isOpen=card.classList.contains('open');
      if((k==='set')!==isOpen) bar.click();
    }
    cur=k; label();
    if(k==='search'){ var i=D.querySelector('#fsearch input'); if(i) setTimeout(function(){ try{ i.focus(); }catch(e){} },50); }
  }
  function label(){
    if(!dock) return;
    var v={};
    /* 設定：目前的時段 */
    var pill=D.querySelector('#ctlbar .cb-pill'); v.set=pill?pill.textContent.replace(/[⏱\s]/g,''):'';
    if(!v.set){ var st=txt('#status'); var m=st.match(/(\d\d:\d\d)[–-](\d\d:\d\d)/); v.set=m?m[1]+'–'+m[2]:''; }
    /* 空檔：下一段空檔開始時間 */
    var gp=D.querySelector('#nalert .na:nth-child(1) .gp .tm'); v.gap=gp?gp.textContent.split('→')[0].trim():(D.querySelector('#nalert .na:nth-child(1) .none')?'沒有':'');
    /* 異動：幾班 */
    var nc=D.querySelectorAll('#nalert .cg').length; v.chg=nc?nc+' 班':'沒有';
    /* 人數：還有幾班 */
    var rm=D.querySelector('#remain b'); v.pax=rm?rm.textContent+' 班':(txt('#remain')?'沒班了':'');
    /* 搜尋：正在搜的字 */
    var si=D.querySelector('#fsearch input'); v.search=si&&si.value?si.value:'班號／城市';
    [].forEach.call(dock.querySelectorAll('button'),function(b){ var k=b.dataset.k;
      b.querySelector('small').textContent=v[k]||'';
      b.classList.toggle('on',k===cur);
      b.classList.toggle('hot',k==='chg'&&nc>0&&k!==cur); });
    /* 晚上的回報鍵 */
    var nx=D.getElementById('nnext'); if(nx){ var has=!!nx.querySelector('.rep');
      nx.classList.toggle('dkrep',has);
      if(has&&nx.parentNode!==dock.parentNode) dock.parentNode.insertBefore(nx,dock.nextSibling); }
  }
  var wait=setInterval(function(){ if(typeof W.render!=='function'||!D.querySelector('.wrap')) return; clearInterval(wait);
    build(); label();
    var _r=W.render; W.render=function(){ var x=_r.apply(this,arguments); try{ label(); }catch(e){} return x; };
  },100);
  setInterval(function(){ try{ label(); }catch(e){} },30000);
  D.addEventListener('input',function(e){ if(e.target&&e.target.closest&&e.target.closest('#fsearch')) label(); });
})();
</script>
