# Optical Earth Observation (EO) Pipeline

This document specifies the Earth Observation multispectral segmentation pipeline, model architecture, preprocessing standards, and API specification.

---

## 1. 11-Band Multispectral Input Contract

The EO pipeline ingests Sentinel-2 L2R surface reflectance multispectral scenes:
- **File Format**: GeoTIFF (`.tif` or `.tiff`).
- **Band Count Requirement**: Exactly **11 bands**. Files with fewer or more bands are rejected with HTTP 422 (`EOValidationError`).
- **Known Spectral Band Ordering**:
  The pipeline assumes the standard MADOS benchmark reflectance band ordering:
  1. Band 1: B01 (Coastal Aerosol, 443 nm)
  2. Band 2: B02 (Blue, 490 nm)
  3. Band 3: B03 (Green, 560 nm)
  4. Band 4: B04 (Red, 665 nm)
  5. Band 5: B05 (Vegetation Red Edge 1, 705 nm)
  6. Band 6: B06 (Vegetation Red Edge 2, 740 nm)
  7. Band 7: B07 (Vegetation Red Edge 3, 783 nm)
  8. Band 8: B08 (NIR, 842 nm)
  9. Band 9: B09 (Water Vapour, 945 nm)
  10. Band 10: B11 (SWIR 1, 1610 nm)
  11. Band 11: B12 (SWIR 2, 2190 nm)

---

## 2. Preprocessing & Normalization (`eo/preprocessing.py`)

1. **Reading & Resampling**:
   - `rasterio` reads the 11 bands simultaneously.
   - Resampled to $240 \times 240$ spatial resolution using `Resampling.nearest` (strictly matching Cell 10 of `mados-sih12345.ipynb`).
2. **Invalid Pixel Imputation**:
   - Any non-finite values (`NaN`, `+Inf`, `-Inf`) are replaced on a per-band basis using published MADOS mean reflectance values.
3. **Z-Score Normalization**:
   - Normalized via $(x - \mu) / \sigma$ using fixed MADOS statistics:
   - **`BAND_MEAN`**:
     `[0.0582676, 0.05223386, 0.04381474, 0.0357083, 0.03412902, 0.03680401, 0.03999107, 0.03566642, 0.03965081, 0.0267993, 0.01978944]`
   - **`BAND_STD`**:
     `[0.03240627, 0.03432253, 0.0354812, 0.0375769, 0.03785412, 0.04992323, 0.05884482, 0.05545856, 0.06423746, 0.04211187, 0.03019115]`
   - Returns float32 tensor of shape `[1, 11, 240, 240]`.

---

## 3. Model Architecture: SeaRel-SR-UNet V3 (`eo/model.py`)

Reproduces Cell 16 of `mados-sih12345.ipynb`:
- **Input Channels**: 11
- **Number of Classes**: 15
- **Base Width**: 48 filters
- **Dropout Rate**: 0.10
- **Absolute Spectral Attention Branch**:
  - `ResidualSpectralStem` with `SpectralSE` squeeze-and-excitation block (hidden channels = 32, residual scale init = 0.10).
- **Sea-Relative Local Spectral Contrast Coordinates (LSCC)**:
  - Annular ring box pooling pairs: `((3, 9), (7, 21), (15, 41))`.
  - Computes spatial delta contrast, log ratios, and spectral angle cosine distances (23 relative channels).
  - Bounded residual gate logits initialized to 0.05, max 0.50.
- **U-Net Backbone**:
  - 4 downsampling stages (GroupNorm + GELU + MaxPool).
  - 4 upsampling stages (ConvTranspose2d + skip concatenation).
  - Final $1\times 1$ conv head producing 15 raw class logits.

---

## 4. The 15 Semantic Marine Classes

