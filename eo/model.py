"""
EO Model — V3 SeaRel-SR-UNet
Exact architecture reproduced from EO_Context/mados-sih12345.ipynb (Cell 16).

Constants verified against experiment_summary_v3.json:
  IN_CHANNELS = 11
  IMAGE_SIZE  = 240
  NUM_CLASSES = 15
  MODEL_WIDTH = 48
  DROPOUT     = 0.10
  SPECTRAL_HIDDEN = 32
  SPECTRAL_RESIDUAL_SCALE_INIT = 0.10
  LSCC_RING_PAIRS = ((3,9),(7,21),(15,41))
  LSCC_HIDDEN  = 48
  LSCC_EPS     = 1e-4
  LSCC_DELTA_CLIP    = 4.0
  LSCC_LOG_RATIO_CLIP = 4.0
  LSCC_GATE_INIT = 0.05
  LSCC_GATE_MAX  = 0.50
"""

import math
import numpy as np

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    HAS_TORCH = True
except ImportError:
    torch = None
    HAS_TORCH = False

    class _DummyModule:
        def __init__(self, *args, **kwargs):
            pass
        def __call__(self, *args, **kwargs):
            return self

    class _DummyNN:
        Module = _DummyModule
        def __getattr__(self, name):
            return lambda *args, **kwargs: _DummyModule()

    class _DummyF:
        def __getattr__(self, name):
            return lambda *args, **kwargs: None

    nn = _DummyNN()
    F = _DummyF()

# ---- Verified constants -------------------------------------------------- #

IN_CHANNELS  = 11
IMAGE_SIZE   = 240
NUM_CLASSES  = 15
MODEL_WIDTH  = 48
DROPOUT      = 0.10

SPECTRAL_HIDDEN              = 32
SPECTRAL_RESIDUAL_SCALE_INIT = 0.10

LSCC_RING_PAIRS   = ((3, 9), (7, 21), (15, 41))
LSCC_HIDDEN       = 48
LSCC_EPS          = 1e-4
LSCC_DELTA_CLIP   = 4.0
LSCC_LOG_RATIO_CLIP = 4.0
LSCC_GATE_INIT    = 0.05
LSCC_GATE_MAX     = 0.50

# Published MADOS dataset statistics used for normalization.
# Source: Cell 5 of mados-sih12345.ipynb
import numpy as np

BAND_MEAN = np.array(
    [0.0582676, 0.05223386, 0.04381474, 0.0357083, 0.03412902,
     0.03680401, 0.03999107, 0.03566642, 0.03965081, 0.0267993,
     0.01978944], dtype=np.float32
)

BAND_STD = np.array(
    [0.03240627, 0.03432253, 0.0354812, 0.0375769, 0.03785412,
     0.04992323, 0.05884482, 0.05545856, 0.06423746, 0.04211187,
     0.03019115], dtype=np.float32
)

CLASS_NAMES = [
    "Marine Debris",
    "Dense Sargassum",
    "Sparse Floating Algae",
    "Natural Organic Material",
    "Ship",
    "Oil Spill",
    "Marine Water",
    "Sediment-Laden Water",
    "Foam",
    "Turbid Water",
    "Shallow Water",
    "Waves & Wakes",
    "Oil Platform",
    "Jellyfish",
    "Sea Snot",
]

# ---- Helper -------------------------------------------------------------- #

def _valid_group_count(channels, preferred=8):
    groups = min(preferred, channels)
    while channels % groups != 0:
        groups -= 1
    return groups


# ---- Absolute branch (unchanged V2.1) ------------------------------------ #

