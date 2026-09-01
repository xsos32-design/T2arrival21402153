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

/* 資料來源：桃園國際機場「開放資料平台」即時航班資料集（服務代碼 114002）
   政府資料開放平臺登錄的官方來源，跟桃機官網看板同一份資料、每 5 分鐘更新。
   關鍵是它在 odp 這台獨立主機，不像 www 那台會擋機房 IP。 */
const ODP = 'https://odp.taoyuan-airport.com/dataset/2025102001?format=json';
const TDX_FLIGHT  = 'https://tdx.transportdata.tw/api/basic/v2/Air/FIDS/Airport/Arrival/TPE?%24format=JSON';
const TDX_AIRPORT = 'https://tdx.transportdata.tw/api/basic/v2/Air/Airport?%24format=JSON';
const TOKEN_URL   = 'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token';
const TDX_ID      = process.env.TDX_ID || '';
const TDX_SECRET  = process.env.TDX_SECRET || '';

const OUT = 'dist';

/* ★ 要改分點別登機門，只改這兩行 ★
   注意：C5-C10 這種範圍會把 C5R 一起包進去，所以 2153 要寫成 'C5, C6-C10' */
const SPEC_2153 = 'B6, C5, C6-C10';
const SPEC_2140 = 'C1-C4, C5R, B7-B9';

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
const buildEpoch = Date.now();          // 產生這份靜態頁的真實時刻（給頁面算「幾分鐘前」用）
const nowTPE = new Date(Date.now() + 8 * 3600 * 1000);
const H = nowTPE.getUTCHours(), M = nowTPE.getUTCMinutes();
const nowMin = H * 60 + M;
const stamp  = pad(H) + ':' + pad(M);
const todayISO = nowTPE.getUTCFullYear() + '-' + pad(nowTPE.getUTCMonth() + 1) + '-' + pad(nowTPE.getUTCDate());
const today  = todayISO.replace(/-/g, '/');
const todayLabel = (nowTPE.getUTCMonth() + 1) + '/' + nowTPE.getUTCDate();

/* TDX 會把共掛班號（同一架飛機、多個航空公司班號）拆成好幾筆。
   對現場作業來說那是同一班，所以依「時間＋登機門＋航廈＋出發地」合併成一列。 */
function mergeCodeshare(list) {
  const map = new Map();
  for (const f of list) {
    const key = f.ODate + '|' + f.OTime + '|' + f.Gate + '|' + f.BNO + '|' + f.CityName;
    if (!map.has(key)) { map.set(key, f); continue; }
    const m = map.get(key);
    if (!m.RTime && f.RTime) { m.RTime = f.RTime; m.RDate = f.RDate; }
    if (!m.Memo && f.Memo) m.Memo = f.Memo;
  }
  return [...map.values()];
}

/* ---------- TDX（主要來源，用你設定的免費金鑰）---------- */
async function tdxAuth() {
  if (!TDX_ID || !TDX_SECRET) throw new Error('沒有設定 TDX_ID / TDX_SECRET');
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials', client_id: TDX_ID, client_secret: TDX_SECRET })
  });
  if (!r.ok) throw new Error('TDX 認證失敗 ' + r.status + '（金鑰可能填錯）');
  return 'Bearer ' + (await r.json()).access_token;
}

async function tdxNames(auth) {
  try {
    const r = await fetch(TDX_AIRPORT, { headers: { Accept: 'application/json', Authorization: auth } });
    if (!r.ok) return {};
    const m = {};
    for (const a of await r.json()) {
      /* 優先用城市名（曼谷），沒有才退回機場名去掉「國際機場」（蘇萬那普） */
      const c = a.AirportCityName && a.AirportCityName.Zh_tw;
      const n = a.AirportName && a.AirportName.Zh_tw;
      const v = c || (n ? (n.replace(/國際機場$|機場$/, '') || n) : '');
      if (a.AirportID && v) m[a.AirportID] = v;
    }
    return m;
  } catch { return {}; }
}

function fromTDX(f, nameOf) {
  const hm = s => (String(s || '').split('T')[1] || '').slice(0, 5);
  const dt = s => String(s || '').split('T')[0].replace(/-/g, '/');
  const sch = f.ScheduleArrivalTime || '';
  const act = f.ActualArrivalTime || f.EstimatedArrivalTime || '';
  const rm  = f.ArrivalRemark || '';
  let memo = '';
  if (/取消|CANCEL/i.test(rm))                        memo = '取消';
  else if (/已到|ARRIVED|LANDED/i.test(rm))           memo = '已到';
  else if (/延誤|延遲|DELAY/i.test(rm))               memo = '延遲';
  else if (/時間更改|變更|SCHEDULE CHANGE/i.test(rm)) memo = '時間更改';
  else if (/準時|ON TIME/i.test(rm))                  memo = '準時';
  const schHM = hm(sch), actHM = hm(act);
  return {
    BNO: String(f.Terminal || ''),
    Dep: String(f.DepartureAirportID || ''),
    Gate: String(f.Gate || '').trim(),
    ODate: dt(sch), OTime: schHM ? schHM + ':00' : '',
    RDate: dt(act),
    RTime: (actHM && (actHM !== schHM || memo)) ? actHM + ':00' : '',
    CityName: nameOf(f.DepartureAirportID),
    flightCode: String(f.AirlineID || '') + String(f.FlightNumber || ''),
    Memo: memo, CurrentStatus: '',
  };
}

