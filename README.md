# SpillTheory · Cyber-Maritime Tactical Command Center

> **Autonomous AI-Driven Marine Oil Spill Intelligence, Dual-Modality Satellite Delineation (SAR + EO), 4D Lagrangian Hydrodynamics & AIS Vessel Attribution Platform**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.140.0-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB.svg?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.4-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0%2B-EE4C2C.svg?logo=pytorch)](https://pytorch.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.11-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-199900.svg?logo=leaflet)](https://leafletjs.com/)
[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB.svg?logo=python)](https://python.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🌊 Executive Overview

**SpillTheory** is an enterprise-grade cyber-maritime tactical intelligence and environmental defense digital twin. It features dual independent satellite observation modalities:

1. **Spaceborne Synthetic Aperture Radar (SAR)** deep learning segmentation (Sentinel-1 C-Band & ALOS PALSAR L-Band) for all-weather day/night slick delineation.
2. **Optical Earth Observation (EO)** multispectral semantic segmentation via **SeaRel-SR-UNet V3** (Sentinel-2 L2R 11-band MSI), resolving 15 marine surface classes including thin slicks, thick oil, marine debris, and algal blooms.
3. **Autonomous Source Deconvolution** that identifies whether a SAR slick originated from a single vessel or two coalesced ships via morphological peak and bottleneck necking topology.
4. **Calibrated MetOcean Coastal Hydrodynamics** modeling live windage, surface currents, and tidal harmonics from the Open-Meteo API.
5. **Physical Fay Spreading Expansion** ($r(t) \propto t^{3/4}$) simulating accurate viscous-surface tension oil growth across a +48-hour forward horizon.
6. **4D Virtual Lagrangian Particle Tracking** featuring 150+ particle swarms with stochastic Brownian eddy diffusion and reverse trajectory backtracking to pinpoint discharge origins.
7. **Kinematic AIS Anomaly Attribution** identifying polluters by detecting speed drop anomalies and course deviations during illicit discharge windows.
8. **Statutory Maritime Legal Dossier Generation** delivering cryptographic SHA-256 tamper-evident PDF briefs for the Indian Coast Guard (ICG) and Directorate General of Shipping (DGS).

---

## ⚡ Technical Architecture

```mermaid
flowchart TD
    subgraph Data_Ingestion [Multi-Source Data Ingestion]
        SAR[Sentinel-1 / ALOS SAR Imagery]
        EO[Sentinel-2 L2R 11-Band Multispectral TIFF]
        MET[Live MetOcean Weather & Tidal Currents]
        AIS[Live AIS Vessel Transponder Telemetry]
    end

    subgraph SAR_Pipeline [SAR Intelligence Pipeline]
        UNET[SAR U-Net Segmentation]
        EDT[Euclidean Distance Transform]
        TOPO[Morphological Source Deconvolution]
        CLASS{SAR Verdict}
        UNET --> EDT --> TOPO --> CLASS
        CLASS -->|1 Vessel| SINGLE[Single Ship Leak Verdict]
        CLASS -->|2 Vessels| DUAL[Dual Ship Coalescence Verdict]
        CLASS -->|0 Vessels| CLEAN[Clean Ocean Benchmark Pass]
    end

    subgraph EO_Pipeline [EO Multispectral Pipeline]
        PRE[Rasterio 11-Band Ingestion & Z-Score Norm]
        LSCC[Local Spectral Contrast Coordinates - LSCC]
        SEAREL[SeaRel-SR-UNet V3 + TTAx4]
        CLASSES[15 Marine Class Segmentation]
        PRE --> LSCC --> SEAREL --> CLASSES
    end

    subgraph Hydro_Physics [4D Hydrodynamic & Dispersion Engine]
        DRIFT[Monsoon Coastal Current 058° ENE]
        FAY[Fay Viscous-Surface Tension Spreading]
        LAGRANGE[150-Particle Virtual Lagrangian Swarm]
        HINDCAST[Reverse Leeway Particle Backtracking]
        DRIFT --> FAY --> LAGRANGE --> HINDCAST
    end

    subgraph Digital_Twin [Tactical Command Center]
        MAP[4D Leaflet Nautical Bathymetry GIS]
        EOVIEW[EO Multispectral Analysis View]
        TIMELINE[Interactive -5h to +48h 4D Time Scrubbing]
        HUD[Live Lagrangian Engine HUD Telemetry]
        PDF[Statutory Legal PDF Attribution Dossier]
    end

    SAR --> UNET
    EO --> PRE
    MET --> DRIFT
    AIS --> HINDCAST
    CLASS --> MAP
    CLASSES --> EOVIEW
    FAY --> MAP
    LAGRANGE --> HUD
    MAP --> TIMELINE --> PDF
```

---

## 🔬 Scientific Methodology & Mathematical Formulations

### 1. Optical Earth Observation (EO) — SeaRel-SR-UNet V3
* **Inputs:** 11 spectral bands from Sentinel-2 L2R reflectance at 240×240 resolution.
* **Marine Inductive Bias (LSCC):** Local Spectral Contrast Coordinates compute multi-scale annular ring contrasts (inner/outer pairs: `(3,9)`, `(7,21)`, `(15,41)`) to decouple oil surface films from water column turbidity and sun glint.
* **Spectral Attention Stem:** Dual-branch fusion combining an absolute residual spectral attention stem with a sea-relative contrast branch.
* **15 Marine Classes:** Marine Debris, Dense Sargassum, Sparse Floating Algae, Natural Organic Material, Ship, **Oil Spill**, Marine Water, Sediment-Laden Water, Foam, Turbid Water, Shallow Water, Waves & Wakes, Oil Platform, Jellyfish, and Sea Snot.
* **Test-Time Augmentation (TTA):** 4-variant ensemble (identity, horizontal flip, vertical flip, dual flip) averaged in logit space.

### 2. Autonomous Single vs. Dual Ship SAR Deconvolution
SpillTheory inspects segmented SAR radar masks using computer vision topology:
* **Euclidean Distance Transform (EDT):** Calculates distance from edges to find deep plume discharge cores.
* **Peak Detection:** Analyzes local maxima with a minimum spatial separation of $\ge 22\text{ px}$ ($>1.2\text{ km}$).
* **Bottleneck Necking Ratio ($\eta$):**
  - $\eta < 0.62$ with two distinct peaks $\rightarrow$ **Dual Ship Coalesced Leak (2 Vessels)**.
  - Single dominant peak $\rightarrow$ **Single Ship Point-Source Discharge (1 Vessel)**.
  - Undisturbed Bragg scattering $\rightarrow$ **Clean Ocean Benchmark (0 Vessels · Zero False Alarm)**.

### 3. Physical Fay Viscous-Surface Tension Spreading
Crude oil spreading on water follows Fay's physical scaling equations:
* **$t = -300\text{ min}$ (Discharge Epoch):** Nascent seed plume $\sim 2.0\text{ km}^2$ (scale 0.22).
* **$t = 0\text{ min}$ (Satellite Observation):** Ground-truth detected slick $13.5\text{ km}^2$ (scale 1.00).
* **$t = +6\text{h}$:** Expands to **$22.5\text{ km}^2$** (scale 1.55).
* **$t = +12\text{h}$:** Expands to **$34.5\text{ km}^2$** (scale 2.10).
* **$t = +24\text{h}$:** Expands to **$54.0\text{ km}^2$** (scale 2.85).
* **$t = +48\text{h}$:** Expands to **$82.0\text{ km}^2$** (scale 3.80).

### 4. Coastal Monsoon Hydrodynamics (Konkan / Raigad Corridor)
Along the Maharashtra coast (off Murud-Janjira and Alibaug), the Southwest Monsoon surface current and windage transport carry offshore slicks **East-North-East ($058^\circ$ to $068^\circ$) directly towards the Murud-Janjira shoreline ($18.298^\circ\text{N}, 72.962^\circ\text{E}$)**:
$$V_{\text{spill}} = V_{\text{current}} + 0.03 \times V_{\text{wind}}\quad (\text{with Coriolis deflection})$$

### 5. 4D Lagrangian Particle Engine
* **150 Active Parcels** (plus 90 parcels for Plume 2 in dual mode) rendered in a dedicated high-z overlay.
* Dynamic Gaussian turbulent eddy diffusion with $K_h = 10\text{ m}^2/\text{s}$.
* **On-Map Live HUD Badge:** Real-time telemetry displaying active parcels, advection speed, drift heading, and dynamic footprint.

---

## 📂 Repository Structure

```
SpillTheory/
├── backend/
│   ├── main.py                     # FastAPI REST API & scenario orchestration
│   ├── eo_router.py                # Dedicated EO multispectral inference router
│   ├── ais_algorithm.py            # Deterministic kinematic proximity & anomaly scoring
│   ├── metocean.py                 # Live Open-Meteo marine telemetry & drift modeling
│   ├── pdf_report.py               # Cryptographic ReportLab forensic dossier generator
│   └── backtracking/               # Lagrangian particle engine, RK4 & synthetic benchmark
├── eo/                             # Earth Observation (Multispectral Optical) Module
│   ├── model.py                    # SeaRel-SR-UNet V3 architecture & LSCC layers
│   ├── preprocessing.py            # 11-band TIFF ingestion & MADOS z-score normalization
│   ├── inference.py                # TTAx4 inference pipeline & lazy model loading
│   └── postprocess.py              # 15-class RGB colormapping & confidence map generation
├── sar/                            # Synthetic Aperture Radar (Radar Backscatter) Module
│   ├── inference.py                # U-Net SAR inference & topological source deconvolution
│   ├── preprocessing.py            # Radar backscatter normalization & tensor transformation
│   ├── postprocess.py              # Connected region morphology & necking ratio analysis
│   └── geo_convert.py              # Pixel mask to GeoJSON WGS84 polygon projection
├── models/
│   ├── unet_oilspill.h5            # Pretrained U-Net SAR deep segmentation weights
│   └── best_v3_miou.pt             # Pretrained EO SeaRel-SR-UNet V3 weights (optional local)
├── docs/                           # Official Technical Specifications & Presentations
│   ├── SpillTheory_4D_Digital_Twin_Logic_Specification.pdf
│   └── SpillTheory_Presentation_Script_SIH2026.pdf
├── demo_data/                      # Real Sentinel-1 & ALOS PALSAR test tiles & scenarios
├── src/
│   ├── components/                 # MapWorkspace, NavigationRail, CommandBar, Header
│   ├── views/                      # SpillDetectionView, EODetectionView, DashboardView
│   ├── services/api.ts             # REST API service client & backend bridge
│   ├── types/                      # TypeScript domain definitions
│   ├── data/mockData.ts            # Calibrated baseline scenarios & AIS tracks
│   └── App.tsx                     # Master state controller & routing
├── index.html                      # HTML5 entrypoint with Leaflet GIS styles
├── package.json                    # Frontend NPM configuration (Vite + React 18)
├── requirements.txt                # Python backend dependencies (FastAPI, PyTorch, etc.)
└── vite.config.ts                  # Vite build configuration
```

---

## 🚀 Quick Start Guide

### Prerequisites
* **Python**: 3.10, 3.11, or 3.12+
* **Node.js**: v18+ & npm

---

### Step 1: Clone & Setup

```bash
git clone https://github.com/monesh-10/SpillTheory.git
cd SpillTheory
```

---

### Step 2: Environment Configuration (Optional)

Copy `.env.example` to `.env` to configure custom model checkpoints:

```bash
cp .env.example .env
# Set EO_MODEL_PATH to your .pt weights path if stored externally
```

---

### Step 3: Backend Installation & Launch

```bash
# Install Python dependencies
pip install -r requirements.txt

# Start FastAPI backend (port 8000)
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
* **API Server:** http://127.0.0.1:8000
* **Interactive Swagger Docs:** http://127.0.0.1:8000/docs

---

### Step 4: Frontend Installation & Launch

Open a second terminal window:

```bash
# Install Node dependencies
npm install

# Start Vite development server (port 3000)
npm run dev
```
* **Web UI Dashboard:** http://localhost:3000

---

## 🧪 Automated Testing & Verification

SpillTheory includes backend test suites and TypeScript type checking:

```bash
# Run backend audit test suite
pytest tests/ -v

# Verify Python bytecode across all modules
python -m py_compile backend/main.py backend/eo_router.py eo/*.py sar/*.py

# Verify TypeScript frontend compilation
npx tsc --noEmit
# Exits with 0 errors
```

---

## 📄 Key API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/detect-eo` | Accepts an 11-band Sentinel-2 TIFF, runs SeaRel-SR-UNet V3 inference, and returns 15-class segmentation stats |
| `POST` | `/api/detect-sar` | Uploads SAR image, runs U-Net inference, detects single vs. dual leak, and generates live 4D scenario |
| `GET` | `/api/scenario/{spill_id}` | Retrieves complete 4D digital twin scenario including AIS tracks, hindcast, and forecast |
| `GET` | `/api/scenario/{spill_id}/export-pdf` | Streams official ReportLab legal forensic attribution dossier |
| `GET` | `/api/metocean` | Live marine weather, tidal current harmonics, and Lagrangian drift vectors |
| `GET` | `/api/backtracking/benchmark` | Executes Lagrangian reverse particle backtracking benchmark |
| `GET` | `/api/spills` | Registry list of active and archived oil spill incidents |

---

## 📜 Documentation & Presentations

Official dossiers generated for Smart India Hackathon (SIH 2026):
* [SpillTheory 4D Digital Twin Logic Specification (PDF)](docs/SpillTheory_4D_Digital_Twin_Logic_Specification.pdf)
* [SpillTheory 8-Minute Grand Finale Presentation Script (PDF)](docs/SpillTheory_Presentation_Script_SIH2026.pdf)

---

## ⚖️ License & Attribution

Developed under the **MIT License**. Built for maritime environmental protection, national coastline defense, and automated legal polluter attribution.
