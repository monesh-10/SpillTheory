"""
Particle Backtracking & Age Evaluation Engine for Maritime Oil Spill Intelligence.

Provides Lagrangian reverse-trajectory particle simulation, age-normalized
compactness scoring, and candidate age evaluation for identifying probable
discharge origin coordinates and elapsed drift time.

Disclaimer:
    This evaluation is an engineering heuristic for operational decision-support
    and ranking candidate drift scenarios, not a calibrated statistical probability
    distribution or rigorous Bayesian estimator.
"""

import math
from dataclasses import dataclass, field
from typing import Dict, Any, List, Tuple, Optional, Callable
import random


@dataclass
class ParticleBacktrackingConfig:
    """Configuration parameters for Lagrangian particle backtracking simulation."""
    num_particles: int = 150
    diffusion_sigma_m_sqrt_hour: float = 1200.0  # Horizontal turbulent diffusion parameter (m / sqrt(h))
    scale_factor: float = 2.146                 # 90th percentile scale factor for 2D Gaussian spread (~sqrt(-2 ln 0.1))
    initial_slick_radius_km: float = 0.5        # Estimated initial source slick release radius
    candidate_ages_hours: List[int] = field(default_factory=lambda: list(range(1, 49)))
    compactness_weight: float = 0.70            # Weight assigned to age-normalized cloud compactness
    alignment_weight: float = 0.30              # Weight assigned to trajectory & environmental alignment
    windage_factor: float = 0.03                # Standard NOAA GNOME wind leeway factor (3%)
    random_seed: Optional[int] = 42             # Deterministic seed for reproducible benchmarks


