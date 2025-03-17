const BASE_PATH = '.';
// const BASE_PATH = '/MountainCircles-map-beta/test3';

// <--------------------service worker code-------------------->

const CACHE_NAME = 'airspace-cache-v1';

console.log("Service Worker script loaded");

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log("Received SKIP_WAITING, activating now");
        self.skipWaiting();
    }
});

self.addEventListener('install', event => {
    console.log("Service Worker installing");
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
    console.log("Service Worker activating");
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.delete(CACHE_NAME)
        ])
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    console.log("Fetch event for:", url.href);

    // Only handle airspace.geojson requests
    if (url.pathname.endsWith('airspace.geojson')) {
        event.respondWith(
            caches.open(CACHE_NAME)
                .then(cache => 
                    cache.match(event.request)
                        .then(response => {
                            if (response) {
                                console.log("Returning cached response");
                                return response;
                            }
                            
                            console.log("Fetching airspace data");
                            return fetch(event.request)
                                .then(networkResponse => {
                                    if (networkResponse.ok) {
                                        cache.put(event.request, networkResponse.clone());
                                    }
                                    return networkResponse;
                                })
                                .catch(error => {
                                    console.error("Error fetching airspace data:", error);
                                    return new Response("Error fetching airspace data", { status: 500 });
                                });
                        })
                )
        );
    }
});