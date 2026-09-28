import numpy as np
from pathlib import Path
from PIL import Image

IMAGE_SIZE = (256, 256)
IN_CHANNELS = 1

class SARValidationError(ValueError):
    pass

def load_and_preprocess(image_path):
    """
    Load any SAR image (TIFF, GeoTIFF, PNG, JPG) and prepare it for U-Net inference.

    Returns:
        image_norm: (256, 256) float32 normalized image in [0, 1]
        model_input: (1, 256, 256, 1) float32 array ready for U-Net model.predict()
    """
    image_path = Path(image_path)
    suffix = image_path.suffix.lower()

    if not image_path.exists():
        raise FileNotFoundError(f"SAR image file not found: {image_path}")

    # 1. Read image with PIL or tifffile
    img_data = None
    if suffix in [".tif", ".tiff"]:
        try:
            import tifffile
            with tifffile.TiffFile(str(image_path)) as tif:
                arr = tif.asarray()
                if arr.ndim == 3:
                    # Multi-band: take first band or average across channels
                    if arr.shape[0] < arr.shape[2]:
                        arr = arr[0]
                    else:
                        arr = arr[:, :, 0]
                img_data = arr.astype(np.float32)
        except Exception:
            pass

    if img_data is None:
        try:
            pil_img = Image.open(str(image_path)).convert("L")
            pil_img = pil_img.resize(IMAGE_SIZE, Image.Resampling.BILINEAR)
            img_data = np.asarray(pil_img, dtype=np.float32)
        except Exception as e:
            raise SARValidationError(f"Could not load SAR image {image_path.name}: {e}")

    # Resize if not yet 256x256
    if img_data.shape != IMAGE_SIZE:
        pil_temp = Image.fromarray(img_data)
        pil_temp = pil_temp.resize(IMAGE_SIZE, Image.Resampling.BILINEAR)
        img_data = np.asarray(pil_temp, dtype=np.float32)

    # Normalize to [0.0, 1.0]
    min_v = float(np.nanmin(img_data))
    max_v = float(np.nanmax(img_data))
    if max_v > min_v:
        image_norm = ((img_data - min_v) / (max_v - min_v)).astype(np.float32)
    else:
        image_norm = np.zeros(IMAGE_SIZE, dtype=np.float32)

    # Clean any NaN or Inf
    bad = ~np.isfinite(image_norm)
    if bad.any():
        image_norm[bad] = 0.0

    # Model input shape (1, 256, 256, 1)
    model_input = image_norm[np.newaxis, ..., np.newaxis]

    return image_norm, model_input
