import { COLOR_MAPPING } from "./mappings.js";

// const BASE_PATH = '/MountainCircles-map-beta/test3';
const BASE_PATH = '.';

const style = {
  version: 8,
  name: "LibreMap GL - Airspace Styled",
  sources: {
    "osm-tiles": {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors"
    },
    "airspace": {
      type: "geojson",
      data: `${BASE_PATH}/airspace.geojson`
    }
  },
  layers: [
    {
      id: "osm-layer",
      type: "raster",
      source: "osm-tiles",
      minzoom: 0,
      maxzoom: 19
    },
    {
      id: "airspace-fill",
      type: "fill",
      source: "airspace",
      paint: {
        "fill-color": "rgba(0, 0, 0, 0)",  // Transparent fill
        "fill-opacity": 0  // No opacity
      }
    },
    {
      id: "airspace-outline",
      type: "line",
      source: "airspace",
      layout: {
        "line-sort-key": ["get", "upperLimitMeters"]
      },
      paint: {
        "line-color": [
          "match",
          ["get", "type"],
          // ICAO classes
          "A", COLOR_MAPPING["A"],
          "C", COLOR_MAPPING["C"],
          "D", COLOR_MAPPING["D"],
          "E", COLOR_MAPPING["E"],
          "G", COLOR_MAPPING["G"],
          // Special areas
          "PROHIBITED", COLOR_MAPPING["PROHIBITED"],
          "DANGER", COLOR_MAPPING["DANGER"],
          "RESTRICTED", COLOR_MAPPING["RESTRICTED"],
          "FIR", COLOR_MAPPING["FIR"],
          "FIS_SECTOR", COLOR_MAPPING["FIS_SECTOR"],
          "OVERFLIGHT_RESTRICTION", COLOR_MAPPING["OVERFLIGHT_RESTRICTION"],
          "TRA", COLOR_MAPPING["TRA"],
          "UNCLASSIFIED", COLOR_MAPPING["UNCLASSIFIED"],
          // Additional types
          "ACTIVITY", COLOR_MAPPING["ACTIVITY"],
          "GLIDING_SECTOR", COLOR_MAPPING["GLIDING_SECTOR"],
          "MTA", COLOR_MAPPING["MTA"],
          "TMZ", COLOR_MAPPING["TMZ"],
          // Default
          COLOR_MAPPING["other"]
        ],
        "line-width": 2  // Consistent line width
      }
    }
  ]
};

export default style;

