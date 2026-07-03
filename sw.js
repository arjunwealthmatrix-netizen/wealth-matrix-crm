// Wealth Matrix CRM — Service Worker
// Caches the app shell so it opens instantly and works offline.
// Data (leads/clients) still comes from localStorage + Google Sheets sync —
// this only caches the HTML/CSS/JS shell, never your business data.

const CACHE_NAME = 'wm-crm-shell-v1';
const SHELL_FILES = [
  './crm.html',
  './manifest.json'
];

// Install: cache the app shell
self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(SHELL_FILES);
    })
  );
});

// Activate: clean up old cache versions
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; })
             .map(function(n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first for the app shell (always get latest version if online),
// fall back to cache if offline. Never intercepts Google Sheets/Apps Script calls.
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // Don't cache or intercept API calls to Google — always go to network
  if (url.includes('script.google.com') || url.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // Got fresh version — update cache for offline fallback next time
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(function() {
        // Offline — serve from cache
        return caches.match(event.request);
      })
  );
});
