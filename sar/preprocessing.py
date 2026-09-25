import numpy as np
from pathlib import Path

IMAGE_SIZE = 512
IN_CHANNELS = 2
BAND_MEAN = np.array([-27.026463, -15.938210], dtype=np.float32)
BAND_STD = np.array([1.472851, 1.034567], dtype=np.float32)

class SARValidationError(ValueError):
    pass

def load_and_preprocess(tiff_path):
    import rasterio
    from rasterio.enums import Resampling

    tiff_path = Path(tiff_path)
    if not (tiff_path.suffix.lower() in [".tif", ".tiff"]):
        raise SARValidationError(f"Expected TIFF file, got {tiff_path.suffix}")

    with rasterio.open(str(tiff_path)) as src:
        band_count = src.count
        if band_count != IN_CHANNELS:
            raise SARValidationError(f"Expected a {IN_CHANNELS}-band SAR TIFF (VV + VH). Received {band_count} band(s).")
        
        data = src.read(
            out_shape=(band_count, IMAGE_SIZE, IMAGE_SIZE),
            resampling=Resampling.nearest,
        ).astype(np.float32)

    for c in range(IN_CHANNELS):
        bad = ~np.isfinite(data[c])
        if bad.any():
            data[c][bad] = BAND_MEAN[c]

    raw_image = data.copy()
    normalized = (data - BAND_MEAN[:, None, None]) / BAND_STD[:, None, None]
    
    # model_input needs to be (1, 2, 512, 512) tensor
    model_input = np.expand_dims(normalized, axis=0)
    
    return raw_image, model_input