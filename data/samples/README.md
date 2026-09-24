# Sample Input Data

This directory is designated for small sample inputs used for unit testing, pipeline verification, and local demonstration.

## Expected Formats

### 1. Earth Observation (EO)
- **Format**: Multispectral GeoTIFF (`.tif` or `.tiff`)
- **Band Count**: Exactly 11 spectral bands
- **Spectral Ordering**: Matching Sentinel-2 L2R (MADOS convention: Coastal aerosol, Blue, Green, Red, Red Edge 1-3, NIR, Water vapour, SWIR 1-2)
- **Resolution**: 240×240 pixels (or arbitrary dimensions resampled to 240×240 nearest)

### 2. Synthetic Aperture Radar (SAR)
- **Format**: Single-channel greyscale radar backscatter image (`.png`, `.jpg`, `.tif`)
- **Dimensions**: Nominal 256×256 pixels
- **Values**: Damped radar backscatter representing oil slicks / capillary wave suppression against ocean clutter

## Important Note

Do not commit large raw satellite granules or proprietary operational feeds here.
