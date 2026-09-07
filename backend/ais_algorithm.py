"""
SIH 2026 - AquaSentinel
Module 6.5: AIS Spatio-Temporal Extraction & Attribution Algorithm

This module demonstrates the decisive algorithm for matching AIS vessel tracks
to an oil spill detection polygon over a specific time window.
"""

from typing import List, Dict
import math

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two GPS coordinates in kilometers."""
    R = 6371.0 # Earth radius in km
    
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

def extract_candidate_vessels(
    spill_origin: Dict[str, float], 
    spill_time_window: tuple, 
    raw_ais_database: List[Dict],
    max_radius_km: float = 15.0
) -> List[Dict]:
    """
    Decisive extraction algorithm to filter thousands of raw AIS tracks down to top suspects.
    
    Args:
        spill_origin: The hindcast origin of the spill {lat, lon}.
        spill_time_window: Tuple of (start_epoch, end_epoch) for the estimated spill time.
        raw_ais_database: The massive raw dataset (e.g. from MarineCadastre).
        max_radius_km: Maximum physical distance a vessel could be to be considered a suspect.
        
    Returns:
        Sorted list of candidate vessels with their evidence attribution scores.
    """
    candidates = []
    
    start_time, end_time = spill_time_window
    
    for vessel in raw_ais_database:
        min_distance = float('inf')
        temporal_match = False
        
        # 1. Spatio-Temporal Filtering
        for point in vessel['path']:
            # Check if vessel was active during the spill window
            if start_time <= point['timestamp'] <= end_time:
                temporal_match = True
                
                # Check spatial proximity
                dist = haversine_distance(
                    spill_origin['lat'], spill_origin['lon'],
                    point['lat'], point['lon']
                )
                if dist < min_distance:
                    min_distance = dist
                    
        # 2. Evidence Scoring
        if temporal_match and min_distance <= max_radius_km:
            
            # Proximity Score (Closer = Higher Score)
            proximity_score = max(0, 1.0 - (min_distance / max_radius_km))
            
            # Anomaly Score (e.g. speed drops below 2 knots unexpectedly)
            # (Simplified for demonstration)
            anomaly_score = 0.8 if vessel.get('suspicious_behavior') else 0.1
            
            # Trajectory Alignment (Does the ship wake match the oil drift?)
            # (Simplified mock math)
            trajectory_score = 0.85 
            
            # Final Weighted Attribution Score
            final_score = (proximity_score * 0.5) + (trajectory_score * 0.3) + (anomaly_score * 0.2)
            
            candidates.append({
                "mmsi": vessel['mmsi'],
                "name": vessel['name'],
                "score": final_score,
                "evidence": {
                    "proximity_km": min_distance,
                    "proximity_score": proximity_score,
                    "trajectory_score": trajectory_score,
                    "anomaly_score": anomaly_score
                }
            })
            
    # Return candidates sorted by highest score
    return sorted(candidates, key=lambda x: x['score'], reverse=True)

if __name__ == "__main__":
    print("AquaSentinel AIS Algorithm Ready.")
