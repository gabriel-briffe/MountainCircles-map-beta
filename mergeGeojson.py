import sys
import json

def merge_geojson(files, output_file="merged.geojson"):
    """
    Merge multiple GeoJSON files into a single FeatureCollection.
    
    Args:
        files (list of str): List of input GeoJSON file paths.
        output_file (str): Path for the output merged GeoJSON file.
    """
    merged_features = []
    
    for file in files:
        try:
            with open(file, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            print(f"Error reading '{file}': {e}")
            continue
        
        # If the GeoJSON is a FeatureCollection, merge its features.
        if data.get("type") == "FeatureCollection" and "features" in data:
            merged_features.extend(data["features"])
        # If the GeoJSON is a single Feature, add it directly.
        elif data.get("type") == "Feature":
            merged_features.append(data)
        else:
            print(f"File '{file}' is not recognized as a valid GeoJSON and will be skipped.")
    
    merged_geojson = {
        "type": "FeatureCollection",
        "features": merged_features
    }
    
    try:
        with open(output_file, 'w', encoding='utf-8') as out_f:
            json.dump(merged_geojson, out_f, indent=4)
        print(f"Merged GeoJSON saved to '{output_file}'")
    except Exception as e:
        print(f"Error writing to '{output_file}': {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python mergeGeojson.py file1.geojson file2.geojson ...")
        sys.exit(1)
    
    # Pass the GeoJSON file paths (all command-line arguments after the script name) to our merge function.
    merge_geojson(sys.argv[1:])