| ID | Class Name | Semantics / Color | Hex Code |
| :--- | :--- | :--- | :--- |
| `0` | Marine Debris | Plastics, floating anthropogenic litter (Orange) | `#FF8C00` |
| `1` | Dense Sargassum | Heavy brown macroalgae mats (Forest Green) | `#228B22` |
| `2` | Sparse Floating Algae | Dispersed micro/macroalgae (Light Green) | `#90EE90` |
| `3` | Natural Organic Material | Flotsam, driftwood, coastal organic detritus (Brown) | `#8B5A2B` |
| `4` | Ship | Vessel superstructure & metallic signatures (Crimson) | `#DC143C` |
| `5` | **Oil Spill** | **Petroleum hydrocarbons, slicks, sheens (Dark Charcoal)** | `**#141414**` |
| `6` | Marine Water | Clear deep open-ocean water (Ocean Blue) | `#006994` |
| `7` | Sediment-Laden Water | River plumes, estuarine runoff, mudflats (Tan) | `#D2B48C` |
| `8` | Foam | Breaking surf, whitecaps, coastal foam (White) | `#FFFFFF` |
| `9` | Turbid Water | High particulate scattering water (Cornflower Blue) | `#6495ED` |
| `10` | Shallow Water | Submerged reefs, shoals, sandy shallows (Light Blue) | `#ADD8E6` |
| `11` | Waves & Wakes | Breaking sea swells, ship wake turbulence (Gold) | `#FFD700` |
| `12` | Oil Platform | Offshore rigs, drilling infrastructure (Indigo) | `#4B0082` |
| `13` | Jellyfish | Surface bloom aggregations (Pink) | `#FFB6C1` |
| `14` | Sea Snot | Mucilage events, phytoplankton secretions (Grey) | `#A9A9A9` |

---

## 5. Checkpoint Loading & Resolution (`eo/inference.py`)

The inference engine lazily initializes the model once per server process. Checkpoints are resolved in this priority:
1. `EO_MODEL_PATH` environment variable
2. `models/eo/best_v3_miou.pt`
3. `models/best_v3_miou.pt`
4. `EO_Context/best_v3_miou.pt` (legacy fallback)

When loading the `.pt` file, the loader inspects the dictionary keys:
- If `"ema"` exists $\rightarrow$ loads Exponential Moving Average weights (preferred).
- If `"model"` exists $\rightarrow$ loads standard model weights.
- Otherwise $\rightarrow$ treats the file as a raw PyTorch state dict.

---

## 6. Test-Time Augmentation (TTA)

Inference applies 4 spatial transformations:
1. Identity: $f(x)$
2. Horizontal Flip: $\text{flip}_h(f(\text{flip}_h(x)))$
3. Vertical Flip: $\text{flip}_v(f(\text{flip}_v(x)))$
4. Both Flips: $\text{flip}_{hv}(f(\text{flip}_{hv}(x)))$

Logits are averaged across all 4 forward passes before softmax activation, improving boundary stability and reducing noise.

---

## 7. Output Artifacts & API Contract

### Endpoint: `POST /api/detect-eo`

- **Request**: Multipart form data with field `file` containing one `.tif` or `.tiff` file.
- **Output Artifacts**:
  - `_eo_pred_<ts>.png`: RGB color-mapped prediction image saved to `data/outputs/`.
  - `_eo_conf_<ts>.png`: Greyscale confidence image saved to `data/outputs/`.
- **Response Format**:
```json
{
  "status": "success",
  "modality": "EO",
  "model": {
    "name": "SeaRel-SR-UNet V3",
    "in_channels": 11,
    "num_classes": 15,
    "image_size": 240,
    "tta": true,
    "checkpoint": "..."
  },
  "oil_spill_detected": true,
  "oil_spill_percent": 3.42,
  "detected_classes": ["Marine Water", "Oil Spill", "Foam"],
  "num_detected_classes": 3,
  "per_class": [
    {
      "class_index": 5,
      "class_name": "Oil Spill",
      "pixel_count": 1970,
      "pixel_fraction": 0.0342,
      "percent": 3.42,
      "color_hex": "#141414",
      "detected": true
    }
  ],
  "image_size": 240,
  "prediction_mask_url": "http://localhost:8000/data/outputs/_eo_pred_123456.png",
  "confidence_map_url": "http://localhost:8000/data/outputs/_eo_conf_123456.png",
  "class_colors": ["#FF8C00", ...],
  "class_names": ["Marine Debris", ...]
}
```
