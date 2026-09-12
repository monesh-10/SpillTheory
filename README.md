# SpillTheory · Cyber-Maritime Tactical Command Center

> **Autonomous AI-Driven Marine Oil Spill Intelligence, Satellite SAR Delineation, 4D Lagrangian Hydrodynamics & AIS Vessel Attribution Platform**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.140.0-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB.svg?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.4-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.11-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-199900.svg?logo=leaflet)](https://leafletjs.com/)
[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB.svg?logo=python)](https://python.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🌊 Executive Overview

**SpillTheory** is an enterprise-grade cyber-maritime tactical intelligence and environmental defense digital twin. It integrates:
1. **Spaceborne Synthetic Aperture Radar (SAR)** deep learning segmentation (Sentinel-1 C-Band & ALOS PALSAR L-Band).
2. **Autonomous Source Deconvolution** that identifies whether a spill originated from a single ship or two coalesced vessels via morphological peak & necking topology.
3. **Calibrated MetOcean Coastal Hydrodynamics** modeling alongshore surface advection vectors and tidal harmonics.
4. **Physical Fay Spreading Expansion** ((t) \propto t^{3/4}$) simulating accurate viscous-surface tension oil growth across a 48-hour horizon.
5. **4D Virtual Lagrangian Particle Tracking** featuring 150+ particle swarms with stochastic Brownian eddy diffusion and reverse trajectory backtracking.
6. **Kinematic AIS Anomaly Attribution** holding polluters accountable by detecting speed drop anomalies and course deviations during illicit bilge dump windows.
7. **Statutory Maritime Legal Dossier Generation** delivering cryptographic SHA-256 tamper-evident PDF briefs for the Indian Coast Guard (ICG) and Directorate General of Shipping (DGS).

---

## ⚡ Core Innovations & Technical Architecture

`mermaid
flowchart TD
    subgraph Data_Ingestion [Multi-Source Data Ingestion]
        SAR[Sentinel-1 / ALOS SAR Imagery]
        MET[Live MetOcean Weather & Tidal Currents]
        AIS[Live AIS Vessel Transponder Telemetry]
    end

    subgraph AI_Core [Autonomous AI & CV Engine]
        UNET[U-Net Deep Convolutional Network]
        EDT[Euclidean Distance Transform]
        TOPO[Morphological Source Deconvolution]
        CLASS{Classification Verdict}
        UNET --> EDT --> TOPO --> CLASS
        CLASS -->|1 Vessel| SINGLE[Single Ship Leak Verdict]
        CLASS -->|2 Vessels| DUAL[Dual Ship Coalescence Verdict]
        CLASS -->|0 Vessels| CLEAN[Clean Ocean Benchmark Pass]
    end

    subgraph Hydro_Physics [4D Hydrodynamic & Dispersion Engine]
        DRIFT[Monsoon Coastal Current 058° ENE]
        FAY[Fay Viscous-Surface Tension Spreading]
        LAGRANGE[150-Particle Virtual Lagrangian Swarm]
        HINDCAST[Reverse Leeway Particle Backtracking]
        DRIFT --> FAY --> LAGRANGE --> HINDCAST
    end

    subgraph Digital_Twin [SpillTheory Tactical Command Center]
        MAP[4D Leaflet Nautical Bathymetry GIS]
        TIMELINE[Interactive -5h to +48h 4D Time Scrubbing]
        HUD[Live Lagrangian Engine HUD Telemetry]
        PDF[Statutory Legal PDF Attribution Dossier]
    end

    SAR --> UNET
    MET --> DRIFT
    AIS --> HINDCAST
    CLASS --> MAP
    FAY --> MAP
    LAGRANGE --> HUD
    MAP --> TIMELINE --> PDF
`

---

## 🔬 Scientific Methodology & Mathematical Formulations

### 1. Autonomous Single vs. Dual Ship Leak Deconvolution
SpillTheory eliminates all manual guessing or filename heuristics. It inspects segmented SAR masks using computer vision topology:
* **Euclidean Distance Transform (EDT):** Calculates distance from edges to find deep plume discharge cores.
* **Peak Detection:** Analyzes local maxima with a minimum spatial separation of >= 22 pixels (>1.2 km).
* **Bottleneck Necking Ratio (η):**
  - η < 0.62 with two distinct peaks -> **Dual Ship Coalesced Leak (2 Vessels)**.
  - Single dominant peak -> **Single Ship Point-Source Discharge (1 Vessel)**.
  - Zero significant damping -> **Clean Ocean (0 Vessels · Zero Spill)**.

### 2. Physical Fay Viscous-Surface Tension Spreading
Crude oil spreading on water follows Fay\'s physical scaling equations:
* **t = -300 min (Discharge Epoch):** Nascent seed plume ~2.0 km² (scale 0.22).
* **t = 0 min (SAR Observation):** Ground-truth detected slick 13.5 km² (scale 1.00).
* **t = +6h:** Expands to **22.5 km²** (scale 1.55).
* **t = +12h:** Expands to **34.5 km²** (scale 2.10).
* **t = +24h:** Expands to **54.0 km²** (scale 2.85).
* **t = +48h:** Expands to **82.0 km²** (scale 3.80).

### 3. Coastal Monsoon Hydrodynamics (Konkan / Raigad Corridor)
Along the Maharashtra coast (off Murud-Janjira and Alibaug), the Southwest Monsoon surface current and windage transport carry offshore slicks **East-North-East (058° to 068°) directly towards the Murud-Janjira shoreline (18.298°N, 72.962°E)**:
V_spill = V_current + 0.03 * V_wind (with Coriolis deflection).
Eliminates artificial 90-degree southward zigzags, providing smooth, realistic hydrodynamic advection trajectories.

### 4. 4D Lagrangian Particle Engine
* **150 Active Parcels** (plus 90 parcels for Plume 2 in dual mode) rendered in a dedicated high-z overlay.
* Dynamic Gaussian turbulent eddy diffusion with Kh = 10 m²/s.
* **On-Map Live HUD Badge:** Real-time telemetry displaying active parcels, advection speed, drift heading, and dynamic footprint.

---

## 📂 Repository Structure

`
SpillTheory/
├── backend/
│   ├── main.py                     # FastAPI REST API, SAR detection, & scenario orchestration
│   ├── metocean.py                 # Live MetOcean ingest & +48h hydrodynamic drift integration
│   ├── pdf_report.py               # Automated ReportLab forensic legal brief generator
│   └── backtracking/               # Lagrangian particle engine & reverse transport kinematics
├── sar/
│   ├── inference.py                # U-Net SAR inference & topological source deconvolution
│   ├── preprocessing.py            # Radar backscatter normalization & tensor transformation
│   ├── postprocess.py              # Connected region morphology & necking ratio analysis
│   └── geo_convert.py              # Pixel mask to GeoJSON WGS84 polygon projection
├── models/
│   └── unet_oilspill.h5            # Pretrained U-Net SAR deep segmentation weights
├── demo_data/                      # Real Sentinel-1 & ALOS PALSAR test tiles & scenarios
├── src/
│   ├── components/                 # MapWorkspace, NavigationRail, CommandBar, Header
│   ├── views/                      # SpillDetectionView, DashboardView, RegistryView
│   ├── services/api.ts             # REST API service client & trajectory smoothing
│   ├── types/                      # TypeScript domain definitions
│   ├── data/mockData.ts            # Calibrated baseline scenarios & AIS tracks
│   └── App.tsx                     # Master state controller & routing
├── SpillTheory_4D_Digital_Twin_Logic_Specification.pdf # Detailed mathematical logic dossier
├── SpillTheory_Presentation_Script_SIH2026.pdf        # Complete 8-minute presentation script
├── index.html                      # HTML5 entrypoint with Leaflet GIS styles
├── package.json                    # Frontend NPM configuration (Vite + React)
├── requirements.txt                # Python backend dependencies
└── vite.config.ts                  # Vite build configuration
`

---

## 🚀 Quick Start Guide

### Prerequisites
* **Python**: 3.10 or 3.11+
* **Node.js**: v18+ & npm

---

### Step 1: Clone & Setup

`ash
git clone https://github.com/monesh-10/SpillTheory.git
cd SpillTheory
`

### Step 2: Backend Installation & Launch

`ash
# Install Python dependencies
pip install -r requirements.txt

# Start FastAPI backend (port 8000)
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
`
* **API Server:** http://127.0.0.1:8000
* **Interactive Swagger Docs:** http://127.0.0.1:8000/docs

### Step 3: Frontend Installation & Launch

Open a second terminal window:

`ash
# Install Node dependencies
npm install

# Start Vite development server (port 3000)
npm run dev -- --host --port 3000
`
* **Web UI Dashboard:** http://localhost:3000

---

## 🧪 Automated Integrity & Health Verification

SpillTheory includes an exhaustive 15-point automated backend test suite:

`ash
python scratch/exhaustive_backend_audit.py
`

All 15 tests verify root health, live MetOcean, dual/single scenario retrieval, reverse Lagrangian backtracking, U-Net inference, clean ocean benchmark, and ReportLab PDF streaming with 100% pass rate.

To verify TypeScript frontend compilation:
`ash
npx tsc --noEmit
# Exits with 0 errors
`

---

## 📄 Key API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | /api/detect-sar | Uploads SAR image, runs U-Net inference, detects single vs. dual leak, and generates live 4D scenario |
| GET | /api/scenario/{spill_id} | Retrieves complete 4D digital twin scenario including AIS tracks, hindcast, and forecast |
| GET | /api/scenario/{spill_id}/export-pdf | Streams official ReportLab legal forensic attribution dossier |
| GET | /api/metocean | Live marine weather, tidal current harmonics, and Lagrangian drift vectors |
| GET | /api/spills | Registry list of active and archived oil spill incidents |

---

## 📜 Documentation & Presentations

Official dossiers generated for Smart India Hackathon (SIH 2026):
* [SpillTheory 4D Digital Twin Logic Specification (PDF)](SpillTheory_4D_Digital_Twin_Logic_Specification.pdf)
* [SpillTheory 8-Minute Grand Finale Presentation Script (PDF)](SpillTheory_Presentation_Script_SIH2026.pdf)

---

## ⚖️ License & Attribution

Developed under the **MIT License**. Built for maritime environmental protection, national coastline defense, and automated legal polluter attribution.
