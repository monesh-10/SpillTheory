import numpy as np
from PIL import Image


IMAGE_SIZE = (256, 256)


def load_and_preprocess(image_path):
    """
    Load a SAR image and prepare it for the trained U-Net.

    Returns:
        image_norm : (256, 256) float32 grayscale image
        model_input: (1, 256, 256, 1) float32 tensor
    """

    image = Image.open(image_path).convert("L")
    image = image.resize(IMAGE_SIZE)

    image_norm = np.asarray(
        image,
        dtype=np.float32
    ) / 255.0

    model_input = image_norm[np.newaxis, ..., np.newaxis]

    return image_norm, model_input