const CACHE_NAME = 'webqr-cache-v2';

const urlsToCache = [
	'./',
	'./index.html',
	'./css/style.css',
	'./js/main.js',
	'./js/jsQR.js'
];

self.addEventListener('install', event => {
	event.waitUntil(
		caches.open(CACHE_NAME)
			.then(cache => cache.addAll(urlsToCache))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', event => {
	event.waitUntil(
		caches.keys().then(keys =>
			Promise.all(
				keys
					.filter(key => key !== CACHE_NAME)
					.map(key => caches.delete(key))
			)
		).then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', event => {
	if (event.request.method !== 'GET') return;

	event.respondWith(
		fetch(event.request)
			.then(networkResponse => {
				const clone = networkResponse.clone();
				caches.open(CACHE_NAME).then(cache => {
					cache.put(event.request, clone);
				});
				return networkResponse;
			})
			.catch(() => {
				return caches.match(event.request);
			})
	);
});