/* 把開放資料平台的中文欄位轉成本程式內部用的格式 */
function fromODP(f) {
  const day  = s => String(s || '').slice(0, 10).replace(/-/g, '/');
  const hm   = s => String(s || '').slice(0, 5);
  const sch  = hm(f['表訂時間']);
  const est  = hm(f['預計時間']);
  const memo = String(f['備註'] || '').trim();
  const cur  = String(f['航班動態中文'] || '').trim();
  /* 沒有任何異動時，預計時間會等於表訂時間 —— 視為「尚無實際時間」，
     維持原本的白字「表定」顯示，才不會整排都變綠色 */
  const hasReal = est && (est !== sch || memo || cur);
  return {
    BNO: String(f['航廈'] || '').replace('T', ''),
    Gate: String(f['機門'] || '').trim(),
    ODate: day(f['表訂日期']), OTime: sch ? sch + ':00' : '',
    RDate: day(f['預計日期']), RTime: hasReal ? est + ':00' : '',
    CityName: String(f['往來地點中文'] || f['往來地點'] || '').trim(),
    flightCode: String(f['航空公司代碼'] || '').trim() + String(f['班次'] || '').trim(),
    Memo: memo, CurrentStatus: cur,
  };
}

/* 轉機客推估：長榮/華航/星宇的東南亞晚班、清晨歐美班 → 轉機多 */
const TXHUB = new Set(['BR','CI','JX']);
const TXSEA = new Set(['BKK','DMK','SIN','KUL','PEN','CGK','DPS','MNL','CEB','CRK','SGN','HAN','DAD','PNH','REP','KTI','RGN','VTE']);
const TXFAR = new Set(['LAX','SFO','SEA','JFK','EWR','ORD','DFW','IAH','IAD','BOS','ATL','MSP','ONT','YVR','YYZ',
  'CDG','AMS','LHR','FRA','MXP','VIE','MUC','PRG','BCN','IST']);
function txOf(f) {
  const al = String(f.flightCode || '').slice(0, 2).toUpperCase();
  if (!TXHUB.has(al)) return false;
  const dep = String(f.Dep || '').toUpperCase();
  const t = hhmm(f.RTime) || hhmm(f.OTime);
  if (TXSEA.has(dep) && t >= '16:00') return true;
  if (TXFAR.has(dep) && t <= '09:00') return true;
  return false;
}

function statusOf(f) {
  const clean = s => String(s || '').replace(/[\s.．、,]+$/, '').replace(/\s+/g, ' ').trim();
  const memo = clean(f.Memo), cur = clean(f.CurrentStatus);
  /* cur 是桃機原始資料才有的即時動態（地面滑行／抵達機坪），TDX 沒有這欄，
     所以手錶版通常只會落在 memo 那幾種。 */
  if (/取消/.test(memo))            return { txt: '❌ 取消',     cls: 'bad',  done: false };
  if (/抵達機坪/.test(cur))         return { txt: '🛬 抵達機坪', cls: 'ok',   done: true  };
  if (/滑行/.test(cur))             return { txt: '🛬 滑行中',   cls: 'ok',   done: true  };
  if (/降落/.test(cur))             return { txt: '🛬 降落',     cls: 'ok',   done: true  };
  if (/已到/.test(memo) || cur)     return { txt: '✅ 已抵達',   cls: 'ok',   done: true  };
  if (/延遲|延誤/.test(memo))       return { txt: '🕐 延誤',     cls: 'warn', done: false };
  if (/變更|更改/.test(memo))       return { txt: '🔀 時間更改', cls: 'warn', done: false };
  if (/準時/.test(memo))            return { txt: '🟢 準時',     cls: 'info', done: false };
  return { txt: '預計', cls: 'none', done: false };
}


/* 四種分類：
   40 = 第二航廈、登機門屬 2140
   53 = 第二航廈、登機門屬 2153
   t2 = 第二航廈其餘登機門
   t1 = 第一航廈全部 */