class SpectralSE(nn.Module):
    """Exact V2.1 absolute spectral attention block."""
    def __init__(self, channels, reduction=4):
        super().__init__()
        hidden = max(channels // reduction, 8)
        self.fc1 = nn.Conv2d(channels, hidden, kernel_size=1)
        self.fc2 = nn.Conv2d(hidden, channels, kernel_size=1)

    def forward(self, x):
        gate = F.adaptive_avg_pool2d(x, output_size=1)
        gate = F.gelu(self.fc1(gate))
        gate = torch.sigmoid(self.fc2(gate))
        return x * gate


class ResidualSpectralStem(nn.Module):
    """Exact V2.1 spectral stem retained as the absolute branch."""
    def __init__(
        self,
        in_channels=IN_CHANNELS,
        hidden_channels=SPECTRAL_HIDDEN,
        residual_scale_init=SPECTRAL_RESIDUAL_SCALE_INIT,
    ):
        super().__init__()
        groups = _valid_group_count(hidden_channels)
        self.mix = nn.Conv2d(in_channels, hidden_channels, kernel_size=1, bias=False)
        self.norm = nn.GroupNorm(groups, hidden_channels)
        self.se = SpectralSE(hidden_channels)
        self.project = nn.Conv2d(hidden_channels, in_channels, kernel_size=1, bias=False)
        self.residual_scale = nn.Parameter(torch.tensor(float(residual_scale_init)))
        nn.init.normal_(self.project.weight, mean=0.0, std=0.01)

    def forward(self, x):
        z = self.mix(x)
        z = F.gelu(self.norm(z))
        z = self.se(z)
        z = self.project(z)
        return x + self.residual_scale * z


# ---- Sea-relative branch (new V3) --------------------------------------- #

class SeaRelativeLSCC(nn.Module):
    """New V3 marine-context inductive bias (Local Spectral Contrast Coordinates)."""
    def __init__(
        self,
        in_channels=IN_CHANNELS,
        hidden_channels=LSCC_HIDDEN,
        ring_pairs=LSCC_RING_PAIRS,
        eps=LSCC_EPS,
        delta_clip=LSCC_DELTA_CLIP,
        log_clip=LSCC_LOG_RATIO_CLIP,
        gate_init=LSCC_GATE_INIT,
        gate_max=LSCC_GATE_MAX,
    ):
        super().__init__()
        self.in_channels = in_channels
        self.ring_pairs = tuple(tuple(x) for x in ring_pairs)
        self.eps = float(eps)
        self.delta_clip = float(delta_clip)
        self.log_clip = float(log_clip)
        self.gate_max = float(gate_max)

        for inner, outer in self.ring_pairs:
            if inner % 2 != 1 or outer % 2 != 1:
                raise ValueError("LSCC box sizes must be odd.")
            if not (1 <= inner < outer):
                raise ValueError(f"Invalid ring pair: inner={inner}, outer={outer}")

        # Published V1 normalization statistics become fixed buffers.
        self.register_buffer(
            "band_mean",
            torch.tensor(BAND_MEAN, dtype=torch.float32).view(1, in_channels, 1, 1),
        )
        self.register_buffer(
            "band_std",
            torch.tensor(BAND_STD, dtype=torch.float32).view(1, in_channels, 1, 1),
        )

        # Per-band STATIC multi-scale context weights: [11 bands, 3 ring scales]
        self.scale_logits = nn.Parameter(
            torch.zeros(in_channels, len(self.ring_pairs), dtype=torch.float32)
        )

        # LSCC = 11 delta + 11 log-ratio + 1 spectral angle = 23 channels
        relative_channels = 2 * in_channels + 1
        groups = _valid_group_count(hidden_channels)
        self.encoder = nn.Sequential(
            nn.Conv2d(relative_channels, hidden_channels, kernel_size=1, bias=False),
            nn.GroupNorm(groups, hidden_channels),
            nn.GELU(),
            nn.Conv2d(hidden_channels, in_channels, kernel_size=1, bias=True),
        )
        nn.init.normal_(self.encoder[-1].weight, mean=0.0, std=0.01)
        nn.init.zeros_(self.encoder[-1].bias)

        # Per-band bounded LSCC gates
        normalized_init = gate_init / gate_max
        if not (0.0 < normalized_init < 1.0):
            raise ValueError("LSCC_GATE_INIT must lie strictly between 0 and LSCC_GATE_MAX.")
        init_logit = math.log(normalized_init / (1.0 - normalized_init))
        self.gate_logits = nn.Parameter(
            torch.full((in_channels,), float(init_logit), dtype=torch.float32)
        )

    @staticmethod
    def _box_mean_reflect(x, kernel):
        """Separable box filtering: O(K) rather than full KxK pooling."""
        p = kernel // 2
        y = F.pad(x, (p, p, 0, 0), mode="reflect")
        y = F.avg_pool2d(y, kernel_size=(1, kernel), stride=1)
        y = F.pad(y, (0, 0, p, p), mode="reflect")
        y = F.avg_pool2d(y, kernel_size=(kernel, 1), stride=1)
        return y

    def _ring_mean(self, x, inner, outer):
        inner_mean = self._box_mean_reflect(x, inner)
        outer_mean = self._box_mean_reflect(x, outer)
        inner_area = float(inner * inner)
        outer_area = float(outer * outer)
        ring = (outer_mean * outer_area - inner_mean * inner_area) / (outer_area - inner_area)
        return ring

    def ring_weights(self):
        return torch.softmax(self.scale_logits, dim=1)

    def residual_gates(self):
        return self.gate_max * torch.sigmoid(self.gate_logits)

    def compute_lscc(self, normalized_x):
        # Geometric / physical features computed in float32 for stable ratios under AMP.
        with torch.autocast(device_type=normalized_x.device.type, enabled=False):
            x = normalized_x.float()
            raw = x * self.band_std.float() + self.band_mean.float()

            ring_refs = []
            for inner, outer in self.ring_pairs:
                ring_refs.append(self._ring_mean(raw, inner, outer))

            stacked_refs = torch.stack(ring_refs, dim=2)  # [B, C, S, H, W]
            w = self.ring_weights().float()
            w = w.view(1, self.in_channels, len(self.ring_pairs), 1, 1)
            reference = (stacked_refs * w).sum(dim=2)

            delta = (raw - reference) / (reference.abs() + self.eps)
            delta = delta.clamp(-self.delta_clip, self.delta_clip)

            raw_pos = raw.clamp_min(self.eps)
            ref_pos = reference.clamp_min(self.eps)
            log_ratio = torch.log(raw_pos) - torch.log(ref_pos)
            log_ratio = log_ratio.clamp(-self.log_clip, self.log_clip)

            dot = (raw * reference).sum(dim=1, keepdim=True)
            raw_norm = torch.linalg.vector_norm(raw, dim=1, keepdim=True)
            ref_norm = torch.linalg.vector_norm(reference, dim=1, keepdim=True)
            cosine = dot / (raw_norm * ref_norm + self.eps)
            cosine = cosine.clamp(-1.0 + 1e-6, 1.0 - 1e-6)
            angle = torch.acos(cosine) / math.pi

            lscc = torch.cat([delta, log_ratio, angle], dim=1)

        return lscc, reference

    def forward(self, normalized_x):
        lscc, _ = self.compute_lscc(normalized_x)
        correction = self.encoder(lscc)
        correction = torch.tanh(correction)
        gates = self.residual_gates().view(1, self.in_channels, 1, 1)
        return gates * correction


class SeaRelSpectralFusion(nn.Module):
    def __init__(self):
        super().__init__()
        self.absolute_stem = ResidualSpectralStem(
            in_channels=IN_CHANNELS,
            hidden_channels=SPECTRAL_HIDDEN,
            residual_scale_init=SPECTRAL_RESIDUAL_SCALE_INIT,
        )
        self.sea_relative = SeaRelativeLSCC(in_channels=IN_CHANNELS, hidden_channels=LSCC_HIDDEN)

    def forward(self, x):
        absolute = self.absolute_stem(x)
        relative_correction = self.sea_relative(x)
        return absolute + relative_correction


# ---- Spatial U-Net backbone (original V1) -------------------------------- #

class ConvBlock(nn.Module):
    """Original V1 residual GroupNorm block."""
    def __init__(self, in_ch, out_ch, dropout=0.0):
        super().__init__()
        groups = _valid_group_count(out_ch)
        self.main = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, 3, padding=1, bias=False),
            nn.GroupNorm(groups, out_ch),
            nn.GELU(),
            nn.Conv2d(out_ch, out_ch, 3, padding=1, bias=False),
            nn.GroupNorm(groups, out_ch),
            nn.GELU(),
            nn.Dropout2d(dropout) if dropout > 0 else nn.Identity(),
        )
        self.skip = (
            nn.Conv2d(in_ch, out_ch, 1, bias=False) if in_ch != out_ch else nn.Identity()
        )

    def forward(self, x):
        return self.main(x) + self.skip(x)


