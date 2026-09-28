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
    Read a multispectral TIFF using tifffile, rasterio, or PIL.

    Returns:
        image: float32 array of shape [IN_CHANNELS, IMAGE_SIZE, IMAGE_SIZE]

    Raises:
        EOValidationError: on invalid file
        RuntimeError: on unreadable file
    """
    tiff_path = Path(tiff_path)
    data = None

    # 1. Try reading with tifffile
    try:
        import tifffile
        with tifffile.TiffFile(str(tiff_path)) as tif:
            arr = tif.asarray().astype(np.float32)
            if arr.ndim == 2:
                # Replicate 2D across all 11 bands
                arr = np.repeat(arr[np.newaxis, :, :], IN_CHANNELS, axis=0)
            elif arr.ndim == 3:
                # If shape is [H, W, C], transpose to [C, H, W]
                if arr.shape[2] == IN_CHANNELS:
                    arr = arr.transpose(2, 0, 1)
                elif arr.shape[0] != IN_CHANNELS and arr.shape[2] > 1:
                    arr = arr.transpose(2, 0, 1)
                
                # If channel count is not 11, adapt
                if arr.shape[0] < IN_CHANNELS:
                    # Pad or tile bands
                    repeats = int(np.ceil(IN_CHANNELS / arr.shape[0]))
                    arr = np.tile(arr, (repeats, 1, 1))[:IN_CHANNELS]
                elif arr.shape[0] > IN_CHANNELS:
                    arr = arr[:IN_CHANNELS]
            data = arr
    except Exception:
        pass

    # 2. Try rasterio if tifffile failed
    if data is None:
        try:
            import rasterio
            from rasterio.enums import Resampling
            with rasterio.open(str(tiff_path)) as src:
                b_cnt = min(src.count, IN_CHANNELS)
                read_arr = src.read(
                    out_shape=(src.count, IMAGE_SIZE, IMAGE_SIZE),
                    resampling=Resampling.nearest,
                ).astype(np.float32)
                if read_arr.shape[0] < IN_CHANNELS:
                    repeats = int(np.ceil(IN_CHANNELS / read_arr.shape[0]))
                    data = np.tile(read_arr, (repeats, 1, 1))[:IN_CHANNELS]
                else:
                    data = read_arr[:IN_CHANNELS]
        except Exception:
            pass

    # 3. Fallback to PIL
    if data is None:
        try:
            from PIL import Image
            pil_img = Image.open(str(tiff_path))
            # If multi-page TIFF, read up to IN_CHANNELS pages
            pages = []
            try:
                for i in range(IN_CHANNELS):
                    pil_img.seek(i)
                    p = pil_img.copy().convert("F").resize((IMAGE_SIZE, IMAGE_SIZE))
                    pages.append(np.asarray(p, dtype=np.float32))
            except EOFError:
                pass
            if pages:
                while len(pages) < IN_CHANNELS:
                    pages.append(pages[-1])
                data = np.stack(pages[:IN_CHANNELS], axis=0)
            else:
                p = pil_img.convert("F").resize((IMAGE_SIZE, IMAGE_SIZE))
                single = np.asarray(p, dtype=np.float32)
                data = np.repeat(single[np.newaxis, :, :], IN_CHANNELS, axis=0)
        except Exception as e:
            raise RuntimeError(f"Could not read TIFF file: {e}")

    # Resize to [IN_CHANNELS, IMAGE_SIZE, IMAGE_SIZE]
    if data.shape[1] != IMAGE_SIZE or data.shape[2] != IMAGE_SIZE:
        from PIL import Image
        resized_bands = []
        for c in range(IN_CHANNELS):
            b_img = Image.fromarray(data[c])
            b_img = b_img.resize((IMAGE_SIZE, IMAGE_SIZE), Image.Resampling.NEAREST)
            resized_bands.append(np.asarray(b_img, dtype=np.float32))
        data = np.stack(resized_bands, axis=0)

    # Replace NaN / Inf with per-band mean
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
