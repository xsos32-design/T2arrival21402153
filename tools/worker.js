/* ══ 小韋班機看板・即時中繼（Cloudflare Worker）2026-10-29 ══
   手錶的瀏覽器讀不到桃機，GitHub 快照又只有 10 分鐘～1 小時更新一次。
   這支放在 Cloudflare（免費），手錶要資料時才去交通部 TDX 抓，抓到的存 60 秒給大家共用。
   回傳格式跟 GitHub 的 snap.json 一模一樣，手錶版不用改讀法。

   設定（在 Cloudflare 後台 → 這支 Worker → Settings → Variables and Secrets，自己填，不要給別人看）：
     TDX_ID      交通部 TDX 的 Client Id      （選填；沒填就用匿名查詢）
     TDX_SECRET  交通部 TDX 的 Client Secret  （選填）
   網址：https://<你取的名字>.<你的帳號>.workers.dev/snap */

const TDX_TOKEN = 'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token';
const TDX_ARR   = 'https://tdx.transportdata.tw/api/basic/v2/Air/FIDS/Airport/Arrival/TPE';
const SEL = 'FlightDate,FlightNumber,AirlineID,DepartureAirportID,ScheduleArrivalTime,EstimatedArrivalTime,ActualArrivalTime,Terminal,Gate,ArrivalRemark,IsCargo';
const META = 'https://xsos32-design.github.io/T2arrival21402153/meta.json';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const KEEP = 60;          /* 同一份資料共用幾秒 */
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Max-Age': '86400' };

let TOKEN = null;         /* { v, exp } 同一台 Worker 重複用，省一次認證 */
let METAC = null;         /* { t, n, x } 機場中文名、轉機比例，1 小時抓一次 */

const pad = n => (n < 10 ? '0' : '') + n;
function tpeNow() { return new Date(Date.now() + 8 * 3600000); }
function isoOf(d) { return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }

async function token(env) {
  if (!env.TDX_ID || !env.TDX_SECRET) return '';
  if (TOKEN && TOKEN.exp > Date.now() + 60000) return TOKEN.v;
  const r = await fetch(TDX_TOKEN, { method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.TDX_ID, client_secret: env.TDX_SECRET }) });
  if (!r.ok) return '';
  const j = await r.json();
  TOKEN = { v: 'Bearer ' + j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return TOKEN.v;
}

async function meta() {
  if (METAC && Date.now() - METAC.at < 3600000) return METAC;
  try {
    const r = await fetch(META + '?cb=' + Math.floor(Date.now() / 3600000), { cf: { cacheTtl: 3600 } });
    if (r.ok) { const j = await r.json(); METAC = { at: Date.now(), n: j.n || {}, x: j.x || {} }; }
  } catch (e) {}
  return METAC || { n: {}, x: {} };
}

async function tdx(env, today, tomorrow) {
  const filter = `date(FlightDate) ge ${today} and date(FlightDate) le ${tomorrow} and IsCargo eq false`;
  const url = TDX_ARR + '?%24select=' + SEL + '&%24filter=' + encodeURIComponent(filter) + '&%24format=JSON';
  const tries = [];
  const auth = await token(env).catch(() => '');
  if (auth) tries.push(auth);
  tries.push('');                                   /* 金鑰不行就匿名再試一次 */
  let last = '';
  for (const a of tries) {
    const h = { Accept: 'application/json', 'User-Agent': UA };
    if (a) h.Authorization = a;
    const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), 12000);
    try {
      const r = await fetch(url, { headers: h, signal: ac.signal });
      clearTimeout(tm);
      if (r.ok) return { list: await r.json(), mode: a ? 'key' : 'anon' };
      last = 'TDX ' + r.status;
    } catch (e) { clearTimeout(tm); last = String(e && e.message || e); }
  }
  throw new Error(last || 'TDX 失敗');
}

