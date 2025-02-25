// import { ICAO_CLASS_MAPPING, TYPE_MAPPING, UNIT_MAPPING, REFERENCE_DATUM_MAPPING } from './mappings.js';

/**
 * Translates airspace properties into richer, human‐readable form.
 *
 * @param {Object} props - The original properties from a GeoJSON feature.
 * @returns {Object} The translated properties.
 */
export function translateData(props) {
    // Clone the properties to avoid side effects
    const translated = { ...props };

    //   if (translated.hasOwnProperty("icaoClass")) {
    //     const val = Number(translated["icaoClass"]);
    //     translated["icaoClassTranslated"] = ICAO_CLASS_MAPPING[val] || val;
    //   }

    //   if (translated.hasOwnProperty("type")) {
    //     const val = Number(translated["type"]);
    //     translated["typeTranslated"] = TYPE_MAPPING[val] || val;
    //   }

    //   if (translated.hasOwnProperty("lowerLimit")) {
    //     try {
    //       const lower = JSON.parse(translated["lowerLimit"]);
    //       lower.unitTranslated = UNIT_MAPPING[lower.unit] || lower.unit;
    //       lower.referenceDatumTranslated = REFERENCE_DATUM_MAPPING[lower.referenceDatum] || lower.referenceDatum;
    //       translated["lowerLimit"] = lower;
    //     } catch (e) {
    //       // If parsing fails, keep the original value.
    //     }
    //   }

    //   if (translated.hasOwnProperty("upperLimit")) {
    //     try {
    //       const upper = JSON.parse(translated["upperLimit"]);
    //       upper.unitTranslated = UNIT_MAPPING[upper.unit] || upper.unit;
    //       upper.referenceDatumTranslated = REFERENCE_DATUM_MAPPING[upper.referenceDatum] || upper.referenceDatum;
    //       translated["upperLimit"] = upper;
    //     } catch (e) {
    //       // If parsing fails, keep the original value.
    //     }
    //   }

    //   if (translated.hasOwnProperty("frequencies")) {
    //     try {
    //       translated["frequencies"] = JSON.parse(translated["frequencies"]);
    //     } catch (e) {
    //       // If parsing fails, do nothing.
    //     }
    //   }

    //   if (translated.hasOwnProperty("hoursOfOperation")) {
    //     try {
    //       translated["hoursOfOperation"] = JSON.parse(translated["hoursOfOperation"]);
    //     } catch (e) {
    //       // If parsing fails, do nothing.
    //     }
    //   }

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
    
    // Translate every feature's properties.
    const processedFeatures = data.features.map(feature => {
        const newProperties = translateData(feature.properties);
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
        const icaoClass = Number(props.icaoClass);
        const type = Number(props.type);
        const name = props.name || "";

        // Dispatch to "parks":
        // parks are features with (icaoClass === 8 and name includes "PARC/RESERVE")
        // or features with type === 21.
        if (icaoClass === 8 && name.includes("PARC/RESERVE")) {
            parts.parks.features.push(feature);
            dispatched = true;
        }

        // gliding are features with type === 21.
        if (!dispatched && type === 21) {
            //if name starts with LTA set custom property to "LTA"
            if (name.startsWith("LTA")) {
                feature.properties.customProperty = "LTA";
            }
            parts.gliding.features.push(feature);
            dispatched = true;
        }
        
        // Dispatch to "SIV": features with type === 33.
        if (!dispatched && type === 33) {
            parts.SIV.features.push(feature);
            dispatched = true;
        }
        
        // Dispatch to "FIR": features with type === 10.
        if (!dispatched && type === 10) {
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