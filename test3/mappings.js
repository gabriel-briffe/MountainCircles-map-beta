export const COLOR_MAPPING = {
    // ICAO classes
    "A": "rgb(255, 0, 0)",      // Red
    "C": "rgb(0, 0, 255)",      // Blue
    "D": "rgb(0, 0, 255)",      // Blue
    "E": "rgb(0, 83, 0)",       // Dark Green
    "G": "rgb(0, 83, 0)",       // Dark Green

    // Special areas
    "PROHIBITED": "rgb(255, 0, 0)",             // Red
    "DANGER": "rgb(255, 0, 0)",                 // Red
    "RESTRICTED": "rgb(255, 0, 0)",             // Red
    "FIR": "rgb(0, 163, 0)",                    // Dark Green
    "FIS_SECTOR": "rgb(0, 66, 0)",              // Dark Green
    "OVERFLIGHT_RESTRICTION": "rgb(255, 165, 0)", // Orange
    "TRA": "rgb(255, 0, 0)",                    // Red
    "UNCLASSIFIED": "rgb(0, 0, 0)",             // Black

    // Additional types
    "ACTIVITY": "rgb(128, 128, 128)",           // Gray
    "GLIDING_SECTOR": "rgb(255, 255, 0)",       // Yellow
    "MTA": "rgb(255,0,0)",                      // red
    "TMZ": "rgb(128, 0, 128)" ,                 // Purple

    // Default
    "other": "rgb(128, 128, 128)"        // Grey
};

export function getColor(props) {
    return COLOR_MAPPING[props.type] || COLOR_MAPPING["other"];
}
