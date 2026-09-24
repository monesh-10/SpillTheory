# Synthetic Aperture Radar (SAR) Pipeline

This document specifies the SAR image processing pipeline, model architecture, topological deconvolution, and API contract.

---

## 1. SAR Input Specification

- **Sensors Supported**:
  - European Space Agency (ESA) Copernicus Sentinel-1 (C-Band Interferometric Wide Swath)
  - JAXA ALOS-2 PALSAR-2 (L-Band SAR)
- **Supported Formats**: `.png`, `.jpg`, `.jpeg`, `.tif`, `.tiff`
- **Resolution**: Typically 10m to 12.5m pixel spacing
- **Image Content**: Single-channel radar backscatter intensity image representing ocean surface capillary wave damping (oil slicks appear as dark anomalies against bright Bragg clutter).

---

## 2. SAR Preprocessing (`sar/preprocessing.py`)

- **Resizing**: Scaled to standard input dimensions of $256 \times 256$ pixels.
- **Normalization**: Pixel values scaled to float32 range $[0.0, 1.0]$.
- **Tensor Formatting**: Formatted to 4D tensor `[1, 256, 256, 1]` for model consumption.

---

## 3. SAR Models & Heuristic Fallbacks (`sar/inference.py`)

### Primary Model (Deep U-Net)
- **Architecture**: 2D Convolutional U-Net segmentation network.
- **Checkpoint Location**: `models/sar/unet_oilspill.h5` (or legacy `models/unet_oilspill.h5`).
- **Framework**: Keras / TensorFlow.
- **Output**: Single-channel sigmoid probability map $[0.0, 1.0]$.

### Multi-Scale Adaptive Otsu Fallback (Zero-Dependency Mode)
If TensorFlow is not installed in the execution environment, the pipeline executes a multi-scale statistical heuristic:
1. Flat image detection ($max - min < 0.05$) $\rightarrow$ Clean ocean.
2. Binary mask detection ($unique \le 4$) $\rightarrow$ Direct threshold.
3. Radar clutter variance check ($std < 0.07$ and $min > 0.18$) $\rightarrow$ Undisturbed sea.
4. Gaussian filter ($\sigma = 1.5$) followed by histogram Otsu optimal variance thresholding and scaled sigmoid activation.

---

## 4. Morphological Source Deconvolution (`sar/postprocess.py`)

Rather than relying on file naming, the pipeline analyzes connected components and geometric topology:
1. **Euclidean Distance Transform (EDT)**: Computes the distance from boundary to interior cores of segmented dark patches.
2. **Local Peak Detection**: Locates distinct discharge maxima separated by at least 22 pixels ($>1.2\text{ km}$).
3. **Bottleneck Necking Ratio ($\eta$)**: Measures the minimum width between peaks relative to peak diameters:
   - $\eta < 0.62$ with 2 peaks: **Dual Ship Coalescence (2 Vessels Merged)**
   - Single peak: **Single Ship Point-Source Leak (1 Vessel)**
   - Zero peaks or coverage $<0.05\%$: **Clean Ocean Benchmark**

---

## 5. SAR API Endpoint (`POST /api/detect-sar`)

### Request
Multipart form data:
- `file`: Uploaded image file (optional if `demo_filename` is provided)
- `demo_filename`: Filename from `demo_data/` (optional)
- `center_lat`: Geographic latitude for scenario anchor (default: `18.112`)
- `center_lon`: Geographic longitude for scenario anchor (default: `72.464`)
- `threshold`: Binary threshold (default: `0.40`)

### Response Structure
```json
{
  "status": "success",
  "spill_detected": true,
  "spill_id": "SAR_123456",
  "location": "Offshore Mumbai Basin (18.11°N, 72.46°E)",
  "coverage_percent": 5.99,
  "area_km2": 13.48,
  "num_sources": 2,
  "topology": "DUAL_MERGED",
  "classification": "Dual-Source Petroleum Coalescence (2 Ships Merged)",
  "vessel_source_classification": "Dual Ship Leak (2 Vessels Coalesced)",
  "sar_metadata": {
    "image_url": "http://localhost:8000/demo_data/...",
    "mask_url": "http://localhost:8000/demo_data/...",
    "sensor": "Sentinel-1 / ALOS PALSAR C/L-Band SAR",
    "coverage_percent": 5.99,
    "confidence": 0.947
  },
  "scenario": { ... }
}
```
