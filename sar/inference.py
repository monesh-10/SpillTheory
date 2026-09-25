import os
from pathlib import Path
import numpy as np
import torch
import torch.nn as nn

from .preprocessing import load_and_preprocess, SARValidationError
from .postprocess import extract_spill_info

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MODEL_PATH = PROJECT_ROOT / "models" / "sar" / "best_model_epoch19.pt"

class DoubleConv(nn.Module):
    def __init__(self, in_ch, out_ch):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_ch, out_ch, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True)
        )
    def forward(self, x): return self.block(x)

class UNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.enc1 = DoubleConv(2, 32)
        self.enc2 = DoubleConv(32, 64)
        self.enc3 = DoubleConv(64, 128)
        self.enc4 = DoubleConv(128, 256)
        self.pool = nn.MaxPool2d(2)
        self.bottleneck = DoubleConv(256, 512)
        
        self.up4 = nn.ConvTranspose2d(512, 256, 2, stride=2)
        self.dec4 = DoubleConv(512, 256)
        self.up3 = nn.ConvTranspose2d(256, 128, 2, stride=2)
        self.dec3 = DoubleConv(256, 128)
        self.up2 = nn.ConvTranspose2d(128, 64, 2, stride=2)
        self.dec2 = DoubleConv(128, 64)
        self.up1 = nn.ConvTranspose2d(64, 32, 2, stride=2)
        self.dec1 = DoubleConv(64, 32)
        self.out = nn.Conv2d(32, 1, 1)

    def forward(self, x):
        e1 = self.enc1(x)
        e2 = self.enc2(self.pool(e1))
        e3 = self.enc3(self.pool(e2))
        e4 = self.enc4(self.pool(e3))
        b = self.bottleneck(self.pool(e4))
        
        d4 = self.up4(b)
        d4 = torch.cat([d4, e4], dim=1)
        d4 = self.dec4(d4)
        
        d3 = self.up3(d4)
        d3 = torch.cat([d3, e3], dim=1)
        d3 = self.dec3(d3)
        
        d2 = self.up2(d3)
        d2 = torch.cat([d2, e2], dim=1)
        d2 = self.dec2(d2)
        
        d1 = self.up1(d2)
        d1 = torch.cat([d1, e1], dim=1)
        d1 = self.dec1(d1)
        return self.out(d1)

_model_cache = None

def get_sar_model(model_path=DEFAULT_MODEL_PATH):
    global _model_cache
    if _model_cache is not None:
        return _model_cache
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = UNet().to(device)
    ckpt = torch.load(model_path, map_location=device, weights_only=False)
    
    state_dict = ckpt["model"]
    new_state = {}
    for k, v in state_dict.items():
        if k.startswith("module."):
            new_state[k[7:]] = v
        else:
            new_state[k] = v
    model.load_state_dict(new_state)
    model.eval()
    _model_cache = (model, device)
    return _model_cache

def sar_predict(image_path, model=None, threshold=0.5):
    raw_image, model_input = load_and_preprocess(image_path)
    
    if model is None:
        model_tuple = get_sar_model()
    else:
        model_tuple = model
        
    unet_model, device = model_tuple
        
    with torch.no_grad():
        x = torch.from_numpy(model_input).to(device)
        logits = unet_model(x)
        probs = torch.sigmoid(logits)
        prob_np = probs.cpu().numpy()[0, 0, :, :]
        
    raw_mask = (prob_np >= threshold).astype(np.uint8)
    
    info = extract_spill_info(raw_mask)
    topology = info.get("topology", {})
    num_sources = topology.get("num_sources", 1)
    
    if num_sources == 0:
        source_class = "Clean Ocean (0 Vessels · Zero Spill)"
    elif num_sources == 2:
        source_class = "Dual Ship Leak (2 Vessels Coalesced)"
    else:
        source_class = "Single Ship Leak (1 Vessel)"

    unet_analysis = {
        "model_name": "PyTorch SAR U-Net (Epoch 19)",
        "vessel_source_classification": source_class,
        "num_vessels_detected": num_sources,
        "topology": topology.get("topology", "UNKNOWN"),
        "confidence": topology.get("confidence", 0.95),
        "reason": topology.get("reason", ""),
        "source_peaks": topology.get("source_peaks", [])
    }

    return {
        "image": raw_image,
        "probability_map": prob_np,
        "raw_mask": raw_mask,
        "clean_mask": info["clean_mask"],
        "coverage_percent": info["coverage_percent"],
        "centroid": info["centroid"],
        "bounding_box": info["bounding_box"],
        "regions": info["regions"],
        "topology": topology,
        "unet_analysis": unet_analysis
    }