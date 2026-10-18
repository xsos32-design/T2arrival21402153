<style>
/* ══ Gemini 美術（2026-10-18）：I1 按鈕小圖（img/ic.webp）、I2 寬版霓虹招牌（img/neon-wide.webp）。入境頁、出境頁共用 ══ */
/* I1 按鈕小圖：Gemini 生成的霓虹線條圖示，顏色跟著按鈕（2140 青、2153 粉、選中黃…）走，外加一點光暈 */
svg.ic:has(use[href="#i-land"]),svg.ic:has(use[href="#i-plane"]),svg.ic:has(use[href="#i-timer"]),svg.ic:has(use[href="#i-refresh"]),svg.ic:has(use[href="#i-up"]),svg.ic:has(use[href="#i-hide"]),svg.ic:has(use[href="#i-copy"]),svg.ic:has(use[href="#i-clock"]),svg.ic:has(use[href="#i-cal"]),svg.ic:has(use[href="#i-cog"]),svg.ic:has(use[href="#i-undo"]),svg.ic:has(use[href="#i-alert"]){background:currentColor;-webkit-mask-image:url(img/ic.webp);mask-image:url(img/ic.webp);-webkit-mask-size:1200% 100%;mask-size:1200% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;filter:drop-shadow(0 0 2px currentColor);stroke:none!important;width:1.22em!important;height:1.22em!important;vertical-align:-.2em}
svg.ic:has(use[href="#i-land"]) use,svg.ic:has(use[href="#i-plane"]) use,svg.ic:has(use[href="#i-timer"]) use,svg.ic:has(use[href="#i-refresh"]) use,svg.ic:has(use[href="#i-up"]) use,svg.ic:has(use[href="#i-hide"]) use,svg.ic:has(use[href="#i-copy"]) use,svg.ic:has(use[href="#i-clock"]) use,svg.ic:has(use[href="#i-cal"]) use,svg.ic:has(use[href="#i-cog"]) use,svg.ic:has(use[href="#i-undo"]) use,svg.ic:has(use[href="#i-alert"]) use{display:none}
svg.ic:has(use[href="#i-land"]){-webkit-mask-position:0.0000% 0;mask-position:0.0000% 0}
svg.ic:has(use[href="#i-plane"]){-webkit-mask-position:9.0909% 0;mask-position:9.0909% 0}
svg.ic:has(use[href="#i-timer"]){-webkit-mask-position:18.1818% 0;mask-position:18.1818% 0}
svg.ic:has(use[href="#i-refresh"]){-webkit-mask-position:27.2727% 0;mask-position:27.2727% 0}
svg.ic:has(use[href="#i-up"]){-webkit-mask-position:36.3636% 0;mask-position:36.3636% 0}
svg.ic:has(use[href="#i-hide"]){-webkit-mask-position:45.4545% 0;mask-position:45.4545% 0}
svg.ic:has(use[href="#i-copy"]){-webkit-mask-position:54.5455% 0;mask-position:54.5455% 0}
svg.ic:has(use[href="#i-clock"]){-webkit-mask-position:63.6364% 0;mask-position:63.6364% 0}
svg.ic:has(use[href="#i-cal"]){-webkit-mask-position:72.7273% 0;mask-position:72.7273% 0}
svg.ic:has(use[href="#i-cog"]){-webkit-mask-position:81.8182% 0;mask-position:81.8182% 0}
svg.ic:has(use[href="#i-undo"]){-webkit-mask-position:90.9091% 0;mask-position:90.9091% 0}
svg.ic:has(use[href="#i-alert"]){-webkit-mask-position:100.0000% 0;mask-position:100.0000% 0}
/* I2 招牌：換成 Gemini 生成的寬版霓虹框（為變矮後的招牌重做，比例不會被壓扁） */
html:is(.arr,.dep) body:not(.mkslim) .mk{background:url(img/neon-wide.webp) center/100% 100% no-repeat,#07040e!important;padding-left:56px!important;padding-right:56px!important}
@media (min-width:821px){html:is(.arr,.dep) body:not(.mkslim) .mk{background-size:auto 100%!important}}
</style>
