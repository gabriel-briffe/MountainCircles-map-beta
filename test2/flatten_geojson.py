import json
import csv
import sys

def flatten_dict(d, parent_key='', sep='.'):
    """
    Recursively flattens a nested dictionary, 
    concatenating keys with a separator.
    
    For example, a key from the original nested dict:
        {"properties": {"name": "Sample"}}
    will become:
        "properties.name": "Sample"
    """
    items = {}
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.update(flatten_dict(v, new_key, sep=sep))
        elif isinstance(v, list):
            if v and all(isinstance(item, dict) for item in v):
                # For a list of dicts, convert to JSON string.
                items[new_key] = json.dumps(v)
            else:
                # Convert list items into a comma separated string.
                items[new_key] = ','.join(map(str, v))
        else:
            items[new_key] = v
    return items

def flatten_geojson(geojson_path, csv_path):
    """
    Reads a GeoJSON file and flattens it into a CSV file.

    Parameters:
      geojson_path (str): The path to the input GeoJSON file.
      csv_path (str): The path to the output CSV file.
    """
    with open(geojson_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Determine if it's a FeatureCollection or a single Feature
    if 'features' in data:
        features = data['features']
    else:
        features = [data]

    # Flatten each feature using the helper function
    rows = [flatten_dict(feature) for feature in features]

    # Determine the CSV header from the union of all keys.
    fieldnames = set()
    for row in rows:
        fieldnames.update(row.keys())
    # Sort keys for consistency.
    fieldnames = sorted(fieldnames)

    # Write the flattened data into CSV.
    with open(csv_path, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)

def extract_structure(obj):
    """
    Recursively extracts the structure of a dictionary or list,
    replacing the actual values with types or nested structures.
    
    For dictionary values, it recurses into the keys; for lists 
    that contain dictionaries, it uses the structure of the first element.
    
    Parameters:
      obj: The input JSON object (or part thereof).
      
    Returns:
      A structure representation where each value is either the type name,
      a nested dictionary (for dict-type objects), or a string "list" for lists.
    """
    if isinstance(obj, dict):
        return {k: extract_structure(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        if obj and all(isinstance(item, dict) for item in obj):
            # For a list of dicts, use the structure of the first element.
            return [extract_structure(obj[0])]
        else:
            return "list"
    else:
        return type(obj).__name__

if __name__ == "__main__":
    # Check if running in structure mode.
    if "--structure" in sys.argv:
        # Remove the '--structure' flag and check that exactly one other argument remains.
        args = [arg for arg in sys.argv[1:] if arg != "--structure"]
        if len(args) != 1:
            print("Usage: python flatten_geojson.py input.geojson --structure")
            sys.exit(1)
        input_geojson = args[0]
        with open(input_geojson, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # If this is a FeatureCollection, try to extract the structure from the first feature's properties
        if 'features' in data:
            if data['features'] and 'properties' in data['features'][0]:
                structure = extract_structure(data['features'][0]['properties'])
            elif data['features']:
                structure = extract_structure(data['features'][0])
            else:
                structure = {}
        else:
            if 'properties' in data:
                structure = extract_structure(data['properties'])
            else:
                structure = extract_structure(data)
        
        print(json.dumps(structure, indent=2))
        sys.exit(0)
        
    # Fallback to flattening mode if --structure is not provided.
    if len(sys.argv) != 3:
        print("Usage: python flatten_geojson.py input.geojson output.csv")
        sys.exit(1)
        
    input_geojson = sys.argv[1]
    output_csv = sys.argv[2]
    flatten_geojson(input_geojson, output_csv)
    print(f"GeoJSON flattened to CSV and saved at {output_csv}")
