const CACHE_NAME = '20261114';

// 需要快取的核心靜態資源
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'
];

// 安裝階段：預先快取核心檔案
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('部分資源快取略過:', err);
      });
    })
  );
  self.skipWaiting();
});

// 啟動階段：清除舊版本快取
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// 攔截請求：Firebase API 走網路即時連線，靜態資源採網路優先並支援快取備援
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 略過非 GET 請求與 Firebase Firestore/Auth 即時資料連線
  if (
    event.request.method !== 'GET' ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('identitytoolkit')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // 僅快取成功的同源或 CDN 靜態回應
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // 離線狀態時從快取讀取
        return caches.match(event.request);
      })
  );
});
