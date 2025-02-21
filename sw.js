// Service Worker File: sw.js

const CACHE_NAME = 'mountaincircles-v1';
const TILE_CACHE_NAME = 'mountaincircles-tiles-v1';
const GEOJSON_CACHE_NAME = 'mountaincircles-geojson-v1';
const DYNAMIC_CACHE_NAME = 'mountaincircles-dynamic-v1';

// Global counter for the number of network fetches served (i.e., when there's no cached response)
let networkFetchCount = 0;

// Resources to cache immediately on install
const INITIAL_CACHE_URLS = [
  '/MountainCircles-map-beta/',
  '/MountainCircles-map-beta/index.html',
  '/MountainCircles-map-beta/manifest.json',
  '/MountainCircles-map-beta/peaks.geojson',
  '/MountainCircles-map-beta/passes.geojson',
  '/MountainCircles-map-beta/icons/icon-192.png',
  'https://cdn.jsdelivr.net/npm/maplibre-gl@latest/dist/maplibre-gl.js',
  'https://cdn.jsdelivr.net/npm/maplibre-gl@latest/dist/maplibre-gl.css',
  'https://fonts.googleapis.com/icon?family=Material+Icons+Round'
];

// Cache GeoJSON files for each policy and configuration
const POLICY_CONFIGS = {
  'alps': ['10-100-250-4200', '20-100-250-4200', '25-100-250-4200', '30-100-250-4200'],
  'West_alps_with_fields': ['10-100-250-4200', '20-100-250-4200', '25-100-250-4200', '30-100-250-4200']
};

// Install event - cache initial resources and policy configurations
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(cache => cache.addAll(INITIAL_CACHE_URLS)),
      caches.open(GEOJSON_CACHE_NAME).then(async cache => {
        // Cache all policy/config combinations
        for (const [policy, configs] of Object.entries(POLICY_CONFIGS)) {
          for (const config of configs) {
            const configPath = `${policy}/${config}`;
            try {
              // Cache main GeoJSON file
              await cache.add(`/MountainCircles-map-beta/${configPath}/aa_${policy}_${config.split('-').slice(0, 3).join('-')}.geojson`);
              // Cache sectors GeoJSON file
              await cache.add(`/MountainCircles-map-beta/${configPath}/aa_${policy}_${config.split('-').slice(0, 3).join('-')}_sectors1.geojson`);
            } catch (error) {
              console.error(`Failed to cache GeoJSON for ${configPath}:`, error);
            }
          }
        }
      })
    ])
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
          .filter(name => name.startsWith('mountaincircles-'))
          .filter(name => ![
            CACHE_NAME, 
            TILE_CACHE_NAME, 
            GEOJSON_CACHE_NAME,
            DYNAMIC_CACHE_NAME
          ].includes(name))
          .map(name => caches.delete(name))
      );
    })
  );
  // Take control of all clients immediately.
  self.clients.claim();
});

// Helper function to determine if a request is for a map tile
function isTileRequest(url) {
  return url.includes('/tiles/');
}

// Helper function to determine if a request is for a GeoJSON file
function isGeoJSONRequest(url) {
  return url.endsWith('.geojson');
}

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Handle tile requests
  if (isTileRequest(url.pathname)) {
    event.respondWith(handleTileRequest(event.request));
    return;
  }

  // Handle GeoJSON requests
  if (isGeoJSONRequest(url.pathname)) {
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

// Handle tile requests
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

// Handle GeoJSON requests
async function handleGeoJSONRequest(request) {
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

  try {
    response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('GeoJSON fetch failed:', error);
    return new Response('GeoJSON not available offline', { status: 404 });
  }
}

// Add this message handler after your other event listeners
self.addEventListener('message', async (event) => {
    if (event.data.type === 'cacheFiles') {
        const cache = await caches.open(DYNAMIC_CACHE_NAME);
        let completed = 0;
        
        // Cache each file and report progress
        for (const file of event.data.files) {
            try {
                await cache.add(file);
                completed++;
                // Send progress back to the page
                event.source.postMessage({
                    type: 'cacheProgress',
                    completed: completed
                });
            } catch (error) {
                console.error(`Failed to cache ${file}:`, error);
            }
        }
    }
}); 