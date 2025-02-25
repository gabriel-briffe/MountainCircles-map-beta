// sw2.js: Service Worker for caching and processing GeoJSON data

import { processGeoJSON } from './processAirspace.js';

const CACHE_NAME = 'geojson-cache-v1';

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
  event.waitUntil(self.clients.claim());
});

self.addEventListener('activate', event => {
  console.log("Service Worker activating");
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clear the cache on every activation
      caches.delete(CACHE_NAME).then(() => {
        console.log(`Cache '${CACHE_NAME}' cleared`);
      }).catch(err => {
        console.error(`Error clearing cache '${CACHE_NAME}':`, err);
      })
    ])
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  console.log("Fetch event for:", url.href);
  if (url.pathname.startsWith('/data/')) {
    event.respondWith((async () => {
      try {
        console.log("Opening cache");
        const cache = await caches.open('geojson-cache-v1');
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          console.log("Returning cached response for:", url.href);
          return cachedResponse;
        }

        console.log("Fetching /fr_asp.geojson");
        const mainGeoJSONResponse = await fetch('/fr_asp.geojson');
        console.log("Fetch status:", mainGeoJSONResponse.status);
        if (!mainGeoJSONResponse.ok) {
          console.log("Fetch failed, returning 404");
          return new Response('Main GeoJSON not available', { status: 404 });
        }
        const geojsonData = await mainGeoJSONResponse.clone().json();
        console.log("GeoJSON data fetched:", geojsonData);

        console.log("Processing GeoJSON");
        const processedParts = processGeoJSON(geojsonData);
        console.log("Processed parts:", processedParts);

        //if the url ends with parks.geojson, use the parks key, if it ends with known.geojson, use the known key, if it ends with ground.geojson, use the ground key
        const partKey = url.pathname.endsWith('parks.geojson') ? 'parks' :
          url.pathname.endsWith('SIV.geojson') ? 'SIV' :
            url.pathname.endsWith('FIR.geojson') ? 'FIR' :
              url.pathname.endsWith('gliding.geojson') ? 'gliding' :
                url.pathname.endsWith('other.geojson') ? 'other' :
                  null;
        console.log("Selected part key:", partKey);

        if (!processedParts[partKey]) {
          console.log("No data for partKey, returning 404");
          return new Response('Not found', { status: 404 });
        }

        const processedData = processedParts[partKey];
        console.log("Returning data:", processedData);
        const response = new Response(JSON.stringify(processedData), {
          headers: { 'Content-Type': 'application/json' }
        });

        console.log("Caching response");
        await cache.put(event.request, response.clone());
        return response;
      } catch (err) {
        console.error("Error in fetch handler:", err);
        return new Response("Error processing GeoJSON", { status: 500 });
      }
    })());
  }
});