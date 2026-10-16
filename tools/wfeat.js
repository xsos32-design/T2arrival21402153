<style>
/* ══ 手錶版排版（2026-10-14）：B1 打開就看到班機、B2 下方按鈕不蓋住班機 ══ */
.mk{padding:3px 4px!important;display:flex!important;flex-direction:column!important;align-items:center!important;gap:0!important;border-width:1px!important}
.mk b{font-size:14px!important;letter-spacing:.3em!important;line-height:1.2!important;white-space:nowrap!important}
.mk i{font-size:9px!important;line-height:1.2!important;white-space:nowrap!important}
#hd{padding:2px 6px!important;min-height:0!important} #hfreq{display:none!important}
#hd b{font-size:12px!important}
#immnote{padding:2px 6px!important;font-size:11px!important;line-height:1.3!important}
#immnote .imn,#immnote>i{display:none!important}
#immnote b,#immnote em{font-size:12px!important}
.grp.s1 .btn{min-height:40px!important}
/* 10/16 浮動按鈕改回原樣：上面三個鍵、下面時間單獨一行（小韋指定，不要再改） */
</style>
<script>
/* B1：「現在起 6 小時」和三個時段鍵搬進「⋯」裡，打開手錶第一眼就是班機 */
(function(){
  var more=document.getElementById('more'), grps=[].slice.call(document.querySelectorAll('body > .grp:not(.s1)'));
  if(more) grps.reverse().forEach(function(g){ more.insertBefore(g,more.firstChild); });
})();
</script>
