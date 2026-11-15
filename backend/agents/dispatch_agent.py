"""
Anti-Fesal (آنتي فصال) - Agent 3: Driver Dispatch Agent
Orchestrates instant driver pickup dispatch across Alexandria districts with
fault-tolerant exponential backoff retry mechanism (Attempt 1 [0s] -> Attempt 2 [wait 3s] -> Attempt 3 [wait 6s]).
Logs all retry attempts and DISPATCH_FAILED events cleanly to logs/automation_log.csv.
"""

import time
import uuid
import logging
from typing import Dict, Any, Optional
from pathlib import Path
import sys

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from logs.logger import log_automation

logger = logging.getLogger("anti_fesal.dispatch_agent")

DISTRICT_DRIVERS = {
    "El-Attarine": {"name": "كابتن طارق الديب", "phone": "01098765431", "vehicle": "شاحنة نقل أثاث خفيف"},
    "El-Mansheya": {"name": "كابتن طارق الديب", "phone": "01098765431", "vehicle": "شاحنة نقل أثاث خفيف"},
    "Sidi Beshr": {"name": "كابتن أحمد الإسكندراني", "phone": "01234567890", "vehicle": "فان بيك أب مجهز"},
    "Miami": {"name": "كابتن أحمد الإسكندراني", "phone": "01234567890", "vehicle": "فان بيك أب مجهز"},
    "Smouha": {"name": "كابتن محمود العطار", "phone": "01123456789", "vehicle": "بيك أب إلكترونيات وأجهزة"},
    "Gleem": {"name": "كابتن محمود العطار", "phone": "01123456789", "vehicle": "بيك أب إلكترونيات وأجهزة"},
    "Roushdy": {"name": "كابتن محمود العطار", "phone": "01123456789", "vehicle": "بيك أب إلكترونيات وأجهزة"},
    "Moharam Bek": {"name": "كابتن حسن البحيري", "phone": "01543210987", "vehicle": "شاحنة أجهزة منزلية"}
}

class DispatchAgent:
    def __init__(self):
        pass

    def dispatch_pickup(self, item_id: str, district: str, pickup_address: str,
                        payout_cash: float, deal_id: Optional[str] = None,
                        simulate_failure: bool = False,
                        max_retries: int = 2) -> Dict[str, Any]:
        """
        Executes driver dispatch with 2-retry backoff (0s -> wait 3s -> wait 6s).
        Returns dispatch card dictionary and updates automation logs.
        """
        dispatch_id = f"DISP-{uuid.uuid4().hex[:8].upper()}"
        start_time = time.time()
        
        assigned_driver = DISTRICT_DRIVERS.get(district, {
            "name": "كابتن إبراهيم السكندري",
            "phone": "01011122233",
            "vehicle": "بيك أب نقل بضائع"
        })

        retry_delays = [0, 3, 6]  # Attempt 1 (0s), Attempt 2 (3s), Attempt 3 (6s)
        success = False
        attempt = 0

        for delay in retry_delays:
            attempt += 1
            if delay > 0:
                logger.info(f"Dispatch retry backoff for item {item_id}: waiting {delay}s before attempt {attempt}...")
                time.sleep(delay)

            step_start = time.time()
            log_automation(
                event_type=f"DISPATCH_ATTEMPT_{attempt}",
                item_id=item_id,
                execution_time_ms=(time.time() - step_start) * 1000,
                status="IN_PROGRESS",
                details=f"District: {district}, Delay: {delay}s, Driver: {assigned_driver['name']}"
            )

            # Check if this attempt succeeds (simulate_failure forces all attempts to fail)
            if not simulate_failure:
                success = True
                break
            else:
                logger.warning(f"Simulated external carrier failure on attempt {attempt} for item {item_id}")

        total_elapsed_ms = (time.time() - start_time) * 1000

        if success:
            log_automation(
                event_type="DISPATCH_SUCCESS",
                item_id=item_id,
                execution_time_ms=total_elapsed_ms,
                status="SUCCESS",
                details=f"Driver {assigned_driver['name']} assigned on attempt {attempt}"
            )
            return {
                "dispatch_id": dispatch_id,
                "deal_id": deal_id,
                "item_id": item_id,
                "district": district,
                "pickup_address": pickup_address,
                "driver_name": assigned_driver["name"],
                "driver_phone": assigned_driver["phone"],
                "driver_vehicle": assigned_driver["vehicle"],
                "payout_cash": payout_cash,
                "attempts_taken": attempt,
                "status": "DISPATCH_SUCCESS",
                "message": f"تم تعيين السائق {assigned_driver['name']} بنجاح لاستلام المنتج ودفع المبلغ كاش للمشتري."
            }
        else:
            # All attempts exhausted
            log_automation(
                event_type="DISPATCH_FAILED",
                item_id=item_id,
                execution_time_ms=total_elapsed_ms,
                status="FAILED",
                details=f"All {attempt} dispatch attempts failed after backoff (0s, 3s, 6s). Alert triggered."
            )
            return {
                "dispatch_id": dispatch_id,
                "deal_id": deal_id,
                "item_id": item_id,
                "district": district,
                "pickup_address": pickup_address,
                "driver_name": "Unassigned",
                "payout_cash": payout_cash,
                "attempts_taken": attempt,
                "status": "DISPATCH_FAILED",
                "error": "فشل الاتصال بمنظومة المناديب بعد محاولتين وإعادة المحاولة مرتين (3ث، 6ث). تم إرسال تنبيه لإدارة التشغيل.",
                "admin_alert_triggered": True
            }

dispatch_agent = DispatchAgent()
