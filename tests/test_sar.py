"""
SAR Pipeline Unit & Integration Tests
Verifies SAR preprocessing, Otsu segmentation fallback, connected component
morphology, and topological source deconvolution.
"""

from pathlib import Path
import numpy as np
import pytest

from sar.preprocessing import load_and_preprocess
from sar.postprocess import extract_spill_info
from sar.geo_convert import mask_to_geojson_polygons
from sar.inference import sar_predict

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEMO_DATA_DIR = PROJECT_ROOT / "demo_data"


def test_sar_preprocessing_shape_and_bounds():
    """Verify that preprocessing scales to 256x256 and normalizes to [0, 1]."""
    demo_img = DEMO_DATA_DIR / "clean_ocean_no_spill.png"
    assert demo_img.exists(), f"Demo file {demo_img} required for test"

    img_norm, model_input = load_and_preprocess(str(demo_img))
    assert img_norm.shape == (256, 256)
    assert model_input.shape == (1, 256, 256, 1)
    assert 0.0 <= float(img_norm.min()) <= float(img_norm.max()) <= 1.0


def test_sar_clean_ocean_topology():
    """Verify that an all-zero or clean mask is classified as Clean Ocean."""
    zero_mask = np.zeros((256, 256), dtype=np.uint8)
    info = extract_spill_info(zero_mask)

    assert info["coverage_percent"] == 0.0
    assert info["topology"]["num_sources"] == 0
    assert info["topology"]["topology"] == "CLEAN_OCEAN"


def test_sar_single_ship_topology():
    """Verify that an isolated circular slick is deconvolved as a Single Ship leak."""
    mask = np.zeros((256, 256), dtype=np.uint8)
    # Create single circular disc representing an isolated slick
    y, x = np.ogrid[:256, :256]
    dist_from_center = (x - 128) ** 2 + (y - 128) ** 2
    mask[dist_from_center <= 25 ** 2] = 1

    info = extract_spill_info(mask)
    assert info["coverage_percent"] > 0
    assert info["topology"]["num_sources"] == 1
    assert "SINGLE" in info["topology"]["topology"]


def test_sar_dual_ship_coalescence_topology():
    """Verify that two distinct peaks connected by a narrow neck trigger DUAL_MERGED."""
    mask = np.zeros((256, 256), dtype=np.uint8)
    y, x = np.ogrid[:256, :256]

    # Two large circular plumes separated by 60 pixels
    mask[(x - 90) ** 2 + (y - 128) ** 2 <= 28 ** 2] = 1
    mask[(x - 165) ** 2 + (y - 128) ** 2 <= 28 ** 2] = 1
    # Thin connecting neck (5 pixels thick)
    mask[126:131, 90:165] = 1

    info = extract_spill_info(mask)
    topology = info["topology"]
    assert topology["num_sources"] == 2
    assert topology["topology"] == "DUAL_MERGED"


def test_sar_geojson_conversion():
    """Verify polygon coordinate extraction to valid WGS84 coordinates."""
    mask = np.zeros((256, 256), dtype=np.uint8)
    mask[100:150, 100:150] = 1
    coords = mask_to_geojson_polygons(mask, center_lat=18.112, center_lon=72.464, km_span=15.0)

    assert isinstance(coords, list)
    assert len(coords) > 0
    # Check that vertices are [lon, lat] pairs within expected geographic bounds
    for pt in coords[0]:
        lon, lat = pt
        assert 70.0 <= lon <= 75.0
        assert 16.0 <= lat <= 20.0


def test_sar_inference_end_to_end():
    """Run full sar_predict pipeline on clean ocean demo tile."""
    demo_img = DEMO_DATA_DIR / "clean_ocean_no_spill.png"
    result = sar_predict(str(demo_img))

    assert "coverage_percent" in result
    assert "clean_mask" in result
    assert "topology" in result
    assert "unet_analysis" in result
