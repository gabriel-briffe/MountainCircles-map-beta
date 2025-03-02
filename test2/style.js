import { COLOR_MAPPING } from "./mappings.js";

const BASE_PATH = '/MountainCircles-map-beta/test2';
// const BASE_PATH = '.';

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
    "parks": {
      type: "geojson",
      data: `${BASE_PATH}/data/parks.geojson`
    },
    "SIV": {
      type: "geojson",
      data: `${BASE_PATH}/data/SIV.geojson`
    },
    "FIR": {
      type: "geojson",
      data: `${BASE_PATH}/data/FIR.geojson`
    },
    "gliding": {
      type: "geojson",
      data: `${BASE_PATH}/data/gliding.geojson`
    },
    "other": {
      type: "geojson",
      data: `${BASE_PATH}/data/other.geojson`
    },
    "ZSM": {
      type: "geojson",
      data: `${BASE_PATH}/data/ZSM.geojson`
    },
    "PROHIBITED": {
      type: "geojson",
      data: `${BASE_PATH}/data/PROHIBITED.geojson`
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
      id: "parks-outline",
      type: "line",
      source: "parks",
      paint: {
        "line-color": COLOR_MAPPING["Prohibited"],
        "line-dasharray": [3,3],
        "line-width": 2
      }
    },
    {
      id: "parks-fill",
      type: "fill",
      source: "parks",
      paint: {
        "fill-color": COLOR_MAPPING["Prohibited"],
        "fill-opacity": 0
      }
    },
    {
      id: "SIV-outline",
      type: "line",
      source: "SIV",
      layout: {
        "visibility": "none"
      },
      paint: {
        "line-color": COLOR_MAPPING["SIV"],
        "line-width": 2,
        "line-dasharray": [2,5]
      }
    },
    {
      id: "SIV-fill",
      type: "fill",
      source: "SIV",
      paint: {
        "fill-opacity": 0
      }
    },
    {
      id: "FIR-outline",
      type: "line",
      source: "FIR",
      layout: {
        "visibility": "none"
      },
      paint: {
        "line-color": COLOR_MAPPING["FIR"],
        "line-width": 1
      }
    },
    {
      id: "FIR-fill",
      type: "fill",
      source: "FIR",
      paint: {
        "fill-opacity": 0
      }
    },
    {
      id: "gliding-outline",
      type: "line",
      source: "gliding",
      paint: {
        "line-color": COLOR_MAPPING["gliding"],
        "line-width": 2
      }
    },
    {
      id: "gliding-fill",
      type: "fill",
      source: "gliding",
      paint: {
        "fill-opacity": 0,
      }
    },
    {
      id: "other-outline",
      type: "line",
      source: "other",
      layout: {
        // "line-sort-key": ["get", "icaoClass"]
        "line-sort-key": [
          "case",
          ["==", ["get", "upperLimitUnit"], "FL"],
          ["*", ["to-number", ["get", "upperLimitValue"]], 100],
          ["to-number", ["get", "upperLimitValue"]]
        ]
      },
      paint: {
        "line-color": [
          "case",
          // if ICAO class is A or B 
          ["all", ["in", ["get", "icaoClass"], ["literal", ["A", "B"]]]], COLOR_MAPPING["A"],
          // if ICAO class is C or D 
          ["all", ["in", ["get", "icaoClass"], ["literal", ["C", "D"]]]], COLOR_MAPPING["D"],
          // if ICAO class is E, F, or G 
          ["all", ["in", ["get", "icaoClass"], ["literal", ["E", "F", "G"]]]], COLOR_MAPPING["E"],
          // If the TYPE is Restricted or Dangerous
          ["all", ["in", ["get", "type"], ["literal", ["Restricted", "Dangerous"]]]], COLOR_MAPPING["Prohibited"],
          // if type is TMZ or Para/voltige, color is purple
          ["all", ["in", ["get", "type"], ["literal", ["TMZ", "Para/voltige"]]]], COLOR_MAPPING["TMZ"],
          // Default color if no condition matches
          COLOR_MAPPING["other"]
        ],
        "line-width": [
          "case",
          ["all", ["in", ["get", "icaoClass"], ["literal", ["A", "B"]]]], 4,
          ["all", ["in", ["get", "icaoClass"], ["literal", ["C", "D"]]]], 2,
          ["all", ["in", ["get", "icaoClass"], ["literal", ["E", "F", "G"]]]], 1,
          ["all", ["in", ["get", "type"], ["literal", ["Restricted", "Dangerous"]]]], 1,
          1
        ]
      }
    },
    {
      id: "other-fill",
      type: "fill",
      source: "other",
      paint: {
        "fill-color": [
          "case",
          // prohibited
          // ["all", ["in", ["get", "type"], ["literal", ["Prohibited"]]]], COLOR_MAPPING["Prohibited"],
          // // Para/voltige purple
          ["all", ["in", ["get", "type"], ["literal", ["Para/voltige"]]]], COLOR_MAPPING["TMZ"],
          // // zsm
          // ["all", ["in", ["get", "type"], ["literal", ["ZSM"]]]], COLOR_MAPPING["ZSM"],
          COLOR_MAPPING["other"]
        ],
        "fill-opacity": [
          "case",
          // // prohibited
          // ["all", ["in", ["get", "type"], ["literal", ["Prohibited"]]]], 0.2,
          // Para/voltige
          ["all", ["in", ["get", "type"], ["literal", ["Para/voltige"]]]], 0.2,
          // // zsm
          // ["all", ["in", ["get", "type"], ["literal", ["ZSM"]]]], 0.5,
          0
        ]
      }
    },
    {
      id: "ZSM-outline",
      type: "line",
      source: "ZSM",
      layout: {
        "visibility": "visible"
      },
      paint: {
        "line-color": COLOR_MAPPING["ZSM"],
        "line-width": 2
      }
    },
    {
      id: "ZSM-fill",
      type: "fill",
      source: "ZSM",
      paint: {
        "fill-color": COLOR_MAPPING["ZSM"],
        "fill-opacity": 0.5
      }
    },
    {
      id: "PROHIBITED-outline",
      type: "line",
      source: "PROHIBITED",
      layout: {
        "visibility": "visible"
      },
      paint: {
        "line-color": COLOR_MAPPING["Prohibited"],
        "line-width": 2
      }
    },
    {
      id: "PROHIBITED-fill",
      type: "fill",
      source: "PROHIBITED",
      paint: {
        "fill-color": COLOR_MAPPING["Prohibited"],
        "fill-opacity": 0.2
      }
    }
  ]
};

export default style;

