import numpy as np
from scipy import ndimage


MIN_REGION_PIXELS = 20


def extract_spill_info(mask, min_region_pixels=MIN_REGION_PIXELS):
    """
    Extract meaningful connected spill regions from a binary mask.

    Returns:
        coverage_percent : percentage of pixels in retained regions
        centroid         : centroid of the largest retained region
        bounding_box      : bounding box of the largest retained region
        regions           : list of retained regions
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

    if not regions:
        return {
            "coverage_percent": 0.0,
            "centroid": None,
            "bounding_box": None,
            "regions": [],
            "clean_mask": retained_mask,
        }

    largest = regions[0]

    return {
        "coverage_percent": float(retained_mask.mean() * 100),
        "centroid": largest["centroid"],
        "bounding_box": largest["bounding_box"],
        "regions": regions,
        "clean_mask": retained_mask,
    }