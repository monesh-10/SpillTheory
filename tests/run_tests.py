import sys
print("RUN_TESTS_TOP_LEVEL_REACHED", flush=True)
import warnings
warnings.filterwarnings('ignore')

import sys
import time
import inspect
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

def run_suite(module_name):
    print(f"\n{'='*70}\nRUNNING SUITE: {module_name}\n{'='*70}")
    try:
        import importlib
        mod = importlib.import_module(module_name)
    except Exception as e:
        print(f"FAILED TO IMPORT {module_name}: {e}")
        import traceback
        traceback.print_exc()
        return False, []

    test_funcs = [
        (name, func) for name, func in inspect.getmembers(mod, inspect.isfunction)
        if name.startswith("test_")
    ]
    
    passed = 0
    failed = 0
    results = []

    for name, func in test_funcs:
        t0 = time.time()
        try:
            func()
            dt = (time.time() - t0) * 1000
            print(f"  [PASS] {name} ({dt:.1f}ms)")
            passed += 1
            results.append((name, "PASS", dt))
        except Exception as e:
            dt = (time.time() - t0) * 1000
            print(f"  [FAIL] {name} ({dt:.1f}ms): {e}")
            import traceback
            traceback.print_exc()
            failed += 1
            results.append((name, "FAIL", dt))

    print(f"\n{module_name} SUMMARY: {passed} passed, {failed} failed.")
    return failed == 0, results

if __name__ == "__main__":
    suites = [
        "tests.test_sar",
        "tests.test_eo",
        "tests.test_eo_digital_twin",
        "tests.test_particle_primary",
        "tests.test_backend_audit",
    ]

    total_passed = 0
    total_failed = 0
    all_ok = True

    print("STARTING COMPLETE SPILLTHEORY TEST SUITE VERIFICATION")
    print(f"Python: {sys.version}")
    
    for s in suites:
        ok, res = run_suite(s)
        if not ok:
            all_ok = False
        for _, status, _ in res:
            if status == "PASS":
                total_passed += 1
            else:
                total_failed += 1

    print("\n" + "="*70)
    print(f"GRAND TOTAL: {total_passed} PASSED, {total_failed} FAILED")
    print("="*70)
    
    sys.exit(0 if all_ok else 1)
