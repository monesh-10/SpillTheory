# SpillTheory (AquaSentinel-4D) · Cyber-Maritime Tactical Command Center

> **Autonomous AI-Driven Marine Oil Spill Intelligence, Satellite SAR Delineation, Lagrangian Backtracking & AIS Vessel Attribution Platform**

---

## Overview

**SpillTheory** is an end-to-end maritime defense and environmental response tactical command platform. It merges C-Band/L-Band Synthetic Aperture Radar (SAR) satellite imagery with deep-learning neural segmentation, real-time MetOcean hydrodynamic drift modeling, and automated AIS vessel attribution to identify marine pollution incidents and hold polluters accountable.

### Key Capabilities

1. **AI Satellite SAR Spill Detection**:
   - Automated C-Band Synthetic Aperture Radar (SAR) backscatter damping analysis (Sentinel-1 IW, ALOS PALSAR).
   - U-Net convolutional neural network segmentation for capillary wave suppression zones.
   - **Interactive Coherence Viewer**: 1:1 pixel-accurate split-screen comparison slider between raw radar backscatter and binary oil slick masks.
   - **Coordinate Geo-Anchoring**: Precision manual latitude/longitude overrides and instant Indian maritime operational presets (Mumbai High, Chennai Port, Kochi Malabar, Gulf of Kutch).
   - Zero false alarm benchmark on undisturbed sea clutter (`clean_ocean_no_spill.png`).

2. **4D Digital Twin & Incident Reconstruction**:
   - Full interactive Leaflet / Esri satellite bathymetric map interface.
   - Reconstructs spills in space and time with forward drift forecasting (+6h, +12h, +24h, +48h).
   - Non-colliding tactical floating markers for slick centroids, probable discharge origin, and suspect vessel tracks.

3. **Lagrangian Reverse Particle Backtracking**:
   - Backtracks dispersed oil particles against wind leeway vectors and surface currents.
   - Computes age-normalized compactness and temporal discharge windows.

4. **AIS Vessel Dark Activity & Anomaly Attribution**:
   - Automated spatiotemporal intersection between vessel historical paths and backtracked origin points.
   - Identifies vessel speed drops (e.g. slowing from 12 knots to 2.4 knots during illegal bilge washouts).
   - Generates ranked attribution candidate dossiers with probabilistic confidence scores.

5. **Operational Incident Registry & PDF Intelligence Briefs**:
   - Active incident table with live status filtering and classification tags.
   - One-click ReportLab automated tactical PDF intelligence export (`/api/scenario/{id}/export-pdf`).

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Leaflet GIS.
- **Backend**: FastAPI, Python 3.11, Uvicorn, Pydantic, NumPy, SciPy, Pillow, ReportLab.
- **AI / Segmentation**: U-Net architecture, multi-scale adaptive Otsu backscatter segmentation fallback.

---

## Quick Start Guide

### Prerequisites
- Node.js (v18+) & npm
- Python (v3.10+)

---

### Step 1: Install Dependencies

```bash
# Clone repository
git clone https://github.com/monesh-10/SpillTheory.git
cd SpillTheory

# Install frontend dependencies
npm install

# Install backend dependencies
pip install -r requirements.txt
```

---

### Step 2: Start the Backend Server (FastAPI)

Open a terminal window and run:

```bash
python -m uvicorn backend.main:app --port 8000 --reload
```

* **API Base URL**: http://127.0.0.1:8000
* **Interactive API Docs (Swagger UI)**: http://127.0.0.1:8000/docs

---

### Step 3: Start the Frontend UI (React + Vite)

Open a second terminal window and run:

```bash
npm run dev -- --host --port 3000
```

* **Web UI URL**: http://localhost:3000

Open your browser and navigate to **http://localhost:3000** to launch the tactical dashboard.

---

## Project Structure

```
SpillTheory/
├── backend/
│   ├── main.py               # FastAPI application endpoints & scenario orchestration
│   ├── backtracking/         # Lagrangian reverse particle benchmark & telemetry
│   ├── metocean.py           # Real-time wind and ocean current drift modeling
│   └── pdf_report.py         # Automated ReportLab intelligence briefing generator
├── sar/
│   ├── inference.py          # U-Net SAR inference & Otsu radar backscatter segmentation
│   ├── preprocessing.py      # SAR imagery normalization & tensor conversion
│   ├── postprocess.py        # Connected region analysis & boundary morphology
│   └── geo_convert.py        # GeoJSON polygon coordinate projection
├── models/
│   └── unet_oilspill.h5      # Pretrained SAR U-Net weights
├── demo_data/                # Real Sentinel-1 / ALOS PALSAR tiles & baseline benchmarks
├── src/
│   ├── components/           # MapWorkspace, NavigationRail, Header, Footer
│   ├── views/                # SpillDetectionView, IncidentRegistryView, etc.
│   ├── services/api.ts       # Centralized REST API service layer
│   └── types/                # TypeScript interface definitions
├── index.html
├── package.json
├── requirements.txt
└── vite.config.ts
```

---

## License

MIT License. Developed for maritime environmental intelligence and rapid emergency response.
