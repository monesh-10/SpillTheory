"""
Earth Observation (EO) Pipeline Unit & Integration Tests
Verifies SeaRel-SR-UNet V3 architecture, input validation, 11-band contract,
normalization constants, and 15-class postprocessing colormaps.
"""

import warnings
warnings.filterwarnings('ignore')

from pathlib import Path
import numpy as np

from eo.model import (
    IN_CHANNELS,
    NUM_CLASSES,
    IMAGE_SIZE,
    BAND_MEAN,
    BAND_STD,
    CLASS_NAMES,
    build_eo_model
)
from eo.preprocessing import (
    validate_eo_file,
    EOValidationError,
    VALID_EXTENSIONS
)
from eo.postprocess import (
    CLASS_COLORS,
    CLASS_HEX,
    prediction_to_rgb,
    build_eo_api_response
)
from eo.inference import _resolve_model_path


# ---------------------------------------------------------------------------
# 1. Pipeline & Architecture Tests (Mock / Self-Contained)
# ---------------------------------------------------------------------------

def test_eo_constants_and_dimensions():
    """Verify MADOS benchmark configuration and spectral constants."""
    assert IN_CHANNELS == 11
    assert NUM_CLASSES == 15
    assert IMAGE_SIZE == 240
    assert len(BAND_MEAN) == 11
    assert len(BAND_STD) == 11
    assert len(CLASS_NAMES) == 15
    assert len(CLASS_COLORS) == 15
    assert len(CLASS_HEX) == 15


def test_eo_model_architecture_shapes():
    """Verify SeaRel-SR-UNet V3 forward pass on synthetic input tensor."""
    try:
        import torch
    except ImportError:
        pytest.skip("PyTorch not installed in environment")

    model = build_eo_model()
    model.eval()

    # Synthetic batch of size 1 with 11 channels at 240x240
    x = torch.randn(1, 11, 240, 240, dtype=torch.float32)
    with torch.no_grad():
        out = model(x)

    assert out.shape == (1, 15, 240, 240), f"Expected [1, 15, 240, 240], got {out.shape}"


def test_eo_validation_rejects_invalid_extensions(tmp_path=None):
    """Ensure non-TIFF files are rejected with EOValidationError."""
    import tempfile
    if tmp_path is None:
        with tempfile.TemporaryDirectory() as td:
            fake_png = Path(td) / "test_image.png"
            fake_png.write_text("not a real tiff")
            try:
                validate_eo_file(str(fake_png))
                assert False, "Expected EOValidationError"
            except EOValidationError as exc:
                assert "Expected a TIFF file" in str(exc)
    else:
        fake_png = Path(tmp_path) / "test_image.png"
        fake_png.write_text("not a real tiff")
        try:
            validate_eo_file(str(fake_png))
            assert False, "Expected EOValidationError"
        except EOValidationError as exc:
            assert "Expected a TIFF file" in str(exc)


def test_eo_validation_rejects_nonexistent_file():
    """Ensure missing files raise RuntimeError."""
    missing = Path("nonexistent_satellite_file.tiff")
    try:
        validate_eo_file(missing)
        assert False, "Expected RuntimeError"
    except RuntimeError:
        pass


def test_eo_colormapping_bounds_and_shape():
    """Verify integer prediction map converts to 3-channel RGB uint8 image."""
    pred_map = np.random.randint(0, NUM_CLASSES, size=(240, 240), dtype=np.int32)
    rgb = prediction_to_rgb(pred_map)

    assert rgb.shape == (240, 240, 3)
    assert rgb.dtype == np.uint8
    assert 0 <= rgb.min() <= rgb.max() <= 255


def test_eo_api_response_builder():
    """Verify build_eo_api_response produces expected JSON-serializable keys."""
    dummy_counts = {name: (100 if i == 5 else 10) for i, name in enumerate(CLASS_NAMES)}
    total_px = sum(dummy_counts.values())
    dummy_fracs = {name: round(cnt / total_px, 6) for name, cnt in dummy_counts.items()}

    dummy_inference = {
        "class_names": CLASS_NAMES,
        "class_pixel_counts": dummy_counts,
        "class_pixel_fracs": dummy_fracs,
        "detected_classes": CLASS_NAMES,
        "oil_spill_fraction": dummy_fracs["Oil Spill"],
        "image_size": 240,
        "model_info": {
            "name": "SeaRel-SR-UNet V3",
            "in_channels": 11,
            "num_classes": 15,
            "image_size": 240,
            "tta": True,
            "checkpoint": "test.pt"
        }
    }

    res = build_eo_api_response(
        inference_result=dummy_inference,
        prediction_png_url="http://localhost:8000/data/outputs/mask.png",
        confidence_png_url="http://localhost:8000/data/outputs/conf.png"
    )

    assert res["status"] == "success"
    assert res["modality"] == "EO"
    assert res["oil_spill_detected"] is True
    assert res["oil_spill_percent"] > 0
    assert len(res["per_class"]) == 15
    assert res["prediction_mask_url"] == "http://localhost:8000/data/outputs/mask.png"


# ---------------------------------------------------------------------------
# 2. Checkpoint & Model Resolution Tests
# ---------------------------------------------------------------------------

def test_eo_checkpoint_path_resolution():
    """Verify checkpoint resolution points to models/eo/best_v3_miou.pt."""
    path = _resolve_model_path()
    assert isinstance(path, Path)
    # If checkpoint is in models/eo/, it should resolve there
    expected_path = Path(__file__).resolve().parents[1] / "models" / "eo" / "best_v3_miou.pt"
    if expected_path.exists():
        assert path == expected_path


def test_eo_checkpoint_loading_if_present():
    """Integration test: Load real weights if best_v3_miou.pt is present locally."""
    try:
        import torch
    except ImportError:
        pytest.skip("PyTorch not installed in environment")

    path = _resolve_model_path()
    if not path.exists():
        pytest.skip(f"Model checkpoint not present at {path}; skipping live weight load.")

    from eo.inference import get_eo_model
    model, device = get_eo_model()
    assert model is not None
    assert str(device) in ["cpu", "cuda"]


if __name__ == "__main__":
    test_eo_constants_and_dimensions()
    print("[PASS] test_eo_constants_and_dimensions passed")
    test_eo_model_architecture_shapes()
    print("[PASS] test_eo_model_architecture_shapes passed")
    test_eo_validation_rejects_nonexistent_file()
    print("[PASS] test_eo_validation_rejects_nonexistent_file passed")
    test_eo_colormapping_bounds_and_shape()
    print("[PASS] test_eo_colormapping_bounds_and_shape passed")
    test_eo_api_response_builder()
    print("[PASS] test_eo_api_response_builder passed")
    test_eo_checkpoint_path_resolution()
    print("[PASS] test_eo_checkpoint_path_resolution passed")
    test_eo_checkpoint_loading_if_present()
    print("[PASS] test_eo_checkpoint_loading_if_present passed")
    print("\nALL EO PIPELINE TESTS PASSED (100%)!")