function shopOf(f) {
  const g = String(f.Gate || '').trim().toUpperCase();
  /* B6～B9 一航二航都有同名登機門，先以航班資訊的航廈為準，再依登機門歸分點 */
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

/* ── 預估下機人數（TDX 沒機型欄位，用航線推估；誤差約 ±15%）──
   燈號：🟢<150　🟡150–250　🔴>250 */
const LONGHAUL = new Set(['LAX','SFO','SEA','JFK','EWR','ORD','DFW','IAH','IAD','BOS','ATL','MSP','ONT',
  'YVR','YYZ','CDG','AMS','LHR','FRA','MXP','VIE','MUC','IST','PRG','BCN','SYD','BNE','MEL','AKL']);
const MIDHAUL = new Set(['BKK','DMK','SIN','KUL','PEN','CGK','DPS','MNL','SGN','HAN','PNH','KTI','REP',
  'RGN','VTE','DAD','CEB','CRK','DEL','BOM']);
const LCC = new Set(['BX','LJ','7C','TW','RS','ZE','VJ','VZ','AK','5J','DG','Z2','IT','MM','SL','OD','JQ','3K','TR','TT','IX']);
function paxOf(f) {
  const dep = String(f.Dep || '').toUpperCase();
  const al  = String(f.flightCode || '').slice(0, 2).toUpperCase();
  const seats = LONGHAUL.has(dep) ? 333 : (LCC.has(al) ? 189 : (MIDHAUL.has(dep) ? 300 : 250));
  let est = Math.round(seats * (LONGHAUL.has(dep) ? 0.85 : 0.80) / 5) * 5;
  const tx = txOf(f);
  if (tx) est = Math.round(est * 0.75 / 5) * 5;   /* 轉機客不走入境 */
  return { est, tx, dot: est > 250 ? '🔴' : (est >= 150 ? '🟡' : '🟢') };
}
function paxHtml(f) { const p = paxOf(f);
  return ` <i class="px">${p.dot}${p.est}</i>` + (p.tx ? '<i class="tx">🔄</i>' : ''); }

/* ---------- 時段 ----------
   注意：這裡刻意用「陣列」而不是物件。JavaScript 的物件會把 '1330'、'1800'
   這種看起來像整數的 key 自動排到最前面並依數值排序，用物件的話按鈕順序會亂掉。 */
const PRESETS = [
  { id: 'h00', label: '00–06',    win: () => ['00:00', '05:59', '00:00–06:00'] },
  { id: 'h13', label: '13:30–18', win: () => ['13:30', '17:59', '13:30–18:00'] },
  { id: 'h18', label: '18–24',    win: () => ['18:00', '23:59', '18:00–24:00'] },
];
/* 現在該看哪個時段 —— 給 watch.html 當預設入口（06:00–13:30 固定排除） */
const CURRENT_PRESET = H < 6 ? 'h00' : (H < 18 ? 'h13' : 'h18');

/* 分類：四種，可任意複選。每個組合都會產生一個獨立的靜態檔。 */
const CATS = [
  { id: '40', label: '2140' },
  { id: '53', label: '2153' },
  { id: 't1', label: '一航' },
  { id: 't2', label: '二航' },
];
/* 組合代號：固定順序、每個代號剛好兩個字，串起來不會有歧義（例：4053、40t1t2） */
const comboId = ids => CATS.filter(c => ids.includes(c.id)).map(c => c.id).join('');
const ALL_ID  = comboId(CATS.map(c => c.id));
const MINE_ID = comboId(['40', '53']);

/* 15 種非空組合 */
const COMBOS = (() => {
  const out = [];
  for (let m = 1; m < (1 << CATS.length); m++)
    out.push(CATS.filter((_, i) => m & (1 << i)).map(c => c.id));
  return out;
})();

const presetOf = id => PRESETS.find(p => p.id === id);

/* 檔名規則：w-<時段>-<店別>[-h].html   （-h = 隱藏已抵達） */
const fileFor = (p, s, hide) => `w-${p}-${s}${hide ? '-h' : ''}.html`;

/* ---------- 版型 ---------- */
const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0b0d10;color:#f2f4f7;font-family:-apple-system,"PingFang TC","Noto Sans TC",sans-serif;
 font-size:16px;line-height:1.35;padding:6px}
/* 浮動快捷鍵：置頂／現在時段／更新 */
/* 手錶版：按鈕排在最上面跟著內容捲（手錶的瀏覽器一固定就會擋住滑動）。
   300px 以上（手機／電腦）才浮動固定在畫面下方。 */
