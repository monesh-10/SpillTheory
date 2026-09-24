# Earth Observation (EO) Deep Learning Models

This directory contains model checkpoints for optical Earth Observation multispectral marine segmentation.

## Model Overview

- **Architecture**: `SeaRel-SR-UNet V3` (Sea-Relative Spectral Residual U-Net)
- **Input Dimensions**: `[Batch, 11, 240, 240]` (11-band Sentinel-2 L2R surface reflectance)
- **Output Classes**: 15 semantic marine classes (including Marine Debris, Algae, Ship, Oil Spill, Water bodies)
- **Checkpoint File**: `best_v3_miou.pt` (~227.4 MB)

## Placement & Configuration

Due to GitHub's 100 MB file limit, large `.pt` and `.pth` weight files are excluded from Git tracking via `.gitignore`.

1. Place your trained checkpoint file here:
   ```
   models/eo/best_v3_miou.pt
   ```

2. Alternatively, configure the checkpoint path using the environment variable:
   ```bash
   # In .env or shell:
   EO_MODEL_PATH=/path/to/your/best_v3_miou.pt
   ```

## Model Path Resolution Order

The pipeline in `eo/inference.py` resolves the model checkpoint in the following order:
1. `EO_MODEL_PATH` environment variable
2. `models/eo/best_v3_miou.pt`
3. `models/best_v3_miou.pt`
4. `EO_Context/best_v3_miou.pt` (legacy fallback)

## Checkpoint Format

The checkpoint is saved by PyTorch and can contain:
- An `"ema"` dictionary (preferred Exponential Moving Average weights)
- A `"model"` dictionary
- Or a raw `state_dict`
