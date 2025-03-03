const ICAO_CLASS_MAPPING = {
    0: "A",
    1: "B",
    2: "C",
    3: "D",
    4: "E",
    5: "F",
    6: "G",
    8: "Other"
};

const TYPE_MAPPING = {
    0: "AWY",
    1: "Restricted",
    2: "Dangerous",
    3: "Prohibited",
    4: "CTR",
    5: "TMZ",
    6: "RMZ",
    7: "TMA",
    10: "FIR",
    21: "gliding",
    26: "CTA",
    28: "Para/voltige",
    29: "ZSM",
    33: "SIV",
    34: "aéromodélisme",
    35: "treuil",
    36: "activité particulière"
};

const UNIT_MAPPING = {
    1: "ft",
    6: "FL"
};

const REFERENCE_DATUM_MAPPING = {
    0: "GND",
    1: "MSL",
    2: "1013"
};

const FT_TO_M = 0.3048;
const BASE_PATH = '.';
// const BASE_PATH = '/MountainCircles-map-beta/test2';

// <--------------------helper functions-------------------->

function translateData(props) {
    // Clone the properties to avoid side effects
    const translated = { ...props };

    // Helper function to flatten nested objects with a prefix
    function flattenObject(obj, prefix = '', target = {}) {
        for (const [key, value] of Object.entries(obj)) {
            const newKey = prefix ? `${prefix}${key.charAt(0).toUpperCase() + key.slice(1)}` : key;
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                flattenObject(value, newKey, target);
            } else {
                target[newKey] = value;
            }
        }
        return target;
    }

    // Process all properties, flattening nested objects (strings or parsed)
    const keys = Object.keys(translated);
    for (const key of keys) {
        const value = translated[key];
        // Handle JSON strings
        if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
            try {
                const parsed = JSON.parse(value);
                if (typeof parsed === 'object' && parsed !== null) {
                    const flattened = flattenObject(parsed, key);
                    Object.assign(translated, flattened);
                    delete translated[key];
                }
            } catch (e) {
                console.log(`Error parsing ${key}:`, e);
            }
        }
        // Handle already-parsed objects
        else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const flattened = flattenObject(value, key);
            Object.assign(translated, flattened);
            delete translated[key];
        }
    }


    if (translated.hasOwnProperty("icaoClass")) {
        translated["icaoClass"] = ICAO_CLASS_MAPPING[translated["icaoClass"]] || translated["icaoClass"];
    }

    if (translated.hasOwnProperty("type")) {
        translated["type"] = TYPE_MAPPING[translated["type"]] || translated["type"];
    }

    if (translated.hasOwnProperty("lowerLimitValue")) {
        try {
            translated["lowerLimitValue"] = translated["lowerLimitValue"];
            translated["lowerLimitUnit"] = UNIT_MAPPING[translated["lowerLimitUnit"]] || translated["lowerLimitUnit"];
            translated["lowerLimitReferenceDatum"] = REFERENCE_DATUM_MAPPING[translated["lowerLimitReferenceDatum"]] || translated["lowerLimitReferenceDatum"];
            if (translated["lowerLimitUnit"] === "FL") {
                translated["parsedLowerLimit"] = `${translated["lowerLimitUnit"]}${translated["lowerLimitValue"]}`;
                translated["lowerLimitMeters"] = Math.round(translated["lowerLimitValue"] * 100 * FT_TO_M);
            } else {
                translated["parsedLowerLimit"] = `${translated["lowerLimitValue"]}${translated["lowerLimitUnit"]} ${translated["lowerLimitReferenceDatum"]}`;
                translated["lowerLimitMeters"] = Math.round(translated["lowerLimitValue"] * FT_TO_M);
            }
        } catch (e) {
            // If parsing fails, keep the original value.
            console.log("Error parsing lowerLimit:", e);
        }
    }

    if (translated.hasOwnProperty("upperLimitValue")) {
        try {
            translated["upperLimitValue"] = translated["upperLimitValue"];
            translated["upperLimitUnit"] = UNIT_MAPPING[translated["upperLimitUnit"]] || translated["upperLimitUnit"];
            translated["upperLimitReferenceDatum"] = REFERENCE_DATUM_MAPPING[translated["upperLimitReferenceDatum"]] || translated["upperLimitReferenceDatum"];
            if (translated["upperLimitUnit"] === "FL") {
                translated["parsedUpperLimit"] = `${translated["upperLimitUnit"]}${translated["upperLimitValue"]}`;
                translated["upperLimitMeters"] = Math.round(translated["upperLimitValue"] * 100 * FT_TO_M);
            } else {
                translated["parsedUpperLimit"] = `${translated["upperLimitValue"]}${translated["upperLimitUnit"]} ${translated["upperLimitReferenceDatum"]}`;
                translated["upperLimitMeters"] = Math.round(translated["upperLimitValue"] * FT_TO_M);
            }
        } catch (e) {
            // If parsing fails, keep the original value.
            console.log("Error parsing upperLimit:", e);
        }
    }


    return translated;
}

