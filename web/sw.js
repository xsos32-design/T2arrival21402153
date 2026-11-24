/* tpeboard.com 網頁推播（11/24）：看板關著也能收到「已抵達／已起飛」通知
   只處理推播，不做離線快取（不影響看板原本的更新方式） */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: '桃機出入境看板', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || '桃機出入境看板', {
    body: d.body || '', tag: d.tag || 'flight', renotify: true,
    icon: 'img/icon-arr-192.png', badge: 'img/icon-arr-192.png', data: { url: d.url || './' }
  }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) { if ('focus' in cs[i]) return cs[i].focus(); }
    return self.clients.openWindow(url);
  }));
});
