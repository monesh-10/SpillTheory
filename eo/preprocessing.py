"""
EO preprocessing for SpillTheory.

Reproduces exactly the preprocessing from mados-sih12345.ipynb Cells 5, 10, 12:
  - TIFF reading via rasterio (single multi-band file)
  - Resizing to IMAGE_SIZE=240 with nearest resampling
  - NaN/Inf replacement with BAND_MEAN per channel
  - Per-band z-score normalization with (x - BAND_MEAN) / BAND_STD
  - Output: float32 tensor [1, 11, 240, 240]

Input contract:
  The user supplies ONE .tif/.tiff file containing exactly 11 bands.
  Band ordering must match the MADOS dataset L2R_rhorc spectral ordering.
"""

from __future__ import annotations

import numpy as np
from pathlib import Path

from .model import IN_CHANNELS, BAND_MEAN, BAND_STD

IMAGE_SIZE = 240  # Verified from experiment_summary_v3.json

# Accepted TIFF extensions
VALID_EXTENSIONS = {".tif", ".tiff"}


class EOValidationError(ValueError):
    """User-facing validation error for EO inputs."""
    pass


def _read_multiband_tiff(tiff_path: str | Path) -> np.ndarray:
    """
    Read a multispectral TIFF using rasterio.

    Returns:
        image: float32 array of shape [IN_CHANNELS, IMAGE_SIZE, IMAGE_SIZE]

    Raises:
        EOValidationError: on readable but incompatible input
        RuntimeError: on unreadable file
    """
    try:
        import rasterio
        from rasterio.enums import Resampling
    except ImportError:
        raise RuntimeError(
            "rasterio is required for EO inference. "
            "Install it with: pip install rasterio"
        )

    tiff_path = Path(tiff_path)

    try:
        with rasterio.open(str(tiff_path)) as src:
            band_count = src.count
            height = src.height
            width = src.width

            if band_count != IN_CHANNELS:
                raise EOValidationError(
                    f"Expected an {IN_CHANNELS}-band multispectral TIFF. "
                    f"Received {band_count} band(s). "
                    f"Please supply a Sentinel-2 L2R reflectance TIFF with all {IN_CHANNELS} bands."
                )

            if height < 1 or width < 1:
                raise EOValidationError(
                    f"TIFF has invalid raster dimensions: {height}×{width}."
                )

            # Read all bands, resampling to IMAGE_SIZE × IMAGE_SIZE with nearest.
            # Matches notebook Cell 10: Resampling.nearest
            data = src.read(
                out_shape=(band_count, IMAGE_SIZE, IMAGE_SIZE),
                resampling=Resampling.nearest,
            ).astype(np.float32)

    except EOValidationError:
        raise
    except Exception as e:
        raise RuntimeError(f"Could not read TIFF file: {e}")

    # Replace NaN / Inf with per-band mean — mirrors notebook Cell 10:
    # for c in range(IN_CHANNELS):
    #     bad = ~np.isfinite(image[c])
    #     if bad.any():
    #         image[c][bad] = BAND_MEAN[c]
    for c in range(IN_CHANNELS):
        bad = ~np.isfinite(data[c])
        if bad.any():
            data[c][bad] = BAND_MEAN[c]

    return data


def preprocess_eo_tiff(tiff_path: str | Path) -> tuple[np.ndarray, np.ndarray]:
    """
    Full EO preprocessing pipeline.

    Steps:
        1. Read 11-band TIFF with rasterio, resize to 240×240 nearest
        2. Replace invalid values with BAND_MEAN
        3. Normalize: (x - BAND_MEAN) / BAND_STD   [matches notebook Cell 12]

    Returns:
        raw_image : float32 [11, 240, 240]  (before normalization, for visualization)
        normalized : float32 [11, 240, 240] (normalized, ready for model)

    Raises:
        EOValidationError: on validation failures
        RuntimeError: on rasterio errors
    """
    raw_image = _read_multiband_tiff(tiff_path)

    # Per-band z-score normalization exactly as in MADOSDataset.__getitem__:
    # image = (image - BAND_MEAN[:, None, None]) / BAND_STD[:, None, None]
    normalized = (raw_image - BAND_MEAN[:, None, None]) / BAND_STD[:, None, None]

    return raw_image, normalized


def validate_eo_file(file_path: str | Path) -> None:
    """
    Validate an EO TIFF file before inference.

    Raises:
        EOValidationError with a clear user-facing message on any problem.
    """
    file_path = Path(file_path)

    # Extension check
    if file_path.suffix.lower() not in VALID_EXTENSIONS:
        raise EOValidationError(
            f"Invalid file format '{file_path.suffix}'. "
            f"Expected a TIFF file (.tif or .tiff)."
        )

    # Read attempt — this also validates band count and dimensions
    _read_multiband_tiff(file_path)
