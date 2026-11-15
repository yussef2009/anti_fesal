"""
Anti-Fesal (آنتي فصال) - NFR Test Suite 2: Reliability & Fault Tolerance
Verifies:
1. System processes 100 items with >= 95.0% reliability rate (95 valid items processed cleanly).
2. All 5 intentionally corrupted rows are cleanly intercepted, logged to logs/skipped_items_log.csv, and skipped with 0 crashes.
"""

import csv
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from config import RELIABILITY_TEST_100_CSV, SKIPPED_ITEMS_LOG_CSV
from backend.workflows.workflow_2_catalog_loop import workflow_catalog

def test_nfr_reliability_100():
    assert RELIABILITY_TEST_100_CSV.exists(), f"Missing dataset: {RELIABILITY_TEST_100_CSV}"

    with open(RELIABILITY_TEST_100_CSV, mode="r", encoding="utf-8") as f:
        items = list(csv.DictReader(f))

    total = len(items)
    assert total == 100, f"Expected exactly 100 items for reliability benchmark, found {total}"

    print(f"\n=======================================================")
    print(f" Anti-Fesal NFR Reliability Test: 100 Items Stress Run")
    print(f" (95 Valid Items + 5 Intentionally Corrupted Items)")
    print(f"=======================================================\n")

    # Clear or record current size of skipped log
    initial_skipped_count = 0
    if SKIPPED_ITEMS_LOG_CSV.exists():
        with open(SKIPPED_ITEMS_LOG_CSV, mode="r", encoding="utf-8") as f:
            initial_skipped_count = len(list(csv.reader(f))) - 1

    # Execute Workflow 2 over the 100 items
    result = workflow_catalog.run_catalog_generation(items_source=items)

    valid_count = result["valid_items_count"]
    skipped_count = result["skipped_items_count"]
    reliability_rate = result["reliability_percent"]

    print("---------------- RELIABILITY SUMMARY ----------------")
    print(f" Total Examined Items : {result['total_examined']}")
    print(f" Valid Added Items    : {valid_count} / {total} ({reliability_rate:.1f}%)")
    print(f" Skipped Corrupt Rows : {skipped_count}")
    print(f" Target Reliability   : >= 95.0%")
    print("-----------------------------------------------------\n")

    # Verify corrupt item IDs logged cleanly
    expected_corrupt_ids = {
        "REL-CORRUPT-01", "REL-CORRUPT-02", "REL-CORRUPT-03",
        "REL-CORRUPT-04", "REL-CORRUPT-05"
    }

    skipped_logged_ids = set()
    with open(SKIPPED_ITEMS_LOG_CSV, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            skipped_logged_ids.add(row["item_id"])

    missing_corrupt_ids = expected_corrupt_ids - skipped_logged_ids
    assert len(missing_corrupt_ids) == 0, f"Corrupted IDs not found in skipped log: {missing_corrupt_ids}"

    # Strict Assertions
    assert valid_count == 95, f"Expected 95 valid items, got {valid_count}"
    assert skipped_count == 5, f"Expected 5 skipped corrupt items, got {skipped_count}"
    assert reliability_rate >= 95.0, f"Reliability {reliability_rate:.1f}% failed >= 95.0% threshold"

    print(">>> SUCCESS: NFR Reliability >=95% & Corrupt Record Filtering PASSED!\n")

if __name__ == "__main__":
    test_nfr_reliability_100()
