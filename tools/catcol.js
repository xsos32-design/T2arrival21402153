<style>
/* ══ 10/21：分類顏色可以自己選（入境頁、出境頁、手錶頁共用）══ */
#colbox{margin-top:12px;padding:10px 10px 8px;border:1px dashed rgba(0,240,255,.35);background:rgba(10,6,20,.45)}
#colbox h4{margin:0 0 8px;font-size:14px;font-weight:900;color:#e8e3f5;letter-spacing:.04em}
#colbox h4 small{font-weight:700;color:#9a8fb5;font-size:12px;margin-left:6px;letter-spacing:0}
#colbox .cr{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin:0 0 8px}
#colbox .cn{flex:0 0 auto;min-width:74px;font-size:14px;font-weight:900;padding:4px 8px;text-align:center}
#colbox .sw{width:28px!important;height:28px!important;min-width:0!important;min-height:0!important;margin:0!important;padding:0!important;border:2px solid rgba(255,255,255,.18)!important;border-radius:0;cursor:pointer;box-shadow:none!important;clip-path:none!important;flex:0 0 auto}
#colbox .sw.on{border-color:#fff!important;outline:2px solid #fff;outline-offset:1px}
#colbox input[type=color]{width:34px!important;height:30px!important;min-width:0!important;padding:0!important;margin:0!important;border:1px solid rgba(255,255,255,.3)!important;background:none!important;cursor:pointer;flex:0 0 auto}
#colbox .warn{flex:1 0 100%;font-size:12.5px;font-weight:800;color:#FF9EC0}
#colbox .ft{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
#colbox .ft button{width:auto!important;min-width:0!important;margin:0!important;font:inherit;font-size:13px;font-weight:900;padding:6px 12px!important;min-height:34px;cursor:pointer;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.3);color:#dfe6ee;clip-path:none!important;box-shadow:none!important}
#colbox .ft i{font-style:normal;font-size:12px;color:#9a8fb5}
</style>
<script>
(function(){
  var W=window, D=document, K='tpeCatCol1';
  var DEP=/出境/.test(D.title), TDX=!!D.getElementById('cfgbox');
  /* 預設顏色：2140 青綠、2153 桃紅、大夜YA 萊姆綠、大夜YB 靛藍（出境的其他一航／二航維持原本灰紫） */
  var DEF=['#00F0FF','#FF2A6D','#8CF23A','#7B78FF'];
  /* 可挑的色：都是看板上分得開的顏色；也可以按最右邊自己調 */
  var PAL=['#00F0FF','#FF2A6D','#8CF23A','#7B78FF','#4DA3FF','#FF8A3D','#C65CFF','#FFC53D','#E8EDF3'];
  function load(){ try{ return JSON.parse(localStorage.getItem(K)||'{}')||{}; }catch(e){ return {}; } }
  function save(o){ try{ localStorage.setItem(K,JSON.stringify(o)); }catch(e){} }
  function key(i){ return i<2?('c'+i):((DEP?'d':'a')+i); }      /* 2140／2153 三頁共用；第 3、4 格入境出境分開記 */
  function ok(c){ return /^#[0-9a-fA-F]{6}$/.test(String(c||'')); }
  function colOf(i,o){ var c=o[key(i)]; return ok(c)?c.toUpperCase():(DEP&&i>=2?null:DEF[i]); }
  function rgb(h){ return [parseInt(h.substr(1,2),16),parseInt(h.substr(3,2),16),parseInt(h.substr(5,2),16)]; }
  function A(h,a){ var c=rgb(h); return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')'; }
  function lum(h){ var c=rgb(h).map(function(v){ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }); return .2126*c[0]+.7152*c[1]+.0722*c[2]; }
  function ink(h){ return lum(h)>.32?'#0B0B12':'#FFFFFF'; }
  function soft(h){ var c=rgb(h).map(function(v){ return Math.round(v+(255-v)*.45); }); return 'rgb('+c.join(',')+')'; }
  function near(a,b){ var x=rgb(a),y=rgb(b); return Math.sqrt(Math.pow(x[0]-y[0],2)+Math.pow(x[1]-y[1],2)+Math.pow(x[2]-y[2],2))<70; }
  function names(){ try{ return CATS.map(function(c){ return c.name; }); }catch(e){ return ['2140','2153','大夜YA','大夜YB']; } }

  var ROW=['.r.r40','.r.r53','.r.rYA','.r.rYB'];
  var TAG=TDX?['.tag.s40','.tag.s53','.tag.sYA','.tag.sYB']:['.tag.t40','.tag.t53','.tag.tYA','.tag.tYB'];
  function css(i,c){
    var P='html body:not(#_) ', R=P+ROW[i], k=ink(c), out=[];
    out.push(R+'{background:linear-gradient(118deg,rgba(255,255,255,.12),rgba(255,255,255,0) 28%),linear-gradient(105deg,'+A(c,.26)+',rgba(18,10,31,.55) 55%)!important;border-color:transparent!important}');
    out.push(R+':not(.soon):not(.taxi){box-shadow:inset 4px 0 0 '+c+',inset 0 0 0 1px '+A(c,.55)+'!important}');
    out.push([R+' .gn',R+' .tag',P+TAG[i],P+'#nnext .nx.kc'+i+' .tg',P+'#nnext .nx.kc'+i+' .g'].concat(i<2?[P+'.nxg.s'+i]:[]).join(',')
      +'{background:'+c+'!important;border-color:'+c+'!important;color:'+k+'!important;box-shadow:0 0 14px -3px '+A(c,.85)+'!important}');
    out.push([P+'.chip.shop.cs'+i+'.act',P+'.cat.cs'+i+'.on'].join(',')
      +'{background:'+A(c,.16)+'!important;border-color:'+c+'!important;color:'+soft(c)+'!important;box-shadow:inset 0 0 0 1px '+c+',0 0 14px -4px '+c+'!important}');
    out.push(P+'#nnext .nx.kc'+i+'{border-color:'+A(c,.6)+'!important;box-shadow:inset 4px 0 0 '+c+'!important}');
    out.push(P+'#prog .p.pc'+i+' .bar i{background:'+c+'!important}');
    out.push(P+'#nextnote .nn.kc'+i+'{background:'+A(c,.14)+'!important;border-color:'+A(c,.6)+'!important;box-shadow:inset 4px 0 0 '+c+',0 0 16px -8px '+c+'!important}');
    out.push(P+'#nextnote .nn.kc'+i+' .nn-k{background:'+c+'!important;color:'+k+'!important}'+P+'#nextnote .nn.kc'+i+' b{color:'+soft(c)+'!important}');
    out.push(P+'.catno.cs'+i+'{color:'+c+'!important}');
    return out.join('\n');
  }
  var st=D.createElement('style'); st.id='catcolcss'; D.head.appendChild(st);
  function apply(){
    var o=load(), h=[];
    for(var i=0;i<4;i++){
      var custom=ok(o[key(i)]);
      /* 2140／2153 沒改過就維持原本的霓虹樣式；大夜YA／YB 一律套（下一班、進度條也要跟著變色） */
      if(custom||(i>=2&&!DEP)){ var c=colOf(i,o); if(c) h.push(css(i,c)); }
    }
    st.textContent=h.join('\n');
  }
  W.catColApply=apply;

  function ui(){
    var host=TDX?D.getElementById('cfgbox'):(D.getElementById('catbox')&&D.getElementById('catbox').closest('details'));
    if(!host) return;
    var box=D.getElementById('colbox'); if(!box){ box=D.createElement('div'); box.id='colbox'; host.appendChild(box); }
    var o=load(), N=names(), cs=[0,1,2,3].map(function(i){ return colOf(i,o)||'#8B93A1'; }), h='<h4>分類顏色<small>卡片、登機門、分類標籤、下一班、進度條一起變</small></h4>';
    for(var i=0;i<4;i++){
      var c=cs[i];
      h+='<div class="cr" data-i="'+i+'"><span class="cn" style="background:'+c+';color:'+ink(c)+'">'+(N[i]||('分類'+(i+1)))+'</span>';
      PAL.forEach(function(p){ h+='<button type="button" class="sw'+(p===c?' on':'')+'" data-c="'+p+'" style="background:'+p+'" aria-label="'+p+'"></button>'; });
      h+='<input type="color" value="'+c.toLowerCase()+'" aria-label="自己調顏色">';
      var dup=[]; for(var j=0;j<4;j++) if(j!==i&&near(c,cs[j])) dup.push(N[j]);
      if(dup.length) h+='<span class="warn">⚠ 跟 '+dup.join('、')+' 顏色太像，一眼會分不出來</span>';
      h+='</div>';
    }
    h+='<div class="ft"><button type="button" data-reset="1">↺ 顏色恢復預設</button><i>只記在這支手機／這個瀏覽器</i></div>';
    if(box.__h!==h){ box.innerHTML=h; box.__h=h; }
  }
  function set(i,c){ var o=load(); var d=(DEP&&i>=2)?null:DEF[i]; if(c&&d&&c.toUpperCase()===d) delete o[key(i)]; else if(c) o[key(i)]=c.toUpperCase(); save(o); apply(); ui(); }
  D.addEventListener('click',function(e){
    var t=e.target; if(!t||!t.closest) return;
    var sw=t.closest('#colbox .sw'); if(sw){ set(+sw.closest('.cr').dataset.i,sw.dataset.c); return; }
    if(t.closest('#colbox [data-reset]')){ var o=load(); [0,1,2,3].forEach(function(i){ delete o[key(i)]; }); save(o); apply(); ui(); }
  });
  D.addEventListener('input',function(e){ var t=e.target; if(t&&t.matches&&t.matches('#colbox input[type=color]')){ var o=load(); var i=+t.closest('.cr').dataset.i; o[key(i)]=t.value.toUpperCase(); save(o); apply(); } });
  D.addEventListener('change',function(e){ var t=e.target; if(t&&t.matches&&t.matches('#colbox input[type=color]')) ui(); });
  apply();
  var wait=setInterval(function(){ if(typeof W.render!=='function') return; clearInterval(wait);
    var _r=W.render; W.render=function(){ var x=_r.apply(this,arguments); try{ ui(); }catch(e){} return x; }; try{ ui(); }catch(e){} },100);
})();
</script>
