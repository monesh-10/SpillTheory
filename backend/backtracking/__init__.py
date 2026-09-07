"""
Backtracking and particle drift hindcast package for oil spill origin attribution.
"""
from .particle_backtracking import (
    ParticleBacktrackingConfig,
    evaluate_particle_ages,
    compute_expected_radius_km,
    _particle_compactness_score,
    run_particle_backtracking,
)
from .benchmark import (
    ControlledEnvironmentalProvider,
    run_synthetic_benchmark,
)

__all__ = [
    "ParticleBacktrackingConfig",
    "evaluate_particle_ages",
    "compute_expected_radius_km",
    "_particle_compactness_score",
    "run_particle_backtracking",
    "ControlledEnvironmentalProvider",
    "run_synthetic_benchmark",
]
