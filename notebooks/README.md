# Research & Training Notebooks

This directory houses the authoritative training notebooks, exploratory data analysis, and model development history for the SpillTheory platform.

## Contents

- **`mados-sih12345.ipynb`**:
  The complete end-to-end training, validation, and benchmarking notebook for the **SeaRel-SR-UNet V3** model trained on the MADOS (Marine Debris Optical Dataset) benchmark.
  - Cell 5: MADOS dataset channel mean and standard deviation constants
  - Cell 10 & 12: TIFF reading, nearest-neighbor resizing, and z-score normalization
  - Cell 16: Complete PyTorch architecture definition (SpectralSE, ResidualSpectralStem, SeaRelativeLSCC, and SeaRelSRUNet)
  - Cell 25: Checkpoint saving, EMA weight extraction, and validation metrics
  - Cell 27: 4-way Test-Time Augmentation (TTA) implementation

## Evaluation Metrics

Formal evaluation artifacts derived from these training runs are preserved in `docs/evaluation/`:
- `experiment_summary_v3.json`: Training hyperparameter configuration and summary
- `validation_metrics_v3.json`: Overall validation mIoU, loss, and convergence stats
- `validation_per_class_v3.csv`: Per-class IoU and F1 scores across all 15 classes
- `history_v3.csv`: Epoch-by-epoch training/validation loss and metric progression
