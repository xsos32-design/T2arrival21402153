/* 桃機出入境看板・抵達／起飛推播（Cloudflare Worker：tpe-push）2026-11-22
 * App 沒開也收得到「班機已抵達／已起飛」通知（訂閱功能）。
 *
 * 流程：App 按「抵達時通知我」→ POST /watch（裝置代碼＋班號＋預計時間）存進 D1
 *       每分鐘排程：有人在等的班才去查（入境用 tpe-board 的 /snap，出境查桃機官網）
 *       一標「已到」「已飛」「取消」→ 送 Apple 推播（APNs）→ 標記已送
 *
 * 綁定（Settings › Bindings）：
 *   DB     D1 資料庫 tpe-push
 *   BOARD  Service binding → tpe-board（入境資料，已有 60～90 秒共用快取；抓不到改用 GitHub snap.json）
 * 變數：
 *   APNS_KEY_ID   3YF2PJJGY2
 *   APNS_TEAM_ID  T6YQYK84R2
 *   APNS_TOPIC    tw.xsos32.t2board
 * 祕密（自己貼，不要給別人看）：
 *   APNS_KEY      AuthKey_3YF2PJJGY2.p8 的整段內容（含 BEGIN/END 那兩行）
 * 排程：* * * * *（每分鐘）
 */

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const APT = 'https://www.taoyuan-airport.com/api/api/flight/a_flight';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const MAX_PER_DEVICE = 40;
const H = 3600e3, DAY = 86400e3;

const j = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS } });

