export const ICAO_CLASS_MAPPING = {
    0: "A",
    1: "B",
    2: "C",
    3: "D",
    4: "E",
    5: "F",
    6: "G",
    8: "Other"
}; 

export const TYPE_MAPPING = {
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
    33: "SIV"
};

export const UNIT_MAPPING = { 
    1: "ft", 
    6: "FL" 
};

export const REFERENCE_DATUM_MAPPING = { 
    0: "GND", 
    1: "MSL", 
    2: "1013" 
};

export const COLOR_MAPPING = {
    "A": "rgb(255, 0, 0)",
    "B": "rgb(255, 0, 0)",
    "C": "rgb(0, 0, 255)",
    "D": "rgb(0, 0, 255)",
    "E": "rgb(0, 83, 0)",
    "F": "rgb(0, 83, 0)",
    "G": "rgb(0, 83, 0)",
    "Prohibited": "rgb(255, 0, 0)",
    "Restricted": "rgb(255, 0, 0)",
    "Dangerous": "rgb(255, 0, 0)",
    "ZSM": "rgb(255, 165, 0)",
    "RMZ": "rgb(255, 165, 0)",
    "TMZ": "rgb(128, 0, 128)",
    "Para/voltige": "rgb(128, 0, 128)",
    "SIV": "rgb(0, 160, 0)",
    "FIR": "rgb(0, 0, 255)",
    "gliding": "rgb(255, 255, 0)",
    "other": "rgb(0, 0, 0)"
}

// export const FT_TO_M = 0.3048;

//           // if ICAO class is A or B 
//           ["all", ["in", ["get", "icaoClass"], ["literal", ["A", "B"]]]], "rgb(255, 0, 0)",
//           // if ICAO class is C or D 
//           ["all", ["in", ["get", "icaoClass"], ["literal", ["C", "D"]]]], "rgb(0, 0, 255)",
//           // if ICAO class is E, F, or G 
//           ["all", ["in", ["get", "icaoClass"], ["literal", ["E", "F", "G"]]]], "rgb(0, 83, 0)",
//           // If the TYPE is Prohibited, Restricted, or Dangerous
//           ["all", ["in", ["get", "type"], ["literal", ["Prohibited", "Restricted", "Dangerous"]]]], "rgb(255, 0, 0)",
//           // if type is ZSM or RMZ, color is orange
//           ["all", ["in", ["get", "type"], ["literal", ["ZSM", "RMZ"]]]], "rgb(255, 165, 0)",
//           // if type is TMZ or Para/voltige, color is purple
//           ["all", ["in", ["get", "type"], ["literal", ["TMZ", "Para/voltige"]]]], "rgb(128, 0, 128)",
//           // Default color if no condition matches
//           "rgb(0, 0, 0)"