#fab{display:flex;gap:5px;padding:0;margin-bottom:6px;background:none;border:0}
.fabb{flex:1 1 0;min-width:0;min-height:36px;font:inherit;font-size:15px;font-weight:800;padding:0 2px;
 border-radius:11px;background:rgba(24,28,34,.96);border:2px solid #3a4250;color:#e5e9ef;cursor:pointer;
 white-space:nowrap;text-align:center;text-decoration:none;display:flex;align-items:center;justify-content:center;
 pointer-events:auto;box-shadow:0 4px 14px rgba(0,0,0,.55);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.fabb.on{background:#16324f;border-color:#3b82f6;color:#bfdbfe}
.fabb:active{opacity:.7}
.hd{display:flex;align-items:center;gap:5px;font-size:12px;color:#8b94a1;padding:7px 8px;margin-bottom:7px;
 text-decoration:none;background:#14171c;border:1px solid #262b33;border-radius:10px;min-height:38px;overflow:hidden}
.hd>*{white-space:nowrap;flex:0 0 auto}
.hd b{color:#cbd5e1;font-size:13px}
.hd .u{margin-left:auto;color:#7dd3fc;font-weight:700}
.hd .old{color:#fbbf24}
.r{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:3px 7px;
 background:#14171c;border:1px solid #262b33;border-radius:11px;padding:8px 9px;margin-bottom:6px;overflow:hidden}
.r.done{opacity:.38}
.r.soon{background:#3a2f10;border-color:#a16207}
b.t{font-size:24px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1.05;
 padding:0 6px;border-radius:7px;display:inline-block}
.t-late{color:#fcd34d;background:#3f2c08}
.t-early{color:#7dd3fc;background:#0b2b3c}
.t-same{color:#6ee7b7;background:#0d2f1e}
.t-plan{color:#fff;padding-left:0}
.nd{font-style:normal;font-size:9.5px;font-weight:800;color:#93c5fd;background:#16233c;border:1px solid #2e4a7a;
 border-radius:5px;padding:0 3px;margin-left:3px;vertical-align:super;letter-spacing:0}
.g{font-size:25px;font-weight:800;color:#fff;text-align:center;white-space:nowrap;line-height:1.05}
.tm{font-size:10px;color:#7c8593;vertical-align:super;margin-left:2px}
.tag{font-size:11px;font-weight:800;padding:2px 5px;border-radius:6px;text-align:center;white-space:nowrap;align-self:center;justify-self:start}
.s53{background:#43200f;color:#fdba74} .s40{background:#0d3b36;color:#5eead4}
.st1{background:#2a1f4a;color:#c4b5fd} .st2{background:#232830;color:#9aa3b0}
.f{font-size:18px;font-weight:800;color:#fff;white-space:nowrap;text-align:center}
.c{font-size:13.5px;color:#8b94a1;white-space:normal;word-break:break-word;line-height:1.45;min-width:0}
.px{font-style:normal;font-size:11px;color:#7c8593;white-space:nowrap}
.tx{font-style:normal;font-size:11px;font-weight:800;color:#fbbf24;white-space:nowrap}
.st{font-size:11.5px;font-weight:700;padding:2px 5px;border-radius:6px;text-align:center;white-space:nowrap;align-self:center}
.b-ok{background:#0e2f1b;color:#4ade80} .b-warn{background:#3a2a0c;color:#fbbf24}
.b-bad{background:#3b1414;color:#f87171} .b-none{background:#232830;color:#8b94a1}
.b-info{background:#0b2b3c;color:#7dd3fc}
#age{font-style:normal;font-weight:700;margin-left:7px;color:#7dd3fc}
#age.old{color:#fbbf24}
#age.dead{color:#f87171}
.tst{display:inline-block;padding:7px 14px;margin-top:4px;border-radius:9px;
 background:#1c2027;border:1px solid #2e343d;color:#7dd3fc;font-size:11px;
 font-weight:700;text-decoration:none}
.msg{background:#14171c;border:1px solid #262b33;border-radius:9px;padding:12px;color:#8b94a1;font-size:12px;text-align:center}
.msg.err{background:#3b1414;border-color:#7f1d1d;color:#fca5a5}
.grp{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:5px}
.btn{flex:1 1 100%;min-height:44px;display:flex;align-items:center;justify-content:center;
 background:#1c2027;border:2px solid #2e343d;border-radius:11px;color:#9aa3b0;
 font-size:14.5px;font-weight:650;text-decoration:none;text-align:center;padding:8px 4px}
.btn.on{background:#16324f;border-color:#3b82f6;color:#bfdbfe}
.btn.half{flex:1 1 46%}
.btn.pre{flex:1 1 22%;font-size:13.5px;padding:8px 2px}
.btn.c40.on{background:#0d3b36;border-color:#14b8a6;color:#5eead4}
.btn.c53.on{background:#43200f;border-color:#f97316;color:#fdba74}
.btn.ct1.on{background:#2a1f4a;border-color:#8b5cf6;color:#c4b5fd}
.btn.ct2.on{background:#232a34;border-color:#64748b;color:#cbd5e1}
.r.r40{background:#0c2a25;border-color:#11655b;box-shadow:inset 4px 0 0 #14b8a6}
.r.r53{background:#311d0c;border-color:#8a4513;box-shadow:inset 4px 0 0 #f97316}
.r.r40 .g{color:#5eead4}
.r.r53 .g{color:#fdba74}
.btn.zone{flex:1 1 22%;font-size:13.5px;padding:8px 2px;cursor:pointer;user-select:none}
.mth{font-size:13px;font-weight:800;color:#e5e9ef;margin:2px 0 6px}
.mt{width:100%;border-collapse:collapse;font-size:12px;background:#14171c;margin-bottom:9px}
.mt th,.mt td{border:1px solid #2e343d;padding:6px 4px;text-align:center;line-height:1.4}
.mt th{background:#1c2027;color:#8b94a1;font-size:10.5px;font-weight:700}
.mt td b{font-size:13.5px}
.mt td small{color:#8b94a1}
.mt .g40 .lb{background:#0d3b36;color:#5eead4;font-weight:800}
.mt .g53 .lb{background:#43200f;color:#fdba74;font-weight:800}
.mt .sub td{font-size:10.5px;color:#8b94a1;background:#181c22;text-align:left;padding:4px 6px}
.sep{border-top:1px solid #262b33;margin:10px 0}
.foot{color:#5b636e;font-size:10.5px;text-align:center;padding:8px 4px 2px;line-height:1.6}
.notice{background:#2e2408;border:1px solid #5c4708;color:#fcd34d;font-size:11.5px;
 padding:8px 9px;border-radius:10px;margin:9px 0;line-height:1.55;text-align:center}
.notice b{color:#fde68a}
/* 300px 以上（手機／電腦）才開浮動固定；手錶約 184–224px，維持一般排版才滑得動 */
@media(min-width:300px){
 body{padding-bottom:47px}
 #fab{position:fixed;bottom:5px;bottom:calc(5px + env(safe-area-inset-bottom));top:auto;
   left:5px;right:5px;z-index:70;margin:0;pointer-events:none}
 .fabb{pointer-events:auto}
}
@media(min-width:420px){
 body{max-width:680px;margin:0 auto;padding:14px;padding-bottom:74px}
 #fab{position:fixed;z-index:70;bottom:16px;right:16px;left:auto;top:auto;margin:0;padding:0;gap:8px;
   justify-content:flex-end;pointer-events:none}
 .fabb{flex:0 0 auto;min-height:42px;padding:0 18px;font-size:14px;border-radius:999px;pointer-events:auto}
 .r{grid-template-columns:auto auto auto auto 1fr auto;align-items:center;gap:4px 12px;padding:8px 12px}
 .g{min-width:52px} .tag{text-align:center}
 .btn{flex:0 0 auto;padding:8px 18px;min-height:40px}
}`;

/* 開會空檔（19:00–20:30，2140／2153 分開）—— 以「抓取時刻」的資料算好內嵌 */
function meetTable(flights) {
  const LO = '19:00', HI = '20:30';
  const toMin2 = t => { const p = t.split(':'); return (+p[0]) * 60 + (+p[1]); };
  const toT = m => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  const inWin = flights.filter(f => {
    if (!String(f.Gate || '').trim() || /取消/.test(f.Memo || '')) return false;
    const t = hhmm(f.RTime) || hhmm(f.OTime);
    return t >= LO && t <= HI;
  });
  const calc = (label, cls, rows) => {
    rows.sort((a, b) => (hhmm(a.RTime) || hhmm(a.OTime)).localeCompare(hhmm(b.RTime) || hhmm(b.OTime)));
    let h = `<tr class="${cls}"><td class="lb">${label}</td>`;
    if (!rows.length) return h + '<td colspan="3">✅ 整段沒班機</td></tr>';
    const pts = [toMin2(LO), ...rows.map(f => toMin2(hhmm(f.RTime) || hhmm(f.OTime))), toMin2(HI)];
    let best = { len: -1, i: 0 }; const gaps = [];
    for (let gi = 1; gi < pts.length; gi++) {
      const glen = pts[gi] - pts[gi - 1];
      gaps.push({ s: pts[gi - 1], e: pts[gi], len: glen, i: gi });
      if (glen > best.len) best = { len: glen, s: pts[gi - 1], e: pts[gi], i: gi };
    }
    const pre = best.i >= 2 ? rows[best.i - 2] : null;
    const post = best.i <= rows.length ? rows[best.i - 1] : null;
    const cell = f => f ? (hhmm(f.RTime) || hhmm(f.OTime)) + ' ' + esc(f.flightCode) + '<br><small>' + esc(f.Gate) + '</small>' : '—';
    h += `<td><b>${toT(best.s)}–${toT(best.e)}</b><br><small>${best.len} 分鐘</small></td>`
       + `<td>${cell(pre)}</td><td>${cell(post)}</td></tr>`;
    const others = gaps.filter(x => x.i !== best.i && x.len >= 10).map(x => toT(x.s) + '–' + toT(x.e) + '（' + x.len + '分）');
    if (others.length) h += `<tr class="${cls} sub"><td></td><td colspan="3">其他空檔：${others.join('、')}</td></tr>`;
    return h;
  };
  return `<div class="mth">🕐 ${todayLabel} 開會空檔（${LO}–${HI}）　<small style="color:#8b94a1">依 ${stamp} 抓取的資料</small></div>`
    + '<table class="mt"><tr><th>分點</th><th>最大空檔</th><th>前一班</th><th>後一班</th></tr>'
    + calc('2140', 'g40', inWin.filter(f => shopOf(f) === '40'))
    + calc('2153', 'g53', inWin.filter(f => shopOf(f) === '53'))
    + '</table>';
}

/* 表定今天、但延誤到隔天才會落地 */
function isNextDay(f) {
  const rd = hhmm(f.RTime) ? (f.RDate || f.ODate) : f.ODate;
  return !!(f.ODate && rd && rd > f.ODate);
}

function renderPage(flights, preset, shopKey, hide, err) {
  const [t1, t2, winLabel] = presetOf(preset).win();
  const codes = new Set(shopKey);

  const rows = flights
    .filter(f => {
      if (!String(f.Gate || '').trim()) return false;
      const t = hhmm(f.RTime) || hhmm(f.OTime);
      if (t >= '06:00' && t <= '13:30') return false;   /* 固定排除 06:00–13:30 */
      /* 延誤跨過午夜的班機（表定今天、實際落到隔天）掛在當天最後一段，不然會整班消失 */
      if (isNextDay(f)) { if (preset !== 'h18') return false; }
      else if (t < t1 || t > t2) return false;
      if (!codes.has(shopOf(f))) return false;
      if (hide && statusOf(f).done) return false;
      return true;
    })
    .sort((a, b) => {
      const ta = hhmm(a.RTime) || hhmm(a.OTime), tb = hhmm(b.RTime) || hhmm(b.OTime);
      return (isNextDay(a) ? 1 : 0) - (isNextDay(b) ? 1 : 0)
          || ta.localeCompare(tb) || hhmm(a.OTime).localeCompare(hhmm(b.OTime));
    });

  const cards = rows.map(f => {
    const st = statusOf(f);
    const sch = hhmm(f.OTime), act = hhmm(f.RTime);
    let big, tc, sub;
    if (act) {
      const d = toMin(f.RTime) - toMin(f.OTime) + (isNextDay(f) ? 1440 : 0);
      big = act;
      tc  = d > 0 ? 'late' : (d < 0 ? 'early' : 'same');
      sub = '表定' + sch + (d ? (d > 0 ? ' +' : ' −') + Math.abs(d) : '');
    } else { big = sch; tc = 'plan'; sub = '表定'; }
    if (isNextDay(f)) sub = '隔日 · ' + sub;

    const shop = shopOf(f);
    const eta  = toMin(big) - nowMin;
    const cls  = st.done ? 'done' : ((eta >= 0 && eta <= 45) ? 'soon' : '');
    const tg   = TAG[shop];

    const rowCls = shop === '40' ? ' r40' : (shop === '53' ? ' r53' : '');
    const zg = String(f.Gate || '').trim().charAt(0).toUpperCase();
    return `<div class="r ${cls}${rowCls}" data-z="${zg}">
<b class="t t-${tc}">${big}${isNextDay(f) ? '<i class="nd">隔日</i>' : ''}</b><span class="f">${esc(f.flightCode || '')}</span><span class="g">${esc(f.Gate)}</span>
<span class="tag ${tg.cls}">${tg.txt}</span><span class="c">${esc(f.CityName)}${paxHtml(f)}</span><span class="st b-${st.cls}">${st.txt}</span>
</div>`;
  }).join('');

  const btn = (href, label, on, cls) => `<a class="btn${cls ? ' ' + cls : ''}${on ? ' on' : ''}" href="${href}">${label}</a>`;

  const cur = new Set(shopKey);
  const idOf = set => comboId(CATS.map(c => c.id).filter(id => set.has(id)));

  /* 捷徑：全部 / 只看我的兩點 */
  const shortcut =
      btn(fileFor(preset, ALL_ID,  hide), '全部',      idOf(cur) === ALL_ID,  'half')
    + btn(fileFor(preset, MINE_ID, hide), '2140+2153', idOf(cur) === MINE_ID, 'half');

  /* 複選：點一下加入／移除該分類。只剩一個時不讓取消（連回自己）。 */
  const catBtns = CATS.map(c => {
    const on = cur.has(c.id);
    const next = new Set(cur);
    if (on) next.delete(c.id); else next.add(c.id);
    const target = next.size ? idOf(next) : idOf(cur);
    return btn(fileFor(preset, target, hide), (on ? '✓ ' : '　') + c.label, on, 'half c' + c.id);
  }).join('\n');

  const presetBtns = PRESETS
    .map(p => btn(fileFor(p.id, idOf(cur), hide), p.label, p.id === preset, 'pre')).join('\n');
  const hideBtn = btn(fileFor(preset, idOf(cur), !hide), '🙈 隱藏已抵達：' + (hide ? '是' : '否'), hide, 'half');
  const meetBtn = `<span class="btn half" id="bmeet">🕐 開會空檔</span>`;
  const zoneBtns = ['A','B','C','D'].map(z => `<span class="btn zone on" data-z="${z}">✓ ${z}區</span>`).join('\n');
  /* 跟其他按鈕同尺寸的更新鍵（點自己＝重新載入最新一份） */
  const reloadBtn = btn(fileFor(preset, idOf(cur), hide),
                        '🔄 立即更新　' + stamp + '<i id="age"></i>', false);

  const body = err
    ? `<div class="msg err">這次抓桃機資料失敗<br><small>${esc(err)}</small><br><br>下次排程會自動重試</div>`
    : (rows.length
        ? cards
        : `<div class="msg">這個區間沒有符合的班機${hide ? '<br><small>（目前隱藏了已抵達的班機）</small>' : ''}</div>`);

  return `<!DOCTYPE html>
<html lang="zh-Hant"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
<title>班機手錶版 ${winLabel}</title>
<style>${CSS}</style></head><body data-b="${buildEpoch}" data-c="${idOf(cur)}" data-p="${preset}" data-h="${hide ? 1 : ''}">
<div id="fab">
  <button class="fabb" id="fTop">⬆</button>
  <a class="fabb" id="fNow" href="${fileFor(preset, idOf(cur), hide)}">⏱ 現在</a>
  <a class="fabb" id="fGo" href="${fileFor(preset, idOf(cur), hide)}">🔄</a>
</div>

<a class="hd" href="${fileFor(preset, idOf(cur), hide)}"><b>✈️ 班機手錶版</b><span>${todayLabel} ${presetOf(preset).label}</span><span class="u">${stamp} ↻</span></a>
<div class="grp">${presetBtns}</div>
<div class="grp">${catBtns}</div>
<div class="grp">${zoneBtns}</div>
<div class="grp">${shortcut}</div>
<div class="grp">${hideBtn}${meetBtn}</div>
<div class="grp">${reloadBtn}</div>
<div class="sep"></div>
<div id="meetbox" hidden>${err ? '' : meetTable(flights)}</div>
${body}
<div class="notice">⚠️ 僅供參考<br><b>實際以現場班機營運為主</b><br>👥 數字＝推估走入境的人（±15%）：🟢&lt;150　🟡150–250　🔴&gt;250<br>本頁固定不顯示 06:00–13:30 的班機<br>🔄＝轉機客多，已扣掉0.75</div>
<div class="foot">資料由 GitHub 定時抓取並預先產生，非即時。<br>上方時間 ${stamp} 為抓取時刻，點標題可重新載入最新一份。<br><br><a class="tst" href="wtest.html">連線測試</a><br><br>檔案作者：小韋</div>
<script>
/* 只做兩件事，都不連外網（手錶只擋跨網域連線，一般 JavaScript 可以跑）：
   1. 讓每個連結每次都帶不一樣的網址參數 → 手錶就不會拿舊的快取充數
   2. 算這份資料放了幾分鐘，超過就變色警告                              */
(function(){
  try{
    var now = Date.now();
    var v = '?v=' + now;
    var a = document.getElementsByTagName('a');
    for (var i = 0; i < a.length; i++){
      var h = a[i].getAttribute('href') || '';
      if (h.indexOf('.html') > -1) a[i].setAttribute('href', h.split('?')[0] + v);
    }
    /* 浮動快捷鍵：⬆ 置頂／⏱ 跳到現在的時段／🔄 重新載入 */
    var fab=document.getElementById('fab');
    var bd=document.body, cid=bd.getAttribute('data-c')||'', hid=bd.getAttribute('data-h')?'-h':'',
        cp=bd.getAttribute('data-p')||'';
    var hh=new Date().getHours();
    var np=hh<6?'h00':(hh<18?'h13':'h18');
    var fN=document.getElementById('fNow');
    if(fN){
      fN.setAttribute('href','w-'+np+'-'+cid+hid+'.html'+v);
      if(np===cp) fN.className='fabb on';
    }
    var fT=document.getElementById('fTop');
    if(fT) fT.addEventListener('click',function(){
      try{ window.scrollTo({top:0,behavior:'smooth'}); }catch(e){ window.scrollTo(0,0); }
    });

    /* A–D 區篩選（純本頁 JavaScript，不用連線）＋ 開會空檔開關 */
    var zs={A:1,B:1,C:1,D:1};
    function zApply(){
      var rs=document.querySelectorAll('.r[data-z]');
      for(var i=0;i<rs.length;i++){
        var z=rs[i].getAttribute('data-z');
        rs[i].style.display=(/[A-D]/.test(z)&&!zs[z])?'none':'';
      }
      var bs=document.querySelectorAll('.btn.zone');
      for(var j=0;j<bs.length;j++){
        var zz=bs[j].getAttribute('data-z');
        bs[j].className='btn zone'+(zs[zz]?' on':'');
        bs[j].textContent=(zs[zz]?'✓ ':'　')+zz+'區';
      }
    }
    var zbs=document.querySelectorAll('.btn.zone');
    for(var k=0;k<zbs.length;k++){
      (function(el){
        el.addEventListener('click',function(){
          var z=el.getAttribute('data-z'), cnt=0;
          for(var key in zs) if(zs[key]) cnt++;
          if(zs[z]&&cnt<=1) return;
          zs[z]=!zs[z]; zApply();
        });
      })(zbs[k]);
    }
    var bm=document.getElementById('bmeet'), mbx=document.getElementById('meetbox');
    if(bm&&mbx) bm.addEventListener('click',function(){
      mbx.hidden=!mbx.hidden;
      bm.className='btn half'+(mbx.hidden?'':' on');
    });
    var b = +(document.body.getAttribute('data-b') || 0);
    var el = document.getElementById('age');
    if (b && el){
      var m = Math.floor((now - b) / 60000);
      if (m < 0) m = 0;
      el.textContent = m < 1 ? '（剛更新）' : '（' + m + ' 分前）';
      if (m >= 45) el.className = 'dead';
      else if (m >= 20) el.className = 'old';
    }
  }catch(e){}
})();
</script>
</body></html>`;
}

/* ---------- 主程式 ---------- */
async function main() {
  let flights = [], tomorrowSnap = [], err = '';
  const tried = [];
  const why = e => { const c = e && e.cause; return e.message + (c ? '｜' + (c.code || c.message || '') : ''); };

  /* ── 主要來源：TDX（政府官方，用金鑰，國外機房連得到）── */
  try {
    const auth = await tdxAuth();
    const names = await tdxNames(auth);
    const nameOf = id => names[id] || id || '';
    const res = await fetch(TDX_FLIGHT, { headers: { Accept: 'application/json', Authorization: auth } });
    if (!res.ok) throw new Error('TDX 回應 ' + res.status);
    const tmD0 = new Date(nowTPE.getTime() + 86400000);
    const tomorrow0 = tmD0.getUTCFullYear() + '/' + pad(tmD0.getUTCMonth() + 1) + '/' + pad(tmD0.getUTCDate());
    const listAll = (await res.json())
      .filter(f => !f.IsCargo)
      .map(f => fromTDX(f, nameOf))
      .filter(f => f.OTime);
    const list = listAll.filter(f => f.ODate === today);
    if (!list.length) throw new Error('TDX 回傳 0 筆今日到站');
    flights = mergeCodeshare(list);
    /* 隔日班機留一份給 data.json 快照 —— wtdx 的「現在起6小時」跨日備援要用 */
    tomorrowSnap = mergeCodeshare(listAll.filter(f => f.ODate === tomorrow0));
    console.log(`共掛合併：${list.length} 筆 → ${flights.length} 班`);
    console.log(`✅ TDX 成功，抓到 ${flights.length} 筆到站（${today}）`);
  } catch (e) {
    tried.push('TDX=' + why(e));
    console.error('❌ TDX 失敗：' + why(e));
  }

  /* ── 備援：桃機開放資料平台（鎖台灣 IP，國外通常連不到）── */
  if (!flights.length) {
    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 20000);
      const res = await fetch(ODP, { headers: { Accept: 'application/json' }, signal: ac.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error('回應 ' + res.status);
      const list = JSON.parse(await res.text())
        .filter(f => f['方向'] === 'A').map(fromODP)
        .filter(f => f.OTime && f.ODate === today);
      if (!list.length) throw new Error('0 筆');
      flights = list;
      console.log('✅ 備援 odp 成功');
    } catch (e) { tried.push('odp=' + why(e)); }
  }

  if (!flights.length) err = '所有來源都失敗｜' + tried.join('；');

  await mkdir(OUT, { recursive: true });

  let n = 0;
  for (const p of PRESETS) {
    for (const ids of COMBOS) {
      for (const hide of [false, true]) {
        await writeFile(join(OUT, fileFor(p.id, comboId(ids), hide)),
                        renderPage(flights, p.id, ids, hide, err), 'utf8');
        n++;
      }
    }
  }
  /* 預設入口：自動挑「現在所在的那個六小時區間」＋全部＋不隱藏 */
  await writeFile(join(OUT, 'watch.html'),
                  renderPage(flights, CURRENT_PRESET, CATS.map(c => c.id), false, err), 'utf8');
  console.log(`watch.html 預設時段 = ${CURRENT_PRESET}（現在 ${stamp}）`);

  /* 給 wtdx.html 當備援的資料快照：手錶連不上 TDX 時改讀這份（同網域一定通） */
  const snap = flights.concat(tomorrowSnap);
  await writeFile(join(OUT, 'data.json'), JSON.stringify({ t: stamp, d: snap }), 'utf8');
  console.log(`data.json 快照 ${snap.length} 筆（含隔日 ${tomorrowSnap.length} 筆）`);

  /* 把有 JavaScript 的手機／電腦版一起帶上（如果存在的話） */
  for (const f of ['index.html', 'wtest.html', 'wtdx.html']) {
    try { await access(f); await copyFile(f, join(OUT, f)); console.log('已複製 ' + f); }
    catch { console.log('找不到 ' + f + '，略過'); }
  }

  console.log(`產生 ${n + 1} 個靜態頁 → ${OUT}/`);
  if (err) process.exitCode = 0; // 抓取失敗也要部署（頁面會顯示錯誤訊息）
}

main();
