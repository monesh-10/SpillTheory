"""
EO postprocessing: converts raw prediction maps into visualizable images and
JSON-serializable result structures for the API response.
"""

from __future__ import annotations

import base64
import io
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

from .model import CLASS_NAMES, NUM_CLASSES

# ---------------------------------------------------------------------------
# Class color palette (15 classes)
# Distinct, semantically motivated colors for marine segmentation classes
# ---------------------------------------------------------------------------

# Each entry: (R, G, B)  — 0-255
CLASS_COLORS: list[tuple[int, int, int]] = [
    (255, 140,   0),  # 0  Marine Debris         — orange
    ( 34, 139,  34),  # 1  Dense Sargassum        — forest green
    (144, 238, 144),  # 2  Sparse Floating Algae  — light green
    (139,  90,  43),  # 3  Natural Organic Material — brown
    (220,  20,  60),  # 4  Ship                   — crimson
    ( 20,  20,  20),  # 5  Oil Spill              — near-black (dark grey)
    (  0, 105, 148),  # 6  Marine Water           — deep ocean blue
    (210, 180, 140),  # 7  Sediment-Laden Water   — tan
    (255, 255, 255),  # 8  Foam                   — white
    (100, 149, 237),  # 9  Turbid Water           — cornflower blue
    (173, 216, 230),  # 10 Shallow Water          — light blue
    (255, 215,   0),  # 11 Waves & Wakes          — gold
    ( 75,   0, 130),  # 12 Oil Platform           — indigo
    (255, 182, 193),  # 13 Jellyfish              — pink
    (169, 169, 169),  # 14 Sea Snot               — grey
]

assert len(CLASS_COLORS) == NUM_CLASSES, (
    f"CLASS_COLORS length {len(CLASS_COLORS)} != NUM_CLASSES {NUM_CLASSES}"
)

# Hex codes for frontend legend
CLASS_HEX: list[str] = [
    "#{:02X}{:02X}{:02X}".format(*rgb) for rgb in CLASS_COLORS
]


def prediction_to_rgb(prediction_map: np.ndarray) -> np.ndarray:
    """
    Convert integer prediction map [H, W] with values 0-14
    into an RGB image [H, W, 3] uint8.
    """
    h, w = prediction_map.shape
    rgb = np.zeros((h, w, 3), dtype=np.uint8)
    for idx, color in enumerate(CLASS_COLORS):
        mask = prediction_map == idx
        rgb[mask] = color
    return rgb


def array_to_png_b64(arr: np.ndarray) -> str:
    """Encode a uint8 RGB/RGBA numpy array as a base64 PNG string."""
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")


def save_prediction_png(prediction_map: np.ndarray, out_path: str | Path) -> str:
    """Save prediction colormap as PNG. Returns the path as string."""
    out_path = Path(out_path)
    rgb = prediction_to_rgb(prediction_map)
    Image.fromarray(rgb).save(str(out_path))
    return str(out_path)


def save_confidence_png(confidence_map: np.ndarray, out_path: str | Path) -> str:
    """Save confidence map as greyscale PNG. Returns path as string."""
    out_path = Path(out_path)
    conf_uint8 = (np.clip(confidence_map, 0.0, 1.0) * 255).astype(np.uint8)
    Image.fromarray(conf_uint8, mode="L").save(str(out_path))
    return str(out_path)


def build_eo_api_response(
    inference_result: dict,
    prediction_png_url: str,
    confidence_png_url: str,
) -> dict[str, Any]:
    """
    Build the JSON-serializable response dict for the /api/detect-eo endpoint.

    Args:
        inference_result : output of eo.inference.run_eo_inference()
        prediction_png_url : URL where the frontend can fetch the colored mask
        confidence_png_url : URL for the confidence map

    Returns:
        dict suitable for JSONResponse
    """
    class_names = inference_result["class_names"]
    class_pixel_counts = inference_result["class_pixel_counts"]
    class_pixel_fracs = inference_result["class_pixel_fracs"]
    detected_classes = inference_result["detected_classes"]
    oil_spill_fraction = inference_result["oil_spill_fraction"]

    # Per-class stats with color for frontend legend
    per_class_stats = []
    for idx, name in enumerate(class_names):
        count = class_pixel_counts[name]
        frac = class_pixel_fracs[name]
        per_class_stats.append({
            "class_index": idx,
            "class_name": name,
            "pixel_count": count,
            "pixel_fraction": frac,
            "percent": round(frac * 100, 3),
            "color_hex": CLASS_HEX[idx],
            "detected": count > 0,
        })

    oil_spill_detected = oil_spill_fraction > 0.0

    return {
        "status": "success",
        "modality": "EO",
        "model": inference_result["model_info"],
        "oil_spill_detected": oil_spill_detected,
        "oil_spill_percent": round(oil_spill_fraction * 100, 3),
        "detected_classes": detected_classes,
        "num_detected_classes": len(detected_classes),
        "per_class": per_class_stats,
        "image_size": inference_result["image_size"],
        "prediction_mask_url": prediction_png_url,
        "confidence_map_url": confidence_png_url,
        "class_colors": CLASS_HEX,
        "class_names": class_names,
    }
