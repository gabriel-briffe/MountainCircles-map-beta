import { ICAO_CLASS_MAPPING, TYPE_MAPPING, UNIT_MAPPING, REFERENCE_DATUM_MAPPING } from './mappings.js';

/**
 * Translates airspace properties into richer, human‐readable form.
 *
 * @param {Object} props - The original properties from a GeoJSON feature.
 * @returns {Object} The translated properties.
 */
export function translateData(props) {
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
export function processGeoJSON(data) {
    console.log("processing main geojson file");

    // Translate every feature's properties (flattening only)
    const processedFeatures = data.features.map(feature => {
        const newProperties = translateData(feature.properties);
        console.log("Processed feature properties:", newProperties); // Debug log
        return { ...feature, properties: newProperties };
    });

    // Initialize parts as empty FeatureCollections.
    const parts = {
        parks: { type: "FeatureCollection", features: [] },
        SIV: { type: "FeatureCollection", features: [] },
        FIR: { type: "FeatureCollection", features: [] },
        gliding: { type: "FeatureCollection", features: [] },
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

        // Dispatch to "FIR": features with type === 10.
        if (!dispatched && type === "FIR") {
            parts.FIR.features.push(feature);
            dispatched = true;
        }

        // If none of the above conditions match, add it to "other".
        if (!dispatched) {
            parts.other.features.push(feature);
        }
    }

    return parts;
} 