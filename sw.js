// Service Worker File: sw.js

const CACHE_NAME = 'mountaincircles-v1';
const TILE_CACHE_NAME = 'mountaincircles-tiles-v1';

// Global counter for the number of network fetches served (i.e., when there's no cached response)
let networkFetchCount = 0;

// Resources to cache immediately on install
const INITIAL_CACHE_URLS = [
  '/MountainCircles-map-beta/',
  '/MountainCircles-map-beta/index.html',
  '/MountainCircles-map-beta/manifest.json',
  '/MountainCircles-map-beta/peaks.geojson',
  '/MountainCircles-map-beta/passes.geojson',
  'https://cdn.jsdelivr.net/npm/maplibre-gl@latest/dist/maplibre-gl.js',
  'https://cdn.jsdelivr.net/npm/maplibre-gl@latest/dist/maplibre-gl.css',
  'https://fonts.googleapis.com/icon?family=Material+Icons+Round'
];

// Install event - cache initial resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(INITIAL_CACHE_URLS))
  );
  // Activate this SW immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith('mountaincircles-') && name !== CACHE_NAME && name !== TILE_CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  // Take control of all clients immediately.
  self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Handle tile requests separately
  if (url.pathname.includes('/tiles/')) {
    event.respondWith(handleTileRequest(event.request));
    return;
  }

  // Handle other requests
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then(response => {
            // Cache successful responses
            if (response.ok) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, responseToCache));
            }
            return response;
          });
      })
  );
});

// Special handling for tile requests
async function handleTileRequest(request) {
  const cache = await caches.open(TILE_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('Tile fetch failed:', error);
    return new Response('Tile not available offline', { status: 404 });
  }
} 