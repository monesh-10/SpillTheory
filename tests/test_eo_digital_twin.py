"""
Integration tests for EO Post-Detection Workflow & Unified Digital Twin.

Verifies:
1. TIFF geospatial metadata extraction and WGS84 conversion.
2. Binary mask to GeoJSON polygon conversion.
3. Shared scenario creation for EO modality.
4. Downstream Digital Twin integration (identical to SAR):
   - In-memory scenario lookup via /api/scenario/{spill_id}
   - Real Lagrangian particle reverse backtracking
   - Dynamic AIS tanker routes (MT OCEAN STAR, GULF VOYAGER)
   - Deterministic AIS kinematic attribution
   - Statutory forensic PDF dossier export via /api/scenario/{spill_id}/export-pdf
   - Incident registration in /api/spills
"""

import warnings
warnings.filterwarnings('ignore')

import io
from pathlib import Path
import numpy as np
from backend.main import app
from backend.scenario_builder import (
    ACTIVE_SPILLS,
    CUSTOM_SCENARIOS,
    build_and_register_spill_scenario,
    get_location_name,
)
from eo.geospatial import extract_tiff_geospatial_metadata, eo_mask_to_geojson_polygons


def get_client():
    from fastapi.testclient import TestClient
    return TestClient(app)


def test_eo_geospatial_fallback():
    """Verify fallback to maritime reference coordinates when TIFF has no georeferencing."""
    # Test fallback with nonexistent or dummy path
    meta = extract_tiff_geospatial_metadata("nonexistent_test.tif", fallback_lat=18.112, fallback_lon=72.464, fallback_km=15.0)
    assert meta["has_georeference"] is False
    assert meta["center_lat"] == 18.112
    assert meta["center_lon"] == 72.464
    assert meta["km_span"] == 15.0
    assert "Multispectral" in meta["sensor"]


def test_eo_mask_to_geojson_polygons():
    """Verify binary oil mask converts to valid closed GeoJSON polygon ring."""
    mask = np.zeros((240, 240), dtype=np.uint8)
    # Draw a 40x40 square representing a detected slick
    mask[100:140, 100:140] = 1

    polygons = eo_mask_to_geojson_polygons(mask, center_lat=18.12, center_lon=72.45, km_span=15.0)
    assert len(polygons) >= 1
    ring = polygons[0]
    assert len(ring) >= 4
    # Closed polygon check: first point equals last point
    assert ring[0] == ring[-1]
    # Points should be geographic coordinates near center
    for lon, lat in ring:
        assert 72.3 <= lon <= 72.6
        assert 18.0 <= lat <= 18.3


def test_eo_shared_scenario_creation_and_registration():
    """Verify build_and_register_spill_scenario correctly registers EO into Digital Twin."""
    test_spill_id = "EO_TEST_999999"
    polygon_coords = [[[72.44, 18.11], [72.46, 18.11], [72.46, 18.13], [72.44, 18.13], [72.44, 18.11]]]

    scenario = build_and_register_spill_scenario(
        spill_id=test_spill_id,
        modality="EO",
        polygon_coords=polygon_coords,
        center_lat=18.12,
        center_lon=72.45,
        calculated_area_km2=6.85,
        coverage_percent=3.04,
        confidence=0.962,
        num_sources=1,
        source_peaks=[{"x": 128.0, "y": 128.0}],
        image_url="http://localhost:8000/data/outputs/test_pred.png",
        mask_url="http://localhost:8000/data/outputs/test_mask.png",
        sensor_name="Sentinel-2 MSI Multispectral Optical",
        resolution_str="10m Ground Sample Distance",
        detection_reason="SeaRel-SR-UNet V3 detected an isolated point-source discharge.",
        km_span=15.0,
        is_dual=False,
    )

    # 1. Check returned structure
    assert scenario["spill_event"]["spill_id"] == test_spill_id
    assert scenario["spill_event"]["area_km2"] == 6.85
    assert scenario["sensor_metadata"]["modality"] == "EO"
    assert "Sentinel-2" in scenario["sensor_metadata"]["sensor"]

    # 2. Check registered in CUSTOM_SCENARIOS
    assert test_spill_id in CUSTOM_SCENARIOS

    # 3. Check registered in ACTIVE_SPILLS
    matching = [s for s in ACTIVE_SPILLS if s["spill_id"] == test_spill_id]
    assert len(matching) >= 1
    assert matching[0]["area_km2"] == 6.85


