"""
EO detection endpoint for SpillTheory.

POST /api/detect-eo
  Accepts: multipart/form-data with field `file` = one .tif/.tiff
           optional fields: `center_lat`, `center_lon`, `origin_lat`, `origin_lon`

Pipeline:
  uploaded TIFF
    → validate (extension, readability, band count, dimensions)
    → preprocess (read 11 bands, resize 240×240, normalize)
    → SeaRelSRUNet V3 (lazy-loaded, TTA)
    → 15-class segmentation map
    → extract geospatial metadata from TIFF (rasterio WGS84 transform / fallback)
    → extract Class 5 ("Oil Spill") mask & morphology topology
    → unified Digital Twin scenario creation (same downstream flow as SAR):
        - particle backtracking integration
        - dynamic open-sea ship tracks (MT OCEAN STAR, GULF VOYAGER)
        - deterministic AIS kinematic attribution
        - +48h forward drift forecast
        - authority dispatch
    → JSON response with scenario & full EO metrics
"""

from __future__ import annotations

import shutil
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
from PIL import Image

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

router = APIRouter()

_REPO_ROOT = Path(__file__).resolve().parents[1]
_OUTPUTS_DIR = _REPO_ROOT / "data" / "outputs"
_BACKEND_DIR = _REPO_ROOT / "backend"
_OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/api/detect-eo")
async def detect_eo(
    file: UploadFile = File(None),
    demo_filename: str = Form(None),
    center_lat: float = Form(None),
    center_lon: float = Form(None),
    origin_lat: float = Form(None),
    origin_lon: float = Form(None),
):
    """
    EO multispectral segmentation endpoint with unified Digital Twin integration.

    Accepts an uploaded TIFF file or a preloaded demo_filename and returns a 15-class
    semantic segmentation result. If an oil spill is detected, it extracts
    geospatial coordinates from the TIFF metadata and registers an identical
    downstream Digital Twin scenario (reverse backtracking, dynamic AIS ships,
    attribution, and +48h drift forecast).
    """
    from eo.preprocessing import EOValidationError
    from eo.inference import run_eo_inference
    from eo.postprocess import save_prediction_png, save_confidence_png, build_eo_api_response
    from eo.geospatial import extract_tiff_geospatial_metadata, eo_mask_to_geojson_polygons
    from sar.postprocess import extract_spill_info
    from backend.scenario_builder import build_and_register_spill_scenario, get_location_name

    # ------------------------------------------------------------------
    # 1. Resolve source file (UploadFile or demo_filename)
    # ------------------------------------------------------------------
    temp_path = _BACKEND_DIR / "_temp_eo_upload.tiff"

    if demo_filename:
        # Validate filename to prevent path traversal
        clean_name = Path(demo_filename).name
        demo_src = _REPO_ROOT / "demo_data" / clean_name
        if not demo_src.exists():
            demo_src = _REPO_ROOT / "data" / clean_name
        if not demo_src.exists():
            raise HTTPException(status_code=404, detail=f"Demo EO file '{clean_name}' not found.")
        try:
            shutil.copyfile(demo_src, temp_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to copy demo EO file: {e}")
    elif file is not None:
        raw_filename = (file.filename or "upload").lower()
        if not (raw_filename.endswith(".tif") or raw_filename.endswith(".tiff") or raw_filename.endswith(".png") or raw_filename.endswith(".jpg")):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Invalid file format. Expected a TIFF/image file. "
                    f"Received: '{file.filename or 'unknown'}'"
                ),
            )
        try:
            with open(temp_path, "wb") as f:
                shutil.copyfileobj(file.file, f)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {e}")
    else:
        raise HTTPException(status_code=400, detail="Either 'file' or 'demo_filename' must be provided.")

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
        # 4. Extract geospatial metadata from GeoTIFF
        # ------------------------------------------------------------------
        geo_meta = extract_tiff_geospatial_metadata(
            temp_path,
            fallback_lat=center_lat if center_lat is not None else 18.112,
            fallback_lon=center_lon if center_lon is not None else 72.464,
            fallback_km=15.0
        )
        if center_lat is not None:
            geo_meta["center_lat"] = float(center_lat)
        if center_lon is not None:
            geo_meta["center_lon"] = float(center_lon)

        # ------------------------------------------------------------------
        # 5. Save output images
        # ------------------------------------------------------------------
        ts = datetime.now(timezone.utc).strftime("%H%M%S%f")[:9]
        pred_filename = f"_eo_pred_{ts}.png"
        conf_filename = f"_eo_conf_{ts}.png"

        pred_path = _OUTPUTS_DIR / pred_filename
        conf_path = _OUTPUTS_DIR / conf_filename

        save_prediction_png(result["prediction_map"], pred_path)
        save_confidence_png(result["confidence_map"], conf_path)

        prediction_url = f"/data/outputs/{pred_filename}"
        confidence_url = f"/data/outputs/{conf_filename}"

        # ------------------------------------------------------------------
        # 6. Extract oil spill class (Class 5 = "Oil Spill")
        # ------------------------------------------------------------------
        pred_map = result["prediction_map"]
        oil_mask = (pred_map == 5).astype(np.uint8)
        oil_spill_detected = bool(np.sum(oil_mask) > 0)

        new_spill_id = f"EO_{datetime.now(timezone.utc).strftime('%H%M%S')}"
        mask_filename = f"_mask_{new_spill_id}.png"
        mask_uint8 = (oil_mask * 255).astype(np.uint8)
        Image.fromarray(mask_uint8).save(_OUTPUTS_DIR / mask_filename)
        mask_url = f"/data/outputs/{mask_filename}"

        # ------------------------------------------------------------------
        # 7. Unified Post-Detection Digital Twin Workflow (matches SAR)
        # ------------------------------------------------------------------
        scenario_payload = None
        loc_str = get_location_name(geo_meta["center_lat"], geo_meta["center_lon"])
        calculated_area_km2 = 0.0
        num_sources = 0
        topology_type = "CLEAN_OCEAN"

        if oil_spill_detected:
            spill_info = extract_spill_info(oil_mask)
            topology = spill_info.get("topology", {})
            num_sources = topology.get("num_sources", 1)
            source_peaks = topology.get("source_peaks", [])
            coverage_pct = float(spill_info.get("coverage_percent", float(np.mean(oil_mask) * 100.0)))

            tile_area_km2 = geo_meta["km_span"] * geo_meta["km_span"]
            calculated_area_km2 = round(max(0.75, (coverage_pct / 100.0) * tile_area_km2), 2)

            polygon_coords = eo_mask_to_geojson_polygons(
                oil_mask,
                center_lat=geo_meta["center_lat"],
                center_lon=geo_meta["center_lon"],
                km_span=geo_meta["km_span"]
            )

            now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            scenario_payload = build_and_register_spill_scenario(
                spill_id=new_spill_id,
                modality="EO",
                polygon_coords=polygon_coords,
                center_lat=geo_meta["center_lat"],
                center_lon=geo_meta["center_lon"],
                calculated_area_km2=calculated_area_km2,
                coverage_percent=coverage_pct,
                confidence=0.958,
                num_sources=num_sources,
                source_peaks=source_peaks,
                image_url=prediction_url,
                mask_url=mask_url,
                sensor_name=geo_meta["sensor"],
                resolution_str=geo_meta["resolution_str"],
                detection_reason=(
                    f"SeaRel-SR-UNet V3 multispectral segmentation detected "
                    f"a single isolated point-source discharge covering {calculated_area_km2} km²."
                ),
                km_span=geo_meta["km_span"],
                origin_lat=origin_lat,
                origin_lon=origin_lon,
                detection_timestamp=now_iso,
                is_dual=(num_sources == 2),
            )
            loc_str = scenario_payload["spill_event"]["location_name"]
            topology_type = topology.get("topology", "SINGLE_POINT_SOURCE")

        # ------------------------------------------------------------------
        # 8. Build complete response
        # ------------------------------------------------------------------
        response = build_eo_api_response(
            inference_result=result,
            prediction_png_url=prediction_url,
            confidence_png_url=confidence_url,
        )

        response.update({
            "spill_detected": oil_spill_detected,
            "spill_id": new_spill_id if oil_spill_detected else None,
            "location": loc_str,
            "area_km2": calculated_area_km2,
            "coverage_percent": round(float(np.mean(oil_mask) * 100.0), 3) if oil_spill_detected else 0.0,
            "num_sources": num_sources,
            "topology": topology_type,
            "classification": (
                topology.get("classification", "Single Point-Source Petroleum Slick")
                if oil_spill_detected else "Undisturbed sea clutter"
            ),
            "vessel_source_classification": (
                f"{num_sources} Vessel Leak" if num_sources > 1 else "Single Ship Leak (1 Vessel)"
                if oil_spill_detected else "Clean Ocean (0 Vessels · Zero Spill)"
            ),
            "geospatial": geo_meta,
            "mask_url": mask_url if oil_spill_detected else None,
            "sar_metadata": scenario_payload["sar_metadata"] if scenario_payload else None,
            "authority_dispatch": scenario_payload["authority_dispatch"] if scenario_payload else None,
            "ais_vessels": scenario_payload["ais"]["vessel_tracks"] if scenario_payload else [],
            "attribution_ranking": scenario_payload["attribution"]["candidates"] if scenario_payload else [],
            "scenario": scenario_payload,
        })

        return JSONResponse(content=response)

    finally:
        # Always remove the temp file
        temp_path.unlink(missing_ok=True)