/* TDX 一筆 → snap.json 一列：[班號, 出發地, 登機門, 航廈, 表定時刻, 實際時刻, 表定日偏移, 實際日偏移, 備註, 轉機比例] */
function toRows(list, todayISO, X) {
  const base = Date.parse(todayISO + 'T00:00:00Z');
  const hm = s => (String(s || '').split('T')[1] || '').slice(0, 5);
  const dOff = s => { const d = String(s || '').split('T')[0]; if (!d) return 0; const b = Date.parse(d + 'T00:00:00Z'); return isNaN(b) ? 0 : Math.round((b - base) / 86400000); };
  const seen = new Map();
  for (const f of list) {
    if (f.IsCargo) continue;
    const sch = f.ScheduleArrivalTime || '', act = f.ActualArrivalTime || f.EstimatedArrivalTime || '';
    const rm = f.ArrivalRemark || '';
    let memo = '';
    if (/取消|CANCEL/i.test(rm)) memo = '取消';
    else if (/已到|ARRIVED|LANDED/i.test(rm)) memo = '已到';
    else if (/延誤|延遲|DELAY/i.test(rm)) memo = '延遲';
    else if (/時間更改|變更|SCHEDULE CHANGE/i.test(rm)) memo = '時間更改';
    else if (/準時|ON TIME/i.test(rm)) memo = '準時';
    const s = hm(sch), a = hm(act); if (!s) continue;
    const code = String(f.AirlineID || '') + String(f.FlightNumber || '');
    const dep = String(f.DepartureAirportID || ''), gate = String(f.Gate || '').trim(), bno = String(f.Terminal || '');
    /* 共掛班號（同一架飛機好幾個班號）合併成一列：時間＋登機門＋航廈＋出發地 */
    const k = dOff(sch) + '|' + s + '|' + gate + '|' + bno + '|' + dep;
    const row = [code, dep, gate, bno, s.replace(':', ''), (a && (a !== s || memo)) ? a.replace(':', '') : '',
                 dOff(sch), a ? dOff(act) : 0, memo, typeof X[code.toUpperCase()] === 'number' ? X[code.toUpperCase()] : 0];
    const old = seen.get(k);
    if (!old) seen.set(k, row);
    else { if (!old[5] && row[5]) { old[5] = row[5]; old[7] = row[7]; } if (!old[8] && row[8]) old[8] = row[8]; if (!old[9] && row[9]) old[9] = row[9]; }
  }
  return [...seen.values()];
}

/* 來源一：桃機官網那支（資料最完整，有滑行／抵達機坪）。國外機房常被擋，擋了就換下一個 */
const APT = 'https://www.taoyuan-airport.com/api/api/flight/a_flight';
async function apt(todayISO, tomorrowISO, X) {
  const base = Date.parse(todayISO + 'T00:00:00Z');
  const dOff = s => { const d = String(s || '').slice(0, 10).replace(/\//g, '-'); if (!d) return 0; const b = Date.parse(d + 'T00:00:00Z'); return isNaN(b) ? 0 : Math.round((b - base) / 86400000); };
  const hm = s => String(s || '').slice(0, 5);
  const one = async iso => {
    const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), 8000);
    try {
      const r = await fetch(APT, { method: 'POST', signal: ac.signal,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': UA, Origin: 'https://www.taoyuan-airport.com', Referer: 'https://www.taoyuan-airport.com/' },
        body: JSON.stringify({ AState: 'A', ODate: iso.replace(/-/g, '/'), language: 'ch' }) });
      clearTimeout(tm);
      if (!r.ok) throw new Error('桃機 ' + r.status);
      return await r.json();
    } catch (e) { clearTimeout(tm); throw e; }
  };
  const [a, b] = await Promise.all([one(todayISO), one(tomorrowISO).catch(() => [])]);
  const rows = [];
  for (const f of (a || []).concat(b || [])) {
    const s = hm(f.OTime); if (!s) continue;
    if (String(f.Memo || '').includes('貨')) continue;
    const code = String(f.flightCode || ((f.ACode || '') + (f.FlightNo || ''))).trim();
    const act = hm(f.RTime), memo = String(f.Memo || '').trim() || String(f.CurrentStatus || '').trim();
    rows.push([code, String(f.CityCode || '').trim(), String(f.Gate || '').trim(), String(f.BNO || ''),
      s.replace(':', ''), act ? act.replace(':', '') : '', dOff(f.ODate), act ? dOff(f.RDate || f.ODate) : 0, memo,
      typeof X[code.toUpperCase()] === 'number' ? X[code.toUpperCase()] : 0]);
  }
  if (!rows.length) throw new Error('桃機 0 班');
  return rows;
}

