<style>
/* ══ 10/19：大夜YA＝萊姆綠、大夜YB＝靛藍（入境頁、手錶頁共用）══
   挑色原則：不跟看板上已經有意義的顏色撞。已用：青綠 2140、桃紅 2153、黃＝表定／快到、
   金＝移民署／延誤、橘＝晚到、紅＝取消、綠＝準時、藍＝提早／滑行、紫＝空檔線。
   剩下最空的兩段色相就是萊姆綠（約 93°）和靛藍（約 241°）。 */
:root{--ya:#8CF23A;--yb:#7B78FF}
/* 卡片底色＋左邊色條（快到／滑行的黃框藍框照舊優先） */
html body:not(#_) .r.rYA{background:linear-gradient(118deg,rgba(255,255,255,.12),rgba(255,255,255,0) 28%),linear-gradient(105deg,rgba(140,242,58,.22),rgba(18,10,31,.55) 55%)!important;border-color:transparent!important}
html body:not(#_) .r.rYB{background:linear-gradient(118deg,rgba(255,255,255,.12),rgba(255,255,255,0) 28%),linear-gradient(105deg,rgba(123,120,255,.30),rgba(18,10,31,.55) 55%)!important;border-color:transparent!important}
html body:not(#_) .r.rYA:not(.soon):not(.taxi){box-shadow:inset 4px 0 0 var(--ya),inset 0 0 0 1px rgba(140,242,58,.5)!important}
html body:not(#_) .r.rYB:not(.soon):not(.taxi){box-shadow:inset 4px 0 0 var(--yb),inset 0 0 0 1px rgba(123,120,255,.6)!important}
/* 登機門、分類小標實心上色 */
html body:not(#_) .r.rYA .gn,html body:not(#_) .r.rYA .tag,html body:not(#_) .tag.tYA,html body:not(#_) .tag.sYA{background:var(--ya)!important;border-color:var(--ya)!important;color:#112400!important;box-shadow:0 0 14px -2px rgba(140,242,58,.8)!important;font-weight:900}
html body:not(#_) .r.rYB .gn,html body:not(#_) .r.rYB .tag,html body:not(#_) .tag.tYB,html body:not(#_) .tag.sYB{background:var(--yb)!important;border-color:var(--yb)!important;color:#fff!important;box-shadow:0 0 14px -2px rgba(123,120,255,.85)!important;font-weight:900}
html body:not(#_) .r.rYA .c,html body:not(#_) .r.rYB .c{color:#DCE4EC}
/* 分類按鈕（勾起來時）跟卡片同色 */
html body:not(#_) .chip.cs2.act,html body:not(#_) .cat.cs2.on,html body:not(#_) .btn.ct1.on{background:rgba(140,242,58,.16)!important;border-color:var(--ya)!important;color:#C9FF9A!important;box-shadow:inset 0 0 0 1px var(--ya),0 0 14px -4px var(--ya)!important}
html body:not(#_) .chip.cs3.act,html body:not(#_) .cat.cs3.on,html body:not(#_) .btn.ct2.on{background:rgba(123,120,255,.20)!important;border-color:var(--yb)!important;color:#C9C8FF!important;box-shadow:inset 0 0 0 1px var(--yb),0 0 14px -4px var(--yb)!important}
html body:not(#_) .catno.cs2{color:var(--ya)!important} html body:not(#_) .catno.cs3{color:var(--yb)!important}
</style>
