# SpillTheory Architecture Specification

This document details the system design, frontend/backend architecture, independent satellite observation workflows (SAR and EO), and API data flow for the SpillTheory platform.

---

## 1. System Overview

SpillTheory is a dual-modality cyber-maritime digital twin that unifies satellite remote sensing with coastal hydrodynamics and AIS vessel kinematics to detect, forecast, and attribute marine oil spills.

The platform provides two completely independent observation modalities:
- **SAR (Synthetic Aperture Radar)**: All-weather, day/night radar backscatter damping analysis for large-scale slick delineation and morphological source deconvolution.
- **EO (Optical Earth Observation)**: Multispectral high-resolution 11-band surface reflectance analysis capable of classifying 15 marine surface classes including thin sheens, crude oil, sargassum, and debris.

---

## 2. Frontend & Backend Structure

```
Frontend (React 18 + TypeScript + Vite + Tailwind CSS)
   │
   ├── NavigationRail (Tactical switching: Command Center, SAR, EO, Incidents, Forecast, Attribution)
   │
   ├── Views
   │    ├── SpillDetectionView  ── SAR upload, Otsu/U-Net inspection, and deconvolution review
   │    ├── EODetectionView     ── Drag-and-drop 11-band TIFF upload, stage progress, mask/confidence viewer
   │    ├── DashboardView       ── 4D Leaflet bathymetry map, -5h to +48h temporal scrubber, live telemetry
   │    ├── VesselAttributionView ── Kinematic speed drops, course deviations, attribution scores
   │    └── ReportsView         ── Official maritime legal forensic PDF briefs
   │
   └── Services (apiService)    ── HTTP client communicating with FastAPI endpoints
        │
        ▼ (HTTP REST / JSON / Multipart)
Backend (FastAPI + Uvicorn)
   │
   ├── main.py                  ── Master routing, scenario orchestration, static mounts
   ├── eo_router.py             ── Dedicated endpoint for EO TIFF inference (/api/detect-eo)
   ├── metocean.py              ── Open-Meteo live marine API client + Fay spreading model
   ├── ais_algorithm.py         ── Haversine proximity, speed anomaly, and course deviation scoring
   ├── pdf_report.py            ── Cryptographic ReportLab PDF generator
   │
   ├── sar/                     ── SAR U-Net inference, Otsu fallback, and EDT topology
   ├── eo/                      ── PyTorch SeaRel-SR-UNet V3, LSCC inductive bias, 4-way TTA
   └── backtracking/            ── Lagrangian particle engine with Brownian eddy diffusion
```

---

## 3. SAR Workflow

1. **Input**: A greyscale satellite radar backscatter image (`.png`, `.jpg`, `.tif`) uploaded via the UI or selected from the demo benchmark catalog.
2. **Preprocessing (`sar/preprocessing.py`)**: Image resized to 256×256 and normalized to `[0.0, 1.0]`.
3. **Inference (`sar/inference.py`)**:
   - If TensorFlow is available: Pretrained 2D U-Net (`models/sar/unet_oilspill.h5`) predicts probability map.
   - If TensorFlow is unavailable: Multi-scale adaptive Otsu thresholding segments the low-backscatter oil anomaly from sea clutter.
4. **Morphological Deconvolution (`sar/postprocess.py`)**:
   - Euclidean Distance Transform (EDT) computes plume thickness peaks.
   - Spatial peak separation ($\ge 22\text{ px}$) and bottleneck necking ratio ($\eta < 0.62$) classify the slick as:
     - **Clean Ocean** (0 vessels, 0% spill coverage)
     - **Single Ship Point-Source** (1 vessel)
     - **Dual Ship Coalescence** (2 vessels merged)
5. **Hydrodynamic Projection**:
   - Mask converted to WGS84 GeoJSON polygon.
   - Seeded into +48h Fay physical spreading expansion and reverse Lagrangian backtracking.

---

## 4. EO Workflow

1. **Input**: A single multispectral GeoTIFF (`.tif` or `.tiff`) containing exactly 11 spectral bands matching Sentinel-2 L2R spectral specifications.
2. **Validation & Preprocessing (`eo/preprocessing.py`)**:
   - `rasterio` validates 11 bands and dimensions $\ge 1\times 1$.
   - Nearest-neighbor resampling to 240×240 pixels (matching MADOS training configuration).
   - Non-finite pixel values replaced with per-band means.
   - Per-band z-score normalization using published MADOS constants: $(x - \mu) / \sigma$.
3. **Inference (`eo/inference.py`)**:
   - Lazy-loads `SeaRelSRUNet` on CPU or CUDA.
   - Loads model weights (preferring EMA weights from checkpoint).
   - Executes 4-way Test-Time Augmentation (TTA: identity, horizontal flip, vertical flip, dual flip), averaging logits.
   - Softmax probabilities and argmax generate 15-class integer map `[240, 240]` and confidence map `[240, 240]`.
4. **Postprocessing (`eo/postprocess.py`)**:
   - Prediction map mapped to distinct 15-class RGB colormap PNG.
   - Confidence map saved as greyscale PNG.
   - Per-class pixel counts, percentages, and detection flags compiled into JSON response.
5. **Frontend Presentation (`EODetectionView.tsx`)**:
   - Dual-view toggle between segmentation mask and confidence heat map.
   - Interactive 15-class distribution bar chart and oil spill detection alert.

---

## 5. API Data Flow

| Endpoint | Method | Input | Processing Engine | Output |
| :--- | :--- | :--- | :--- | :--- |
| `/api/detect-sar` | `POST` | Multipart SAR file or demo name | U-Net / Otsu + EDT deconvolution | Scenario JSON with mask URL, topology, and drift forecast |
| `/api/detect-eo` | `POST` | Multipart 11-band TIFF | SeaRel-SR-UNet V3 + 4-way TTA | JSON with 15-class stats, mask URL, and confidence URL |
| `/api/scenario/{id}` | `GET` | Spill ID string | Scenario loader + Live MetOcean + Backtracking | Full 4D digital twin payload |
| `/api/metocean` | `GET` | Lat/Lon coordinates | Open-Meteo Marine API + Lagrangian drift | Hourly weather, wave, current, and net drift vectors |
| `/api/scenario/{id}/export-pdf` | `GET` | Spill ID string | ReportLab PDF engine | Tamper-evident SHA-256 legal forensic dossier |
