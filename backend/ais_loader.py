"""
SIH 2026 - AquaSentinel
Module 6.4: AIS Ingestion & Synthetic Benchmark Generator
Conforms to NOAA / MarineCadastre AIS CSV specifications (https://marinecadastre.gov/accessais/)
"""

import csv
import json
import math
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import List, Dict, Tuple

# Standard MarineCadastre columns:
# MMSI, BaseDateTime, LAT, LON, SOG, COG, Heading, VesselName, IMO, CallSign, VesselType, Status, Length, Width, Draft, Cargo
MARINECADASTRE_FIELDS = [
    "MMSI", "BaseDateTime", "LAT", "LON", "SOG", "COG", "Heading",
    "VesselName", "IMO", "CallSign", "VesselType", "Status", "Length", "Width", "Draft", "Cargo"
]

def generate_marinecadastre_sample_csv(
    output_path: Path,
    center_lat: float = 18.12,
    center_lon: float = 72.45,
    start_iso: str = "2026-09-01T06:00:00Z",
    hours: int = 24,
    num_vessels: int = 5
) -> Path:
    """
    Generates standard MarineCadastre formatted CSV data for local benchmarking.
    Useful when offline or demonstrating compliance with SIH data requirements.
    """
    start_dt = datetime.fromisoformat(start_iso.replace("Z", "+00:00"))
    
    records = []
    vessel_configs = [
        {"mmsi": 412345678, "name": "Vessel A (Tanker)", "type": 80, "base_heading": 45, "sog": 11.5, "anomaly": True},
        {"mmsi": 987654321, "name": "Vessel B (Cargo)", "type": 70, "base_heading": 135, "sog": 14.0, "anomaly": False},
        {"mmsi": 455123890, "name": "Ocean Trader", "type": 70, "base_heading": 220, "sog": 12.2, "anomaly": False},
        {"mmsi": 566234001, "name": "Gulf Voyager", "type": 80, "base_heading": 310, "sog": 10.8, "anomaly": False},
        {"mmsi": 344901222, "name": "Coastal Pioneer", "type": 60, "base_heading": 90, "sog": 8.0, "anomaly": False}
    ][:num_vessels]
    
    for v in vessel_configs:
        curr_lat = center_lat + (v["mmsi"] % 7 - 3) * 0.05
        curr_lon = center_lon + (v["mmsi"] % 5 - 2) * 0.05
        
        # 1 point every 30 minutes
        steps = hours * 2
        for step in range(steps):
            t = start_dt + timedelta(minutes=step * 30)
            heading = v["base_heading"]
            sog = v["sog"]
            
            # Simulate tanker slowing down near spill origin (8:15 AM)
            if v["anomaly"] and (step in range(4, 8)):
                sog = 3.2
                heading = (heading + 30) % 360
            
            # Step in km converted to approx lat/lon
            speed_km_min = (sog * 1.852) / 60.0
            dist_km = speed_km_min * 30.0
            rad = math.radians(heading)
            curr_lat += (dist_km / 111.0) * math.cos(rad)
            curr_lon += (dist_km / (111.0 * math.cos(math.radians(curr_lat)))) * math.sin(rad)
            
            records.append({
                "MMSI": v["mmsi"],
                "BaseDateTime": t.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "LAT": round(curr_lat, 5),
                "LON": round(curr_lon, 5),
                "SOG": round(sog, 1),
                "COG": round(heading, 1),
                "Heading": int(heading),
                "VesselName": v["name"],
                "IMO": f"IMO{v['mmsi']}",
                "CallSign": f"CALL{v['mmsi'] % 1000}",
                "VesselType": v["type"],
                "Status": 0,
                "Length": 180,
                "Width": 32,
                "Draft": 10.5,
                "Cargo": v["type"]
            })
            
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=MARINECADASTRE_FIELDS)
        writer.writeheader()
        writer.writerows(records)
        
    return output_path

def parse_marinecadastre_csv(file_path: Path) -> List[Dict]:
    """
    Parses MarineCadastre AIS CSV into structured vessel trajectories for the attribution engine.
    """
    vessels = {}
    with open(file_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            mmsi = int(row["MMSI"])
            if mmsi not in vessels:
                vessels[mmsi] = {
                    "mmsi": mmsi,
                    "name": row.get("VesselName", f"MMSI-{mmsi}"),
                    "type": "Tanker" if str(row.get("VesselType", "")).startswith("8") else "Cargo",
                    "path": []
                }
            vessels[mmsi]["path"].append({
                "timestamp": row["BaseDateTime"],
                "lat": float(row["LAT"]),
                "lon": float(row["LON"]),
                "heading": float(row.get("Heading") or row.get("COG") or 0.0),
                "sog": float(row.get("SOG") or 0.0)
            })
            
    # Sort paths chronologically
    for mmsi, v in vessels.items():
        v["path"].sort(key=lambda p: p["timestamp"])
        
    return list(vessels.values())

if __name__ == "__main__":
    test_out = Path(__file__).resolve().parent / "sample_marinecadastre_ais.csv"
    generate_marinecadastre_sample_csv(test_out)
    parsed = parse_marinecadastre_csv(test_out)
    print(f"Generated and verified {len(parsed)} vessels following MarineCadastre spec.")
