"""
Primary Regression & Verification Test Suite for Particle Backtracking.

Tests:
- Age-normalized compactness score behavior (relative to diffusion baseline vs absolute).
- Expected radius helper monotonic scaling with sqrt(t).
- Regression test for evaluate_particle_ages: asserts recovered best_age_hours is close
  to ground truth (e.g. 24h) across the full 1–48h candidate range, eliminating the systematic youth bias.
- Verification that age_error_hours is computed dynamically in run_synthetic_benchmark().
- Preservation of operational engineering heuristic disclaimers.
"""

import math
import pytest
from backtracking.particle_backtracking import (
    ParticleBacktrackingConfig,
    compute_expected_radius_km,
    _particle_compactness_score,
    evaluate_particle_ages,
)
from backtracking.benchmark import (
    ControlledEnvironmentalProvider,
    run_synthetic_benchmark,
)


def test_expected_radius_monotonic_scaling():
    """Verifies that compute_expected_radius_km scales monotonically with sqrt(age_hours)."""
    cfg = ParticleBacktrackingConfig(diffusion_sigma_m_sqrt_hour=1200.0, scale_factor=2.146)
    
    r0 = compute_expected_radius_km(0.0, cfg)
    assert r0 >= cfg.initial_slick_radius_km

    r1 = compute_expected_radius_km(1.0, cfg)
    r4 = compute_expected_radius_km(4.0, cfg)
    r16 = compute_expected_radius_km(16.0, cfg)
    r25 = compute_expected_radius_km(25.0, cfg)

    # Spread should strictly grow with age
    assert r1 < r4 < r16 < r25
    # r16 - r0 should be approximately 4 * (r1 - r0) due to sqrt scaling (sqrt(16) = 4 * sqrt(1))
    assert math.isclose((r16 - cfg.initial_slick_radius_km) / (r1 - cfg.initial_slick_radius_km), 4.0, rel_tol=1e-3)


def test_particle_compactness_rewards_relative_tightness_not_absolute():
    """
    Validates that _particle_compactness_score evaluates compactness relative to
    the baseline diffusion spread at that age, NOT on an arbitrary fixed target.

    A cloud at age 40h that is unusually compact (e.g. 6.0 km vs expected 16 km)
    should score significantly higher than a 2h cloud that is unusually dispersed
    (e.g. 4.0 km vs expected 2.5 km), even though the 40h cloud is larger in absolute km.
    """
    cfg = ParticleBacktrackingConfig()

    # Cloud at 40h: r90 = 6.0 km (very tight for 40 hours of ocean drift)
    score_40h_tight = _particle_compactness_score(r90_km=6.0, age_hours=40.0, config=cfg)

    # Cloud at 2h: r90 = 5.0 km (very dispersed for 2 hours of drift)
    score_2h_diffuse = _particle_compactness_score(r90_km=5.0, age_hours=2.0, config=cfg)

    # The 40h tight cloud should score higher than the 2h diffuse cloud
    assert score_40h_tight > score_2h_diffuse, (
        f"Expected relative score at 40h ({score_40h_tight:.3f}) to exceed "
        f"diffuse score at 2h ({score_2h_diffuse:.3f})"
    )


def test_particle_age_accuracy_regression_known_age():
    """
    Regression Test:
    Constructs a synthetic scenario with a known true age (24.0 hours) using
    backtracking/benchmark.py's controlled provider pattern.
    Runs evaluate_particle_ages across the full 1–48h candidate range.
    Asserts best_age_hours is close to the true age (within 4 hours),
    confirming the algorithm is not trapped in the systematic youth bias (1-2h).
    """
    true_age = 24.0
    true_origin = (18.12, 72.45)
    
    cfg = ParticleBacktrackingConfig(
        num_particles=150,
        candidate_ages_hours=list(range(1, 49)),
        random_seed=42,
    )
    provider = ControlledEnvironmentalProvider(
        base_current_speed_kts=0.6,
        current_direction_deg=135.0,
        wind_speed_kts=12.0,
        wind_direction_deg=225.0,
    )

    # Run full synthetic benchmark
    report = run_synthetic_benchmark(
        true_origin=true_origin,
        true_age_hours=true_age,
        provider=provider,
        config=cfg,
    )

    recovered_age = report["recovered_best_age"]
    age_error = report["age_error_hours"]
    origin_error = report["origin_error_km"]

    # Assert that age error is dynamically computed (not 0 hardcoded)
    assert "age_error_hours" in report
    assert report["age_error_hours"] == abs(recovered_age - true_age)

    # Core assertion: recovered age must be close to ground-truth 24h (within 4 hours)
    assert abs(recovered_age - true_age) <= 4.0, (
        f"Expected recovered age close to {true_age}h, but got {recovered_age}h (error: {age_error}h). "
        f"This indicates a regression where candidate ages systematically collapse to 1-2h."
    )

    # Confirm it did NOT collapse to the minimum candidate age (1h or 2h)
    assert recovered_age > 10.0, f"Recovered age {recovered_age}h collapsed to near-minimum candidate age!"

    # Origin position should also recover accurately
    assert origin_error < 10.0, f"Recovered origin error {origin_error} km exceeded tolerance (10 km)"

    # Plausible age range must include the true age or bracket the recovered age
    min_p, max_p = report["plausible_age_range"]
    assert min_p <= recovered_age <= max_p
    assert min_p <= true_age <= max_p


def test_run_synthetic_benchmark_computes_age_error_hours():
    """Validates that run_synthetic_benchmark computes age_error_hours dynamically."""
    res = run_synthetic_benchmark(true_age_hours=20.0)
    assert isinstance(res["age_error_hours"], (int, float))
    assert res["age_error_hours"] == abs(res["recovered_best_age"] - 20.0)
    assert res["benchmark_status"] == "SUCCESS"


def test_engineering_heuristic_disclaimer_preserved():
    """Ensures the legal / operational engineering heuristic disclaimer is preserved."""
    res = evaluate_particle_ages({
        1: [(18.1, 72.4), (18.11, 72.41)],
        2: [(18.2, 72.5), (18.21, 72.51)],
    })
    assert "note" in res
    assert "engineering heuristic" in res["note"].lower()
    assert "not a calibrated" in res["note"].lower()
