"""
Anti-Fesal (آنتي فصال) - Thread-Safe CSV Audit Logger
Implements thread-safe, non-blocking audit logging for workflows, corrupt items, and HITL corrections.
"""

import csv
import threading
from datetime import datetime
from pathlib import Path
from config import AUTOMATION_LOG_CSV, SKIPPED_ITEMS_LOG_CSV, CORRECTIONS_CSV

_lock = threading.Lock()

def _ensure_csv_headers(filepath: Path, headers: list):
    """Initializes CSV file with header row if file doesn't exist or is empty."""
    if not filepath.exists() or filepath.stat().st_size == 0:
        filepath.parent.mkdir(parents=True, exist_ok=True)
        with open(filepath, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(headers)

# Initialize all 3 audit CSV files on import
_ensure_csv_headers(
    AUTOMATION_LOG_CSV,
    ["timestamp", "event_type", "item_id", "execution_time_ms", "status", "details"]
)
_ensure_csv_headers(
    SKIPPED_ITEMS_LOG_CSV,
    ["timestamp", "item_id", "title", "category", "quoted_price", "reason"]
)
_ensure_csv_headers(
    CORRECTIONS_CSV,
    ["timestamp", "item_id", "original_grade", "corrected_grade", "original_price", "corrected_price", "merchant_notes", "reviewer_id"]
)

def log_automation(event_type: str, item_id: str, execution_time_ms: float, status: str, details: str = ""):
    """Thread-safe append to automation_log.csv"""
    with _lock:
        timestamp = datetime.utcnow().isoformat()
        with open(AUTOMATION_LOG_CSV, mode="a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([timestamp, event_type, str(item_id), round(execution_time_ms, 2), status, str(details)])

def log_skipped_item(item_id: str, title: str, category: str, quoted_price: float, reason: str):
    """Thread-safe append to skipped_items_log.csv"""
    with _lock:
        timestamp = datetime.utcnow().isoformat()
        with open(SKIPPED_ITEMS_LOG_CSV, mode="a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([timestamp, str(item_id), str(title), str(category), quoted_price, str(reason)])

def log_correction(item_id: str, original_grade: str, corrected_grade: str,
                   original_price: float, corrected_price: float,
                   merchant_notes: str = "", reviewer_id: str = "merchant_admin"):
    """Thread-safe append to corrections.csv"""
    with _lock:
        timestamp = datetime.utcnow().isoformat()
        with open(CORRECTIONS_CSV, mode="a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([
                timestamp, str(item_id), original_grade, corrected_grade,
                original_price, corrected_price, str(merchant_notes), str(reviewer_id)
            ])

def read_log_records(filepath: Path, limit: int = 50) -> list:
    """Read latest records from a CSV log in reverse chronological order."""
    if not filepath.exists():
        return []
    with _lock:
        with open(filepath, mode="r", newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            records = list(reader)
            records.reverse()
            return records[:limit]
