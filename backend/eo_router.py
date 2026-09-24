"""
EO detection endpoint for SpillTheory.

POST /api/detect-eo
  Accepts: multipart/form-data with field `file` = one .tif/.tiff

Pipeline:
  uploaded TIFF
    → validate (extension, readability, band count, dimensions)
    → preprocess (read 11 bands, resize 240×240, normalize)
    → SeaRelSRUNet V3 (lazy-loaded, TTA)
    → 15-class segmentation map
    → colored PNG saved to demo_data/
    → JSON response

Security:
  - Uploaded file content is inspected by rasterio; filename is not trusted.
  - Temporary file uses a fixed internal name; no client-controlled paths.
  - No code from the uploaded file is executed.
"""

from __future__ import annotations

import shutil
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

router = APIRouter()

_REPO_ROOT = Path(__file__).resolve().parents[1]
_OUTPUTS_DIR = _REPO_ROOT / "data" / "outputs"
_BACKEND_DIR = _REPO_ROOT / "backend"
_OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/api/detect-eo")
async def detect_eo(file: UploadFile = File(...)):
    """
    EO multispectral segmentation endpoint.

    Accepts a single 11-band TIFF file and returns a 15-class
    semantic segmentation result with per-class statistics.
    """
    from eo.preprocessing import EOValidationError
    from eo.inference import run_eo_inference
    from eo.postprocess import save_prediction_png, save_confidence_png, build_eo_api_response

    # ------------------------------------------------------------------
    # 1. Basic extension check on the incoming filename (not trusted for
    #    content, but used for the temp file suffix only).
    # ------------------------------------------------------------------
    raw_filename = (file.filename or "upload").lower()
    if not (raw_filename.endswith(".tif") or raw_filename.endswith(".tiff")):
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid file format. Expected a TIFF file (.tif or .tiff). "
                f"Received: '{file.filename or 'unknown'}'"
            ),
        )

    # ------------------------------------------------------------------
    # 2. Write to a fixed temp path (no client-supplied paths)
    # ------------------------------------------------------------------
    temp_path = _BACKEND_DIR / "_temp_eo_upload.tiff"
    try:
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {e}")

    try:
        # ------------------------------------------------------------------
        # 3. Run full EO inference pipeline
        # ------------------------------------------------------------------
        try:
            result = run_eo_inference(str(temp_path), use_tta=True)
        except EOValidationError as e:
            raise HTTPException(status_code=422, detail=str(e))
        except FileNotFoundError as e:
            raise HTTPException(status_code=503, detail=str(e))
        except RuntimeError as e:
            raise HTTPException(status_code=500, detail=f"EO inference error: {e}")

        # ------------------------------------------------------------------
        # 4. Save output images
        # ------------------------------------------------------------------
        ts = datetime.now(timezone.utc).strftime("%H%M%S%f")[:9]
        pred_filename = f"_eo_pred_{ts}.png"
        conf_filename = f"_eo_conf_{ts}.png"

        pred_path = _OUTPUTS_DIR / pred_filename
        conf_path = _OUTPUTS_DIR / conf_filename

        save_prediction_png(result["prediction_map"], pred_path)
        save_confidence_png(result["confidence_map"], conf_path)

        prediction_url = f"http://localhost:8000/data/outputs/{pred_filename}"
        confidence_url = f"http://localhost:8000/data/outputs/{conf_filename}"

        # ------------------------------------------------------------------
        # 5. Build response
        # ------------------------------------------------------------------
        response = build_eo_api_response(
            inference_result=result,
            prediction_png_url=prediction_url,
            confidence_png_url=confidence_url,
        )

        return JSONResponse(content=response)

    finally:
        # Always remove the temp file
        temp_path.unlink(missing_ok=True)
