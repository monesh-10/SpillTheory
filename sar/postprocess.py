import numpy as np
from scipy import ndimage


MIN_REGION_PIXELS = 20


def detect_spill_topology(clean_mask: np.ndarray, regions: list) -> dict:
    """
    Classifies the binary oil spill mask into clean ocean or single-source topology.
    """
    if not regions or clean_mask is None or clean_mask.sum() < 30:
        return {
            "num_sources": 0,
            "topology": "CLEAN_OCEAN",
            "classification": "Undisturbed sea clutter",
            "confidence": 1.0,
            "source_peaks": [],
            "reason": "No significant radar backscatter depression detected (clean water)."
        }

    total_area = sum(r["area_pixels"] for r in regions)
    r1 = regions[0]
    r2 = regions[1] if len(regions) > 1 else None

    # 1. Multiple Major Disconnected Plumes
    if r2 is not None and r2["area_pixels"] >= 250:
        area_ratio = r2["area_pixels"] / max(1, r1["area_pixels"])
        r2_pct = (r2["area_pixels"] / max(1, total_area)) * 100
        if area_ratio >= 0.20 or r2_pct >= 14.0:
            return {
                "num_sources": 2,
                "topology": "DUAL_MERGED",
                "classification": "Dual-Source Petroleum Coalescence",
                "confidence": round(min(0.98, 0.82 + area_ratio * 0.15), 3),
                "source_peaks": [r1["centroid"], r2["centroid"]],
                "reason": f"Detected 2 major disconnected slick plumes (Lobe 1: {r1['area_pixels']} px, Lobe 2: {r2['area_pixels']} px, ratio: {area_ratio:.2f})."
            }

    # 2. Single Dominant Component: Distance Transform & Necking Bottleneck Analysis
    labels, _ = ndimage.label(clean_mask)
    largest_mask = (labels == 1).astype(np.uint8)

    edt = ndimage.distance_transform_edt(largest_mask)
    smoothed = ndimage.gaussian_filter(edt, sigma=2.5)

    local_max = (ndimage.maximum_filter(smoothed, size=15) == smoothed) & (smoothed > smoothed.max() * 0.35)
    ys, xs = np.where(local_max)
    raw_peaks = []
    for y, x in zip(ys, xs):
        raw_peaks.append((smoothed[y, x], x, y))
    raw_peaks.sort(key=lambda item: item[0], reverse=True)

    distinct_peaks = []
    for val, x, y in raw_peaks:
        if not any(np.hypot(x - px, y - py) < 25 for _, px, py in distinct_peaks):
            distinct_peaks.append((val, x, y))

    if len(distinct_peaks) >= 2:
        val1, x1, y1 = distinct_peaks[0]
        val2, x2, y2 = distinct_peaks[1]
        dist = np.hypot(x2 - x1, y2 - y1)
        peak_ratio = val2 / max(1e-3, val1)

        if dist >= 28.0 and peak_ratio >= 0.30:
            num_samples = max(20, int(dist))
            xs_line = np.linspace(x1, x2, num_samples).astype(int)
            ys_line = np.linspace(y1, y2, num_samples).astype(int)
            line_vals = smoothed[ys_line, xs_line]
            min_neck_val = float(np.min(line_vals))
            neck_ratio = min_neck_val / max(1e-3, min(val1, val2))

            if neck_ratio <= 0.65:
                return {
                    "num_sources": 2,
                    "topology": "DUAL_MERGED",
                    "classification": "Dual-Source Petroleum Coalescence",
                    "confidence": round(min(0.96, 0.80 + (1.0 - neck_ratio) * 0.16), 3),
                    "source_peaks": [
                        {"x": float(x1), "y": float(y1)},
                        {"x": float(x2), "y": float(y2)}
                    ],
                    "reason": f"Morphological necking detected: two distinct emulsion cores separated by {dist:.1f}px with constriction ratio {neck_ratio:.2f}."
                }

    # 3. Default: Single Point-Source Plume
    return {
        "num_sources": 1,
        "topology": "SINGLE_POINT_SOURCE",
        "classification": "Single Point-Source Petroleum Slick",
        "confidence": 0.958,
        "source_peaks": [r1["centroid"]],
        "reason": f"Uniform unimodal plume radiating from single discharge point ({r1['area_pixels']} px)."
    }


def extract_spill_info(mask, min_region_pixels=MIN_REGION_PIXELS):
    """
    Extract meaningful connected spill regions from a binary mask.

    Returns:
        coverage_percent : percentage of pixels in retained regions
        centroid         : centroid of the largest retained region
        bounding_box      : bounding box of the largest retained region
        regions           : list of retained regions
        topology_info     : classification of single vs dual ship oil leak
    """

    mask = np.asarray(mask, dtype=np.uint8)

    labels, num_regions = ndimage.label(mask)

    regions = []

    for label_id in range(1, num_regions + 1):

        ys, xs = np.where(labels == label_id)
        area = len(xs)

        if area < min_region_pixels:
            continue

        centroid_x = float(xs.mean())
        centroid_y = float(ys.mean())

        regions.append({
            "area_pixels": int(area),
            "centroid": {
                "x": centroid_x,
                "y": centroid_y,
            },
            "bounding_box": {
                "x_min": int(xs.min()),
                "y_min": int(ys.min()),
                "x_max": int(xs.max()),
                "y_max": int(ys.max()),
            },
        })

    # Largest region first
    regions.sort(
        key=lambda r: r["area_pixels"],
        reverse=True,
    )

    retained_mask = np.zeros_like(mask)

    for label_id in range(1, num_regions + 1):

        ys, xs = np.where(labels == label_id)

        if len(xs) >= min_region_pixels:
            retained_mask[ys, xs] = 1

    topology = detect_spill_topology(retained_mask, regions)

    if not regions:
        return {
            "coverage_percent": 0.0,
            "centroid": None,
            "bounding_box": None,
            "regions": [],
            "clean_mask": retained_mask,
            "topology": topology
        }

    largest = regions[0]

    return {
        "coverage_percent": float(retained_mask.mean() * 100),
        "centroid": largest["centroid"],
        "bounding_box": largest["bounding_box"],
        "regions": regions,
        "clean_mask": retained_mask,
        "topology": topology
    }