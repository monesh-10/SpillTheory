# SAR Deep Learning Models

This directory contains pretrained deep learning model weights for spaceborne Synthetic Aperture Radar (SAR) oil spill segmentation.

## Model Files

| File | Architecture | Input Data | Target | File Size |
| :--- | :--- | :--- | :--- | :--- |
| `unet_oilspill.h5` | 2D U-Net CNN (Keras / TensorFlow) | Sentinel-1 C-Band / ALOS PALSAR L-Band (256×256 normalized radar backscatter) | Binary oil slick segmentation mask | ~732 KB |

## Expected Location

- **Standard path**: `models/sar/unet_oilspill.h5`
- **Legacy fallback**: `models/unet_oilspill.h5`

## Pipeline Integration

- The SAR inference pipeline in `sar/inference.py` loads `unet_oilspill.h5` via `load_sar_model()`.
- If TensorFlow is unavailable, the pipeline falls back to an adaptive Otsu radar backscatter damping segmentation heuristic, ensuring uninterrupted operation.
