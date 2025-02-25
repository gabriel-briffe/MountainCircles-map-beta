import { ICAO_CLASS_MAPPING, TYPE_MAPPING } from './mappings.js';

// export const ICAO_CLASS_MAPPING = {
//   0: "A",
//   1: "B",
//   2: "C",
//   3: "D",
//   4: "E",
//   5: "F",
//   6: "G",
//   7: "",
//   8: "Other"
// }; 

// export const TYPE_MAPPING = {
//   0: "AWY",
//   1: "Restricted",
//   2: "Dangerous",
//   3: "Prohibited",
//   4: "CTR",
//   5: "TMZ",
//   6: "RMZ",
//   7: "TMA",
//   10: "FIR",
//   21: "gliding",
//   26: "CTA",
//   28: "Para/voltige",
//   29: "ZSM",
//   33: "SIV"
// };
// ----------created by me, properties.custom----------
//   LTA

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
      data: "/data/parks.geojson"
    },
    "SIV": {
      type: "geojson",
      data: "/data/SIV.geojson"
    },
    "FIR": {
      type: "geojson",
      data: "/data/FIR.geojson"
    },
    "gliding": {
      type: "geojson",
      data: "/data/gliding.geojson"
    },
    // "ground": {
    //   type: "geojson",
    //   data: "/data/ground.geojson"
    // },
    "other": {
      type: "geojson",
      data: "/data/other.geojson"
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
        "line-color": "rgb(255, 0, 0)",
        "line-dasharray": [3,3],
        "line-width": 2
      }
    },
    {
      id: "parks-fill",
      type: "fill",
      source: "parks",
      paint: {
        "fill-color": "rgb(255, 0, 0)",
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
        "line-color": "rgb(0, 255, 0)",
        "line-width": 1
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
        "line-color": "rgb(0, 0, 255)",
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
        "line-color": "rgb(255, 255, 0)",
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
      id: "other-fill",
      type: "fill",
      source: "other",
      paint: {
        "fill-color": [
          "case",
          // prohibited
          ["all", ["in", ["get", "type"], ["literal", [3]]]], "rgb(255, 0, 0)",
          // para/voltige purple
          ["all", ["in", ["get", "type"], ["literal", [28]]]], "rgb(128, 0, 128)",
          // zsm
          ["all", ["in", ["get", "type"], ["literal", [29]]]], "rgb(255, 165, 0)",
          // rmz
          ["all", ["in", ["get", "type"], ["literal", [6]]]], "rgb(255, 165, 0)",
          "rgb(0, 0, 0, 0)"
        ],
        "fill-opacity": [
          "case",
          // prohibited
          ["all", ["in", ["get", "type"], ["literal", [3]]]], 0.2,
          // para/voltige
          ["all", ["in", ["get", "type"], ["literal", [28]]]], 0.2,
          // zsm
          ["all", ["in", ["get", "type"], ["literal", [29]]]], 0.5,
          // rmz
          ["all", ["in", ["get", "type"], ["literal", [6]]]], 0.2,
          0
        ]
      }
    },
    {
      id: "other-outline",
      type: "line",
      source: "other",
      layout: {
        "line-sort-key": [
          "case",
          // If the unit is FL, multiply the value by 100.
          ["==", ["get", "upperLimit.unit"], "FL"],
             ["*", ["get", "upperLimit.value"], 100],
             // otherwise, use the value as-is.
             ["get", "upperLimit.value"]
        ]
      },
      paint: {
        "line-color": [
          "case",
          // if ICAO class is A or B 
          ["all", ["in", ["get", "icaoClass"], ["literal", [0, 1]]]], "rgb(255, 0, 0)",
          // if ICAO class is C or D 
          ["all", ["in", ["get", "icaoClass"], ["literal", [2, 3]]]], "rgb(0, 0, 255)",
          // if ICAO class is E, F, or G 
          ["all", ["in", ["get", "icaoClass"], ["literal", [4, 5, 6]]]], "rgb(0, 83, 0)",
          // If the TYPE is Prohibited, Restricted, or Dangerous
          ["all", ["in", ["get", "type"], ["literal", [3, 1, 2]]]], "rgb(255, 0, 0)",
          // if type is ZSM or RMZ, color is orange
          ["all", ["in", ["get", "type"], ["literal", [6, 29]]]], "rgb(255, 165, 0)",
          // if type is TMZ or Para/voltige, color is purple
          ["all", ["in", ["get", "type"], ["literal", [5, 28]]]], "rgb(128, 0, 128)",
          // Default color if no condition matches
          "rgb(0, 0, 0)"
        ],
        "line-width": [
          "case",
          ["all", ["in", ["get", "icaoClass"], ["literal", [0, 1]]]], 4,
          ["all", ["in", ["get", "icaoClass"], ["literal", [2, 3]]]], 2,
          ["all", ["in", ["get", "icaoClass"], ["literal", [4, 5, 6]]]], 1,
          // if type is Prohibited, Restricted, or Dangerous, use line width 2
          ["all", ["in", ["get", "type"], ["literal", [3, 1, 2]]]], 2,
          1
        ]
      }
    },
    

  ]
};

export default style;

// properties for text suggestions
// {
//   "_id": "str",
//   "createdBy": "str",
//   "createdAt": "str",
//   "updatedBy": "str",
//   "updatedAt": "str",
//   "name": "str",
//   "dataIngestion": "bool",
//   "type": "int",
//   "icaoClass": "int",
//   "activity": "int",
//   "onDemand": "bool",
//   "onRequest": "bool",
//   "byNotam": "bool",
//   "specialAgreement": "bool",
//   "requestCompliance": "bool",
//   "country": "str",
//   "upperLimit": {
//     "value": "int",
//     "unit": "int",
//     "referenceDatum": "int"
//   },
//   "lowerLimit": {
//     "value": "int",
//     "unit": "int",
//     "referenceDatum": "int"
//   },
//   "hoursOfOperation": {
//     "operatingHours": [
//       {
//         "dayOfWeek": "int",
//         "startTime": "str",
//         "endTime": "str",
//         "byNotam": "bool",
//         "sunrise": "bool",
//         "sunset": "bool",
//         "publicHolidaysExcluded": "bool"
//       }
//     ]
//   }
// }