# SAR Oil-Spill Segmentation Module

This module contains the SAR preprocessing, inference, and post-processing pipeline used by the oil-spill detection system.

## Pipeline

```text
SAR image
   ↓
Grayscale conversion
   ↓
Resize to 256 × 256
   ↓
Normalize to [0, 1]
   ↓
Pretrained U-Net
   ↓
Probability map
   ↓
Threshold = 0.40
   ↓
Connected-component filtering
   ↓
Spill-region measurements
```

## Files

### `preprocessing.py`

Responsible for:

- loading the SAR image
- converting it to grayscale
- resizing it to `256 × 256`
- normalizing pixel values to `[0, 1]`
- preparing the model input tensor

Main function:

```python
from sar.preprocessing import load_and_preprocess

image_norm, model_input = load_and_preprocess(
    "demo_data/palsar_0.png"
)
```

### `inference.py`

Responsible for:

- loading the pretrained U-Net
- running model inference
- converting the probability map into a binary mask
- applying the selected inference threshold
- passing the mask to post-processing
- returning structured prediction results

Main API:

```python
from sar.inference import sar_predict

result = sar_predict(
    "demo_data/palsar_0.png",
    threshold=0.40,
)
```

Returned information includes:

- normalized image
- probability map
- raw binary mask
- cleaned binary mask
- spill coverage percentage
- largest-region centroid
- largest-region bounding box
- detected regions

### `postprocess.py`

Responsible for connected-component analysis and region measurements.

Small components below the configured minimum region size are discarded.

For retained regions, the module calculates:

- region area in pixels
- centroid
- bounding box

Current default minimum region size:

```text
20 pixels
```

## Model

The SAR branch uses:

```text
models/unet_oilspill.h5
```

The checkpoint is an existing pretrained U-Net model reused as the SAR segmentation backbone.

Current model input:

```text
256 × 256 × 1
```

Current model output:

```text
256 × 256 × 1
```

The model was not retrained during the current evaluation and refactoring process.

## Operating Threshold

The current inference threshold is:

```text
0.40
```

This threshold was selected from a validation-set threshold sweep using IoU as the selection criterion.

The threshold changes how the probability map is converted into a binary mask. It does not modify the model weights.

## Validation Baseline

At threshold `0.40`, the current validation results are:

| Metric | Score |
|---|---:|
| Accuracy | 88.19% |
| Precision | 75.35% |
| Recall | 83.74% |
| IoU | 65.73% |
| Dice | 79.32% |

These values are the current SAR baseline for this repository.

## Example Result

A typical result object can be accessed as:

```python
result["image"]
result["probability_map"]
result["raw_mask"]
result["clean_mask"]
result["coverage_percent"]
result["centroid"]
result["bounding_box"]
result["regions"]
```

For example:

```python
print("Coverage:", result["coverage_percent"])
print("Centroid:", result["centroid"])
print("Bounding box:", result["bounding_box"])
```

## Integration

The SAR module is intentionally separated from the Streamlit application.

The dashboard in:

```text
app/App1.py
```

uses the same `sar_predict()` inference API for both demo images and uploaded images.

This keeps model preprocessing, inference, thresholding, and post-processing in one reusable pipeline.

The resulting spill-region information can later be passed to:

- EO–SAR fusion
- geospatial processing
- origin backtracking
- AIS vessel analysis
- digital-twin visualization