let READY = false;
async function ready(env) {
  if (READY) return;
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS w (
      tok TEXT NOT NULL, k TEXT NOT NULL, f TEXT NOT NULL, d INTEGER NOT NULL, at INTEGER NOT NULL,
      g TEXT, c TEXT, sent INTEGER NOT NULL DEFAULT 0, sb INTEGER NOT NULL DEFAULT 0, made INTEGER NOT NULL,
      PRIMARY KEY (tok, k))`),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS w_at ON w (sent, at)'),
  ]);
  READY = true;
}

/* 班號統一：CI0112、CI 112 → CI112 */
function codeKey(c) {
  const s = String(c || '').toUpperCase().replace(/\s+/g, '');
  if (s.length <= 2) return s;
  return s.slice(0, 2) + (s.slice(2).replace(/^0+(?=.)/, ''));
}
/* 台灣日期 yyyy-mm-dd ＋ HHMM → 毫秒 */
const tw = (iso, hhmm) => Date.parse(`${iso}T${String(hhmm).slice(0, 2)}:${String(hhmm).slice(2, 4)}:00+08:00`);
const twISO = ms => new Date(ms + 8 * H).toISOString().slice(0, 10);
const hm = ms => new Date(ms + 8 * H).toISOString().slice(11, 16);

export default {
  async fetch(req, env, ctx) {
    const u = new URL(req.url), p = u.pathname.replace(/\/+$/, '') || '/';
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    try {
      if (p === '/') return new Response('t2board push ok', { headers: CORS });
      await ready(env);
      if (p === '/watch' && req.method === 'POST') return watch(await req.json(), env);
      if (p === '/unwatch' && req.method === 'POST') return unwatch(await req.json(), env);
      if (p === '/stat') {
        const r = await env.DB.prepare('SELECT COUNT(*) n, SUM(sent=0) wait, COUNT(DISTINCT tok) dev FROM w').first();
        return j({ ...r, key: env.APNS_KEY ? '有設定' : '沒設定', id: env.APNS_KEY_ID || '', board: !!env.BOARD });
      }
      if (p === '/need') {   // GitHub 那邊問：現在有沒有人在等出境班機（沒有就不用多抓出境資料）
        const n = Date.now(), d = await env.DB.prepare('SELECT COUNT(*) n FROM w WHERE sent=0 AND d=1 AND at BETWEEN ? AND ?').bind(n - 8 * H, n + 4 * H).first('n');
        return j({ d });
      }
      if (p === '/tick') { const out = await tick(env); return j(out); }   // 手動跑一次（測試用，不回傳任何裝置代碼）
      return j({ error: 'not found' }, 404);
    } catch (e) { return j({ error: String(e && e.message || e) }, 500); }
  },
  async scheduled(ev, env, ctx) {
    await ready(env);
    ctx.waitUntil(tick(env));
  },
};

/* ── App 呼叫 ───────────────────────────────── */
const okTok = t => /^[0-9a-f]{64,200}$/i.test(String(t || ''));
async function watch(b, env) {
  if (!okTok(b.token)) return j({ ok: false, why: 'token' }, 400);
  const f = String(b.f || '').trim().slice(0, 12), d = b.dep ? 1 : 0;
  const at = +b.at;
  if (!/^[A-Z0-9]{2}\s*\d{1,5}[A-Z]?$/i.test(f) || !(at > Date.now() - 12 * H && at < Date.now() + 3 * DAY)) return j({ ok: false, why: 'bad' }, 400);
  const n = await env.DB.prepare('SELECT COUNT(*) n FROM w WHERE tok=?').bind(b.token).first('n');
  if (n >= MAX_PER_DEVICE) return j({ ok: false, why: 'too many' }, 429);
  const k = (d ? 'D' : 'A') + codeKey(f) + '@' + twISO(at);
  await env.DB.prepare(`INSERT INTO w (tok,k,f,d,at,g,c,sent,sb,made) VALUES (?,?,?,?,?,?,?,0,?,?)
      ON CONFLICT(tok,k) DO UPDATE SET at=excluded.at, g=excluded.g, c=excluded.c, sb=excluded.sb`)   /* 11/22：已送過的不再重送（只更新時間） */
    .bind(b.token, k, f, d, at, String(b.g || '').slice(0, 8), String(b.c || '').slice(0, 20), b.sandbox ? 1 : 0, Date.now()).run();
  return j({ ok: true, k });
}
async function unwatch(b, env) {
  if (!okTok(b.token)) return j({ ok: false }, 400);
  const f = String(b.f || '').trim(), d = b.dep ? 1 : 0;
  if (b.all) await env.DB.prepare('DELETE FROM w WHERE tok=?').bind(b.token).run();
  else await env.DB.prepare('DELETE FROM w WHERE tok=? AND k LIKE ?').bind(b.token, (d ? 'D' : 'A') + codeKey(f) + '@%').run();
  return j({ ok: true });
}

/* ── 每分鐘 ─────────────────────────────────── */
async function tick(env) {
  const now = Date.now();
  if (new Date(now).getUTCMinutes() === 7) await env.DB.prepare('DELETE FROM w WHERE at < ? OR (sent=1 AND at < ?)').bind(now - 12 * H, now - 3 * H).run();
  const { results: list } = await env.DB.prepare('SELECT rowid id, * FROM w WHERE sent=0 AND at BETWEEN ? AND ?').bind(now - 8 * H, now + 4 * H).all();
  if (!list.length) return { wait: 0 };
  const needA = list.some(r => !r.d), dDays = [...new Set(list.filter(r => r.d).map(r => twISO(r.at)))];
  const [arr, dep] = await Promise.all([needA ? arrivals(env).catch(e => ({ err: String(e.message || e) })) : null, dDays.length ? departures(dDays).catch(e => ({ err: String(e.message || e) })) : null]);
  let sent = 0, gone = 0;
  const jwt = await apnsJWT(env).catch(() => null);
  for (const r of list) {
    const src = r.d ? dep : arr;
    if (!src || src.err) continue;
    const x = pick(src, r);
    if (!x) continue;
    let title = '', body = '';
    const where = [x.g || r.g ? '登機門 ' + (x.g || r.g) : '', r.c].filter(Boolean).join('・');
    if (x.cancel) { title = `${r.f} 已取消`; body = (where ? where + '・' : '') + '請以航空公司公告為準'; }
    else if (x.done) { title = `${r.f} 已${r.d ? '起飛' : '抵達'}`; body = (where ? where + '・' : '') + (x.t ? '實際 ' + x.t : '') + '（以現場為準）'; }
    else continue;
    if (!jwt) continue;
    const res = await push(env, jwt, r.tok, r.sb, { aps: { alert: { title, body }, sound: 'default', 'thread-id': 'flight' }, k: r.k });
    if (res === 'ok') { sent++; await env.DB.prepare('UPDATE w SET sent=1 WHERE tok=? AND k=?').bind(r.tok, r.k).run(); }
    else if (res === 'gone') { gone++; await env.DB.prepare('DELETE FROM w WHERE tok=?').bind(r.tok).run(); }
  }
  return { wait: list.length, sent, gone, arr: arr && (arr.err || arr.rows.length + '班@' + arr.at), dep: dep && (dep.err || dep.rows.length + '班@' + dep.at) };
}

/* 找同一班、表定時間最接近使用者按的那一班（±12 小時內） */
function pick(src, r) {
  const want = codeKey(r.f);
  let best = null, bd = 12 * H;
  for (const x of src.rows) {
    if (x.k !== want) continue;
    const dd = Math.abs(x.s - r.at);
    const de = x.e ? Math.abs(x.e - r.at) : dd;
    const m = Math.min(dd, de);
    if (m < bd) { bd = m; best = x; }
  }
  return best;
}

/* 入境：tpe-board 的 /snap（大家共用）＋ GitHub 每 5 分鐘的 snap.json，哪份比較新用哪份 */
const SITE = 'https://xsos32-design.github.io/T2arrival21402153/';
const fresh = t => { const m = /(\d\d):(\d\d)/.exec(t || ''); if (!m) return 9999; const n = new Date(Date.now() + 8 * H); let a = n.getUTCHours() * 60 + n.getUTCMinutes() - (+m[1] * 60 + +m[2]); if (a < 0) a += 1440; return a; };
async function getJ(u, init) { const r = await (init || fetch)(u, { headers: { Accept: 'application/json' }, cf: { cacheTtl: 30 } }); if (!r.ok) throw new Error(r.status); return r.json(); }
async function arrivals(env) {
  const [a, b] = await Promise.all([
    getJ('https://tpe-board/snap', env.BOARD ? (u, o) => env.BOARD.fetch(u, o) : null).catch(() => null),
    getJ(SITE + 'snap.json?v=' + Math.floor(Date.now() / 60e3)).catch(() => null),
  ]);
  const s = [a, b].filter(x => x && x.f && x.f.length).sort((x, y) => fresh(x.t) - fresh(y.t))[0];
  if (!s) throw new Error('入境資料抓不到');
  if (fresh(s.t) > 45) throw new Error('入境資料太舊 ' + s.t);
  const base = String(s.d || '').replace(/\//g, '-');
  const rows = s.f.map(a => {
    const sch = tw(base, a[4]) + (a[6] || 0) * DAY, e = a[5] ? tw(base, a[5]) + (a[7] || 0) * DAY : 0;
    const memo = String(a[8] || '');
    return { k: codeKey(a[0]), s: sch, e, g: a[2], done: /已到/.test(memo), cancel: /取消/.test(memo), t: e ? hm(e) : '' };
  });
  return { rows, at: s.t };
}

/* 出境：先問桃機官網（AState D）；被擋就用 GitHub 每 5 分鐘的 dep.json */
async function departures(days) {
  const rows = [];
  try {
    for (const iso of days) {
      const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 9000);
      let a;
      try {
        const r = await fetch(APT, { method: 'POST', signal: ac.signal,
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': UA, Origin: 'https://www.taoyuan-airport.com', Referer: 'https://www.taoyuan-airport.com/' },
          body: JSON.stringify({ AState: 'D', ODate: iso.replace(/-/g, '/'), language: 'ch' }) });
        if (!r.ok) throw new Error('桃機 ' + r.status);
        a = await r.json();
      } finally { clearTimeout(tm); }
      for (const f of a || []) {
        const ot = String(f.OTime || '').slice(0, 5); if (!ot) continue;
        const od = String(f.ODate || iso).slice(0, 10).replace(/\//g, '-');
        const sch = tw(od, ot.replace(':', ''));
        const rt = String(f.RTime || '').slice(0, 5), rd = String(f.RDate || od).slice(0, 10).replace(/\//g, '-');
        const e = rt ? tw(rd, rt.replace(':', '')) : 0;
        rows.push(depRow(f.flightCode || (String(f.ACode || '') + String(f.FlightNo || '')), sch, e, f.Gate, f.Memo, f.CurrentStatus));
      }
    }
    if (rows.length) return { rows, at: 'apt' };
  } catch (e) {}
  const s = await getJ(SITE + 'dep.json?v=' + Math.floor(Date.now() / 60e3));
  if (!s || !s.f || !s.f.length) throw new Error('出境資料抓不到');
  if (fresh(s.t) > 45) throw new Error('出境資料太舊 ' + s.t);
  const base = String(s.d || '').replace(/\//g, '-');
  for (const a of s.f) rows.push(depRow(a[0], tw(base, a[4]) + (a[6] || 0) * DAY, a[5] ? tw(base, a[5]) + (a[7] || 0) * DAY : 0, a[2], a[8], a[9]));
  return { rows, at: s.t };
}
function depRow(code, sch, e, gate, memo, cur) {
  memo = String(memo || ''); cur = String(cur || '');
  return { k: codeKey(code), s: sch, e, g: String(gate || '').trim(), done: /已飛|起飛/.test(cur) || /出發/.test(memo), cancel: /取消/.test(memo), t: e ? hm(e) : '' };
}

/* ── Apple 推播（APNs，金鑰式 JWT，ES256，50 分鐘換一次）─────────── */
let JWT = null;
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64uStr = s => b64u(new TextEncoder().encode(s));
async function apnsJWT(env) {
  if (JWT && JWT.exp > Date.now()) return JWT.v;
  if (!env.APNS_KEY || !env.APNS_KEY_ID || !env.APNS_TEAM_ID) throw new Error('APNs 金鑰沒設定');
  const pem = String(env.APNS_KEY).replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = b64uStr(JSON.stringify({ alg: 'ES256', kid: env.APNS_KEY_ID }));
  const body = b64uStr(JSON.stringify({ iss: env.APNS_TEAM_ID, iat: Math.floor(Date.now() / 1000) }));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(head + '.' + body));
  JWT = { v: head + '.' + body + '.' + b64u(sig), exp: Date.now() + 50 * 60e3 };
  return JWT.v;
}
/* 回傳 ok / gone（裝置已移除 App）/ fail。正式版（TestFlight、App Store）走 production；失敗 BadDeviceToken 再試 sandbox */
async function push(env, jwt, tok, sandbox, payload) {
  const send = host => fetch(`https://${host}/3/device/${tok}`, { method: 'POST',
    headers: { authorization: 'bearer ' + jwt, 'apns-topic': env.APNS_TOPIC || 'tw.xsos32.t2board', 'apns-push-type': 'alert',
      'apns-priority': '10', 'apns-expiration': String(Math.floor(Date.now() / 1000) + 3600), 'content-type': 'application/json' },
    body: JSON.stringify(payload) });
  let r = await send(sandbox ? 'api.sandbox.push.apple.com' : 'api.push.apple.com');
  if (r.status === 200) return 'ok';
  let why = ''; try { why = (await r.json()).reason || ''; } catch (e) {}
  if (r.status === 400 && why === 'BadDeviceToken' && !sandbox) {
    r = await send('api.sandbox.push.apple.com');
    if (r.status === 200) return 'ok';
  }
  if (r.status === 410 || why === 'Unregistered') return 'gone';
  if (r.status === 403 && /Token/.test(why)) JWT = null;
  console.log('apns', r.status, why);
  return 'fail';
}