def haversine_km(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    """Computes the great-circle distance between two (lat, lon) pairs in kilometers."""
    lat1, lon1 = coord1
    lat2, lon2 = coord2
    r = 6371.0  # Earth mean radius in km

    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return r * c


def compute_expected_radius_km(age_hours: float, config: Optional[ParticleBacktrackingConfig] = None) -> float:
    """
    Computes the expected baseline horizontal spread radius (r90) at a given age
    under the turbulent diffusion model alone with no informative convergence signal.

    Formula:
        expected_radius_km(age_hours) = initial_radius + (scale_factor * sigma_m_sqrt_h * sqrt(age_hours)) / 1000.0

    This represents the spread you would expect from an 'average' unconstrained candidate
    age under pure Brownian/Fickian ocean surface diffusion.

    Args:
        age_hours: Elapsed candidate drift duration in hours.
        config: Optional ParticleBacktrackingConfig containing diffusion parameters.

    Returns:
        Expected 90th percentile dispersion radius in kilometers.
    """
    cfg = config or ParticleBacktrackingConfig()
    effective_age = max(0.0, float(age_hours))
    
    # Diffusion component in meters converted to km
    diffusive_spread_km = (cfg.scale_factor * cfg.diffusion_sigma_m_sqrt_hour * math.sqrt(effective_age)) / 1000.0
    
    # Combined with initial slick geometry
    return max(0.1, cfg.initial_slick_radius_km + diffusive_spread_km)


def _particle_compactness_score(r90_km: float, age_hours: float, config: Optional[ParticleBacktrackingConfig] = None) -> float:
    """
    Evaluates candidate age compactness relative to the expected baseline spread
    at that age rather than against an arbitrary fixed absolute distance target.

    Scoring relative to expected_radius_km(age_hours) ensures that older candidate
    clouds (e.g. 24h or 40h) that have converged significantly compared to their expected
    diffusive expansion receive high scores, eliminating the systematic youth bias where
    1-2h candidates were artificially favored.

    Note:
        This metric is an engineering heuristic for operational decision-support and
        candidate scenario ranking, not a calibrated statistical probability estimator.

    Args:
        r90_km: Actual 90th percentile radius of the backtracked particle cloud in km.
        age_hours: Elapsed candidate drift duration in hours.
        config: Optional ParticleBacktrackingConfig instance.

    Returns:
        Compactness score in [0.0, 1.0], rewarding clouds that are tighter than expected for their age.
    """
    expected_km = compute_expected_radius_km(age_hours, config)
    ratio = max(0.0, r90_km) / max(expected_km, 1e-4)

    # Exponential decay based on the ratio of observed to expected spread:
    # ratio < 1.0 means tighter than expected for this elapsed time (scores > e^-1 = ~0.37 up to 1.0)
    # ratio > 1.0 means more dispersed than expected for this elapsed time (scores decay towards 0)
    return float(math.exp(-ratio))


def compute_cloud_centroid(coords: List[Tuple[float, float]]) -> Tuple[float, float]:
    """Calculates the geometric mean (lat, lon) centroid of a list of coordinates."""
    if not coords:
        return 0.0, 0.0
    mean_lat = sum(c[0] for c in coords) / len(coords)
    mean_lon = sum(c[1] for c in coords) / len(coords)
    return mean_lat, mean_lon


def compute_cloud_r90(coords: List[Tuple[float, float]], centroid: Optional[Tuple[float, float]] = None) -> float:
    """Computes the 90th-percentile distance in kilometers of particles from the cloud centroid."""
    if len(coords) < 2:
        return 0.1
    c = centroid or compute_cloud_centroid(coords)
    distances = sorted(haversine_km(pt, c) for pt in coords)
    idx90 = min(len(distances) - 1, int(math.ceil(0.90 * len(distances))) - 1)
    return max(0.01, distances[idx90])


def evaluate_particle_ages(
    candidate_clouds: Dict[int, List[Tuple[float, float]]],
    alignment_scores: Optional[Dict[int, float]] = None,
    config: Optional[ParticleBacktrackingConfig] = None
) -> Dict[str, Any]:
    """
    Evaluates candidate particle ages across a candidate drift duration spectrum.

    Combines an age-normalized compactness metric (weight 0.70) with a hydrodynamic/trajectory
    alignment metric (weight 0.30) to rank candidate release ages.

    Note:
        This evaluation is an engineering heuristic for operational decision-support and
        ranking candidate drift scenarios, not a calibrated statistical probability distribution
        or rigorous Bayesian estimator.

    Args:
        candidate_clouds: Mapping of candidate_age_hours -> list of backtracked (lat, lon) coordinates.
        alignment_scores: Optional mapping of candidate_age_hours -> alignment score in [0, 1].
        config: Optional ParticleBacktrackingConfig instance.

    Returns:
        Dictionary containing:
            - best_age_hours: Best candidate age in hours.
            - best_score: Peak composite score.
            - plausible_age_range: (min_age_hours, max_age_hours) for scores within 85% of peak.
            - candidate_evaluations: Detailed breakdown for each candidate age.
    """
    cfg = config or ParticleBacktrackingConfig()
    evaluations = []

    for age in sorted(candidate_clouds.keys()):
        pts = candidate_clouds[age]
        centroid = compute_cloud_centroid(pts)
        r90_km = compute_cloud_r90(pts, centroid)
        expected_r_km = compute_expected_radius_km(age, cfg)
        
        compactness = _particle_compactness_score(r90_km, age, cfg)
        alignment = alignment_scores.get(age, 1.0) if alignment_scores else 1.0

        composite = (cfg.compactness_weight * compactness) + (cfg.alignment_weight * alignment)

        evaluations.append({
            "age_hours": age,
            "centroid": centroid,
            "r90_km": round(r90_km, 3),
            "expected_radius_km": round(expected_r_km, 3),
            "compactness_score": round(compactness, 4),
            "alignment_score": round(alignment, 4),
            "composite_score": round(composite, 4),
        })

    if not evaluations:
        return {
            "best_age_hours": 1,
            "best_score": 0.0,
            "plausible_age_range": (1, 1),
            "candidate_evaluations": [],
            "note": "Engineering heuristic for decision-support; not a calibrated statistical probability."
        }

    # Identify candidate age with maximum composite score
    best_eval = max(evaluations, key=lambda x: x["composite_score"])
    best_age = best_eval["age_hours"]
    best_score = best_eval["composite_score"]

    # Plausible range: candidate ages maintaining >= 85% of peak score
    score_threshold = 0.85 * best_score
    plausible = [e["age_hours"] for e in evaluations if e["composite_score"] >= score_threshold]
    plausible_range = (min(plausible), max(plausible)) if plausible else (best_age, best_age)

    return {
        "best_age_hours": best_age,
        "best_score": best_score,
        "plausible_age_range": plausible_range,
        "best_centroid": best_eval["centroid"],
        "candidate_evaluations": evaluations,
        "note": "Engineering heuristic for decision-support; not a calibrated statistical probability."
    }


def run_particle_backtracking(
    observed_centroid: Tuple[float, float],
    velocity_provider: Callable[[float, float, float], Tuple[float, float]],
    config: Optional[ParticleBacktrackingConfig] = None,
    candidate_ages: Optional[List[int]] = None
) -> Dict[str, Any]:
    """
    Executes reverse Lagrangian particle advection & diffusion integration
    backward from an observed slick centroid to evaluate potential origins.

    Args:
        observed_centroid: (lat, lon) coordinates of observed spill.
        velocity_provider: Callable(lat, lon, t_hours_back) returning (u_ms, v_ms) forward velocity.
                           (Negative velocity is applied for backward advection).
        config: Optional ParticleBacktrackingConfig instance.
        candidate_ages: Optional explicit list of candidate age hours to evaluate.

    Returns:
        Complete evaluation result dictionary with best origin, best age, and candidate clouds.
    """
    cfg = config or ParticleBacktrackingConfig()
    ages = candidate_ages or cfg.candidate_ages_hours
    max_age = max(ages)

    # Initialize random seed if provided
    rng = random.Random(cfg.random_seed)

    # Initialize particle ensemble around observed centroid
    particles: List[Dict[str, float]] = []
    km_per_deg_lat = 111.0
    cos_lat = math.cos(math.radians(observed_centroid[0]))
    km_per_deg_lon = 111.0 * max(0.1, cos_lat)

    for _ in range(cfg.num_particles):
        angle = rng.uniform(0, 2.0 * math.pi)
        r = cfg.initial_slick_radius_km * math.sqrt(rng.uniform(0, 1.0))
        dlat = (r * math.cos(angle)) / km_per_deg_lat
        dlon = (r * math.sin(angle)) / km_per_deg_lon
        particles.append({
            "lat": observed_centroid[0] + dlat,
            "lon": observed_centroid[1] + dlon
        })

    candidate_clouds: Dict[int, List[Tuple[float, float]]] = {}
    dt_hours = 0.5  # 30-minute integration step
    current_time_back = 0.0

    # Step-by-step backward numerical integration
    while current_time_back < max_age:
        next_time = current_time_back + dt_hours
        
        # Turbulent diffusion step (random walk per dt)
        diff_sigma_m = cfg.diffusion_sigma_m_sqrt_hour * math.sqrt(dt_hours)
        diff_sigma_km = diff_sigma_m / 1000.0

        for p in particles:
            # Query forward velocity at current location & time
            u_ms, v_ms = velocity_provider(p["lat"], p["lon"], current_time_back)
            
            # Convert m/s to km/h and apply negative vector for reverse advection
            u_kmh = u_ms * 3.6
            v_kmh = v_ms * 3.6
            
            d_east_km = -u_kmh * dt_hours + rng.gauss(0.0, diff_sigma_km)
            d_north_km = -v_kmh * dt_hours + rng.gauss(0.0, diff_sigma_km)

            p["lat"] += d_north_km / km_per_deg_lat
            p["lon"] += d_east_km / (111.0 * max(0.1, math.cos(math.radians(p["lat"]))))

        current_time_back = next_time

        # Check if current_time_back corresponds to a candidate age
        nearest_age = int(round(current_time_back))
        if nearest_age in ages and abs(current_time_back - nearest_age) < 1e-4:
            candidate_clouds[nearest_age] = [(p["lat"], p["lon"]) for p in particles]

    # Evaluate candidate ages with age-normalized compactness metric
    eval_results = evaluate_particle_ages(candidate_clouds, config=cfg)
    eval_results["candidate_clouds"] = candidate_clouds
    return eval_results
