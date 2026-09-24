# SpillTheory Automated Test Suite

This directory contains automated unit and integration tests covering the independent SAR, EO, Lagrangian backtracking, and backend service components.

## Test Structure

```
tests/
├── README.md                 # Test documentation and run instructions
├── test_sar.py               # SAR preprocessing, Otsu fallback, and EDT topology tests
├── test_eo.py                # EO architecture, validation, colormapping, and TTA tests
├── test_particle_primary.py  # 4D Lagrangian hydrodynamic advection & diffusion tests
└── test_backend_audit.py     # 15-point exhaustive backend HTTP API integration suite
```

## Running Tests

### 1. Run all tests with pytest
```bash
pytest tests/ -v
```

### 2. Run SAR tests independently
```bash
pytest tests/test_sar.py -v
```

### 3. Run EO tests independently
```bash
pytest tests/test_eo.py -v
```

## Test Classification

- **SAR Tests (`test_sar.py`)**:
  - Preprocessing dimensions and pixel normalization
  - Connected component extraction and spatial peak topology
  - Necking ratio classification (single vs. dual vs. clean ocean)
  - Coordinate GeoJSON polygon conversion

- **EO Tests (`test_eo.py`)**:
  - **Pipeline & Architecture Tests**: Model instantiation, layer shapes, LSCC inductive bias, and output tensor dimensions
  - **Input Validation Tests**: Rejection of invalid file extensions, non-existent files, and band mismatch handling
  - **Postprocessing Tests**: Palette length verification, 15-class RGB colormapping, and API dictionary serialization
  - **Live Weight Checkpoint Tests**: Conditionally tests actual inference when `models/eo/best_v3_miou.pt` is present; skipped if checkpoint is not installed.
