"""
EO inference pipeline for SpillTheory.

Implements:
  - Lazy model loading (loaded once, cached globally)
  - Checkpoint loading: prefers EMA weights when present
    (matches notebook Cell 25: if "ema" in ckpt: best_model.load_state_dict(ckpt["ema"]))
  - Test-time augmentation (TTA) with 4 variants
    (matches notebook Cell 27: identity, H-flip, V-flip, both)
  - Model path via EO_MODEL_PATH env var or repository convention fallback

Model path resolution order:
  1. EO_MODEL_PATH environment variable
  2. EO_Context/best_v3_miou.pt (relative to repository root)
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

import numpy as np
import torch
import torch.nn.functional as F

from .model import build_eo_model, CLASS_NAMES, NUM_CLASSES, IN_CHANNELS, IMAGE_SIZE
from .preprocessing import preprocess_eo_tiff, validate_eo_file, EOValidationError

# ---------------------------------------------------------------------------
# Paths & configuration
# ---------------------------------------------------------------------------

_REPO_ROOT = Path(__file__).resolve().parents[1]
_DEFAULT_CHECKPOINT = _REPO_ROOT / "models" / "eo" / "best_v3_miou.pt"


def _resolve_model_path() -> Path:
    """Resolve EO model path: env var takes priority, models/eo/, models/, then EO_Context/ fallback."""
    env_path = os.environ.get("EO_MODEL_PATH", "").strip()
    if env_path:
        return Path(env_path)
    eo_ckpt = _REPO_ROOT / "models" / "eo" / "best_v3_miou.pt"
    if eo_ckpt.exists():
        return eo_ckpt
    models_ckpt = _REPO_ROOT / "models" / "best_v3_miou.pt"
    if models_ckpt.exists():
        return models_ckpt
    legacy_ckpt = _REPO_ROOT / "EO_Context" / "best_v3_miou.pt"
    if legacy_ckpt.exists():
        return legacy_ckpt
    return _DEFAULT_CHECKPOINT


# ---------------------------------------------------------------------------
# Global lazy model cache (one load per process)
# ---------------------------------------------------------------------------

_eo_model = None
_eo_device: Optional[torch.device] = None


def get_eo_model() -> tuple[torch.nn.Module, torch.device]:
    """
    Lazy-load and cache the EO model.

    Returns:
        (model, device) ready for inference.

    Raises:
        FileNotFoundError: if checkpoint is not found.
        RuntimeError: if checkpoint cannot be loaded.
    """
    global _eo_model, _eo_device

    if _eo_model is not None:
        return _eo_model, _eo_device

    ckpt_path = _resolve_model_path()

    if not ckpt_path.exists():
        raise FileNotFoundError(
            f"EO model checkpoint not found at: {ckpt_path}. "
            f"Set the EO_MODEL_PATH environment variable to the correct path, "
            f"or place best_v3_miou.pt in EO_Context/."
        )

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    try:
        ckpt = torch.load(str(ckpt_path), map_location=device)
    except Exception as e:
        raise RuntimeError(f"Failed to load EO model checkpoint from {ckpt_path}: {e}")

    model = build_eo_model().to(device)

    # Notebook Cell 25:
    # if "ema" in ckpt:
    #     best_model.load_state_dict(ckpt["ema"])   # prefer EMA weights
    # else:
    #     best_model.load_state_dict(ckpt["model"])
    if "ema" in ckpt:
        model.load_state_dict(ckpt["ema"])
        loaded_key = "ema"
    elif "model" in ckpt:
        model.load_state_dict(ckpt["model"])
        loaded_key = "model"
    else:
        # Bare state dict (no wrapper dict)
        model.load_state_dict(ckpt)
        loaded_key = "bare"

    model.eval()

    _eo_model = model
    _eo_device = device

    epoch = ckpt.get("epoch", "?") if isinstance(ckpt, dict) else "?"
    best_miou = ckpt.get("best_miou", "?") if isinstance(ckpt, dict) else "?"
    print(
        f"[EO] Loaded checkpoint ({loaded_key} weights). "
        f"Epoch={epoch}, best_val_mIoU={best_miou}, device={device}"
    )

    return _eo_model, _eo_device


# ---------------------------------------------------------------------------
# Test-time augmentation (TTA)
# Matches notebook Cell 27 exactly.
# ---------------------------------------------------------------------------

@torch.no_grad()
def _tta_logits(model: torch.nn.Module, x: torch.Tensor) -> torch.Tensor:
    """
    4-variant TTA: identity, H-flip, V-flip, both flips.
    Averaged in logit space.
    """
    preds = [model(x)]

    # Horizontal flip
    xf = torch.flip(x, dims=[3])
    yf = model(xf)
    preds.append(torch.flip(yf, dims=[3]))

    # Vertical flip
    xf = torch.flip(x, dims=[2])
    yf = model(xf)
    preds.append(torch.flip(yf, dims=[2]))

    # Both flips
    xf = torch.flip(x, dims=[2, 3])
    yf = model(xf)
    preds.append(torch.flip(yf, dims=[2, 3]))

    return torch.stack(preds).mean(dim=0)


# ---------------------------------------------------------------------------
# Public inference function
# ---------------------------------------------------------------------------

def run_eo_inference(tiff_path: str | Path, use_tta: bool = True) -> dict:
    """
    Full EO inference pipeline.

    Steps:
        1. Validate TIFF
        2. Read + preprocess (normalize)
        3. Load model (lazy)
        4. TTA inference → averaged logits
        5. Softmax → per-class probabilities
        6. Argmax → prediction map (0–14)
        7. Compute per-class pixel statistics

    Args:
        tiff_path: path to 11-band multispectral TIFF
        use_tta: whether to use test-time augmentation (default: True)

    Returns:
        dict with keys:
            prediction_map   : np.ndarray [240, 240] int, values 0-14 (class index)
            confidence_map   : np.ndarray [240, 240] float, max softmax probability
            class_names      : list[str] of 15 class names
            class_pixel_counts : dict[str, int]
            class_pixel_fracs  : dict[str, float]
            detected_classes : list[str] classes with >0 pixels
            oil_spill_fraction : float (fraction of Oil Spill pixels)
            image_size       : int (240)
            model_info       : dict

    Raises:
        EOValidationError: on invalid input
        FileNotFoundError: on missing checkpoint
        RuntimeError: on inference errors
    """
    tiff_path = Path(tiff_path)

    # Step 1: Validate
    validate_eo_file(tiff_path)

    # Step 2: Preprocess
    raw_image, normalized = preprocess_eo_tiff(tiff_path)

    # Step 3: Load model
    model, device = get_eo_model()

    # Step 4: TTA inference
    # Shape: [1, 11, 240, 240]
    x = torch.from_numpy(normalized).unsqueeze(0).float().to(device)

    model.eval()
    with torch.no_grad():
        if use_tta:
            logits = _tta_logits(model, x)  # [1, 15, 240, 240]
        else:
            logits = model(x)

    # Step 5: Softmax probabilities
    probs = torch.softmax(logits.float(), dim=1)  # [1, 15, 240, 240]
    confidence_map, pred_map = probs.max(dim=1)   # [1, 240, 240] each

    prediction_map = pred_map[0].cpu().numpy().astype(np.int32)   # [240, 240], values 0-14
    confidence_map = confidence_map[0].cpu().numpy().astype(np.float32)  # [240, 240]

    # Step 6: Per-class statistics
    total_pixels = prediction_map.size
    class_pixel_counts: dict[str, int] = {}
    class_pixel_fracs: dict[str, float] = {}

    for idx, name in enumerate(CLASS_NAMES):
        count = int(np.sum(prediction_map == idx))
        class_pixel_counts[name] = count
        class_pixel_fracs[name] = round(count / total_pixels, 6)

    detected_classes = [
        name for name in CLASS_NAMES if class_pixel_counts[name] > 0
    ]

    oil_spill_idx = CLASS_NAMES.index("Oil Spill")
    oil_spill_fraction = class_pixel_fracs["Oil Spill"]

    return {
        "prediction_map": prediction_map,
        "confidence_map": confidence_map,
        "class_names": CLASS_NAMES,
        "class_pixel_counts": class_pixel_counts,
        "class_pixel_fracs": class_pixel_fracs,
        "detected_classes": detected_classes,
        "oil_spill_fraction": oil_spill_fraction,
        "image_size": IMAGE_SIZE,
        "model_info": {
            "name": "SeaRel-SR-UNet V3",
            "in_channels": IN_CHANNELS,
            "num_classes": NUM_CLASSES,
            "image_size": IMAGE_SIZE,
            "tta": use_tta,
            "checkpoint": str(_resolve_model_path()),
        },
    }
