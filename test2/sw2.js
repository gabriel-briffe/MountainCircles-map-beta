// sw2.js: Service Worker for caching and processing GeoJSON data

import { processGeoJSON } from './processAirspace.js';

const CACHE_NAME = 'geojson-cache-v1';

// Store the promise for fetching and processing /fr_asp.geojson
let geojsonPromise = null;

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
            // Clear the cache and reset the geojsonPromise on every activation
            caches.delete(CACHE_NAME).then(() => {
                console.log(`Cache '${CACHE_NAME}' cleared`);
                geojsonPromise = null; // Reset to ensure fresh fetch on next request
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
                const cache = await caches.open(CACHE_NAME);
                const cachedResponse = await cache.match(event.request);
                if (cachedResponse) {
                    console.log("Returning cached response for:", url.href);
                    return cachedResponse;
                }

                // Fetch and process /fr_asp.geojson only once
                if (!geojsonPromise) {
                    console.log("Initiating fetch for /fr_asp.geojson");
                    geojsonPromise = fetch('/fr_asp.geojson')
                        .then(response => {
                            console.log("Fetch status:", response.status);
                            if (!response.ok) {
                                throw new Error('Fetch failed');
                            }
                            return response.clone().json();
                        })
                        .then(geojsonData => {
                            console.log("GeoJSON data fetched:", geojsonData);
                            console.log("Processing GeoJSON");
                            const processedParts = processGeoJSON(geojsonData);
                            console.log("Processed parts:", processedParts);
                            return processedParts;
                        })
                        .catch(err => {
                            console.error("Error fetching or processing GeoJSON:", err);
                            geojsonPromise = null; // Reset on error to retry next time
                            throw err;
                        });
                }

                // Wait for the shared promise to resolve
                const processedParts = await geojsonPromise;

                // Determine the part key based on URL
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