/**
* Processes a main GeoJSON file by translating feature properties and dispatching features
* into categories one-by-one. If a feature does not match any condition, it is placed in the "other" category.
*
* @param {Object} data - The main GeoJSON object.
* @returns {Object} An object containing the categorized GeoJSON parts.
*/
function processGeoJSON(data) {
    console.log("processing main geojson file");

    // Translate every feature's properties (flattening only)
    const processedFeatures = data.features.map(feature => {
        const newProperties = translateData(feature.properties);
        // console.log("Processed feature properties:", newProperties); // Debug log
        return { ...feature, properties: newProperties };
    });

    // Initialize parts as empty FeatureCollections.
    const parts = {
        parks: { type: "FeatureCollection", features: [] },
        SIV: { type: "FeatureCollection", features: [] },
        FIR: { type: "FeatureCollection", features: [] },
        gliding: { type: "FeatureCollection", features: [] },
        ZSM: { type: "FeatureCollection", features: [] },
        PROHIBITED: { type: "FeatureCollection", features: [] },
        other: { type: "FeatureCollection", features: [] }
    };

    // Iterate over features and dispatch one by one.
    for (const feature of processedFeatures) {
        let dispatched = false;
        const props = feature.properties;
        const icaoClass = props.icaoClass;
        const type = props.type;
        const name = props.name || "";

        // Dispatch to "parks":
        // parks are features with (icaoClass === 8 and name includes "PARC/RESERVE")
        // or features with type === 21.
        if (icaoClass === "Other" && name.includes("PARC/RESERVE")) {
            parts.parks.features.push(feature);
            dispatched = true;
        }

        // gliding are features with type === 21.
        if (!dispatched && type === "gliding") {
            //if name starts with LTA set custom property to "LTA"
            if (name.startsWith("LTA")) {
                feature.properties.customProperty = "LTA";
            }
            parts.gliding.features.push(feature);
            dispatched = true;
        }

        // Dispatch to "SIV": features with type === 33.
        if (!dispatched && type === "SIV") {
            parts.SIV.features.push(feature);
            dispatched = true;
        }

        // Dispatch to "FIR": features with type === "FIR".
        if (!dispatched && type === "FIR") {
            parts.FIR.features.push(feature);
            dispatched = true;
        }

        // Dispatch to "ZSM": features with type === "ZSM".
        if (!dispatched && type === "ZSM") {
            parts.ZSM.features.push(feature);
            dispatched = true;
        }

        // Dispatch to "PROHIBITED": features with type === "Prohibited".
        if (!dispatched && type === "Prohibited") {
            parts.PROHIBITED.features.push(feature);
            dispatched = true;
        }

        // If none of the above conditions match, add it to "other".
        if (!dispatched) {
            parts.other.features.push(feature);
        }
    }

    return parts;
}



// <--------------------service worker code-------------------->

const CACHE_NAME = 'geojson-cache-v1';

// Store the promise for fetching and processing /merged_asp.geojson
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
            // Cl jear the cache and reset the geojsonPromise on every activation
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
    //add basepath
    // if (url.pathname.startsWith(`/data/`)) {
    if (url.pathname.startsWith(`${BASE_PATH}/data/`)) {
        event.respondWith((async () => {
            try {
                console.log("Opening cache");
                const cache = await caches.open(CACHE_NAME);
                const cachedResponse = await cache.match(event.request);
                if (cachedResponse) {
                    console.log("Returning cached response for:", url.href);
                    return cachedResponse;
                }

                // Fetch and process /merged_asp.geojson only once
                if (!geojsonPromise) {
                    console.log("Initiating fetch for merged_asp.geojson using BASE_PATH");
                    // geojsonPromise = fetch(`merged_asp.geojson`)
                    geojsonPromise = fetch(`${BASE_PATH}/merged_asp.geojson`)
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
                            // console.log("Processed parts:", processedParts);
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
                            url.pathname.endsWith('ZSM.geojson') ? 'ZSM' :
                                url.pathname.endsWith('gliding.geojson') ? 'gliding' :
                                    url.pathname.endsWith('PROHIBITED.geojson') ? 'PROHIBITED' :
                                        url.pathname.endsWith('other.geojson') ? 'other' :
                                            null;
                console.log("Selected part key:", partKey);

                if (!processedParts[partKey]) {
                    console.log("No data for partKey, returning 404");
                    return new Response('Not found', { status: 404 });
                }

                const processedData = processedParts[partKey];
                // console.log("Returning data:", processedData);
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