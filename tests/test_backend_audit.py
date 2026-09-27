import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_root_health():
    resp = client.get("/api")
    assert resp.status_code == 200
    data = resp.json()
    assert "status" in data
    assert data["status"] in ["online", "operational"]


def test_active_spills_list():
    resp = client.get("/api/spills")
    assert resp.status_code == 200
    spills = resp.json()
    assert isinstance(spills, list)
    assert len(spills) >= 2


def test_metocean_live_telemetry():
    resp = client.get("/api/metocean?lat=18.112&lon=72.464")
    assert resp.status_code == 200
    data = resp.json()
    assert "wind" in data
    assert "currents" in data
    assert "drift_model" in data


def test_dual_scenario_resolution():
    resp = client.get("/api/scenario/OCN-042")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("spill_event", {}).get("topology") == "SINGLE_POINT_SOURCE"
    vessels = data.get("ais", {}).get("vessel_tracks", [])
    assert len(vessels) >= 2


def test_single_scenario_resolution():
    resp = client.get("/api/scenario/OCN-043")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("spill_event", {}).get("topology") == "SINGLE_POINT_SOURCE"


def test_drift_forecast_smoothness_and_fay_growth():
    resp = client.get("/api/scenario/OCN-042")
    assert resp.status_code == 200
    data = resp.json()
    forecast = data.get("live_drift_forecast", [])
    assert len(forecast) >= 5
    
    prev_dist = -1.0
    for step in forecast:
        dist = step.get("drift_distance_km", 0)
        assert dist >= prev_dist
        prev_dist = dist
        bearing = step.get("drift_bearing_deg", 60.0)
        assert 40.0 <= bearing <= 75.0
        assert step.get("point", {}).get("lon") >= 72.46


def test_sar_single_vessel_detection():
    resp = client.post("/api/detect-sar", data={"demo_filename": "palsar_0.png"})
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("spill_detected") is True
    assert data.get("num_sources") >= 1
    assert "Ship" in data.get("classification", "") or "Dual" in data.get("classification", "") or "Single" in data.get("classification", "")
    assert data.get("area_km2") > 0


def test_sar_dual_vessel_detection():
    resp = client.post("/api/detect-sar", data={"demo_filename": "palsar_1.png"})
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("spill_detected") is True
    assert data.get("num_sources") == 1
    assert "Single" in data.get("classification", "")


def test_clean_ocean_benchmark():
    resp = client.post("/api/detect-sar", data={"demo_filename": "clean_ocean_no_spill.png"})
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("spill_detected") is False
    assert data.get("num_sources") == 0
    assert data.get("coverage_percent") == 0.0


def test_pdf_dossier_generation():
    resp = client.get("/api/scenario/OCN-042/export-pdf")
    assert resp.status_code == 200
    assert "application/pdf" in resp.headers.get("content-type", "")
    content = resp.content
    assert content.startswith(b"%PDF-")
    assert len(content) > 10000
