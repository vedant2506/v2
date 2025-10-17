// sw.js

const CACHE_NAME = 'attendance-no-cache-v1';
const URLS_TO_CACHE = [];

// Install the service worker and cache all the app's content
self.addEventListener('install', event => {
    // Activate immediately
    self.skipWaiting();
    event.waitUntil(
        (async () => {
            // Ensure our (empty) cache exists; also clear any residuals
            await caches.open(CACHE_NAME);
        })()
    );
});

// Serve cached content when offline
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    event.respondWith((async () => {
        try {
            const noStoreReq = new Request(event.request, { cache: 'no-store' });
            return await fetch(noStoreReq);
        } catch (err) {
            // Network failed: optionally fallback to cache if something is there
            const cached = await caches.match(event.request);
            if (cached) return cached;
            // As a last resort, try the root
            return fetch('./');
        }
    })());
});

// Clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names.map(name => name !== CACHE_NAME ? caches.delete(name) : Promise.resolve()));
        // Take control of open pages immediately
        await self.clients.claim();
    })());
});