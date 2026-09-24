# Generated Inference Outputs

This directory holds temporary, runtime-generated outputs produced by the SpillTheory inference pipelines.

## Output Types

- **EO Segmentation Masks**: `_eo_pred_<timestamp>.png` (15-class colormapped RGB PNG)
- **EO Confidence Maps**: `_eo_conf_<timestamp>.png` (Greyscale probability map L-mode)
- **Temporary Upload Caches**: Ephemeral upload staging files cleaned after processing

## Git Policy

All generated prediction images and temporary cache files in this directory are ignored via `.gitignore` (`data/outputs/*`, except documentation).
