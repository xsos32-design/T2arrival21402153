/**
 * 桃機到站 2153/2140 — 靜態頁產生器
 * 檔案作者：小韋
 *
 * 由 GitHub Actions 定時執行：去桃機 API 抓資料，算好、排好、上好色，
 * 直接產生一堆「純 HTML、零 JavaScript」的檔案到 dist/。
 *
 * Apple Watch 打不開原本那版，是因為手錶不讓網頁去跟別的網域要資料。
 * 這裡把「要資料」這件事整個搬到 GitHub 的機器上做，手錶只負責顯示文字。
 */

import { mkdir, writeFile, copyFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/* 資料來源：TDX 交通部運輸資料流通服務（政府官方開放資料）
   原本是直接打桃機官網的 API，但桃機掛在 Cloudflare 後面、會擋機房 IP，
   GitHub Actions 一律收到 403。TDX 是給程式介接用的官方平台，不擋。 */
const API_FLIGHT  = 'https://tdx.transportdata.tw/api/basic/v2/Air/FIDS/Airport/Arrival/TPE?%24format=JSON';
const API_AIRPORT = 'https://tdx.transportdata.tw/api/basic/v2/Air/Airport?%24format=JSON';
const OUT = 'dist';

/* TDX 需要免費金鑰才能給伺服器程式使用（匿名只開放給瀏覽器，機房 IP 會被擋成 401）。
   金鑰放在 GitHub 的 Settings → Secrets，程式從環境變數讀，不會出現在原始碼裡。 */
const TDX_ID     = process.env.TDX_ID || '';
const TDX_SECRET = process.env.TDX_SECRET || '';
const TOKEN_URL  = 'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token';

async function tdxHeaders() {
  const h = { 'Accept': 'application/json' };
  if (!TDX_ID || !TDX_SECRET) {
    console.warn('沒有設定 TDX_ID / TDX_SECRET，改用匿名存取（在 GitHub 上通常會被擋）');
    return h;
  }
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials', client_id: TDX_ID, client_secret: TDX_SECRET })
  });
  if (!r.ok) throw new Error('TDX 認證失敗（' + r.status + '）— 請檢查 TDX_ID / TDX_SECRET 是否正確');
  const j = await r.json();
  console.log('TDX 認證成功');
  return { ...h, Authorization: 'Bearer ' + j.access_token };
}

/* ★ 要改分點別登機門，只改這兩行 ★
   注意：C5-C10 這種範圍會把 C5R 一起包進去，所以 2153 要寫成 'C5, C6-C10' */
const SPEC_2153 = 'C5, C6-C10';
const SPEC_2140 = 'C1-C4, C5R, B6-B9';

/* ---------- 登機門排序基準 ---------- */
const GATE_ORDER = (() => {
  const o = [];
  for (let i = 1; i <= 10; i++) o.push('A' + i);
  ['B1','B1R','B2','B3','B4','B5','B6','B7','B8','B9'].forEach(g => o.push(g));
  ['C1','C2','C3','C4','C5','C5R','C6','C7','C8','C9','C10'].forEach(g => o.push(g));
  const d = ['D1','D2','D3','D4','D5','D5R'];
  for (let i = 6; i <= 18; i++) d.push('D' + i);
  d.forEach(g => o.push(g));
  return o;
})();

function expandSpec(spec) {
  const set = new Set();
  for (const raw of spec.split(/[,，、]/)) {
    const part = raw.trim().toUpperCase();
    if (!part) continue;
    const m = part.match(/^([A-D]\d+R?)\s*[-–—~]\s*([A-D]\d+R?)$/);
    if (m) {
      const a = GATE_ORDER.indexOf(m[1]), b = GATE_ORDER.indexOf(m[2]);
      if (a >= 0 && b >= 0)
        for (let i = Math.min(a, b); i <= Math.max(a, b); i++) set.add(GATE_ORDER[i]);
    } else set.add(part);
  }
  return set;
}
const G53 = expandSpec(SPEC_2153);
const G40 = expandSpec(SPEC_2140);

