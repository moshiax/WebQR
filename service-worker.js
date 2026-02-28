const CACHE_NAME = 'webqr-cache-v1';
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
	event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
	event.respondWith(
		caches.match(event.request)
			.then(response => response || fetch(event.request))
	);
});