class Down(nn.Module):
    def __init__(self, in_ch, out_ch, dropout):
        super().__init__()
        self.pool = nn.MaxPool2d(2)
        self.block = ConvBlock(in_ch, out_ch, dropout)

    def forward(self, x):
        return self.block(self.pool(x))


class Up(nn.Module):
    def __init__(self, in_ch, skip_ch, out_ch, dropout):
        super().__init__()
        self.up = nn.ConvTranspose2d(in_ch, out_ch, 2, stride=2)
        self.block = ConvBlock(out_ch + skip_ch, out_ch, dropout)

    def forward(self, x, skip):
        x = self.up(x)
        if x.shape[-2:] != skip.shape[-2:]:
            x = F.interpolate(x, size=skip.shape[-2:], mode="bilinear", align_corners=False)
        return self.block(torch.cat([x, skip], dim=1))


class SeaRelSRUNet(nn.Module):
    def __init__(
        self,
        in_channels=IN_CHANNELS,
        classes=NUM_CLASSES,
        width=MODEL_WIDTH,
        dropout=DROPOUT,
    ):
        super().__init__()
        w = width
        self.spectral_fusion = SeaRelSpectralFusion()
        self.stem = ConvBlock(in_channels, w, 0.0)
        self.d1 = Down(w, w * 2, dropout)
        self.d2 = Down(w * 2, w * 4, dropout)
        self.d3 = Down(w * 4, w * 8, dropout)
        self.d4 = Down(w * 8, w * 12, dropout)
        self.u4 = Up(w * 12, w * 8, w * 8, dropout)
        self.u3 = Up(w * 8, w * 4, w * 4, dropout)
        self.u2 = Up(w * 4, w * 2, w * 2, dropout)
        self.u1 = Up(w * 2, w, w, dropout)
        self.head = nn.Conv2d(w, classes, 1)

    def forward(self, x):
        x = self.spectral_fusion(x)
        s0 = self.stem(x)
        s1 = self.d1(s0)
        s2 = self.d2(s1)
        s3 = self.d3(s2)
        b = self.d4(s3)
        x = self.u4(b, s3)
        x = self.u3(x, s2)
        x = self.u2(x, s1)
        x = self.u1(x, s0)
        return self.head(x)


def build_eo_model():
    """Build the V3 SeaRel-SR-UNet with the verified configuration."""
    return SeaRelSRUNet(
        in_channels=IN_CHANNELS,
        classes=NUM_CLASSES,
        width=MODEL_WIDTH,
        dropout=DROPOUT,
    )