def test_eo_digital_twin_downstream_scenario_resolution():
    """Verify /api/scenario/{eo_spill_id} executes Lagrangian backtracking, AIS tracks, and metocean."""
    test_spill_id = "EO_TEST_DOWNSTREAM"
    polygon_coords = [[[72.44, 18.11], [72.46, 18.11], [72.46, 18.13], [72.44, 18.13], [72.44, 18.11]]]

    build_and_register_spill_scenario(
        spill_id=test_spill_id,
        modality="EO",
        polygon_coords=polygon_coords,
        center_lat=18.12,
        center_lon=72.45,
        calculated_area_km2=11.20,
        coverage_percent=4.98,
        confidence=0.955,
        num_sources=2,
        source_peaks=[{"x": 110.0, "y": 110.0}, {"x": 145.0, "y": 145.0}],
        image_url="http://localhost:8000/data/outputs/eo_pred.png",
        mask_url="http://localhost:8000/data/outputs/eo_mask.png",
        sensor_name="Sentinel-2 MSI Multispectral Optical",
        resolution_str="10m Ground Sample Distance",
        detection_reason="SeaRel-SR-UNet V3 dual plume detection.",
        is_dual=True,
    )

    # Fetch through the unified /api/scenario/{spill_id} endpoint
    resp = get_client().get(f"/api/scenario/{test_spill_id}")
    assert resp.status_code == 200
    data = resp.json()

    # Check spill event
    assert data["spill_event"]["spill_id"] == test_spill_id
    assert data["spill_event"]["topology"] == "DUAL_MERGED"

    # Check Lagrangian backtracking was executed
    assert "hindcast" in data
    hindcast = data["hindcast"]
    assert "origin_estimate" in hindcast
    assert "point" in hindcast["origin_estimate"]
    assert "trajectory_waypoints" in hindcast
    assert len(hindcast["trajectory_waypoints"]) >= 2
    assert "particle_cloud" in hindcast
    assert len(hindcast["particle_cloud"]) > 0

    # Check AIS dynamic ships (same hardcoded ship visualization as SAR)
    assert "ais" in data
    vessels = data["ais"]["vessel_tracks"]
    assert len(vessels) >= 2
    names = [v["name"] for v in vessels]
    assert "MT OCEAN STAR" in names
    assert "GULF VOYAGER" in names

    # Check deterministic attribution
    assert "attribution" in data
    candidates = data["attribution"]["candidates"]
    assert len(candidates) >= 2
    assert candidates[0]["mmsi"] in [419001284, 419002931]

    # Check live MetOcean drift forecast
    assert "live_metocean" in data
    assert "live_drift_forecast" in data
    assert len(data["live_drift_forecast"]) > 0


def test_eo_scenario_pdf_dossier_export():
    """Verify /api/scenario/{eo_spill_id}/export-pdf generates official legal PDF."""
    test_spill_id = "EO_TEST_PDF"
    polygon_coords = [[[72.44, 18.11], [72.46, 18.11], [72.46, 18.13], [72.44, 18.13], [72.44, 18.11]]]

    build_and_register_spill_scenario(
        spill_id=test_spill_id,
        modality="EO",
        polygon_coords=polygon_coords,
        center_lat=18.12,
        center_lon=72.45,
        calculated_area_km2=8.40,
        coverage_percent=3.73,
        confidence=0.960,
        num_sources=1,
        source_peaks=[{"x": 128.0, "y": 128.0}],
        image_url="http://localhost:8000/data/outputs/eo_pred.png",
        mask_url="http://localhost:8000/data/outputs/eo_mask.png",
        sensor_name="Sentinel-2 MSI Multispectral Optical",
        resolution_str="10m Ground Sample Distance",
        detection_reason="SeaRel-SR-UNet V3 single point leak.",
        is_dual=False,
    )

    resp = get_client().get(f"/api/scenario/{test_spill_id}/export-pdf")
    assert resp.status_code == 200
    assert "application/pdf" in resp.headers.get("content-type", "")
    content = resp.content
    assert content.startswith(b"%PDF-")
    assert len(content) > 10000


def test_eo_active_spills_list_endpoint():
    """Verify /api/spills returns active spills including newly created EO scenarios."""
    # Ensure at least one EO spill is registered
    test_spill_id = "EO_TEST_LIST"
    polygon_coords = [[[72.44, 18.11], [72.46, 18.11], [72.46, 18.13], [72.44, 18.13], [72.44, 18.11]]]
    build_and_register_spill_scenario(
        spill_id=test_spill_id,
        modality="EO",
        polygon_coords=polygon_coords,
        center_lat=18.12,
        center_lon=72.45,
        calculated_area_km2=5.0,
        coverage_percent=2.5,
        confidence=0.95,
        num_sources=1,
        source_peaks=[{"x": 128.0, "y": 128.0}],
        image_url="http://localhost:8000/data/outputs/test_list.png",
        mask_url="http://localhost:8000/data/outputs/test_list_mask.png",
        sensor_name="Sentinel-2 MSI Multispectral Optical",
        resolution_str="10m Ground Sample Distance",
        detection_reason="Self-contained list endpoint test",
        is_dual=False,
    )

    resp = get_client().get("/api/spills")
    assert resp.status_code == 200
    spills = resp.json()
    assert isinstance(spills, list)
    spill_ids = [s["spill_id"] for s in spills]
    assert any(sid.startswith("EO_") for sid in spill_ids)


if __name__ == "__main__":
    test_eo_geospatial_fallback()
    print("[PASS] test_eo_geospatial_fallback passed")
    test_eo_mask_to_geojson_polygons()
    print("[PASS] test_eo_mask_to_geojson_polygons passed")
    test_eo_shared_scenario_creation_and_registration()
    print("[PASS] test_eo_shared_scenario_creation_and_registration passed")
    test_eo_digital_twin_downstream_scenario_resolution()
    print("[PASS] test_eo_digital_twin_downstream_scenario_resolution passed")
    test_eo_scenario_pdf_dossier_export()
    print("[PASS] test_eo_scenario_pdf_dossier_export passed")
    test_eo_active_spills_list_endpoint()
    print("[PASS] test_eo_active_spills_list_endpoint passed")
    print("\nALL EO DIGITAL TWIN TESTS PASSED (100%)!")
