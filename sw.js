// Service Worker File: sw.js

const CACHE_NAME = 'mountaincircles-v1';
const TILE_CACHE_NAME = 'mountaincircles-tiles-v1';
const GEOJSON_CACHE_NAME = 'mountaincircles-geojson-v1';
const DYNAMIC_CACHE_NAME = 'mountaincircles-dynamic-v1';

const BASE_PATH = '/MountainCircles-map-beta';

// Global counter for the number of network fetches served (i.e., when there's no cached response)
let networkFetchCount = 0;

// Resources to cache immediately on install
const INITIAL_CACHE_URLS = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/peaks.geojson`,
  `${BASE_PATH}/passes.geojson`,
  `${BASE_PATH}/icons/icon-192.png`,
  'https://cdn.jsdelivr.net/npm/maplibre-gl@latest/dist/maplibre-gl.js',
  'https://cdn.jsdelivr.net/npm/maplibre-gl@latest/dist/maplibre-gl.css',
  'https://fonts.googleapis.com/icon?family=Material+Icons+Round'
];

// Cache GeoJSON files for each policy and configuration
const POLICY_CONFIGS = {
  'alps': ['10-100-250-4200', '20-100-250-4200', '25-100-250-4200', '30-100-250-4200'],
  'West_alps_with_fields': ['10-100-250-4200', '20-100-250-4200', '25-100-250-4200', '30-100-250-4200']
};

// Install event - cache initial resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(INITIAL_CACHE_URLS))
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith('mountaincircles-'))
          .filter(name => ![CACHE_NAME, TILE_CACHE_NAME, GEOJSON_CACHE_NAME, DYNAMIC_CACHE_NAME].includes(name))
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Helper function to normalize URLs
function normalizeUrl(url) {
  return url.pathname.startsWith(BASE_PATH) ? url.pathname : `${BASE_PATH}${url.pathname}`;
}

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests and requests to other domains
  if (event.request.method !== 'GET' || !url.pathname.startsWith(BASE_PATH)) {
    return;
  }

  // Handle tile requests
  if (url.pathname.includes('/tiles/')) {
    event.respondWith(handleTileRequest(event.request));
    return;
  }

  // Handle GeoJSON requests
  if (url.pathname.endsWith('.geojson')) {
    event.respondWith(handleGeoJSONRequest(event.request));
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
            if (response.ok) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, responseToCache));
            }
            return response;
          })
          .catch(error => {
            console.error('Fetch failed:', error);
            return new Response('Network error', { status: 503 });
          });
      })
  );
});

// Handle tile requests
async function handleTileRequest(request) {
  const cache = await caches.open(TILE_CACHE_NAME);
  try {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('Tile fetch failed:', error);
    return new Response('Tile not available offline', { status: 404 });
  }
}

// Handle GeoJSON requests
async function handleGeoJSONRequest(request) {
  try {
    // Check dynamic cache first
    const dynamicCache = await caches.open(DYNAMIC_CACHE_NAME);
    let response = await dynamicCache.match(request);
    if (response) {
      return response;
    }

    // Then check regular GeoJSON cache
    const cache = await caches.open(GEOJSON_CACHE_NAME);
    response = await cache.match(request);
    if (response) {
      return response;
    }

    // If not in cache, fetch from network
    response = await fetch(request);
    if (response.ok) {
      // Store in regular GeoJSON cache
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('GeoJSON fetch failed:', error);
    return new Response('GeoJSON not available offline', { status: 404 });
  }
}

// Handle messages from the client
self.addEventListener('message', async (event) => {
  if (event.data.type === 'cacheFiles') {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    let completed = 0;
    const total = event.data.files.length;
    
    // Send initial message to confirm receipt
    event.source.postMessage({
      type: 'cacheStart',
      message: `Starting to cache ${total} files`
    });
    
    // Process files one at a time to ensure reliable progress updates
    for (const file of event.data.files) {
      try {
        // The file path already includes /MountainCircles-map-beta/, so we don't need to add BASE_PATH
        const url = new URL(`.${file}`, self.location.origin).href;
        event.source.postMessage({
          type: 'cacheProgress',
          message: `Attempting to fetch: ${url}`,
          completed: completed,
          total: total,
          currentFile: file
        });
        
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
          completed++;
          event.source.postMessage({
            type: 'cacheProgress',
            message: `Successfully cached: ${file}`,
            completed: completed,
            total: total,
            currentFile: file
          });
        } else {
          event.source.postMessage({
            type: 'cacheError',
            message: `Failed to fetch ${file}: ${response.status} ${response.statusText}`
          });
        }
      } catch (error) {
        event.source.postMessage({
          type: 'cacheError',
          message: `Failed to cache ${file}: ${error.message}`
        });
      }
    }
    
    // Send completion message
    event.source.postMessage({
      type: 'cacheComplete',
      message: `Successfully cached ${completed} of ${total} files`
    });
  }
}); 