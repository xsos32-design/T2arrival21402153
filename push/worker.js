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
 *   VAPID_KEY     網頁推播 VAPID 私鑰（PKCS8 PEM）；VAPID_PUBLIC（變數）＝對應公鑰
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
    env.DB.prepare('CREATE TABLE IF NOT EXISTS wsub (tok TEXT PRIMARY KEY, ep TEXT NOT NULL, p TEXT NOT NULL, a TEXT NOT NULL, made INTEGER NOT NULL)'),
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
      if (p === '/wwatch' && req.method === 'POST') return wwatch(await req.json(), env);      // 網頁推播（瀏覽器）
      if (p === '/wunwatch' && req.method === 'POST') return wunwatch(await req.json(), env);
      if (p === '/vapid') return j({ key: env.VAPID_PUBLIC || '' });
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
const okTok = t => /^[0-9a-f]{64,200}$/i.test(String(t || '')) || /^web:[0-9a-f]{48}$/.test(String(t || ''));
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

/* ── 網頁推播：瀏覽器的訂閱（endpoint＋金鑰）換成一個 web: 代碼，班機照樣存在 w 表 ── */
async function webTok(ep) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(ep))));
  return 'web:' + [...h].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 48);
}
async function wwatch(b, env) {
  const sub = b.sub || {}, ep = String(sub.endpoint || ''), k = sub.keys || {};
  if (!/^https:\/\//.test(ep) || !k.p256dh || !k.auth) return j({ ok: false, why: 'sub' }, 400);
  const tok = await webTok(ep);
  await env.DB.prepare('INSERT INTO wsub (tok,ep,p,a,made) VALUES (?,?,?,?,?) ON CONFLICT(tok) DO UPDATE SET p=excluded.p, a=excluded.a')
    .bind(tok, ep, String(k.p256dh), String(k.auth), Date.now()).run();
  return watch({ ...b, token: tok }, env);
}
async function wunwatch(b, env) {
  const ep = String((b.sub && b.sub.endpoint) || b.endpoint || '');
  if (!ep) return j({ ok: false }, 400);
  return unwatch({ ...b, token: await webTok(ep) }, env);
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
    let res;
    if (r.tok.startsWith('web:')) res = await webPush(env, r.tok, { title, body, tag: r.k });
    else { if (!jwt) continue; res = await push(env, jwt, r.tok, r.sb, { aps: { alert: { title, body }, sound: 'default', 'thread-id': 'flight' }, k: r.k }); }
    if (res === 'ok') { sent++; await env.DB.prepare('UPDATE w SET sent=1 WHERE tok=? AND k=?').bind(r.tok, r.k).run(); }
    else if (res === 'gone') { gone++; await env.DB.batch([env.DB.prepare('DELETE FROM w WHERE tok=?').bind(r.tok), env.DB.prepare('DELETE FROM wsub WHERE tok=?').bind(r.tok)]); }
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

/* ── 網頁推播（Web Push：RFC 8291 aes128gcm 加密＋RFC 8292 VAPID）──────────
   祕密 VAPID_KEY：VAPID 私鑰（PKCS8 PEM）；變數 VAPID_PUBLIC：公鑰（base64url，給網頁訂閱用）
   回傳 ok / gone（瀏覽器已取消訂閱）/ fail */
const ub = s => Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((String(s).length + 3) % 4)), c => c.charCodeAt(0));
const cat = (...a) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
const te = s => new TextEncoder().encode(s);
let VKEY = null;
async function vapidKey(env) {
  if (VKEY) return VKEY;
  const pem = String(env.VAPID_KEY || '').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  VKEY = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), c => c.charCodeAt(0)), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  return VKEY;
}
async function hkdf(salt, ikm, info, len) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8));
}
async function encryptWP(p256dh, auth, plain) {
  const ua = ub(p256dh), au = ub(auth);
  const eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const as = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', ua, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const secret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, eph.privateKey, 256));
  const ikm = await hkdf(au, secret, cat(te('WebPush: info\0'), ua, as), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, te('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, te('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, cat(te(plain), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]);   // 4096
  return cat(salt, rs, new Uint8Array([as.length]), as, ct);
}
async function webPush(env, tok, msg) {
  if (!env.VAPID_KEY || !env.VAPID_PUBLIC) return 'fail';
  const sub = await env.DB.prepare('SELECT ep,p,a FROM wsub WHERE tok=?').bind(tok).first();
  if (!sub) return 'gone';
  const aud = new URL(sub.ep).origin;
  const head = b64uStr(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const claims = b64uStr(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUB || 'https://tpeboard.com' }));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, await vapidKey(env), te(head + '.' + claims));
  const jwt = head + '.' + claims + '.' + b64u(sig);
  const body = await encryptWP(sub.p, sub.a, JSON.stringify(msg));
  const r = await fetch(sub.ep, { method: 'POST', body,
    headers: { 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '3600', Urgency: 'high',
      Authorization: 'vapid t=' + jwt + ', k=' + env.VAPID_PUBLIC } });
  if (r.status >= 200 && r.status < 300) return 'ok';
  if (r.status === 404 || r.status === 410) return 'gone';
  console.log('webpush', r.status, (await r.text()).slice(0, 200));
  return 'fail';
}
