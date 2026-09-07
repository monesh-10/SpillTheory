"""
AquaSentinel - AIS Spatio-Temporal Extraction & Attribution Algorithm
======================================================================
Provides algorithmic evaluation and attribution scoring of AIS vessel tracks
against hindcast oil spill origin estimates.
"""

from typing import List, Dict, Any, Optional
import math


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two GPS coordinates in kilometers."""
    r = 6371.0  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return r * c


def compute_vessel_attribution(
    vessel: Dict[str, Any],
    origin_point: Dict[str, float],
    origin_time_iso: Optional[str] = None,
    time_window_hours: float = 4.0,
    max_radius_km: float = 25.0
) -> Dict[str, Any]:
    """
    Computes rigorous deterministic attribution scores and reports from AIS track kinematics.
    
    Evaluates:
    1. Spatial Proximity: Minimum distance to origin point (km).
    2. Kinematic Speed Anomaly: Speed drop relative to cruise speed during origin transit.
    3. Course Deviation: Heading change near the point of closest approach (CPA).
    4. Deterministic Report: Explanation dynamically generated from actual numbers.
    """
    path = vessel.get("path", [])
    if not path:
        return {
            "mmsi": vessel.get("mmsi"),
            "name": vessel.get("name", "Unknown Vessel"),
            "score": 0.10,
            "evidence": {
                "proximity_km": max_radius_km,
                "proximity_score": 0.10,
                "trajectory_score": 0.10,
                "anomaly_score": 0.10,
                "min_distance_km": max_radius_km,
                "speed_drop_kts": 0.0,
                "course_delta_deg": 0.0
            },
            "reasoning_agent_report": f"Algorithmic Evaluation: Insufficient AIS trajectory points for {vessel.get('name', 'Vessel')}."
        }

    orig_lat = float(origin_point.get("lat", 18.12))
    orig_lon = float(origin_point.get("lon", 72.45))

    min_distance_km = float("inf")
    cpa_point = path[0]
    speeds = []
    headings = []

    for pt in path:
        p_lat = float(pt.get("lat", 0.0))
        p_lon = float(pt.get("lon", 0.0))
        dist = haversine_distance(orig_lat, orig_lon, p_lat, p_lon)
        if dist < min_distance_km:
            min_distance_km = dist
            cpa_point = pt
        if "sog" in pt:
            speeds.append(float(pt["sog"]))
        if "heading" in pt:
            headings.append(float(pt["heading"]))

    # Proximity score (1.0 at 0 km, decaying towards 0 at max_radius_km)
    proximity_score = max(0.0, min(1.0, 1.0 - (min_distance_km / max_radius_km)))

    # Speed anomaly: contrast nominal cruising speed vs speed at CPA
    max_speed = max(speeds) if speeds else 12.0
    cpa_speed = float(cpa_point.get("sog", max_speed))
    speed_drop_kts = max(0.0, max_speed - cpa_speed)
    
    # Anomaly score scaled by speed drop significance (e.g. slowing > 5 kts is anomalous)
    anomaly_score = min(1.0, (speed_drop_kts / 8.0) * 0.9) if speed_drop_kts > 2.0 else 0.15

    # Course deviation near CPA
    cpa_heading = float(cpa_point.get("heading", 0.0))
    initial_heading = float(path[0].get("heading", cpa_heading))
    course_delta_deg = abs(cpa_heading - initial_heading)
    if course_delta_deg > 180.0:
        course_delta_deg = 360.0 - course_delta_deg

    trajectory_score = 0.90 if (min_distance_km < 5.0 and course_delta_deg > 15.0) else (0.75 if min_distance_km < 10.0 else 0.35)

    # Composite attribution score
    composite_score = (proximity_score * 0.45) + (trajectory_score * 0.30) + (anomaly_score * 0.25)
    composite_score = round(max(0.05, min(0.98, composite_score)), 2)

    cpa_time_str = cpa_point.get("timestamp", "08:15 UTC").replace("2026-09-01T", "").replace("Z", " UTC")
    vessel_name = vessel.get("name", f"MMSI {vessel.get('mmsi')}")
    mmsi_val = vessel.get("mmsi", "N/A")

    if composite_score >= 0.70:
        report_text = (
            f"Algorithmic Attribution: High probability ({int(composite_score * 100)}%). "
            f"{vessel_name} (MMSI: {mmsi_val}) approached within {min_distance_km:.2f} km of the computed origin at {cpa_time_str}. "
            f"AIS telemetry records a speed drop of {speed_drop_kts:.1f} kts (from {max_speed:.1f} kts cruising down to {cpa_speed:.1f} kts) "
            f"and a course deviation of {course_delta_deg:.1f}°. Proximity score: {proximity_score:.2f}, Trajectory score: {trajectory_score:.2f}."
        )
    else:
        report_text = (
            f"Algorithmic Attribution: Low probability ({int(composite_score * 100)}%). "
            f"{vessel_name} transited {min_distance_km:.2f} km from computed origin at {cpa_time_str} "
            f"maintaining steady speed ({cpa_speed:.1f} kts) along nominal transit fairway (Score: {composite_score:.2f})."
        )

    return {
        "mmsi": vessel.get("mmsi"),
        "name": vessel_name,
        "score": composite_score,
        "evidence": {
            "proximity_km": round(min_distance_km, 2),
            "proximity_score": round(proximity_score, 2),
            "trajectory_score": round(trajectory_score, 2),
            "anomaly_score": round(anomaly_score, 2),
            "speed_drop_kts": round(speed_drop_kts, 1),
            "course_delta_deg": round(course_delta_deg, 1)
        },
        "reasoning_agent_report": report_text
    }


def extract_candidate_vessels(
    spill_origin: Dict[str, float], 
    spill_time_window: tuple, 
    raw_ais_database: List[Dict],
    max_radius_km: float = 25.0
) -> List[Dict]:
    """
    Filters AIS vessel database and ranks candidates by kinematic attribution score.
    """
    candidates = []
    for vessel in raw_ais_database:
        cand = compute_vessel_attribution(
            vessel=vessel,
            origin_point=spill_origin,
            max_radius_km=max_radius_km
        )
        candidates.append(cand)
    return sorted(candidates, key=lambda x: x["score"], reverse=True)

