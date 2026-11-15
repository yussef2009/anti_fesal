"""
Anti-Fesal (آنتي فصال) - NFR Test Suite 3: Fault Tolerance & Retry Backoff
Verifies:
1. Driver dispatch succeeds on Attempt 1 under normal operation.
2. Under external carrier failures, executes 2-retry backoff (0s -> wait 3s -> wait 6s).
3. If all attempts fail, logs DISPATCH_FAILED to logs/automation_log.csv and triggers admin alert without crashing.
"""

import time
import csv
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from config import AUTOMATION_LOG_CSV
from backend.agents.dispatch_agent import dispatch_agent

def test_fault_tolerance_dispatch():
    print(f"\n=======================================================")
    print(f" Anti-Fesal Fault Tolerance & Retry Backoff Test")
    print(f"=======================================================\n")

    # Part 1: Normal successful dispatch
    print("[Test 1] Testing normal driver dispatch in Sidi Beshr...")
    success_res = dispatch_agent.dispatch_pickup(
        item_id="TEST-DISP-OK",
        district="Sidi Beshr",
        pickup_address="شارع خالد بن الوليد، سيدي بشر",
        payout_cash=10440.0,
        simulate_failure=False
    )

    assert success_res["status"] == "DISPATCH_SUCCESS", f"Expected success, got {success_res['status']}"
    assert success_res["attempts_taken"] == 1, "Should succeed on attempt 1"
    assert "أحمد" in success_res["driver_name"], "Expected Captain Ahmed for Sidi Beshr"
    print(f"  ✓ Attempt 1 succeeded immediately with driver: {success_res['driver_name']}")

    # Part 2: Simulated external carrier outage requiring 2-retry backoff (3s, 6s)
    print("\n[Test 2] Simulating external dispatch failure to trigger 2-retry backoff (0s -> wait 3s -> wait 6s)...")
    start_time = time.time()
    failure_res = dispatch_agent.dispatch_pickup(
        item_id="TEST-DISP-FAIL",
        district="El-Attarine",
        pickup_address="شارع فؤاد، العطارين",
        payout_cash=15000.0,
        simulate_failure=True
    )
    duration = time.time() - start_time

    assert failure_res["status"] == "DISPATCH_FAILED", f"Expected failure, got {failure_res['status']}"
    assert failure_res["attempts_taken"] == 3, f"Expected 3 attempts (initial + 2 retries), got {failure_res['attempts_taken']}"
    assert failure_res.get("admin_alert_triggered") is True, "Admin alert must be triggered on dispatch failure"
    assert duration >= 9.0, f"Expected backoff duration >= 9.0s (3s + 6s), took {duration:.2f}s"
    print(f"  ✓ 2 retries completed with backoff in {duration:.2f}s without system crash")

    # Part 3: Verify logs in automation_log.csv
    with open(AUTOMATION_LOG_CSV, mode="r", encoding="utf-8") as f:
        log_rows = list(csv.DictReader(f))

    logged_events = [r["event_type"] for r in log_rows if r["item_id"] == "TEST-DISP-FAIL"]
    print(f"  ✓ Recorded events for failed dispatch: {logged_events}")

    assert "DISPATCH_ATTEMPT_1" in logged_events
    assert "DISPATCH_ATTEMPT_2" in logged_events
    assert "DISPATCH_ATTEMPT_3" in logged_events
    assert "DISPATCH_FAILED" in logged_events

    print("\n>>> SUCCESS: Fault-tolerance 2-retry backoff & DISPATCH_FAILED logging PASSED!\n")

if __name__ == "__main__":
    test_fault_tolerance_dispatch()
