import pandas as pd
import json
import os

# Source Excel file
file_path = r"C:\Users\xpall\OneDrive - Fr. Meyer's Sohn GmbH & Co. KG\Dokumente\Tablas Comparativas Limpias.xlsx"

# Target assets directory within the project
assets_dir = r"C:\Users\xpall\Source\Control-Tower\Freight-Comparer\assets"
json_output_path = os.path.join(assets_dir, "Tablas_Comparativas_Datos.json")
csv_output_path = os.path.join(assets_dir, "Tablas_Comparativas_Datos.csv")

def convert_timestamps(obj):
    if isinstance(obj, pd.Timestamp):
        return obj.isoformat()
    return obj

try:
    print(f"Reading {file_path}...")
    df = pd.read_excel(file_path, sheet_name="Datos")
    
    # Generate JSON
    print(f"Generating {json_output_path}...")
    data = df.where(pd.notnull(df), None).to_dict(orient="records")
    
    # Recursively convert timestamps
    def process_data(data):
        if isinstance(data, list):
            return [process_data(item) for item in data]
        elif isinstance(data, dict):
            return {k: process_data(v) for k, v in data.items()}
        elif isinstance(data, pd.Timestamp):
            return data.isoformat()
        else:
            return data

    processed_data = process_data(data)

    with open(json_output_path, "w", encoding="utf-8") as f:
        json.dump(processed_data, f, ensure_ascii=False, indent=4, default=convert_timestamps)
        
    # Generate CSV
    print(f"Generating {csv_output_path}...")
    df.to_csv(csv_output_path, index=False, encoding="utf-8-sig")
        
    print(f"Successfully updated files in {assets_dir}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
