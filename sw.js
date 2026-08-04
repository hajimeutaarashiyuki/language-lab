// 隨身版 Service Worker：整包快取＝完全離線（版本＝內容雜湊）
var CACHE = 'll-fb20ff462d';
var ASSETS = ['./', './index.html', './manifest.webmanifest',
              './icon-192.png', './icon-512.png', './icon-180.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
    .then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var isNav = e.request.mode === 'navigate'
    || (e.request.destination === 'document');
  if (isNav) {
    // 秒開＋背景更新（stale-while-revalidate）：先用快取瞬間開啟，
    // 背景抓新版寫回快取（配合版本化 CACHE，新版下次啟動生效）。
    // 之前的「連線優先」每次開啟都重下 3MB——秒開才是正確架構。
    e.respondWith(caches.match('./index.html').then(function (hit) {
      var refresh = fetch(e.request).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put('./index.html', copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || refresh;
    }));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
    return hit || fetch(e.request).catch(function () { return caches.match('./index.html'); });
  }));
});
