<style>
/* ══ 10/19：移民署可選一航／二航／一＋二航（入境頁、出境頁、手錶頁共用） ══ */
#immnote .imt{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin:0 0 5px}
#immnote .imt button{width:auto!important;min-width:0!important;margin:0!important;padding:3px 10px!important;min-height:30px!important;height:auto!important;
  font:inherit;font-size:13px!important;font-weight:900;line-height:1.2!important;cursor:pointer;border-radius:0;clip-path:none!important;box-shadow:none!important;
  background:rgba(255,197,61,.08);border:1px solid rgba(217,150,40,.6);color:#d9a23a}
#immnote .imt button.on{background:#FFC53D;border-color:#FFC53D;color:#111}
#immnote .imt .ims{margin-left:auto;font-size:13px;font-weight:900;color:#FFC53D;white-space:nowrap}
#immnote .imblk+.imblk{margin-top:6px;padding-top:6px;border-top:1px dashed rgba(255,197,61,.3)}
#immnote .imwait{font-size:12px;color:#8b94a1}
#immnote.imtap{cursor:pointer}
</style>
<script>
(function(){
  var W=window, D=document, K='tpeImmT';
  var MODES=[['2','二航'],['1','一航'],['12','一＋二航']];
  function mode(){ var m='2'; try{ m=localStorage.getItem(K)||'2'; }catch(e){} return /^(1|2|12)$/.test(m)?m:'2'; }
  function setMode(m){ try{ localStorage.setItem(K,m); }catch(e){} }
  /* 一航：新版資料有 in1d／out1d（含國籍），舊版只有 in1／out1 一個數字 */
  function get(base,t){
    if(!IMM) return null;
    if(t==='2') return IMM[base+'2'];
    var d=IMM[base+'1d']; if(d&&d.total!=null) return d;
    var n=IMM[base+'1']; if(typeof n==='number') return {total:n,nat:{},_only:1};
    return (n&&n.total!=null)?n:null;
  }
  function lab(label,t){
    if(t==='2') return label;
    return String(label).replace('第二航廈','第一航廈').replace('T2','T1');
  }
  var last=null;
  function paint(id,anchorSel,key,label,topN,compact){
    last=[id,anchorSel,key,label,topN,compact];
    var el=D.getElementById(id);
    if(!el){ var a=D.querySelector(anchorSel); if(!a) return;
      el=D.createElement('div'); el.id=id; a.parentNode.insertBefore(el,a.nextSibling); }
    var base=String(key).replace(/[12]$/,''), m=mode(), ts=m==='12'?['1','2']:[m];
    var parts=[], sum=0, cnt=0;
    ts.forEach(function(t){ var d=get(base,t); if(!d||!d.total) return;
      var h=immLine(d,lab(label,t),topN,compact); if(!h) return;
      sum+=Number(d.total)||0; cnt++;
      if(!compact&&d._only&&immAge()<=180) h+='<div class="imwait">一航國籍明細：移民署下一次更新（半小時內）後出現</div>';
      parts.push(compact?h:'<div class="imblk">'+h+'</div>'); });
    if(compact){
      /* 手錶頁：不加按鈕（不動版面），點那一行就換 二航 → 一航 → 一＋二航 */
      el.innerHTML=parts.map(function(h,i){ return i?h.replace('<b>移民署</b> ',''):h; }).join(' ｜ ')+(m==='12'&&cnt>1?' <b>合計 '+sum.toLocaleString()+'</b>':'');
      el.classList.add('imtap'); el.title='點一下換：二航 → 一航 → 一＋二航';
      return;
    }
    if(!parts.length&&!(IMM&&IMM.t)){ el.innerHTML=''; return; }
    var bar='<div class="imt">'+MODES.map(function(x){ return '<button type="button" data-imt="'+x[0]+'"'+(x[0]===m?' class="on"':'')+'>'+x[1]+'</button>'; }).join('')
      +(m==='12'&&cnt>1?'<span class="ims">一＋二航合計 '+sum.toLocaleString()+' 人</span>':'')+'</div>';
    el.innerHTML=bar+(parts.join('')||'<div class="imwait">這個航廈目前沒有移民署資料</div>');
  }
  W.immPaint=paint;
  D.addEventListener('click',function(e){
    var b=e.target&&e.target.closest&&e.target.closest('#immnote [data-imt]');
    var tap=!b&&e.target&&e.target.closest&&e.target.closest('#immnote.imtap');
    if(!b&&!tap) return;
    if(b) setMode(b.getAttribute('data-imt'));
    else { var m=mode(), i=MODES.map(function(x){ return x[0]; }).indexOf(m); setMode(MODES[(i+1)%3][0]); }
    if(last) paint.apply(null,last);
  });
})();
</script>