/* ---------- 小工具 ---------- */
const pad   = n => String(n).padStart(2, '0');
const hhmm  = t => String(t || '').slice(0, 5);
const toMin = t => { const p = hhmm(t).split(':'); return (+p[0]) * 60 + (+p[1]); };
const esc   = s => String(s ?? '').replace(/[&<>"]/g,
  c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

/* 台北時間（Actions runner 跑 UTC，台灣固定 +8，沒有日光節約問題） */
const nowTPE = new Date(Date.now() + 8 * 3600 * 1000);
const H = nowTPE.getUTCHours(), M = nowTPE.getUTCMinutes();
const nowMin = H * 60 + M;
const stamp  = pad(H) + ':' + pad(M);
const todayISO = nowTPE.getUTCFullYear() + '-' + pad(nowTPE.getUTCMonth() + 1) + '-' + pad(nowTPE.getUTCDate());
const today  = todayISO.replace(/-/g, '/');
const todayLabel = (nowTPE.getUTCMonth() + 1) + '/' + nowTPE.getUTCDate();

/* 把 TDX 的欄位轉成本程式內部用的格式 */
function fromTDX(f, nameOf) {
  const hm   = s => String(s || '').split('T')[1]?.slice(0, 5) || '';
  const dt   = s => String(s || '').split('T')[0].replace(/-/g, '/');
  const sch  = f.ScheduleArrivalTime || '';
  const act  = f.ActualArrivalTime || f.EstimatedArrivalTime || '';
  const rm   = f.ArrivalRemark || '';
  let memo = '';
  if (/取消|CANCEL/i.test(rm))                    memo = '取消';
  else if (/已到|ARRIVED|LANDED/i.test(rm))       memo = '已到';
  else if (/延誤|延遲|DELAY/i.test(rm))           memo = '延遲';
  else if (/時間更改|變更|SCHEDULE CHANGE/i.test(rm)) memo = '時間變更';
  return {
    BNO: String(f.Terminal || ''),
    Gate: String(f.Gate || '').trim(),
    ODate: dt(sch), OTime: hm(sch) ? hm(sch) + ':00' : '',
    RDate: dt(act), RTime: hm(act) ? hm(act) + ':00' : '',
    CityName: nameOf(f.DepartureAirportID),
    flightCode: String(f.AirlineID || '') + String(f.FlightNumber || ''),
    Memo: memo, CurrentStatus: '',
  };
}

function statusOf(f) {
  const clean = s => String(s || '').replace(/[\s.．、,]+$/, '').replace(/\s+/g, ' ').trim();
  const memo = clean(f.Memo), cur = clean(f.CurrentStatus);
  if (/取消/.test(memo))        return { txt: '取消', cls: 'bad',  done: false };
  if (/已到/.test(memo) || cur) return { txt: '已到', cls: 'ok',   done: true  };
  if (/延遲/.test(memo))        return { txt: '延遲', cls: 'warn', done: false };
  if (/變更/.test(memo))        return { txt: '改點', cls: 'warn', done: false };
  return { txt: '預計', cls: 'none', done: false };
}

/* 四種分類：
   40 = 第二航廈、登機門屬 2140
   53 = 第二航廈、登機門屬 2153
   t2 = 第二航廈其餘登機門
   t1 = 第一航廈全部 */
function shopOf(f) {
  const g = String(f.Gate || '').trim().toUpperCase();
  if (String(f.BNO) === '1') return 't1';
  if (g && G40.has(g)) return '40';
  if (g && G53.has(g)) return '53';
  return 't2';
}
const TAG = {
  '40': { txt: '2140',  cls: 's40' },
  '53': { txt: '2153',  cls: 's53' },
  't1': { txt: '一航',  cls: 'st1' },
  't2': { txt: '二航',  cls: 'st2' },
};

/* ---------- 時段 ----------
   注意：這裡刻意用「陣列」而不是物件。JavaScript 的物件會把 '1330'、'1800'
   這種看起來像整數的 key 自動排到最前面並依數值排序，用物件的話按鈕順序會亂掉。 */
const PRESETS = [
  { id: 'h00', label: '00–06', win: () => ['00:00', '05:59', '00:00–06:00'] },
  { id: 'h06', label: '06–12', win: () => ['06:00', '11:59', '06:00–12:00'] },
  { id: 'h12', label: '12–18', win: () => ['12:00', '17:59', '12:00–18:00'] },
  { id: 'h18', label: '18–24', win: () => ['18:00', '23:59', '18:00–24:00'] },
];
/* 現在落在哪一個六小時區間 —— 給 watch.html 當預設入口 */
const CURRENT_PRESET = ['h00', 'h06', 'h12', 'h18'][Math.floor(H / 6)];

/* 分類按鈕（用陣列保住順序） */
const SHOPSETS = [
  { id: 'all', label: '全部',      codes: ['40','53','t1','t2'] },
  { id: '40',  label: '2140',      codes: ['40'] },
  { id: '53',  label: '2153',      codes: ['53'] },
  { id: 't1',  label: '其他 一航', codes: ['t1'] },
  { id: 't2',  label: '其他 二航', codes: ['t2'] },
];

const presetOf = id => PRESETS.find(p => p.id === id);
const shopsetOf = id => SHOPSETS.find(s => s.id === id);

/* 檔名規則：w-<時段>-<店別>[-h].html   （-h = 隱藏已抵達） */
const fileFor = (p, s, hide) => `w-${p}-${s}${hide ? '-h' : ''}.html`;

/* ---------- 版型 ---------- */
const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0b0d10;color:#f2f4f7;font-family:-apple-system,"PingFang TC","Noto Sans TC",sans-serif;
 font-size:15px;line-height:1.35;padding:5px}
.hd{display:flex;align-items:center;gap:5px;font-size:10.5px;color:#8b94a1;padding:6px 7px;margin-bottom:6px;
 text-decoration:none;background:#14171c;border:1px solid #262b33;border-radius:9px;min-height:34px;overflow:hidden}
.hd>*{white-space:nowrap;flex:0 0 auto}
.hd b{color:#cbd5e1;font-size:11.5px}
.hd .u{margin-left:auto;color:#7dd3fc;font-weight:700}
.hd .old{color:#fbbf24}
.r{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:2px 6px;
 background:#14171c;border:1px solid #262b33;border-radius:9px;padding:6px 8px;margin-bottom:5px;overflow:hidden}
.r.done{opacity:.38}
.r.soon{background:#3a2f10;border-color:#a16207}
b.t{font-size:20px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1.05;
 padding:0 5px;border-radius:6px;display:inline-block}
.t-late{color:#fcd34d;background:#3f2c08}
.t-early{color:#7dd3fc;background:#0b2b3c}
.t-same{color:#6ee7b7;background:#0d2f1e}
.t-plan{color:#fff;padding-left:0}
.g{font-size:21px;font-weight:800;color:#fff;text-align:center;white-space:nowrap;line-height:1.05}
.tm{font-size:9px;color:#7c8593;vertical-align:super;margin-left:2px}
.tag{font-size:9.5px;font-weight:800;padding:1px 4px;border-radius:5px;text-align:right;white-space:nowrap;align-self:center}
.s53{background:#43200f;color:#fdba74} .s40{background:#0d3b36;color:#5eead4}
.st1{background:#2a1f4a;color:#c4b5fd} .st2{background:#232830;color:#9aa3b0}
.f{font-size:13px;font-weight:700;color:#e5e9ef;white-space:nowrap}
.c{font-size:11.5px;color:#8b94a1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.st{font-size:10px;font-weight:700;padding:1px 5px;border-radius:5px;text-align:center;white-space:nowrap;align-self:center}
.b-ok{background:#0e2f1b;color:#4ade80} .b-warn{background:#3a2a0c;color:#fbbf24}
.b-bad{background:#3b1414;color:#f87171} .b-none{background:#232830;color:#8b94a1}
.msg{background:#14171c;border:1px solid #262b33;border-radius:9px;padding:12px;color:#8b94a1;font-size:12px;text-align:center}
.msg.err{background:#3b1414;border-color:#7f1d1d;color:#fca5a5}
.grp{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:5px}
.btn{flex:1 1 100%;min-height:46px;display:flex;align-items:center;justify-content:center;
 background:#1c2027;border:2px solid #2e343d;border-radius:11px;color:#9aa3b0;
 font-size:14px;font-weight:600;text-decoration:none;text-align:center;padding:8px 4px}
.btn.on{background:#16324f;border-color:#3b82f6;color:#bfdbfe}
.sep{border-top:1px solid #262b33;margin:10px 0}
.foot{color:#5b636e;font-size:9.5px;text-align:center;padding:8px 4px 2px;line-height:1.6}
.notice{background:#2e2408;border:1px solid #5c4708;color:#fcd34d;font-size:10.5px;
 padding:7px 8px;border-radius:9px;margin:8px 0;line-height:1.55;text-align:center}
.notice b{color:#fde68a}
@media(min-width:420px){
 body{max-width:680px;margin:0 auto;padding:14px}
 .r{grid-template-columns:auto auto auto auto 1fr auto;align-items:center;gap:4px 12px;padding:8px 12px}
 .g{min-width:52px} .tag{text-align:center}
 .btn{flex:0 0 auto;padding:8px 18px;min-height:40px}
}`;

function renderPage(flights, preset, shopKey, hide, err) {
  const [t1, t2, winLabel] = presetOf(preset).win();
  const codes = new Set(shopsetOf(shopKey).codes);

  const rows = flights
    .filter(f => {
      if (!String(f.Gate || '').trim()) return false;
      const t = hhmm(f.RTime) || hhmm(f.OTime);
      if (t < t1 || t > t2) return false;
      if (!codes.has(shopOf(f))) return false;
      if (hide && statusOf(f).done) return false;
      return true;
    })
    .sort((a, b) => {
      const ta = hhmm(a.RTime) || hhmm(a.OTime), tb = hhmm(b.RTime) || hhmm(b.OTime);
      return ta.localeCompare(tb) || hhmm(a.OTime).localeCompare(hhmm(b.OTime));
    });

  const cards = rows.map(f => {
    const st = statusOf(f);
    const sch = hhmm(f.OTime), act = hhmm(f.RTime);
    let big, tc, sub;
    if (act) {
      const d = toMin(f.RTime) - toMin(f.OTime);
      big = act;
      tc  = d > 0 ? 'late' : (d < 0 ? 'early' : 'same');
      sub = '表定' + sch + (d ? (d > 0 ? ' +' : ' −') + Math.abs(d) : '');
    } else { big = sch; tc = 'plan'; sub = '表定'; }

    const shop = shopOf(f);
    const eta  = toMin(big) - nowMin;
    const cls  = st.done ? 'done' : ((eta >= 0 && eta <= 45) ? 'soon' : '');
    const tg   = TAG[shop];

    return `<div class="r ${cls}">
<b class="t t-${tc}">${big}</b><span class="g">${esc(f.Gate)}</span><span class="tag ${tg.cls}">${tg.txt}</span>
<span class="f">${esc(f.flightCode || '')}</span><span class="c">${esc(f.CityName)}</span><span class="st b-${st.cls}">${st.txt}</span>
</div>`;
  }).join('');

  const btn = (href, label, on) => `<a class="btn${on ? ' on' : ''}" href="${href}">${label}</a>`;

  const shopBtns = SHOPSETS
    .map(v => btn(fileFor(preset, v.id, hide), v.label, v.id === shopKey)).join('\n');
  const presetBtns = PRESETS
    .map(p => btn(fileFor(p.id, shopKey, hide), p.label, p.id === preset)).join('\n');
  const hideBtn = btn(fileFor(preset, shopKey, !hide), '隱藏已抵達：' + (hide ? '是' : '否'), hide);

  const body = err
    ? `<div class="msg err">這次抓桃機資料失敗<br><small>${esc(err)}</small><br><br>下次排程會自動重試</div>`
    : (rows.length
        ? cards
        : `<div class="msg">這個區間沒有符合的班機${hide ? '<br><small>（目前隱藏了已抵達的班機）</small>' : ''}</div>`);

  return `<!DOCTYPE html>
<html lang="zh-Hant"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>桃機到站 ${winLabel}</title>
<style>${CSS}</style></head><body>
<a class="hd" href="${fileFor(preset, shopKey, hide)}"><b>桃機到站</b><span>${todayLabel} ${presetOf(preset).label}</span><span class="u">${stamp} ↻</span></a>
<div class="grp">${shopBtns}</div>
<div class="grp">${presetBtns}</div>
<div class="grp">${hideBtn}</div>
<div class="sep"></div>
${body}
<div class="notice">⚠️ 僅供參考<br><b>實際以現場班機營運為主</b></div>
<div class="foot">資料由 GitHub 定時抓取並預先產生，非即時。<br>上方時間 ${stamp} 為抓取時刻，點標題可重新載入最新一份。<br><br>檔案作者：小韋</div>
</body></html>`;
}

/* ---------- 主程式 ---------- */
async function main() {
  let flights = [], err = '';

  /* 機場中文名對照（TDX 只給 IATA 代碼）。抓不到就退回用代碼顯示，不影響主要功能。 */
  let AUTH = { 'Accept': 'application/json' };
  try { AUTH = await tdxHeaders(); }
  catch (e) { err = e.message; console.error(err); }

  let NAMES = {};
  try {
    const r = await fetch(API_AIRPORT, { headers: AUTH });
    if (r.ok) {
      for (const a of await r.json()) {
        const n = a.AirportName && a.AirportName.Zh_tw;
        if (a.AirportID && n) NAMES[a.AirportID] = n.replace(/國際機場$|機場$/, '') || n;
      }
      console.log(`機場名稱對照表 ${Object.keys(NAMES).length} 筆`);
    }
  } catch (e) { console.warn('機場名稱抓取失敗，改用 IATA 代碼：', e.message); }
  const nameOf = id => NAMES[id] || id || '';

  const TRIES = 4;
  for (let i = 1; i <= TRIES; i++) {
    try {
      const res = await fetch(API_FLIGHT, { headers: AUTH });
      if (res.status === 401 || res.status === 403)
        throw new Error('TDX 拒絕存取（' + res.status + '）— 需要在 GitHub Secrets 設定 TDX_ID / TDX_SECRET');
      if (!res.ok) throw new Error('TDX API 回應 ' + res.status);
      const all = await res.json();
      flights = (Array.isArray(all) ? all : [])
        .filter(f => !f.IsCargo && f.FlightDate === todayISO)
        .map(f => fromTDX(f, nameOf))
        .filter(f => f.OTime);
      console.log(`第 ${i} 次嘗試成功，抓到 ${flights.length} 筆客機到站（${todayISO}）`);
      err = '';
      break;
    } catch (e) {
      err = e.message || String(e);
      console.error(`第 ${i}/${TRIES} 次嘗試失敗：${err}`);
      if (i < TRIES) await new Promise(r => setTimeout(r, i * 3000));
    }
  }

  await mkdir(OUT, { recursive: true });

  let n = 0;
  for (const p of PRESETS) {
    for (const s of SHOPSETS) {
      for (const hide of [false, true]) {
        await writeFile(join(OUT, fileFor(p.id, s.id, hide)),
                        renderPage(flights, p.id, s.id, hide, err), 'utf8');
        n++;
      }
    }
  }
  /* 預設入口：自動挑「現在所在的那個六小時區間」＋全部＋不隱藏 */
  await writeFile(join(OUT, 'watch.html'),
                  renderPage(flights, CURRENT_PRESET, 'all', false, err), 'utf8');
  console.log(`watch.html 預設時段 = ${CURRENT_PRESET}（現在 ${stamp}）`);

  /* 把有 JavaScript 的手機／電腦版一起帶上（如果存在的話） */
  for (const f of ['index.html']) {
    try { await access(f); await copyFile(f, join(OUT, f)); console.log('已複製 ' + f); }
    catch { console.log('找不到 ' + f + '，略過'); }
  }

  console.log(`產生 ${n + 1} 個靜態頁 → ${OUT}/`);
  if (err) process.exitCode = 0; // 抓取失敗也要部署（頁面會顯示錯誤訊息）
}

main();
