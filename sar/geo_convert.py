"""
SAR Mask to Real GeoJSON Polygon Converter
Converts U-Net pixel segmentation masks into geographic GeoJSON coordinates
anchored to a reference satellite scene center.
"""

import numpy as np
from scipy import ndimage
import math

def mask_to_geojson_polygons(mask: np.ndarray, center_lat: float, center_lon: float, km_span: float = 15.0):
    """
    Takes a (H, W) binary segmentation mask (0 or 1) and converts the primary
    detected spill component into geographic GeoJSON polygon coordinates.
    
    Args:
        mask: 2D numpy array (256x256) where 1 indicates oil spill.
        center_lat: Anchor latitude of the SAR scene.
        center_lon: Anchor longitude of the SAR scene.
        km_span: Physical footprint span of the SAR tile in km.
        
    Returns:
        List of GeoJSON polygon rings: [[[lon, lat], [lon, lat], ...]]
    """
    H, W = mask.shape
    
    # 1. Label connected components
    labeled, num_features = ndimage.label(mask)
    if num_features == 0:
        return []
        
    # 2. Extract largest connected component
    sizes = ndimage.sum(mask, labeled, range(1, num_features + 1))
    largest_label = int(np.argmax(sizes) + 1)
    target_mask = (labeled == largest_label).astype(np.uint8)
    
    # 3. Find boundary pixels using binary erosion
    eroded = ndimage.binary_erosion(target_mask)
    boundary = target_mask ^ eroded
    ys, xs = np.where(boundary)
    
    if len(xs) < 4:
        return []
        
    # 4. Sort boundary coordinates by polar angle from component centroid for clockwise polygon
    cx, cy = float(xs.mean()), float(ys.mean())
    angles = np.arctan2(ys - cy, xs - cx)
    order = np.argsort(angles)
    sorted_xs = xs[order]
    sorted_ys = ys[order]
    
    # 5. Downsample boundary points to maintain light WebGL rendering
    step = max(1, len(sorted_xs) // 30)
    sampled_xs = sorted_xs[::step]
    sampled_ys = sorted_ys[::step]
    
    # 6. Map pixel coordinates (0-255) to real geographic Lat/Lon
    # km per degree lat is ~111km, km per degree lon is ~111km * cos(lat)
    km_per_deg_lat = 111.0
    km_per_deg_lon = 111.0 * math.cos(math.radians(center_lat))
    
    poly_coords = []
    for px, py in zip(sampled_xs, sampled_ys):
        # Normalized offset from image center (-0.5 to +0.5)
        offset_x_norm = (px - (W / 2.0)) / float(W)
        offset_y_norm = ((H / 2.0) - py) / float(H) # Invert y for latitude
        
        offset_km_x = offset_x_norm * km_span
        offset_km_y = offset_y_norm * km_span
        
        pt_lon = round(center_lon + (offset_km_x / km_per_deg_lon), 6)
        pt_lat = round(center_lat + (offset_km_y / km_per_deg_lat), 6)
        poly_coords.append([pt_lon, pt_lat])
        
    # Close polygon ring
    if poly_coords and (poly_coords[0] != poly_coords[-1]):
        poly_coords.append(poly_coords[0])
        
    return [poly_coords]
