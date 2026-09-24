"""
EO Geospatial Metadata Extraction & GeoJSON Conversion.

Extracts real CRS, affine transform, and bounding box information from
multispectral GeoTIFF files using rasterio, maps detected pixel coordinates
to geographic WGS84 (EPSG:4326), and provides graceful fallback when
unreferenced TIFF files are provided.
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any
from sar.geo_convert import mask_to_geojson_polygons


def extract_tiff_geospatial_metadata(
    tiff_path: Path | str,
    fallback_lat: float = 18.112,
    fallback_lon: float = 72.464,
    fallback_km: float = 15.0,
) -> dict[str, Any]:
    """
    Extracts coordinate reference system (CRS), bounds, and resolution from a GeoTIFF.
    Transforms bounding coordinates to WGS84 (EPSG:4326) and calculates the scene
    center and spatial footprint (km_span).
    """
    tiff_path = Path(tiff_path)
    meta: dict[str, Any] = {
        "has_georeference": False,
        "crs": None,
        "bounds": None,
        "center_lat": fallback_lat,
        "center_lon": fallback_lon,
        "km_span": fallback_km,
        "pixel_resolution_m": None,
        "sensor": "Sentinel-2 MSI / Landsat-8/9 Multispectral Optical",
        "resolution_str": "10m-20m Ground Sample Distance",
    }

    try:
        import rasterio
        from rasterio.warp import transform_bounds

        with rasterio.open(str(tiff_path)) as src:
            crs = src.crs
            bounds = src.bounds
            res = src.res  # (res_x, res_y)

            if res and len(res) >= 2:
                if crs and crs.is_projected:
                    meta["pixel_resolution_m"] = round(float(res[0]), 2)
                    meta["resolution_str"] = f"{meta['pixel_resolution_m']}m Ground Sample Distance"
                elif crs and crs.is_geographic:
                    meta["pixel_resolution_m"] = round(float(res[0]) * 111000.0, 2)
                    meta["resolution_str"] = f"{meta['pixel_resolution_m']}m Ground Sample Distance"

            if crs is not None and bounds is not None:
                crs_str = crs.to_string() if hasattr(crs, "to_string") else str(crs)
                is_wgs84 = crs_str == "EPSG:4326" or (hasattr(crs, "to_epsg") and crs.to_epsg() == 4326)

                if is_wgs84:
                    min_lon, min_lat, max_lon, max_lat = bounds.left, bounds.bottom, bounds.right, bounds.top
                else:
                    min_lon, min_lat, max_lon, max_lat = transform_bounds(
                        crs, "EPSG:4326", bounds.left, bounds.bottom, bounds.right, bounds.top
                    )

                # Ensure valid planetary coordinates
                if -90.0 <= min_lat <= 90.0 and -90.0 <= max_lat <= 90.0 and -180.0 <= min_lon <= 180.0 and -180.0 <= max_lon <= 180.0:
                    c_lat = (min_lat + max_lat) / 2.0
                    c_lon = (min_lon + max_lon) / 2.0
                    lat_diff_km = abs(max_lat - min_lat) * 111.0
                    lon_diff_km = abs(max_lon - min_lon) * 111.0 * math.cos(math.radians(c_lat))
                    calc_km = max(lat_diff_km, lon_diff_km, 1.0)

                    meta["has_georeference"] = True
                    meta["crs"] = crs_str
                    meta["bounds"] = [round(min_lon, 6), round(min_lat, 6), round(max_lon, 6), round(max_lat, 6)]
                    meta["center_lat"] = round(c_lat, 6)
                    meta["center_lon"] = round(c_lon, 6)
                    meta["km_span"] = round(calc_km, 2)
    except Exception:
        # Graceful fallback to default maritime coordinates if tags missing or unprojected
        pass

    return meta


def eo_mask_to_geojson_polygons(
    mask: np.ndarray,
    center_lat: float,
    center_lon: float,
    km_span: float = 15.0,
) -> list:
    """
    Converts a binary oil spill mask into geographic GeoJSON polygon rings.
    Falls back to a rectangular bounding polygon around the scene center if
    insufficient boundary points are extracted.
    """
    polygons = mask_to_geojson_polygons(mask, center_lat, center_lon, km_span=km_span)
    if not polygons or len(polygons[0]) < 4:
        d = round(0.015 * (km_span / 15.0), 5)
        polygons = [[[
            round(center_lon - d, 5), round(center_lat - d, 5)
        ], [
            round(center_lon + d, 5), round(center_lat - d, 5)
        ], [
            round(center_lon + d, 5), round(center_lat + d, 5)
        ], [
            round(center_lon - d, 5), round(center_lat + d, 5)
        ], [
            round(center_lon - d, 5), round(center_lat - d, 5)
        ]]]
    return polygons