/* 備援：桃機開放資料平台（不用金鑰；有時只讓台灣連線，連不到就算了） */
const ODP = 'https://odp.taoyuan-airport.com/dataset/2025102001?format=json';
async function odp(todayISO, X) {
  const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), 12000);
  try {
    const r = await fetch(ODP, { headers: { Accept: 'application/json', 'User-Agent': UA }, signal: ac.signal });
    clearTimeout(tm);
    if (!r.ok) throw new Error('odp ' + r.status);
    const base = Date.parse(todayISO + 'T00:00:00Z');
    const dOff = s => { const d = String(s || '').slice(0, 10).replace(/\//g, '-'); if (!d) return 0; const b = Date.parse(d + 'T00:00:00Z'); return isNaN(b) ? 0 : Math.round((b - base) / 86400000); };
    const hm = s => String(s || '').slice(0, 5);
    const rows = [];
    for (const f of await r.json()) {
      if (f['方向'] !== 'A') continue;
      const s = hm(f['表訂時間']); if (!s) continue;
      const est = hm(f['預計時間']), memo = String(f['備註'] || '').trim(), cur = String(f['航班動態中文'] || '').trim();
      const real = est && (est !== s || memo || cur);
      const code = String(f['航空公司代碼'] || '').trim() + String(f['班次'] || '').trim();
      const so = dOff(f['表訂日期']); if (so < 0 || so > 1) continue;
      rows.push([code, String(f['往來地點'] || '').trim(), String(f['機門'] || '').trim(), String(f['航廈'] || '').replace('T', ''),
        s.replace(':', ''), real ? est.replace(':', '') : '', so, real ? dOff(f['預計日期']) : 0, memo || cur,
        typeof X[code.toUpperCase()] === 'number' ? X[code.toUpperCase()] : 0]);
    }
    if (!rows.length) throw new Error('odp 0 班');
    return rows;
  } catch (e) { clearTimeout(tm); throw e; }
}

async function build(env) {
  const n = tpeNow(), today = isoOf(n), tomorrow = isoOf(new Date(n.getTime() + 86400000));
  const M = await meta();
  let rows = [], src = '', why = [];
  try { rows = await apt(today, tomorrow, M.x || {}); src = 'apt'; } catch (e) { why.push(String(e && e.message || e)); }
  if (!rows.length) try { const { list, mode } = await tdx(env, today, tomorrow); rows = toRows(list, today, M.x || {}); src = 'tdx-' + mode; }
  catch (e) { why.push(String(e && e.message || e)); }
  if (!rows.length) {
    try { rows = await odp(today, M.x || {}); src = 'odp'; } catch (e) { why.push(String(e && e.message || e)); }
  }
  if (!rows.length) throw new Error(why.join('；') || '0 班');
  return { t: pad(n.getUTCHours()) + ':' + pad(n.getUTCMinutes()), d: today.replace(/-/g, '/'), f: rows, src: 'worker-' + src, at: Date.now() };
}

export default {
  async fetch(req, env, ctx) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const u = new URL(req.url);
    if (u.pathname === '/' ) return new Response('小韋班機看板中繼：/snap', { headers: { 'Content-Type': 'text/plain; charset=utf-8', ...CORS } });
    if (u.pathname === '/probe') {          /* 檢查各來源通不通（不含任何金鑰內容） */
      const n = tpeNow(), today = isoOf(n), tomorrow = isoOf(new Date(n.getTime() + 86400000)), out = {};
      const t = async (k, fn) => { const s0 = Date.now(); try { const r = await fn(); out[k] = 'ok ' + (r.length || 0) + ' 班 ' + (Date.now() - s0) + 'ms'; } catch (e) { out[k] = 'x ' + String(e && e.message || e) + ' ' + (Date.now() - s0) + 'ms'; } };
      await t('桃機', () => apt(today, tomorrow, {}));
      await t('TDX', async () => toRows((await tdx(env, today, tomorrow)).list, today, {}));
      await t('開放資料', () => odp(today, {}));
      out['金鑰'] = (env.TDX_ID && env.TDX_SECRET) ? '有設定' : '沒設定';
      return new Response(JSON.stringify(out, null, 1), { headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS } });
    }
    if (u.pathname !== '/snap') return new Response('not found', { status: 404, headers: CORS });

    const cache = caches.default;
    const key = new Request(u.origin + '/snap');
    const lastKey = new Request(u.origin + '/snap-last');     /* 最後一份成功的，留 1 天當備用 */
    const hit = await cache.match(key);
    if (hit && u.searchParams.get('fresh') !== '1') {
      const r = new Response(hit.body, hit); r.headers.set('X-Cache', 'hit'); return r;
    }
    try {
      const body = JSON.stringify(await build(env));
      const res = new Response(body, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=' + KEEP, ...CORS } });
      ctx.waitUntil(cache.put(key, res.clone()));
      ctx.waitUntil(cache.put(lastKey, new Response(body, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=86400', ...CORS } })));
      return res;
    } catch (e) {
      /* 抓不到：有舊的就給舊的（標明），沒有才回錯誤，讓手錶改走 GitHub 快照 */
      const old = hit || await cache.match(lastKey);
      if (old) { const r = new Response(old.body, old); r.headers.set('X-Cache', 'stale'); r.headers.set('Cache-Control', 'no-store'); return r; }
      return new Response(JSON.stringify({ error: String(e && e.message || e) }), { status: 502, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS } });
    }
  },
};
